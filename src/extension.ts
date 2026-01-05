import * as vscode from 'vscode';
import * as http from 'http';
import * as path from 'path';
import * as os from 'os';
import { TextDecoder } from 'util';

let server: http.Server | undefined;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    startServer();

    context.subscriptions.push(vscode.commands.registerCommand('uiSmartPicker.restart', () => {
        startServer();
        vscode.window.showInformationMessage('UI Picker Server Restarted');
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('uiSmartPicker.port')) {
            startServer();
        }
    }));
}

export function deactivate() {
    if (server) { server.close(); }
}

function startServer() {
    if (server) { server.close(); }
    const config = vscode.workspace.getConfiguration('uiSmartPicker');
    const PORT = config.get<number>('port') || 54321;

    server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

        if (req.method === 'POST' && req.url === '/pick') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const payload = JSON.parse(body);
                    await handleElementSelection(payload);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                } catch (err: any) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        }
    });

    server.listen(PORT, '0.0.0.0', () => {
        statusBarItem.text = `$(radio-tower) Picker: ${PORT}`;
        statusBarItem.show();
    });
}

export async function handleElementSelection(payload: any) {
    const { screenshotBase64, outerHTML, searchHint, hintType, url } = payload;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    // 1. 이미지 저장
    const captureUri = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'captures');
    await vscode.workspace.fs.createDirectory(captureUri);
    const fileUri = vscode.Uri.joinPath(captureUri, `ui_${Date.now()}.png`);
    await vscode.workspace.fs.writeFile(fileUri, Buffer.from(screenshotBase64, 'base64'));

    // 2. 검색 준비
    const decoder = new TextDecoder();
    // [수정] 빌드 폴더(.next, dist, out 등)를 검색 대상에서 제외
    const excludePattern = '{**/node_modules/**,**/.next/**,**/dist/**,**/out/**,**/build/**,**/.git/**}';
    const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,html,vue,svelte}', excludePattern);
    
    const tagNameMatch = outerHTML.match(/^<([a-z0-9]+)/i);
    const targetTagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
    const targetTexts = outerHTML.replace(/<[^>]+>/g, '###').split('###').map((t: string) => t.trim()).filter((t: string) => t.length > 2);

    let foundFileInfo = "알 수 없음";
    let foundContextCode = outerHTML;

    // 3. 구조적 검색 실행
    searchLoop: for (const file of files) {
        try {
            const fileData = await vscode.workspace.fs.readFile(file);
            const text = decoder.decode(fileData);
            if (!targetTagName) continue;

            const regex = new RegExp(`<${targetTagName}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                const startIdx = match.index;
                let depth = 0;
                let endIdx = startIdx;
                const tagPattern = /<(\/?[a-zA-Z][a-zA-Z0-9]*)/g;
                tagPattern.lastIndex = startIdx;

                let tagMatch;
                while ((tagMatch = tagPattern.exec(text)) !== null) {
                    const tName = tagMatch[1];
                    if (tName.startsWith('/')) depth--;
                    else {
                        const tagFull = text.substring(tagMatch.index, text.indexOf('>', tagMatch.index) + 1);
                        if (!tagFull.includes('/>') && !['img','br','hr','input','meta','link'].includes(tName.toLowerCase())) depth++;
                    }
                    if (depth === 0) {
                        endIdx = text.indexOf('>', tagMatch.index) + 1;
                        break;
                    }
                    if (tagMatch.index - startIdx > 5000) break;
                }

                const candidateCode = text.substring(startIdx, endIdx);
                const normalizedCandidate = candidateCode.replace(/\s+/g, '');
                
                // 검증: 모든 텍스트 조각이 포함되어 있는지 확인
                const isMatch = targetTexts.every((t: string) => normalizedCandidate.includes(t.replace(/\s+/g, '')));

                if (isMatch) {
                    const startLine = text.substring(0, startIdx).split('\n').length;
                    foundFileInfo = `@${vscode.workspace.asRelativePath(file)}:${startLine}`;
                    foundContextCode = candidateCode;

                    const doc = await vscode.workspace.openTextDocument(file);
                    await vscode.window.showTextDocument(doc, {
                        selection: new vscode.Range(startLine - 1, 0, startLine - 1, 0),
                        preview: true
                    });
                    break searchLoop;
                }
            }
        } catch (e) {}
    }

    // 4. 프롬프트 생성
    const prompt = `
# 수정 요청
- URL: ${url}
- 파일: ${foundFileInfo}
- 이미지: ${fileUri.fsPath}

[(1)UI 개선 (2)스타일 변경 (3)제거/단순화]
작업종류:
요청:
- 
    `.trim();

    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage(`✅ 캡처 완료! (${foundFileInfo})`);
}
