import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, useColorScheme, View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Transaction, Message, Category } from './src/types';
import { INITIAL_TRANSACTIONS, CATEGORIES } from './src/constants';
import { Database } from './src/services/Database';

import CalendarScreen from './src/screens/CalendarScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import AnalysisScreen from './src/screens/AnalysisScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SmartInputScreen from './src/screens/SmartInputScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom Button Component for the middle tab
const CustomTabBarButton = ({ children, onPress }: any) => (
  <TouchableOpacity
    style={{
      top: -24, // Lifted up
      justifyContent: 'center',
      alignItems: 'center',
      ...styles.shadow,
    }}
    onPress={onPress}
  >
    <View
      style={{
        width: 64,
        height: 64, // Slightly larger
        borderRadius: 32,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Ionicons name="add" size={38} color="#FFF" />
    </View>
  </TouchableOpacity>
);

const TabNavigator = ({
  isDark,
  language,
  transactions,
  categories,
  chatMessages,
  handleSetChatMessages,
  selectedPersonalityId,
  setSelectedPersonalityId,
  theme,
  handleAddTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction
}: any) => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderTopColor: isDark ? '#374151' : '#F3F4F6',
        height: 80,
        paddingBottom: 20,
        paddingTop: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 0,
        borderTopWidth: 1,
      },
      tabBarActiveTintColor: '#10b981',
      tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#9CA3AF',
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
      }
    }}
  >
    <Tab.Screen
      name="Calendar"
      options={{
        tabBarLabel: language === 'Tiếng Việt' ? 'Tổng quan' : 'Overview',
        tabBarIcon: ({ color }) => (
          <Ionicons name="home-outline" color={color} size={24} />
        ),
      }}
    >
      {({ navigation }) => (
        <CalendarScreen
          transactions={transactions}
          categories={categories}
          onAddTransaction={handleAddTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          navigation={navigation}
          language={language}
          theme={theme}
        />
      )}
    </Tab.Screen>

    <Tab.Screen
      name="Statistics"
      options={{
        tabBarLabel: language === 'Tiếng Việt' ? 'Thống kê' : 'Stats',
        tabBarIcon: ({ color }) => (
          <Ionicons name="stats-chart-outline" color={color} size={24} />
        ),
      }}
    >
      {({ navigation }) => (
        <StatisticsScreen
          transactions={transactions}
          categories={categories}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          navigation={navigation}
          language={language}
          theme={theme}
        />
      )}
    </Tab.Screen>

    <Tab.Screen
      name="Add"
      component={View}
      options={{
        tabBarButton: (props) => (
          <CustomTabBarButton {...props} />
        ),
        tabBarLabel: () => null
      }}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.navigate('AddTransaction');
        },
      })}
    />

    <Tab.Screen
      name="Analysis"
      options={{
        tabBarLabel: language === 'Tiếng Việt' ? 'Kế hoạch' : 'Planner',
        tabBarIcon: ({ color }) => (
          <Ionicons name="bulb-outline" color={color} size={24} />
        ),
      }}
    >
      {({ navigation }) => (
        <AnalysisScreen
          transactions={transactions}
          language={language}
          theme={theme}
          navigation={navigation}
        />
      )}
    </Tab.Screen>

    <Tab.Screen
      name="AIChat"
      options={{
        tabBarLabel: language === 'Tiếng Việt' ? 'Mentor' : 'AI Chat',
        tabBarIcon: ({ color }) => (
          <Ionicons name="chatbubbles-outline" color={color} size={24} />
        ),
      }}
    >
      {({ navigation, route }) => (
        <ChatScreen
          transactions={transactions}
          messages={chatMessages}
          setMessages={handleSetChatMessages}
          selectedPersonalityId={selectedPersonalityId}
          setSelectedPersonalityId={setSelectedPersonalityId}
          language={language}
          theme={theme}
          navigation={navigation}
          route={route}
        />
      )}
    </Tab.Screen>
  </Tab.Navigator>
);

