// NovaStore.js — Global state management (React Context + useReducer)
// Provides shared state across ALL Nova screens
// Wrap your app: <NovaProvider><NovaNavigator /></NovaProvider>

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const initialState = {
  // User
  user: {
    name: 'John',
    monthlyIncome: 50000,
    dailyBudget: 500,
    riskTolerance: 'Aggressive', // Conservative | Moderate | Aggressive
    timezone: 'America/New_York',
  },

  // API Keys (loaded from AsyncStorage)
  keys: {
    gemini: null,
    alphaVantage: null,
    gmailClientId: null,
    gmailToken: null,
  },

  // App State
  onboarded: false,
  activeScreen: 'NovaChat',
  lastUpdated: null,

  // Notifications
  notifications: {
    budgetAlerts: true,
    tradingAlerts: true,
    goalReminders: true,
    dailyCheckin: true,
    impulseTimer: true,
  },

  // Shared data (cross-screen)
  watchlist: ['AAPL', 'NVDA', 'TSLA', 'SPY', 'QQQ', 'MSFT', 'META'],
  recentSearches: [],
  totalPortfolioValue: 0,
  totalBudgetSpent: 0,
  unreadEmailCount: 0,
  groceryItemCount: 0,
  pendingTaskCount: 0,
  activeSavingsGoals: 0,
};

