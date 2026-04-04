// Nova Navigator — React Native
// Full Pocket Pro Solutions navigator — 9 screens
// Install deps:
//   npm install @react-navigation/native @react-navigation/bottom-tabs
//   npm install react-native-screens react-native-safe-area-context
//   npm install @react-native-async-storage/async-storage
//   npx expo install expo-notifications expo-device expo-auth-session expo-web-browser

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import NovaChat           from './NovaChat';
import NovaTradingAlerts  from './NovaTradingAlerts';
import NovaPortfolio      from './NovaPortfolio';
import NovaTaskManager    from './NovaTaskManager';
import NovaBudget         from './NovaBudget';
import NovaSavings        from './NovaSavings';
import NovaGrocery        from './NovaGrocery';
import NovaGmail          from './NovaGmail';
import NovaNewsFeed       from './NovaNewsFeed';

import {
  requestNotificationPermissions,
  scheduleDailyCheckIn,
  setupNotificationResponseHandler,
} from './NovaPushNotifications';

const Tab = createBottomTabNavigator();

// Tab groups — keeps nav clean with 9 screens
// Money group: Trading, Portfolio, Budget, Savings
// Life group: Tasks, Grocery, Gmail, News

export default function NovaNavigator() {
  useEffect(() => {
    (async () => {
      const token = await requestNotificationPermissions();
      if (token) {
        await scheduleDailyCheckIn(8, 0);
      }
    })();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0a0a1a',
            borderTopColor: '#1a1a2e',
            borderTopWidth: 1,
            height: 72,
            paddingBottom: 10,
            paddingTop: 4,
          },
          tabBarActiveTintColor: '#6c63ff',
          tabBarInactiveTintColor: '#444',
          tabBarLabelStyle: { fontSize: 9, marginTop: 2 },
        }}
      >
        <Tab.Screen
          name="Nova AI"
          component={NovaChat}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚡</Text> }}
        />
        <Tab.Screen
          name="News"
          component={NovaNewsFeed}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📰</Text> }}
        />
        <Tab.Screen
          name="Trading"
          component={NovaTradingAlerts}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📈</Text> }}
        />
        <Tab.Screen
          name="Portfolio"
          component={NovaPortfolio}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }}
        />
        <Tab.Screen
          name="Budget"
          component={NovaBudget}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text> }}
        />
        <Tab.Screen
          name="Savings"
          component={NovaSavings}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏦</Text> }}
        />
        <Tab.Screen
          name="Tasks"
          component={NovaTaskManager}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text> }}
        />
        <Tab.Screen
          name="Grocery"
          component={NovaGrocery}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text> }}
        />
        <Tab.Screen
          name="Gmail"
          component={NovaGmail}
          options={{ tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📧</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
