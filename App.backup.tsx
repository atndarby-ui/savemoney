import React, { useState, useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Transaction, Message } from './src/types';
import { INITIAL_TRANSACTIONS } from './src/constants';

// Import screens (sẽ tạo sau)
import CalendarScreen from './src/screens/CalendarScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'Tiếng Việt' | 'English'>('Tiếng Việt');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Load data from AsyncStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [savedTheme, savedLang, savedTx, savedChat] = await Promise.all([
        AsyncStorage.getItem('app_theme'),
        AsyncStorage.getItem('app_lang'),
        AsyncStorage.getItem('mintflow_transactions'),
        AsyncStorage.getItem('mintflow_chat_history'),
      ]);

      if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
      if (savedLang) setLanguage(savedLang as 'Tiếng Việt' | 'English');

      if (savedTx) {
        const parsed = JSON.parse(savedTx);
        setTransactions(parsed.map((tx: any) => ({ ...tx, date: new Date(tx.date) })));
      } else {
        setTransactions(INITIAL_TRANSACTIONS);
      }

      if (savedChat) {
        setChatMessages(JSON.parse(savedChat));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Save data to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem('app_theme', theme);
  }, [theme]);

  useEffect(() => {
    AsyncStorage.setItem('app_lang', language);
  }, [language]);

  useEffect(() => {
    AsyncStorage.setItem('mintflow_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    AsyncStorage.setItem('mintflow_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substr(2, 9),
    };
    setTransactions([tx, ...transactions]);
  };

  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderTopColor: theme === 'dark' ? '#374151' : '#E5E7EB',
            },
            tabBarActiveTintColor: theme === 'dark' ? '#10b981' : '#111827',
            tabBarInactiveTintColor: '#9CA3AF',
          }}
        >
          <Tab.Screen
            name="Calendar"
            options={{ tabBarLabel: language === 'Tiếng Việt' ? 'Tổng quan' : 'Overview' }}
          >
            {() => (
              <CalendarScreen
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                language={language}
                theme={theme}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Statistics"
            options={{ tabBarLabel: language === 'Tiếng Việt' ? 'Thống kê' : 'Stats' }}
          >
            {() => (
              <StatisticsScreen
                transactions={transactions}
                language={language}
                theme={theme}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Analysis"
            options={{ tabBarLabel: language === 'Tiếng Việt' ? 'AI Chat' : 'AI Chat' }}
          >
            {() => (
              <AnalysisScreen
                transactions={transactions}
                messages={chatMessages}
                setMessages={setChatMessages}
                language={language}
                theme={theme}
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Profile"
            options={{ tabBarLabel: language === 'Tiếng Việt' ? 'Hồ sơ' : 'Profile' }}
          >
            {() => (
              <ProfileScreen
                transactions={transactions}
                theme={theme}
                setTheme={setTheme}
                language={language}
                setLanguage={setLanguage}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
