# 📘 UI SmartPicker: AI 기반 UI 편집 도구

## 프로젝트 개요

**UI SmartPicker**는 브라우저와 VS Code를 연결하여 개발 효율을 극대화하는 도구입니다. 브라우저에서 수정하고 싶은 UI 요소를 클릭하면, 해당 위치의 소스 코드를 자동으로 찾아주고 AI에게 전달할 완벽한 프롬프트를 생성해 줍니다.

## 아키텍처

프로젝트는 상호 작용하는 두 개의 확장 프로그램으로 구성됩니다.

### 1. VS Code 확장 프로그램 (서버)
*   **이름:** `UI SmartPicker (VSCode)`
*   **ID:** `ui-smart-picker`
*   **역할:** 로컬 서버(기본 포트: `54321`)를 실행하여 브라우저로부터 데이터를 수신하고 처리합니다.
*   **주요 기능:**
    *   **로컬 서버:** Chrome 확장 프로그램의 `POST /pick` 요청을 대기합니다.
    *   **스마트 검색:** HTML 구조와 텍스트를 분석하여 클래스명이 다르더라도 정확한 소스 코드 파일과 줄 번호를 찾아냅니다.
    *   **프롬프트 생성:** AI가 바로 이해할 수 있도록 이미지 경로와 파일 위치가 포함된 구조화된 프롬프트를 생성합니다.
    *   **자동 탐색:** 검색된 파일로 즉시 이동하고 해당 줄로 커서를 옮겨줍니다.

### 2. Chrome 확장 프로그램 (클라이언트)
*   **이름:** `UI SmartPicker (Browser)`
*   **역할:** 브라우저에 주입되어 사용자의 인터랙션을 감지하고 데이터를 전송합니다.
*   **주요 기능:**
    *   **요소 선택:** 마우스 오버로 요소를 하이라이트하고, 클릭하여 선택합니다.
    *   **스마트 캡처:** 요소 주변의 맥락이 잘 보이도록 상하좌우 여백을 조절하여 스크린샷을 찍습니다.
    *   **시각적 피드백:** 세련된 다크 테마 토스트 알림을 통해 전송 상태를 알려줍니다.
    *   **데이터 전송:** 캡처된 정보(HTML, 스크린샷, URL 등)를 VS Code 서버로 전송합니다.

## 주요 파일

*   **`src/extension.ts`**: VS Code 확장의 핵심 로직 (서버, 파일 검색, 프롬프트 생성).
*   **`chrome-extension/content.js`**: 브라우저 측 스크립트 (요소 선택, 캡처, 알림).
*   **`chrome-extension/background.js`**: 확장 프로그램의 상태 관리.
*   **`package.json`**: VS Code 확장 설정.
*   **`chrome-extension/manifest.json`**: Chrome 확장 설정.

## 🚀 실행 방법 (개발용)

### 1. VS Code 확장 실행
```bash
# 의존성 설치
npm install

# 컴파일
npm run compile

# 실행
F5 키를 눌러 [Extension Development Host] 창을 엽니다.
```

### 2. Chrome 확장 로드
1.  Chrome 브라우저에서 `chrome://extensions` 접속
2.  **개발자 모드** 활성화 (우측 상단)
3.  **압축해제된 확장 프로그램을 로드** 클릭
4.  `ui-smart-picker/chrome-extension` 폴더 선택

### 3. 사용 방법
1.  VS Code 서버가 실행 중인지 확인 (상태바에 `Picker: 54321` 표시).
2.  브라우저에서 확장 프로그램 아이콘을 눌러 활성화 (배지가 초록색으로 변함).
3.  로컬 웹 페이지(`localhost:3000` 등)에서 요소를 클릭합니다.
4.  생성된 프롬프트를 AI(ChatGPT, Claude 등)에게 붙여넣습니다.

---

## 📦 배포 가이드 (Marketplace)

### 1. VS Code 확장 배포
1.  **준비**: `README.md` 작성 및 `package.json`의 `publisher`를 본인 ID로 수정.
2.  **vsce 설치**: `npm install -g @vscode/vsce`
3.  **패키징**: `vsce package` 실행 → `.vsix` 파일 생성.
4.  **게시**:
    *   [Visual Studio Marketplace](https://marketplace.visualstudio.com/)에서 게시자(Publisher) 계정 생성.
    *   Azure DevOps에서 **개인 액세스 토큰(PAT)** 발급 (Marketplace Manage 권한 필요).
    *   `vsce login <publisher-id>` 후 토큰 입력.
    *   `vsce publish` 실행.

### 2. Chrome 확장 배포
1.  `chrome-extension` 폴더를 압축(Zip)합니다.
2.  [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/dev/dashboard)에 접속합니다.
3.  Zip 파일을 업로드하고 스토어 정보를 입력한 뒤 심사를 요청합니다.
