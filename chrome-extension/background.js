// 탭별 상태 관리
const tabStates = {};

// [NEW] 컨텐츠 스크립트가 로드되면 상태 동기화
chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === 'content-script-ready' && sender.tab) {
        const tabId = sender.tab.id;
        const isActive = tabStates[tabId] || false;
        // 현재 상태(ON/OFF)를 다시 보내줌
        chrome.tabs.sendMessage(tabId, { type: 'toggle-ui-picker', enabled: isActive }).catch(() => {});
    }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  console.log("🖱️ Icon Clicked on tab:", tab.id);

  // 상태 토글
  const currentState = tabStates[tab.id] || false;
  const newState = !currentState;
  tabStates[tab.id] = newState;

  // 1. 스크립트 주입 (최초 1회)
  try {
      await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['html2canvas.min.js', 'content.js']
      });
      console.log("✅ Script injected");
  } catch(e) { 
      console.log("ℹ️ Script already injected or error:", e);
  }

  // 2. 메시지 전송
  try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-ui-picker', enabled: newState });
      console.log("📨 Message sent:", newState);
  } catch(e) {
      console.warn("⚠️ Message failed (Script might not be ready):", e);
      // 스크립트가 없으면 다시 주입 시도
      try {
          await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['html2canvas.min.js', 'content.js']
          });
          // 주입 후 다시 전송
          setTimeout(() => {
             chrome.tabs.sendMessage(tab.id, { type: 'toggle-ui-picker', enabled: newState }).catch(() => {});
          }, 200);
      } catch(injectErr) {
          console.error("❌ Injection failed:", injectErr);
      }
  }
  
  // 3. 뱃지 업데이트
  if (newState) {
      chrome.action.setBadgeText({ text: "ON", tabId: tab.id });
      chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
  } else {
      chrome.action.setBadgeText({ text: "", tabId: tab.id });
  }
});