// ─── ACTION TYPES ─────────────────────────────────────────────────────────────
export const ACTIONS = {
  SET_USER:                'SET_USER',
  SET_KEYS:                'SET_KEYS',
  SET_GMAIL_TOKEN:         'SET_GMAIL_TOKEN',
  SET_ONBOARDED:           'SET_ONBOARDED',
  SET_ACTIVE_SCREEN:       'SET_ACTIVE_SCREEN',
  UPDATE_NOTIFICATIONS:    'UPDATE_NOTIFICATIONS',
  SET_WATCHLIST:           'SET_WATCHLIST',
  ADD_TO_WATCHLIST:        'ADD_TO_WATCHLIST',
  REMOVE_FROM_WATCHLIST:   'REMOVE_FROM_WATCHLIST',
  ADD_RECENT_SEARCH:       'ADD_RECENT_SEARCH',
  UPDATE_PORTFOLIO_VALUE:  'UPDATE_PORTFOLIO_VALUE',
  UPDATE_BUDGET_SPENT:     'UPDATE_BUDGET_SPENT',
  UPDATE_UNREAD_EMAIL:     'UPDATE_UNREAD_EMAIL',
  UPDATE_GROCERY_COUNT:    'UPDATE_GROCERY_COUNT',
  UPDATE_TASK_COUNT:       'UPDATE_TASK_COUNT',
  UPDATE_SAVINGS_GOALS:    'UPDATE_SAVINGS_GOALS',
  HYDRATE:                 'HYDRATE',
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
function novaReducer(state, action) {
  switch (action.type) {
    case ACTIONS.HYDRATE:
      return { ...state, ...action.payload };
    case ACTIONS.SET_USER:
      return { ...state, user: { ...state.user, ...action.payload } };
    case ACTIONS.SET_KEYS:
      return { ...state, keys: { ...state.keys, ...action.payload } };
    case ACTIONS.SET_GMAIL_TOKEN:
      return { ...state, keys: { ...state.keys, gmailToken: action.payload } };
    case ACTIONS.SET_ONBOARDED:
      return { ...state, onboarded: action.payload };
    case ACTIONS.SET_ACTIVE_SCREEN:
      return { ...state, activeScreen: action.payload };
    case ACTIONS.UPDATE_NOTIFICATIONS:
      return { ...state, notifications: { ...state.notifications, ...action.payload } };
    case ACTIONS.SET_WATCHLIST:
      return { ...state, watchlist: action.payload };
    case ACTIONS.ADD_TO_WATCHLIST:
      if (state.watchlist.includes(action.payload)) return state;
      return { ...state, watchlist: [...state.watchlist, action.payload] };
    case ACTIONS.REMOVE_FROM_WATCHLIST:
      return { ...state, watchlist: state.watchlist.filter(s => s !== action.payload) };
    case ACTIONS.ADD_RECENT_SEARCH:
      const searches = [action.payload, ...state.recentSearches.filter(s => s !== action.payload)].slice(0, 10);
      return { ...state, recentSearches: searches };
    case ACTIONS.UPDATE_PORTFOLIO_VALUE:
      return { ...state, totalPortfolioValue: action.payload };
    case ACTIONS.UPDATE_BUDGET_SPENT:
      return { ...state, totalBudgetSpent: action.payload };
    case ACTIONS.UPDATE_UNREAD_EMAIL:
      return { ...state, unreadEmailCount: action.payload };
    case ACTIONS.UPDATE_GROCERY_COUNT:
      return { ...state, groceryItemCount: action.payload };
    case ACTIONS.UPDATE_TASK_COUNT:
      return { ...state, pendingTaskCount: action.payload };
    case ACTIONS.UPDATE_SAVINGS_GOALS:
      return { ...state, activeSavingsGoals: action.payload };
    default:
      return state;
  }
}

// ─── CONTEXT ──────────────────────────────────────────────────────────────────
const NovaContext = createContext(null);

export function NovaProvider({ children }) {
  const [state, dispatch] = useReducer(novaReducer, initialState);

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const keys = {
          gemini:       await AsyncStorage.getItem('NOVA_GEMINI_KEY'),
          alphaVantage: await AsyncStorage.getItem('NOVA_ALPHAVANTAGE_KEY'),
          gmailClientId:await AsyncStorage.getItem('NOVA_GMAIL_CLIENT_ID'),
        };
        const onboarded = (await AsyncStorage.getItem('NOVA_ONBOARDED')) === 'true';
        const savedUser = await AsyncStorage.getItem('NOVA_USER');
        const savedWatchlist = await AsyncStorage.getItem('NOVA_WATCHLIST');
        const savedNotifs = await AsyncStorage.getItem('NOVA_NOTIFICATIONS');

        dispatch({
          type: ACTIONS.HYDRATE,
          payload: {
            keys,
            onboarded,
            user: savedUser ? { ...initialState.user, ...JSON.parse(savedUser) } : initialState.user,
            watchlist: savedWatchlist ? JSON.parse(savedWatchlist) : initialState.watchlist,
            notifications: savedNotifs ? JSON.parse(savedNotifs) : initialState.notifications,
          }
        });
      } catch (e) {
        console.warn('Nova hydration error:', e);
      }
    })();
  }, []);

  // Persist watchlist changes
  useEffect(() => {
    AsyncStorage.setItem('NOVA_WATCHLIST', JSON.stringify(state.watchlist));
  }, [state.watchlist]);

  // Persist notification prefs
  useEffect(() => {
    AsyncStorage.setItem('NOVA_NOTIFICATIONS', JSON.stringify(state.notifications));
  }, [state.notifications]);

  // Persist user prefs
  useEffect(() => {
    AsyncStorage.setItem('NOVA_USER', JSON.stringify(state.user));
  }, [state.user]);

  return (
    <NovaContext.Provider value={{ state, dispatch }}>
      {children}
    </NovaContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useNova() {
  const ctx = useContext(NovaContext);
  if (!ctx) throw new Error('useNova must be used inside <NovaProvider>');
  return ctx;
}

// ─── SELECTOR HOOKS (convenience) ─────────────────────────────────────────────
export function useNovaKeys()          { return useNova().state.keys; }
export function useNovaUser()          { return useNova().state.user; }
export function useNovaWatchlist()     { return useNova().state.watchlist; }
export function useNovaNotifications() { return useNova().state.notifications; }

// ─── ACTION HELPERS ───────────────────────────────────────────────────────────
export function useNovaActions() {
  const { dispatch } = useNova();
  return {
    setUser:              (data) => dispatch({ type: ACTIONS.SET_USER, payload: data }),
    setKeys:              (data) => dispatch({ type: ACTIONS.SET_KEYS, payload: data }),
    setGmailToken:        (token) => dispatch({ type: ACTIONS.SET_GMAIL_TOKEN, payload: token }),
    setOnboarded:         (val) => dispatch({ type: ACTIONS.SET_ONBOARDED, payload: val }),
    setActiveScreen:      (screen) => dispatch({ type: ACTIONS.SET_ACTIVE_SCREEN, payload: screen }),
    updateNotifications:  (prefs) => dispatch({ type: ACTIONS.UPDATE_NOTIFICATIONS, payload: prefs }),
    addToWatchlist:       (sym) => dispatch({ type: ACTIONS.ADD_TO_WATCHLIST, payload: sym }),
    removeFromWatchlist:  (sym) => dispatch({ type: ACTIONS.REMOVE_FROM_WATCHLIST, payload: sym }),
    setWatchlist:         (list) => dispatch({ type: ACTIONS.SET_WATCHLIST, payload: list }),
    addRecentSearch:      (q) => dispatch({ type: ACTIONS.ADD_RECENT_SEARCH, payload: q }),
    updatePortfolioValue: (v) => dispatch({ type: ACTIONS.UPDATE_PORTFOLIO_VALUE, payload: v }),
    updateBudgetSpent:    (v) => dispatch({ type: ACTIONS.UPDATE_BUDGET_SPENT, payload: v }),
    updateUnreadEmail:    (v) => dispatch({ type: ACTIONS.UPDATE_UNREAD_EMAIL, payload: v }),
    updateGroceryCount:   (v) => dispatch({ type: ACTIONS.UPDATE_GROCERY_COUNT, payload: v }),
    updateTaskCount:      (v) => dispatch({ type: ACTIONS.UPDATE_TASK_COUNT, payload: v }),
    updateSavingsGoals:   (v) => dispatch({ type: ACTIONS.UPDATE_SAVINGS_GOALS, payload: v }),
  };
}
