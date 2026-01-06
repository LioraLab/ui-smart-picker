(function() {
    if (window.hasUiPicker) return; // 중복 주입 방지
    window.hasUiPicker = true;

    let enabled = false;
    let hoveredEl = null;

    // [NEW] 확장 컨텍스트 유효성 체크 함수
    function isContextValid() {
        try {
            return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    // 스타일 주입
    const style = document.createElement('style');
    style.innerHTML = `
        .ui-picker-highlight { outline: 3px solid #22c55e !important; cursor: crosshair !important; box-shadow: 0 0 10px #22c55e !important; }
        .ui-picker-clicked { outline: 3px solid #3b82f6 !important; background: rgba(59, 130, 246, 0.2) !important; }
    `;
    document.head.appendChild(style);

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'toggle-ui-picker') {
            enabled = msg.enabled;
            if(!enabled && hoveredEl) {
                hoveredEl.classList.remove('ui-picker-highlight');
                hoveredEl = null;
            }
        }
    });

    document.addEventListener('mouseover', (e) => {
        if (!enabled) return;
        e.preventDefault(); e.stopPropagation();
        if (hoveredEl && hoveredEl !== e.target) hoveredEl.classList.remove('ui-picker-highlight');
        hoveredEl = e.target;
        hoveredEl.classList.add('ui-picker-highlight');
    }, true);

    document.addEventListener('mouseout', (e) => {
        if (!enabled) return;
        if(e.target) e.target.classList.remove('ui-picker-highlight');
    }, true);

    // [NEW] 확장 컨텍스트 유효성 체크 함수
    function isContextValid() {
        return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
    }

    // [NEW] 토스트 메시지 표시 함수
    function showToast(message, isError = false) {
        if (!document.body) return;
        const toast = document.createElement('div');
        
        // 아이콘 컬러 설정
        const iconColor = isError ? '#ff4d4d' : '#10b981';
        
        // 아이콘 설정 (SVG)
        const icon = isError 
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

        toast.innerHTML = `<span style="display:flex; align-items:center; gap:10px;">${icon} ${message.replace(/^[✅❌]\s*/, '')}</span>`;
        
        Object.assign(toast.style, {
            position: 'fixed', 
            top: '30px', 
            left: '50%', 
            transform: 'translateX(-50%) translateY(-20px)',
            padding: '10px 22px', 
            borderRadius: '12px', 
            zIndex: '999999',
            background: 'rgba(20, 20, 20, 0.98)', 
            color: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            fontSize: '13.5px', 
            fontWeight: '600',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2)',
            opacity: '0', 
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.08)'
        });
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 2200);
    }

    document.addEventListener('click', async (e) => {
        if (!enabled) return;
        
        // 컨텍스트 체크
        if (!isContextValid()) {
            showToast("확장이 갱신되었습니다. 페이지를 새로고침해주세요.", true);
            return;
        }

        e.preventDefault(); e.stopPropagation();
        const el = e.target;
        el.classList.remove('ui-picker-highlight');
        
        // 1. 힌트 추출
        let hint = "", type = "None";
        if(el.id) { hint = el.id; type = "ID"; }
        else if(el.innerText && el.innerText.length < 50) { hint = el.innerText.trim(); type = "Text"; }
        else if(el.className && typeof el.className === 'string') {
             const cls = el.className.split(' ').find(c => c.length > 4 && !c.includes('hover:') && !c.includes('ui-picker'));
             if(cls) { hint = cls; type = "Class"; }
        }

        try {
            // 2. 캡처 (상하좌우 여유 세밀 조정)
            const pTop = 10, pBottom = 10, pLeft = 5, pRight = 20;
            const rect = el.getBoundingClientRect();
            
            const canvas = await html2canvas(document.body, {
                x: window.scrollX + rect.left - pLeft,
                y: window.scrollY + rect.top - pTop,
                width: el.offsetWidth + pLeft + pRight, 
                height: el.offsetHeight + pTop + pBottom,
                useCORS: true, 
                logging: false
            });

            // 3. 시각적 피드백
            el.classList.add('ui-picker-clicked');
            setTimeout(() => el.classList.remove('ui-picker-clicked'), 500);

            // 4. 전송 (포트 설정 가져오기)
            chrome.storage.sync.get({ host: '172.28.87.39', port: 54321 }, (items) => {
                // 콜백 시점에서도 컨텍스트 유효성 다시 체크
                if (!isContextValid()) {
                    showToast("연결이 끊어졌습니다. 새로고침이 필요합니다.", true);
                    return;
                }
                
                const HOST = items.host;
                const PORT = items.port;
                fetch(`http://${HOST}:${PORT}/pick`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: window.location.href,
                        outerHTML: el.outerHTML,
                        searchHint: hint,
                        hintType: type,
                        screenshotBase64: canvas.toDataURL().split(',')[1]
                    })
                }).then(res => {
                    if(res.ok) showToast("✅ VSCode로 전송 완료!");
                    else showToast("❌ 전송 실패: VSCode 서버를 확인하세요.", true);
                }).catch(err => {
                    showToast(`❌ 연결 실패: 포트 ${PORT} 확인 필요`, true);
                });
            });

        } catch(err) {
            console.error(err);
            showToast("캡처 에러가 발생했습니다.", true);
        }
    }, true);

    // [NEW] 로드 완료 신호 전송 (안전하게 처리)
    if (isContextValid()) {
        chrome.runtime.sendMessage({ type: 'content-script-ready' }).catch(() => {});
    }
})();
