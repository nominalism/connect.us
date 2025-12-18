# connect.us 

A chromium extension to watch movies and videos perfectly synchronized with friends.

I built this because I needed something simple that **actually works**. The concept is simple: a "Host" controls the video, and the "Friend's" player blindly obeys.

## How it works (Technical Summary)

- **Backend:** Node.js + Socket.io acting as a relay.
- **Frontend:** Vanilla JS (Manifest V3).
- **Logic:** The "Friend's" player is forced to follow the Host's timestamp. If the drift exceeds 1.5s, it automatically corrects itself (forced seek).
- **Chat:** Custom interface injected into the page DOM.

## Compatibility

The extension is designed to be **universal**, meaning it should work on any site that uses standard HTML5 players (`<video>`).

Tested and Validated Platforms:
- **YouTube**
- **Mercado Play** (Mercado Livre)

If you find bugs on other players, feel free to open an issue or submit a commit!

## Running the Project

### 1. Backend

Requires Node.js installed.

```bash
git clone https://github.com/your-user/connect.us.git
cd connect.us
npm (or bun) install
npm (or bun) start
```
The server runs on port `8080`.

### 2. Exposing to the Internet

Since Chrome requires HTTPS/WSS for service workers in production and your friend is not on your localhost, you need to expose your local server. Example using **ngrok** (you can use any other service, but ngrok is the easiest):

1. Install [ngrok](https://ngrok.com/).
2. Run: `ngrok http 8080`
3. Copy the generated URL (e.g., `https://xyz.ngrok-free.app`).

### 3. Configuring the Extension

Open the `config.js` file in the root directory and paste your ngrok URL:

```javascript
const CONFIG = {
    SERVER_URL: 'https://your-ngrok-url.app'
};
```

### 4. Installing in Chrome

1. Go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the project folder.

## Usage

1. **Host:** Open video -> Click extension -> "Host" -> "Start Room". Send code to friend.
2. **Friend:** Click extension -> "Join" -> Paste code.
3. **Chat:** Click "Open Chat" to open the floating window.

**Note:** The sync is "authoritative". The Host commands, the Follower obeys. If the Follower tries to pause, the video will keep playing (or pause and play again as soon as it receives the Host's command). This is intentional to prevent feedback loops, but may be modified in the future as the project evolves.
