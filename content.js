let video = null;
let locked = false;
let myRole = null;

function findVideo() {
    const v = document.querySelectorAll('video');
    if (!v.length) return null;
    let best = null;
    let max = 0;
    v.forEach(el => {
        const r = el.getBoundingClientRect();
        const a = r.width * r.height;
        if (a > max) { max = a; best = el; }
    });
    return best;
}

function setup() {
    video = findVideo();
    if (!video) {
        setTimeout(setup, 1000);
        return;
    }

    video.removeEventListener('play', userAction);
    video.removeEventListener('pause', userAction);
    video.removeEventListener('seeked', userAction);

    video.addEventListener('play', userAction);
    video.addEventListener('pause', userAction);
    video.addEventListener('seeked', userAction);
}

function userAction(e) {
    if (locked) return;

    chrome.runtime.sendMessage({
        type: e.type === 'play' ? 'VIDEO_PLAY' : e.type === 'pause' ? 'VIDEO_PAUSE' : 'VIDEO_SEEK',
        currentTime: video.currentTime
    });
}

async function hardSync(time, playing) {
    if (myRole === 'leader') return;

    if (!video) video = findVideo();
    if (!video) return;

    locked = true;

    video.currentTime = time;

    if (playing === true && video.paused) {
        video.play().catch(() => { });
    } else if (playing === false && !video.paused) {
        video.pause();
    }

    setTimeout(() => { locked = false; }, 1500);
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'START_LEADER_MODE') {
        myRole = 'leader';
        setup();
        return;
    }

    if (msg.type === 'START_FRIEND_MODE') {
        myRole = 'friend';
        setup();
        return;
    }

    if (msg.type === 'STOP_SYNC') {
        myRole = null;
        return;
    }

    if (myRole === 'friend') {
        if (msg.type === 'VIDEO_PLAY') hardSync(msg.currentTime, true);
        if (msg.type === 'VIDEO_PAUSE') hardSync(msg.currentTime, false);
        if (msg.type === 'VIDEO_SEEK') hardSync(msg.currentTime, null);
        if (msg.type === 'SYNC_STATE') hardSync(msg.currentTime, msg.isPlaying);
    }

    if (msg.type === 'REQUEST_SYNC_DATA' && myRole === 'leader') {
        if (video) {
            chrome.runtime.sendMessage({
                type: 'SYNC_STATE',
                url: window.location.href,
                currentTime: video.currentTime,
                isPlaying: !video.paused
            });
        }
    }

    if (msg.type === 'TOGGLE_CHAT') {
        const c = document.getElementById('ssc');
        c ? c.remove() : mkChat();
    }

    if (msg.type === 'CHAT_MESSAGE') {
        addMsg(msg.sender, msg.message);
    }
});

function mkChat() {
    const d = document.createElement('div');
    d.id = 'ssc';
    d.innerHTML = `
        <div id="ssh">
            <span class="sst">connect.us</span>
            <span id="ssx">✕</span>
        </div>
        <div id="ssm"></div>
        <div id="ssf">
            <input type="text" id="ssi" placeholder="Message..." autocomplete="off">
            <button id="ssb">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </div>
    `;


    const s = document.createElement('style');
    s.textContent = `
        #ssc {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 300px;
            height: 400px;
            background: #111;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            z-index: 2147483647;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 1px solid #333;
            display: flex;
            flex-direction: column;
        }

        #ssc * { box-sizing: border-box; }

        #ssh {
            padding: 14px 16px;
            background: #111;
            color: #fff;
            font-weight: 600;
            font-size: 14px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #222;
        }

        .sst { color: #fff; opacity: 0.9; }

        #ssx {
            cursor: pointer;
            opacity: 0.5;
            transition: opacity 0.2s;
            font-size: 16px; 
            line-height:1;
        }
        #ssx:hover { opacity: 1; }

        #ssm {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: #111;
        }

        .ss-msg {
            max-width: 85%;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.5;
            color: #ccc;
            word-wrap: break-word;
        }

        .ss-msg.leader {
            align-self: flex-start;
            background: #1e1e1e;
            border: 1px solid #333;
        }

        .ss-msg.friend {
            align-self: flex-end;
            background: #252525;
            border: 1px solid #444;
            color: #fff;
        }

        .ss-author {
            font-size: 10px;
            margin-bottom: 4px;
            opacity: 0.5;
            font-weight: 500;
            display: block;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ss-msg.leader .ss-author { color: #ff5f5f; }
        .ss-msg.friend .ss-author { color: #5fafff; text-align: right; }

        #ssf {
            padding: 12px;
            display: flex;
            gap: 8px;
            background: #111;
            border-top: 1px solid #222;
            border-radius: 0 0 8px 8px;
        }

        #ssi {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #333;
            border-radius: 4px;
            background: #1a1a1a;
            color: #fff;
            outline: none;
            font-size: 13px;
            transition: border-color 0.2s;
        }

        #ssi:focus {
            border-color: #555;
            background: #1e1e1e;
        }

        #ssi::placeholder { color: #444; }

        #ssb {
            width: 34px;
            height: 34px;
            padding: 0;
            background: #fff;
            border: none;
            color: #000;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s;
        }

        #ssb:hover { opacity: 0.9; }
        
        #ssb svg { width: 14px; height: 14px; stroke-width: 2.5; }
    `;
    document.head.appendChild(s);
    document.body.appendChild(d);

    document.getElementById('ssx').addEventListener('click', () => d.remove());
    document.getElementById('ssb').addEventListener('click', sendMsg);
    document.getElementById('ssi').addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') sendMsg();
    });
    document.getElementById('ssi').addEventListener('keyup', (e) => e.stopPropagation());
    document.getElementById('ssi').addEventListener('keypress', (e) => e.stopPropagation());


    setTimeout(() => document.getElementById('ssi').focus(), 100);
}

function sendMsg() {
    const i = document.getElementById('ssi');
    if (!i.value.trim()) return;
    chrome.runtime.sendMessage({ type: 'SEND_CHAT', message: i.value.trim() });
    i.value = '';
}

function addMsg(sender, text) {
    const c = document.getElementById('ssm');
    if (!c) return;

    const div = document.createElement('div');
    const isMe = (sender === 'leader' && myRole === 'leader') || (sender === 'friend' && myRole === 'friend');


    div.className = `ss-msg ${sender}`;



    div.innerHTML = `
        <span class="ss-author">${sender === 'leader' ? 'Leader' : 'Friend'}</span>
        ${text}
    `;

    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
}

new MutationObserver(() => {
    if (!video && myRole) setup();
}).observe(document.body, { childList: true, subtree: true });
