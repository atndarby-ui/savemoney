import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, useColorScheme, View, TouchableOpacity, StyleSheet, Text, AppState, AppStateStatus, Image } from 'react-native';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs, StackNavigationOptions } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
import LockScreen from './src/screens/LockScreen';
import { SecurityService } from './src/services/SecurityService';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const PremiumTransition: StackNavigationOptions = {
  gestureDirection: 'horizontal',
  transitionSpec: {
    open: TransitionSpecs.TransitionIOSSpec,
    close: TransitionSpecs.TransitionIOSSpec,
  },
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.5, 1],
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    };
  },
};

// Custom Button Component for the middle tab
const CustomTabBarButton = ({ children, onPress, primaryColor }: any) => (
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
        width: 84,
        height: 84, // Slightly larger
        borderRadius: 42,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Image
        source={require('./assets/icons/3d/tab_add.png')}
        style={{ width: 84, height: 84 }}
        resizeMode="contain"
      />
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
  primaryColor,
  handleAddTransaction,
  handleUpdateTransaction,
  handleDeleteTransaction
}: any) => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme === 'dark' ? '#000000' : 'transparent', // Transparent to show gradient background in light mode
        borderTopColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'transparent',
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
      tabBarActiveTintColor: primaryColor,
      tabBarInactiveTintColor: theme === 'dark' ? '#D1D5DB' : '#6B7280',
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
      },
      tabBarBackground: () => theme === 'dark' ? null : (
        <LinearGradient
          colors={['#FFFFFF', '#F0F2F5', '#E2E8F0']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      ),
    }}
  >
    <Tab.Screen
      name="Calendar"
      options={{
        tabBarLabel: language === 'Tiếng Việt' ? 'Tổng quan' : 'Overview',
        tabBarIcon: ({ color, focused }) => (
          <Image
            source={require('./assets/icons/3d/tab_home.png')}
            style={{
              width: 28,
              height: 28,
              opacity: focused ? 1 : 0.8,
              transform: [{ scale: focused ? 1.25 : 1 }]
            }}
            resizeMode="contain"
          />
        ),
      }}
    >
      {({ navigation }) => (
        <CalendarScreen
          transactions={transactions}
          categories={categories}
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
        tabBarIcon: ({ color, focused }) => (
          <Image
            source={require('./assets/icons/3d/tab_stats.png')}
            style={{
              width: 28,
              height: 28,
              opacity: focused ? 1 : 0.8,
              transform: [{ scale: focused ? 1.25 : 1 }]
            }}
            resizeMode="contain"
          />
        ),
      }}
    >
      {({ navigation }) => (
        <StatisticsScreen
          transactions={transactions}
          categories={categories}
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
          <CustomTabBarButton {...props} primaryColor={primaryColor} />
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
        tabBarIcon: ({ color, focused }) => (
          <Image
            source={require('./assets/icons/3d/tab_plan.png')}
            style={{
              width: 28,
              height: 28,
              opacity: focused ? 1 : 0.8,
              transform: [{ scale: focused ? 1.25 : 1 }]
            }}
            resizeMode="contain"
          />
        ),
      }}
    >
      {({ navigation }) => (
        <AnalysisScreen
          transactions={transactions}
          language={language}
          navigation={navigation}
        />
      )}
    </Tab.Screen>

    <Tab.Screen
      name="Chat"
      options={{
        tabBarLabel: 'Mentor',
        tabBarIcon: ({ color, focused }) => (
          <Image
            source={require('./assets/icons/3d/tab_chat.png')}
            style={{
              width: 28,
              height: 28,
              opacity: focused ? 1 : 0.8,
              transform: [{ scale: focused ? 1.25 : 1 }]
            }}
            resizeMode="contain"
          />
        ),
      }}
    >
      {({ navigation, route }) => (
        <ChatScreen
          transactions={transactions}
          messages={chatMessages}
          setMessages={handleSetChatMessages}
          navigation={navigation}
          route={route}
          selectedPersonalityId={selectedPersonalityId}
          setSelectedPersonalityId={setSelectedPersonalityId}
          language={language}
          theme={theme}
        />
      )}
    </Tab.Screen>
  </Tab.Navigator>
);

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, setTheme, isDark, colors } = useTheme();
  const [language, setLanguage] = useState<'Tiếng Việt' | 'English'>('Tiếng Việt');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [selectedPersonalityId, setSelectedPersonalityId] = useState('super_accountant');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    checkSecurity();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    loadData();
    return () => {
      subscription.remove();
    };
  }, []);

  const checkSecurity = async () => {
    const enabled = await SecurityService.isEnabled();
    if (enabled) {
      setIsLocked(true);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Returned to app. If we were ignoring lock, valid session resumed.
      // Reset flag so next backgrounding locks properly.
      if (SecurityService.shouldIgnoreAppLock()) {
        SecurityService.setIgnoreAppLock(false);
      }
    }

    if (nextAppState === 'background') {
      if (SecurityService.shouldIgnoreAppLock()) {
        console.log('Ignoring app lock for this background transition');
        // Do NOT reset here. Reset when coming back to active.
        return;
      }
      const enabled = await SecurityService.isEnabled();
      if (enabled) {
        setIsLocked(true);
      }
    }
  };

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

  const handleSetChatMessages = (newMessagesOrUpdater: Message[] | ((prev: Message[]) => Message[])) => {
    let nextMessages: Message[] = [];
    if (typeof newMessagesOrUpdater === 'function') {
      nextMessages = newMessagesOrUpdater(chatMessages);
    } else {
      nextMessages = newMessagesOrUpdater;
    }

    if (nextMessages.length > chatMessages.length) {
      const addedMessages = nextMessages.slice(chatMessages.length);
      addedMessages.forEach(msg => Database.addChatMessage(msg));
    } else if (nextMessages.length === 0 && chatMessages.length > 0) {
      Database.clearChatHistory();
    }

    setChatMessages(nextMessages);
  };

  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            ...PremiumTransition
          }}
        >
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
                primaryColor={colors.primary}
                handleAddTransaction={handleAddTransaction}
                handleUpdateTransaction={handleUpdateTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name="SmartInput"
            component={SmartInputScreen}
            options={{
              presentation: 'transparentModal',
              cardStyle: { backgroundColor: 'transparent' },
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
            }}
          />
          <Stack.Screen
            name="AddTransaction"
            options={{
              presentation: 'transparentModal',
              cardStyle: { backgroundColor: 'transparent' },
              cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
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

