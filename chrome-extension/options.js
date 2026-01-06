// 저장
document.getElementById('save').addEventListener('click', () => {
    const host = document.getElementById('host').value || '172.28.87.39';
    const port = document.getElementById('port').value || 54321;
    chrome.storage.sync.set({ host: host, port: port }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => { status.style.display = 'none'; }, 1500);
    });
});

// 로드
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({ host: '172.28.87.39', port: 54321 }, (items) => {
        document.getElementById('host').value = items.host;
        document.getElementById('port').value = items.port;
    });
});
