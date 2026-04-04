// Nova Push Notifications — React Native
// Handles all local + remote push notifications for Pocket Pro Solutions
// Uses expo-notifications (Expo) or @notifee/react-native (bare RN)
// This file uses Expo — swap notifee calls if using bare React Native

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── REQUEST PERMISSIONS ──────────────────────────────────────────────────────
export async function requestNotificationPermissions() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Nova: Push notification permission denied.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nova-alerts', {
      name: 'Nova Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6c63ff',
    });
    await Notifications.setNotificationChannelAsync('nova-budget', {
      name: 'Nova Budget',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#ff5252',
    });
    await Notifications.setNotificationChannelAsync('nova-trading', {
      name: 'Nova Trading',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#69f0ae',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Nova push token:', token);
  return token;
}

// ─── SEND LOCAL NOTIFICATION ──────────────────────────────────────────────────
export async function sendLocalNotification({ title, body, data = {}, channel = 'nova-alerts', delay = 0 }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: delay > 0 ? { seconds: delay } : null,
    ...(Platform.OS === 'android' && { channelId: channel }),
  });
}

// ─── BUDGET ALERT ─────────────────────────────────────────────────────────────
export async function sendBudgetAlert(category, spent, budget) {
  const pct = ((spent / budget) * 100).toFixed(0);
  await sendLocalNotification({
    title: `⚠️ Budget Alert — ${category}`,
    body: `You've used ${pct}% of your ${category} budget ($${spent.toFixed(0)} of $${budget}).`,
    channel: 'nova-budget',
    data: { type: 'budget', category },
  });
}

export async function sendBudgetExceededAlert(category, spent, budget) {
  await sendLocalNotification({
    title: `🚨 Over Budget — ${category}!`,
    body: `You're $${(spent - budget).toFixed(0)} over your ${category} limit. Nova says: stop spending here.`,
    channel: 'nova-budget',
    data: { type: 'budget_exceeded', category },
  });
}

// ─── TRADING ALERT ────────────────────────────────────────────────────────────
export async function sendTradingAlert(symbol, price, targetPrice, condition) {
  await sendLocalNotification({
    title: `📈 ${symbol} Price Alert`,
    body: `${symbol} is now $${price} — ${condition === 'above' ? 'above' : 'below'} your $${targetPrice} target.`,
    channel: 'nova-trading',
    data: { type: 'trading', symbol, price },
  });
}

// ─── SAVINGS GOAL REMINDER ────────────────────────────────────────────────────
export async function sendGoalDeadlineAlert(goalName, daysLeft, remaining) {
  await sendLocalNotification({
    title: `🎯 Goal Deadline Coming — ${goalName}`,
    body: `${daysLeft} days left. You still need $${remaining.toLocaleString()} to hit your goal.`,
    channel: 'nova-alerts',
    data: { type: 'goal', goalName },
  });
}

export async function sendGoalAchievedAlert(goalName) {
  await sendLocalNotification({
    title: `🎉 Goal Achieved!`,
    body: `You hit your "${goalName}" savings goal! Nova is proud of you.`,
    channel: 'nova-alerts',
    data: { type: 'goal_complete', goalName },
  });
}

// ─── IMPULSE BUY COOLING TIMER ───────────────────────────────────────────────
export async function scheduleImpulseCooldown(itemName, amount) {
  // Fires after 10 minutes — user can decide if they still want it
  await sendLocalNotification({
    title: `🛑 10-Min Impulse Check — $${amount}`,
    body: `Still want to buy "${itemName}"? If yes, now you can decide with a clear head.`,
    channel: 'nova-budget',
    delay: 600, // 10 minutes
    data: { type: 'impulse_check', itemName, amount },
  });
}

// ─── DAILY FINANCIAL CHECK-IN ─────────────────────────────────────────────────
export async function scheduleDailyCheckIn(hour = 8, minute = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚡ Nova Daily Check-In',
      body: 'Log your spending before the day gets away from you.',
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
    ...(Platform.OS === 'android' && { channelId: 'nova-budget' }),
  });
}

// ─── GROCERY LIST REMINDER ───────────────────────────────────────────────────
export async function sendGroceryReminder(itemCount) {
  await sendLocalNotification({
    title: `🛒 Nova Grocery List`,
    body: `You have ${itemCount} item${itemCount !== 1 ? 's' : ''} on your list. Don't forget to check it before you shop.`,
    channel: 'nova-alerts',
    data: { type: 'grocery' },
  });
}

// ─── GMAIL DIGEST ─────────────────────────────────────────────────────────────
export async function sendGmailDigestNotification(unread, actionRequired) {
  await sendLocalNotification({
    title: `📧 Nova Gmail Digest`,
    body: `${unread} unread emails. ${actionRequired} need your attention.`,
    channel: 'nova-alerts',
    data: { type: 'gmail' },
  });
}

// ─── NOTIFICATION RESPONSE HANDLER ──────────────────────────────────────────
export function setupNotificationResponseHandler(navigation) {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const { type } = response.notification.request.content.data;
    if (!navigation) return;
    switch (type) {
      case 'budget':
      case 'budget_exceeded': navigation.navigate('Budget'); break;
      case 'trading':         navigation.navigate('Trading'); break;
      case 'goal':
      case 'goal_complete':   navigation.navigate('Savings'); break;
      case 'grocery':         navigation.navigate('Grocery'); break;
      case 'gmail':           navigation.navigate('Gmail'); break;
      default: break;
    }
  });
}
