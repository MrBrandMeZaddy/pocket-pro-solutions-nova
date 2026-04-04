# Nova — Pocket Pro Solutions
## Complete React Native Suite · 11 Files · Copy & Paste Ready

---

## COMPLETE FILE LIST

| File | Screen | Tab Icon | Purpose |
|---|---|---|---|
| `NovaOnboarding.jsx` | 🚀 Setup Wizard | (first launch only) | Guides users through every API key step by step |
| `NovaChat.jsx` | ⚡ Nova AI | ⚡ | Gemini 1.5 Pro chat with conversation history |
| `NovaNewsFeed.jsx` | 📰 News | 📰 | AI news feed with per-article analysis + daily briefing |
| `NovaTradingAlerts.jsx` | 📈 Trading | 📈 | Live quotes, watchlist, price alerts |
| `NovaPortfolio.jsx` | 📊 Portfolio | 📊 | P&L tracker, allocation, AI analysis |
| `NovaBudget.jsx` | 💰 Budget | 💰 | Behavioral finance + impulse buy blocker |
| `NovaSavings.jsx` | 🏦 Savings | 🏦 | Goals + recurring expense manager |
| `NovaTaskManager.jsx` | ✅ Tasks | ✅ | AI-powered task manager |
| `NovaGrocery.jsx` | 🛒 Grocery | 🛒 | Smart list, meal planning, budget optimizer |
| `NovaGmail.jsx` | 📧 Gmail | 📧 | Inbox cleaner + AI summaries |
| `NovaPushNotifications.js` | — (utility) | — | All push notifications wired to every feature |
| `NovaNavigator.jsx` | — (root) | — | Bottom tab nav wiring all 9 screens |

---

## INSTALL (run once)

```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npx expo install expo-notifications expo-device expo-auth-session expo-web-browser
```

---

## APP.JS — PASTE THIS EXACTLY

```js
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NovaOnboarding from './nova_integration/NovaOnboarding';
import NovaNavigator  from './nova_integration/NovaNavigator';

export default function App() {
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('NOVA_ONBOARDED').then(val => {
      setOnboarded(val === 'true');
    });
  }, []);

  if (onboarded === null) return null;

  if (!onboarded) {
    return (
      <NovaOnboarding
        onComplete={async () => {
          await AsyncStorage.setItem('NOVA_ONBOARDED', 'true');
          setOnboarded(true);
        }}
      />
    );
  }

  return <NovaNavigator />;
}
```

---

## API KEYS NEEDED

| Key | Used In | Get It Free At |
|---|---|---|
| Google AI Studio | Chat, Budget, Tasks, Grocery, Gmail, News, Portfolio | aistudio.google.com |
| Alpha Vantage | Trading, Portfolio, News Feed | alphavantage.co |
| Gmail OAuth | Gmail screen | console.cloud.google.com |

> The **NovaOnboarding** screen walks users through all 3 automatically on first launch.

---

## FEATURE BREAKDOWN

### ⚡ NovaChat
- Gemini 1.5 Pro, full conversation history
- Configured for John: trader, developer, author, social worker
- Auto-scroll, multiline input, dark theme

### 📰 NovaNewsFeed
- **News Feed tab** — 7 topic filters: All, Markets, Trading, Tech, Economy, Crypto, Earnings
- Filter by ticker (e.g. AAPL, TSLA)
- Tap any article → Nova AI gives 3-bullet summary + market impact score + trade idea
- Sentiment badges (Bullish → Bearish) on every article
- **Daily Digest tab** — one tap generates a full morning briefing: top 3 stories, market sentiment, 3 trade takeaways, red flags — written for a daytrader

### 📈 NovaTradingAlerts
- Real-time quotes (Alpha Vantage, refreshes every 60s)
- Watchlist add/remove, H/L/Volume
- Custom price alerts (above/below) with native alert popups

### 📊 NovaPortfolio
- **Positions tab** — add by symbol + shares + avg cost, pull-to-refresh live prices
- **Performance tab** — allocation bars, top/worst performers, cost vs market value
- **AI tab** — Full Analysis (score + action), Risk Analysis (hedges), Trim or Add? (specific % recommendations)
- Long press to remove a position

### 💰 NovaBudget
- 🛑 Impulse Buy Intervention — full-screen STOP modal before confirming impulse purchases
- Mood + trigger tagging on every transaction
- AI modes: Full score, Impulse Fix protocol, 5-year wealth forecast
- Category budget bars, over-budget banners

### 🏦 NovaSavings
- Goal tracker with icon, color, deadline, progress bars
- 🎉 celebration on completion
- Recurring expenses (Daily/Weekly/Monthly/Yearly) → auto monthly equivalent
- Subscription audit warning over $200/mo

### ✅ NovaTaskManager
- Priority + category per task
- "Expand with Nova AI" — generates subtasks from title
- Category filter, mark complete

### 🛒 NovaGrocery
- Checklist with category, store, price
- Budget bar (turns red when over)
- By Store tab — groups items with subtotals per store
- AI: Smart Suggestions, 7-Day Meal Plan, Budget Optimizer, Health Score

### 📧 NovaGmail
- Tabs: Inbox, Unread, Promotions, Newsletters, Starred
- Tap → AI summary (bullets + action required + safe to delete?)
- Long press → bulk select → mark read / archive / delete
- "Analyze Inbox" — Nova tells you what to respond to, delete, unsubscribe

### 🔔 NovaPushNotifications
- Budget alerts at 80% + exceeded
- Price alert hits
- Goal deadline warnings + completion
- 10-min impulse buy cooling timer
- Daily 8am financial check-in
- Deep links to correct screen on tap

### 🚀 NovaOnboarding
- 5-step wizard (Welcome → Gemini → Alpha Vantage → Gmail → Done)
- Time estimates per step, direct links to each website
- Key validation before saving, secure storage via AsyncStorage
- Skip any step — come back later from Settings
- Never shows again after completion

---

## ADDING MORE FEATURES

1. Ask Nova in the chat: *"Build me a [feature] for React Native"*
2. Paste the file into `nova_integration/`
3. Import in `NovaNavigator.jsx` + add `<Tab.Screen>`

### Next Suggested Features
- 🌍 Travel expense tracker + currency converter
- 📚 Author dashboard (book sales, writing goals, deadlines)
- 🤝 Social work case tracker (clients, notes, follow-ups)
- 🔒 Biometric lock (Face ID / fingerprint)
- 📱 Widget support (home screen trading ticker)
- 💬 WhatsApp/SMS alerts via Twilio
