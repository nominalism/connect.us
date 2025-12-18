importScripts('socket.io.min.js', 'config.js');

const SERVER_URL = CONFIG.SERVER_URL;

let socket = null;
let currentRole = null;
let currentRoomCode = null;
let syncTabId = null;

function connectSocket() {
    if (socket && socket.connected) return socket;

    socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
    });

    socket.on('connect', () => {
        saveState();
    });

    socket.on('video-play', (data) => {
        sendToSyncTab('VIDEO_PLAY', { currentTime: data.currentTime });
    });

    socket.on('video-pause', (data) => {
        sendToSyncTab('VIDEO_PAUSE', { currentTime: data.currentTime });
    });

    socket.on('video-seek', (data) => {
        sendToSyncTab('VIDEO_SEEK', { currentTime: data.currentTime });
    });

    socket.on('sync-state', (data) => {
        sendToSyncTab('SYNC_STATE', data);
    });

    socket.on('request-sync', () => {

        sendToSyncTab('REQUEST_SYNC_DATA');
    });

    socket.on('url-change', (data) => {
        if (syncTabId) {
            chrome.tabs.get(syncTabId, (tab) => {
                if (tab.url !== data.url) {
                    chrome.tabs.update(syncTabId, { url: data.url });
                }
            });
        }
    });

    socket.on('chat-message', (data) => {
        notifyPopup('CHAT_MESSAGE', data);
        sendToSyncTab('CHAT_MESSAGE', data);
    });

    socket.on('friend-joined', () => notifyPopup('FRIEND_JOINED'));
    socket.on('friend-left', () => notifyPopup('FRIEND_LEFT'));
    socket.on('room-closed', () => {
        currentRole = null;
        currentRoomCode = null;
        saveState();
        notifyPopup('ROOM_CLOSED');
    });

    return socket;
}

function sendToSyncTab(type, data = {}) {
    if (!syncTabId) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type, ...data }).catch(() => { });
        });
        return;
    }
    chrome.tabs.sendMessage(syncTabId, { type, ...data }).catch(() => { });
}

function notifyPopup(type, data = {}) {
    chrome.runtime.sendMessage({ type, ...data }).catch(() => { });
}

async function saveState() {
    await chrome.storage.local.set({
        role: currentRole,
        roomCode: currentRoomCode,
        syncTabId: syncTabId,
        isActive: socket && socket.connected
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SET_SYNC_TAB') {
        syncTabId = message.tabId;
        saveState();
        sendResponse({ success: true });
        return true;
    }

    if (message.type === 'REQUEST_TOGGLE_CHAT') {
        sendToSyncTab('TOGGLE_CHAT');
        sendResponse({ success: true });
        return true;
    }

    handleMessage(message).then(sendResponse);
    return true;
});

async function handleMessage(message) {
    switch (message.type) {
        case 'CREATE_ROOM':
            const s1 = connectSocket();
            return new Promise(resolve => {
                s1.emit('create-room', (res) => {
                    if (res.success) {
                        currentRole = 'leader';
                        currentRoomCode = res.roomCode;
                        saveState();
                    }
                    resolve(res);
                });
            });

        case 'JOIN_ROOM':
            const s2 = connectSocket();
            return new Promise(resolve => {
                s2.emit('join-room', message.roomCode, (res) => {
                    if (res.success) {
                        currentRole = 'friend';
                        currentRoomCode = message.roomCode;
                        saveState();
                    }
                    resolve(res);
                });
            });

        case 'VIDEO_PLAY':
            if (socket) socket.emit('video-play', message.currentTime);
            return { success: true };

        case 'VIDEO_PAUSE':
            if (socket) socket.emit('video-pause', message.currentTime);
            return { success: true };

        case 'VIDEO_SEEK':
            if (socket) socket.emit('video-seek', message.currentTime);
            return { success: true };

        case 'SYNC_STATE':
            if (socket) socket.emit('sync-state', message);
            return { success: true };

        case 'SEND_CHAT':
            if (socket) socket.emit('chat-message', message.message);
            return { success: true };

        case 'GET_STATE':
            return { role: currentRole, roomCode: currentRoomCode, isActive: !!socket?.connected };
    }
}
