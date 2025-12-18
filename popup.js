let currentRole = null;
let roomCode = null;

const leaderBtn = document.getElementById('leaderBtn');
const friendBtn = document.getElementById('friendBtn');
const leaderSection = document.getElementById('leaderSection');
const leaderActiveSection = document.getElementById('leaderActiveSection');
const friendSection = document.getElementById('friendSection');
const friendActiveSection = document.getElementById('friendActiveSection');
const createRoomBtn = document.getElementById('createRoomBtn');
const closeRoomBtn = document.getElementById('closeRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const leaderStatusDot = document.getElementById('leaderStatusDot');
const leaderStatusText = document.getElementById('leaderStatusText');
const toggleChatLeaderBtn = document.getElementById('toggleChatLeaderBtn');
const toggleChatFriendBtn = document.getElementById('toggleChatFriendBtn');

function hideAllSections() {
    leaderSection.classList.remove('active');
    leaderActiveSection.classList.remove('active');
    friendSection.classList.remove('active');
    friendActiveSection.classList.remove('active');
}

leaderBtn.addEventListener('click', () => {
    currentRole = 'leader';
    leaderBtn.classList.add('active');
    friendBtn.classList.remove('active');
    hideAllSections();
    leaderSection.classList.add('active');
});

friendBtn.addEventListener('click', () => {
    currentRole = 'friend';
    friendBtn.classList.add('active');
    leaderBtn.classList.remove('active');
    hideAllSections();
    friendSection.classList.add('active');
});

createRoomBtn.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ type: 'CREATE_ROOM' });

    if (response.success) {
        roomCode = response.roomCode;
        roomCodeDisplay.textContent = roomCode;
        hideAllSections();
        leaderActiveSection.classList.add('active');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.runtime.sendMessage({ type: 'SET_SYNC_TAB', tabId });
            chrome.tabs.sendMessage(tabId, { type: 'START_LEADER_MODE' });
        });
    }
});

closeRoomBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CLOSE_ROOM' });
    roomCode = null;
    hideAllSections();
    leaderSection.classList.add('active');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_SYNC' });
    });
});

joinRoomBtn.addEventListener('click', async () => {
    const code = roomCodeInput.value.toUpperCase().trim();

    if (code.length !== 6) {
        alert('Please enter a valid 6-character room code');
        return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'JOIN_ROOM', roomCode: code });

    if (response.success) {
        roomCode = code;
        hideAllSections();
        friendActiveSection.classList.add('active');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0].id;
            chrome.runtime.sendMessage({ type: 'SET_SYNC_TAB', tabId });
            chrome.tabs.sendMessage(tabId, { type: 'START_FRIEND_MODE' });

            if (response.url && tabs[0].url !== response.url) {
                chrome.tabs.update(tabId, { url: response.url });
            }
        });
    } else {
        alert(response.error || 'Failed to join room');
    }
});

leaveRoomBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'LEAVE_ROOM' });
    roomCode = null;
    hideAllSections();
    friendSection.classList.add('active');
    roomCodeInput.value = '';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_SYNC' });
    });
});

function toggleChat() {
    chrome.runtime.sendMessage({ type: 'REQUEST_TOGGLE_CHAT' });
}

toggleChatLeaderBtn.addEventListener('click', toggleChat);
toggleChatFriendBtn.addEventListener('click', toggleChat);

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'FRIEND_JOINED') {
        leaderStatusDot.classList.remove('waiting');
        leaderStatusText.textContent = 'Friend connected!';
    }

    if (message.type === 'FRIEND_LEFT') {
        leaderStatusDot.classList.add('waiting');
        leaderStatusText.textContent = 'Waiting for friend...';
    }

    if (message.type === 'ROOM_CLOSED') {
        roomCode = null;
        hideAllSections();
        friendSection.classList.add('active');
        roomCodeInput.value = '';
        alert('The room has been closed by the Leader');
    }
});

async function restoreState() {
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });

    if (state.isActive && state.role && state.roomCode) {
        currentRole = state.role;
        roomCode = state.roomCode;

        if (state.role === 'leader') {
            leaderBtn.classList.add('active');
            roomCodeDisplay.textContent = roomCode;
            hideAllSections();
            leaderActiveSection.classList.add('active');
        } else {
            friendBtn.classList.add('active');
            hideAllSections();
            friendActiveSection.classList.add('active');
        }
    }
}

restoreState();
