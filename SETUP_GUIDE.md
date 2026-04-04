# Nova Setup Guide
## Get Every Feature Working — Step by Step

---

## 🔑 API Keys You Need (All Free)

| Feature | Key Needed | Time to Get |
|---|---|---|
| AI Chat, Budget AI, Grocery AI, Gmail AI | Google AI Studio | 2 minutes |
| Stock quotes & trading alerts | Alpha Vantage | 1 minute |
| Gmail inbox cleaner | Gmail OAuth Token | 5 minutes |

---

## 1️⃣ Google AI Studio Key
### Powers: Nova AI Chat · Budget Analyzer · Grocery AI · Gmail Summaries

**Steps:**
1. Go to **aistudio.google.com**
2. Sign in with your Google account
3. Click **"Get API Key"** in the top left
4. Click **"Create API Key"**
5. Copy the key — it looks like: `AIzaSyXXXXXXXXXXXXXXXXXXX`

**Paste it in these files** (replace `YOUR_GOOGLE_AI_STUDIO_API_KEY`):
- `NovaChat.jsx` — line 8
- `NovaTaskManager.jsx` — line 9
- `NovaBudget.jsx` — line 10
- `NovaGrocery.jsx` — line 9
- `NovaGmail.jsx` — line 9

**Example:**
```js
// BEFORE:
const GOOGLE_AI_STUDIO_API_KEY = 'YOUR_GOOGLE_AI_STUDIO_API_KEY';

// AFTER:
const GOOGLE_AI_STUDIO_API_KEY = 'AIzaSyAbcdef1234567890';
```

---

## 2️⃣ Alpha Vantage Key
### Powers: Live Stock Quotes · Trading Alerts · Watchlist

**Steps:**
1. Go to **alphavantage.co**
2. Click **"Get Free API Key"**
3. Fill in your name and email — no credit card needed
4. Copy the key — it looks like: `ABCDEF1234567890`

**Paste it in:**
- `NovaTradingAlerts.jsx` — line 10

**Example:**
```js
// BEFORE:
const ALPHA_VANTAGE_KEY = 'YOUR_ALPHA_VANTAGE_KEY';

// AFTER:
const ALPHA_VANTAGE_KEY = 'ABCDEF1234567890';
```

> ⚠️ Free tier = 25 requests/day. For more, upgrade at alphavantage.co ($50/mo).

---

## 3️⃣ Gmail OAuth Token
### Powers: Read Inbox · AI Email Summaries · Bulk Delete · Archive

This one has a few more steps but you only do it once.

---

### Part A — Create Your Gmail App (Google Cloud)

1. Go to **console.cloud.google.com**
2. Sign in with the Google account whose Gmail you want to connect
3. At the top, click **"Select a project"** → then **"New Project"**
4. Name it anything (e.g. `Nova App`) → click **"Create"**
5. In the search bar at the top, type **"Gmail API"** and click it
6. Click the blue **"Enable"** button

---

### Part B — Create Your Credentials

1. In the left menu click **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → choose **"OAuth 2.0 Client ID"**
3. If asked to configure consent screen:
   - Click **"Configure Consent Screen"**
   - Choose **"External"** → click **"Create"**
   - Fill in App Name (e.g. `Nova`) and your email → click **"Save and Continue"** through all steps
4. Back on Credentials — click **"+ Create Credentials"** → **"OAuth 2.0 Client ID"** again
5. For Application Type choose **"iOS"** (for iPhone) or **"Android"** (for Android)
6. Fill in your app's bundle ID (found in your `app.json` as `"bundleIdentifier"`)
7. Click **"Create"** → copy your **Client ID** — looks like: `1234567890-abc.apps.googleusercontent.com`

---

### Part C — Add to Your App (Expo)

1. Install the auth library — run this in your project folder:
```
npx expo install expo-auth-session expo-web-browser
```

2. Open your `App.js` and add this code **once** at the top level:

```js
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { setGmailToken } from './nova_integration/NovaGmail';

WebBrowser.maybeCompleteAuthSession();

// Add inside your App component:
const [request, response, promptAsync] = Google.useAuthRequest({
  iosClientId: 'YOUR_IOS_CLIENT_ID',       // paste from Part B
  androidClientId: 'YOUR_ANDROID_CLIENT_ID', // paste from Part B
  scopes: ['https://www.googleapis.com/auth/gmail.modify'],
});

useEffect(() => {
  if (response?.type === 'success') {
    const { access_token } = response.params;
    setGmailToken(access_token); // this activates Gmail in the app
  }
}, [response]);
```

3. Add a **"Connect Gmail"** button somewhere in your app (or it auto-shows in the Gmail screen):
```js
<Button title="Connect Gmail" onPress={() => promptAsync()} />
```

4. When users tap it, a Google sign-in popup appears. They sign in → Gmail is connected. Done.

---

### ✅ Quick Test Checklist

Once everything is set up, test each feature:

| Feature | How to Test |
|---|---|
| Nova AI Chat | Open chat tab → type "hello" → should respond |
| Trading | Open Trading tab → tap "Load" → prices should appear |
| Budget AI | Open Budget → tap "Full Analysis" → AI insight should generate |
| Grocery AI | Open Grocery → AI tab → tap "Smart Suggestions" |
| Gmail | Open Gmail tab → tap "Connect Gmail" → sign in → tap "Load" |
| Push Notifications | Log an impulse buy in Budget → should get a popup + notification |

---

### 🆘 Common Errors & Fixes

| Error | Fix |
|---|---|
| "API key not valid" | Double-check you copied the full key with no spaces |
| "Gmail API error: 401" | Your OAuth token expired — re-authenticate by tapping Connect Gmail again |
| "Gmail API error: 403" | Gmail API not enabled — go back to Google Cloud and enable it |
| Stock quotes show "Loading..." forever | Alpha Vantage free tier hit daily limit (25 requests) — wait until tomorrow |
| Notifications not showing on iPhone | Go to Settings → Notifications → your app → turn on Allow Notifications |
| Notifications not showing on Android | Go to Settings → Apps → your app → Notifications → enable all |

---

### 💬 Need Help?

Ask Nova directly in the chat tab — just describe the error and Nova will walk you through it.
