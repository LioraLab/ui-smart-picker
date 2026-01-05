// 저장
document.getElementById('save').addEventListener('click', () => {
    const port = document.getElementById('port').value;
    chrome.storage.sync.set({ port: port }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => { status.style.display = 'none'; }, 1500);
    });
});

// 로드
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get({ port: 54321 }, (items) => {
        document.getElementById('port').value = items.port;
    });
});