export default function App() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'Tiếng Việt' | 'English'>('Tiếng Việt');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [selectedPersonalityId, setSelectedPersonalityId] = useState('super_accountant');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Database.init();

      const [savedTheme, savedLang, savedPersonality] = await Promise.all([
        Database.getMetadata('app_theme'),
        Database.getMetadata('app_lang'),
        Database.getMetadata('app_personality'),
      ]);

      if (savedTheme) setTheme(savedTheme as 'light' | 'dark');
      if (savedLang) setLanguage(savedLang as 'Tiếng Việt' | 'English');
      if (savedPersonality) setSelectedPersonalityId(savedPersonality);

      const loadedTransactions = await Database.getTransactions();
      setTransactions(loadedTransactions);

      const loadedCategories = await Database.getCategories();
      // Only set if we have categories, otherwise initialization in DB should have handled it or we use default state
      if (loadedCategories.length > 0) {
        setCategories(loadedCategories);
      }

      const loadedChat = await Database.getChatHistory();
      setChatMessages(loadedChat);

      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoaded(true);
    }
  };

  // Sync Theme/Lang to DB
  useEffect(() => {
    if (isLoaded) {
      Database.setMetadata('app_theme', theme);
    }
  }, [theme, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      Database.setMetadata('app_lang', language);
    }
  }, [language, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      Database.setMetadata('app_personality', selectedPersonalityId);
    }
  }, [selectedPersonalityId, isLoaded]);

  // DB Sync Wrappers
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substr(2, 9),
    };
    await Database.addTransaction(tx);
    setTransactions(prevTransactions => [tx, ...prevTransactions]);
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    await Database.updateTransaction(updatedTx);
    setTransactions(transactions.map(tx => tx.id === updatedTx.id ? updatedTx : tx));
  };

  const handleDeleteTransaction = async (id: string) => {
    await Database.deleteTransaction(id);
    setTransactions(transactions.filter(tx => tx.id !== id));
  };

  const handleAddCategory = async (newCat: Category) => {
    await Database.addCategory(newCat);
    setCategories([...categories, newCat]);
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    await Database.updateCategory(updatedCat);
    setCategories(categories.map(cat => cat.id === updatedCat.id ? updatedCat : cat));
  };

  const handleDeleteCategory = async (id: string) => {
    await Database.deleteCategory(id);
    setCategories(categories.filter(cat => cat.id !== id));
  };

  // Chat message wrapper to sync append-only updates
  const handleSetChatMessages = (newMessagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
    // We need to calculate the next state to determine what to save
    let nextMessages: Message[] = [];

    // Check if it's a function or value
    if (typeof newMessagesOrUpdater === 'function') {
      nextMessages = newMessagesOrUpdater(chatMessages);
    } else {
      nextMessages = newMessagesOrUpdater;
    }

    // Detect added messages
    if (nextMessages.length > chatMessages.length) {
      const addedMessages = nextMessages.slice(chatMessages.length);
      addedMessages.forEach(msg => Database.addChatMessage(msg));
    } else if (nextMessages.length === 0 && chatMessages.length > 0) {
      // Handle clear history if applicable
      Database.clearChatHistory();
    }

    setChatMessages(nextMessages);
  };

  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;
  const isDark = theme === 'dark';

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs">
            {(props) => (
              <TabNavigator
                {...props}
                isDark={isDark}
                language={language}
                transactions={transactions}
                categories={categories}
                chatMessages={chatMessages}
                handleSetChatMessages={handleSetChatMessages}
                selectedPersonalityId={selectedPersonalityId}
                setSelectedPersonalityId={setSelectedPersonalityId}
                theme={theme}
                handleAddTransaction={handleAddTransaction}
                handleUpdateTransaction={handleUpdateTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SmartInput"
            component={SmartInputScreen}
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AddTransaction"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          >
            {(props) => (
              <AddTransactionScreen
                {...props}
                categories={categories}
                onAddCategory={handleAddCategory}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {() => (
              <ProfileScreen
                transactions={transactions}
                theme={theme}
                setTheme={setTheme}
                language={language}
                setLanguage={setLanguage}
                categories={categories}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onRestore={loadData}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
});
