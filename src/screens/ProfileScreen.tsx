import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Image,
    Switch,
    Alert,
    ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category } from '../types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, User } from 'firebase/auth';
import { SyncService } from '../services/SyncService';
import { NotificationService } from '../services/NotificationService';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { WebView } from 'react-native-webview';
import { useTheme, ACCENT_COLORS, AccentColorKey } from '../context/ThemeContext';
import { ThemedText, ThemedView, GlassView } from '../components/ThemedComponents';
import { COLORS, SPACING, RADII } from '../constants/theme';

interface ProfileScreenProps {
    transactions: Transaction[];
    language: 'Tiếng Việt' | 'English';
    setLanguage: (lang: 'Tiếng Việt' | 'English') => void;
    categories: Category[];
    onAddCategory: (cat: Category) => void;
    onUpdateCategory: (cat: Category) => void;
    onDeleteCategory: (id: string) => void;
    onRestore: () => void;
}

interface Goal {
    id: string;
    type: 'future' | 'debt' | 'plan' | 'subscription'; // Added subscription
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    description?: string;
    completed: boolean;
    reminderEnabled?: boolean;
    reminderOffset?: number;
    notificationId?: string;
}

interface Tool {
    id: string;
    title: string;
    description: string;
    icon: string;
    url?: string;
    htmlContent?: string;
    type?: 'webview' | 'native';
}

const translations = {
    'Tiếng Việt': {
        account: 'TÀI KHOẢN',
        personalInfo: 'Thông tin cá nhân',
        paymentMethods: 'Phương thức thanh toán',
        security: 'Bảo mật & Quyền riêng tư',
        settings: 'CÀI ĐẶT',
        notifications: 'Thông báo',
        theme: 'Giao diện',
        lang: 'Ngôn ngữ',
        income: 'THU NHẬP',
        savings: 'TIẾT KIỆM',
        editProfile: 'Chỉnh sửa hồ sơ',
        displayName: 'Tên hiển thị',
        email: 'Email',
        cancel: 'Hủy',
        save: 'Lưu',
        light: 'Sáng',
        dark: 'Tối',
        logout: 'Đăng xuất',
        login: 'Đăng nhập',
        register: 'Đăng ký',
        categoriesTitle: 'Danh mục',
        profileTitle: 'Hồ sơ',
        goalsTitle: 'Nhắc nhở', // Renamed
        toolsTitle: 'Kho ứng dụng', // Changed from 'Công cụ' to match dynamic store feel
        addCategory: 'Thêm danh mục',
        utilityTools: 'Công cụ tiện ích',
        editCategory: 'Sửa danh mục',
        deleteCategory: 'Xóa danh mục',
        catName: 'Tên danh mục',
        catIcon: 'Biểu tượng',
        catType: 'Loại',
        catColor: 'Màu sắc',
        incomeTab: 'Thu nhập',
        expenseTab: 'Chi tiêu',
        syncTitle: 'ĐỒNG BỘ DỮ LIỆU',
        backup: 'Sao lưu lên đám mây',
        restore: 'Khôi phục từ đám mây',
        deleteAccount: 'Xóa tài khoản',
        deleteAccountConfirm: 'Bạn có chắc chắn muốn xóa tài khoản không? Hành động này không thể hoàn tác.',
        guest: 'Khách',
        loginToSync: 'Đăng nhập để đồng bộ dữ liệu',
        password: 'Mật khẩu',
        noAccount: 'Chưa có tài khoản?',
        hasAccount: 'Đã có tài khoản?',
        authSuccess: 'Thành công',
        authError: 'Lỗi xác thực',
        deleteBackup: 'Xóa bản sao lưu trên mây',
        // Reminders Strings
        addGoal: 'Thêm nhắc nhở', // Renamed
        editGoal: 'Sửa nhắc nhở', // Renamed
        goalType: 'Loại nhắc nhở', // Renamed
        goalTitle: 'Tên nhắc nhở', // Renamed
        goalAmount: 'Số tiền',
        goalCurrent: 'Hiện có',
        goalDeadline: 'Hạn chót / Kỳ hạn',
        goalDesc: 'Mô tả',
        typeFuture: 'Tương lai',
        typeDebt: 'Nợ',
        typePlan: 'Kế hoạch',
        typeSubscription: 'Gói đăng ký', // Added
        // Notification Strings
        reminderEnable: 'Bật nhắc nhở',
        reminderTime: 'Thời gian nhắc',
        remind24h: 'Trước 24 giờ',
        remindOnDay: 'Vào ngày đến hạn',
        remind3Day: 'Trước 3 ngày',
        remindCustom: 'Tùy chỉnh (giờ)',
        notifSettings: 'Cài đặt thông báo',
        allowNotif: 'Cho phép thông báo',
        sound: 'Âm thanh',
        soundDefault: 'Mặc định',
        // Tools Strings
        compoundInterest: 'Tính lãi kép',
        principal: 'Vốn ban đầu',
        monthlyContribution: 'Đóng góp hàng tháng',
        interestRate: 'Lãi suất (%/năm)',
        years: 'Số năm',
        calculate: 'Tính toán',
        futureValue: 'Giá trị tương lai',
        totalInterest: 'Tổng lãi tiền gửi',
        toolDesc_compound: 'Tính toán sức mạnh của lãi suất kép theo thời gian',
        // Dynamic Tool Strings
        addTool: 'Thêm ứng dụng',
        toolName: 'Tên ứng dụng',
        toolUrl: 'Đường dẫn (URL)',
        toolIcon: 'Biểu tượng (Emoji)',
        toolDesc: 'Mô tả ngắn',
        openTool: 'Mở',
        indexTracking: 'Theo dõi chỉ số',
        trackUsd: 'Theo dõi USD',
        trackEur: 'Theo dõi EUR',
        trackBtc: 'Theo dõi Bitcoin',
        trackEth: 'Theo dõi Ethereum',
        appearance: 'GIAO DIỆN',
        accentColor: 'Màu chủ đạo',
        chooseColor: 'Chọn màu',
        colorPink: 'Hồng',
        colorPurple: 'Tím',
        colorBlue: 'Xanh dương',
        colorGreen: 'Xanh lá',
        colorOrange: 'Cam',
        colorRed: 'Đỏ',
        privacyTitle: 'Bảo mật & Quyền riêng tư',
        privacyPolicy: 'Chính sách bảo mật',
        privacySecurityDesc: 'Dữ liệu của bạn được ưu tiên bảo mật hàng đầu. Các giao dịch chỉ được lưu trữ cục bộ trên thiết bị của bạn hoặc được mã hóa khi sao lưu lên đám mây.',
        privacyBullet1: '• Không chia sẻ dữ liệu cho bên thứ ba.',
        privacyBullet2: '• Dữ liệu sao lưu được mã hóa đầu cuối.',
        privacyBullet3: '• Bạn có toàn quyền xóa dữ liệu bất cứ lúc nào.',
        selectSound: 'Chọn âm thanh',
        soundCrystal: 'Crystal',
        soundAurora: 'Aurora',
        soundDigital: 'Digital',
        soundElegant: 'Elegant',
    },
    'English': {
        account: 'ACCOUNT',
        personalInfo: 'Personal Information',
        paymentMethods: 'Payment Methods',
        security: 'Security & Privacy',
        settings: 'SETTINGS',
        notifications: 'Notifications',
        theme: 'Theme',
        lang: 'Language',
        income: 'INCOME',
        savings: 'SAVINGS',
        editProfile: 'Edit Profile',
        displayName: 'Display Name',
        email: 'Email',
        cancel: 'Cancel',
        save: 'Save',
        light: 'Light',
        dark: 'Dark',
        logout: 'Log out',
        login: 'Log in',
        register: 'Sign up',
        categoriesTitle: 'Categories',
        profileTitle: 'Profile',
        goalsTitle: 'Reminders', // Renamed
        toolsTitle: 'Tools',
        addCategory: 'Add Category',
        utilityTools: 'Utility Tools',
        editCategory: 'Edit Category',
        deleteCategory: 'Delete Category',
        catName: 'Category Name',
        catIcon: 'Icon (Emoji)',
        catType: 'Type',
        catColor: 'Color',
        incomeTab: 'Income',
        expenseTab: 'Expense',
        syncTitle: 'DATA SYNC',
        backup: 'Backup to Cloud',
        restore: 'Restore from Cloud',
        deleteAccount: 'Delete Account',
        deleteAccountConfirm: 'Are you sure you want to delete your account? This cannot be undone.',
        guest: 'Guest',
        loginToSync: 'Log in to sync data',
        password: 'Password',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        authSuccess: 'Success',
        authError: 'Auth Error',
        deleteBackup: 'Delete Cloud Backup',
        // Reminders Strings
        addGoal: 'Add Reminder', // Renamed
        editGoal: 'Edit Reminder', // Renamed
        goalType: 'Type',
        goalTitle: 'Title',
        goalAmount: 'Amount',
        goalCurrent: 'Current',
        goalDeadline: 'Deadline / Cycle',
        goalDesc: 'Description',
        typeFuture: 'Future',
        typeDebt: 'Debt',
        typePlan: 'Plan',
        typeSubscription: 'Subscription', // Added
        // Notification Strings
        reminderEnable: 'Enable Reminder',
        reminderTime: 'Remind me',
        remind24h: '24 hours before',
        remindOnDay: 'On due date',
        remind3Day: '3 days before',
        remindCustom: 'Custom (hours)',
        notifSettings: 'Notification Settings',
        allowNotif: 'Allow Notifications',
        sound: 'Sound',
        soundDefault: 'Default',
        // Tools Strings
        compoundInterest: 'Compound Interest',
        principal: 'Principal',
        monthlyContribution: 'Monthly Contribution',
        interestRate: 'Interest Rate (%/year)',
        years: 'Years',
        calculate: 'Calculate',
        futureValue: 'Future Value',
        totalInterest: 'Total Interest',
        toolDesc_compound: 'Calculate the power of compound interest over time',
        // Dynamic Tool Strings
        addTool: 'Add App',
        toolName: 'App Name',
        toolUrl: 'URL',
        toolIcon: 'Icon (Emoji)',
        toolDesc: 'Short Description',
        openTool: 'Open',
        indexTracking: 'Index Tracking',
        trackUsd: 'Track USD',
        trackEur: 'Track EUR',
        trackBtc: 'Track Bitcoin',
        trackEth: 'Track Ethereum',
        appearance: 'APPEARANCE',
        accentColor: 'Accent Color',
        chooseColor: 'Choose Color',
        colorPink: 'Pink',
        colorPurple: 'Purple',
        colorBlue: 'Blue',
        colorGreen: 'Green',
        colorOrange: 'Orange',
        colorRed: 'Red',
        privacyTitle: 'Security & Privacy',
        privacyPolicy: 'Privacy Policy',
        privacySecurityDesc: 'Your data security is our top priority. Transactions are stored locally on your device or encrypted when backed up to the cloud.',
        privacyBullet1: '• No data sharing with third parties.',
        privacyBullet2: '• Backups are end-to-end encrypted.',
        privacyBullet3: '• You have full control to delete data anytime.',
        selectSound: 'Select Sound',
        soundCrystal: 'Crystal',
        soundAurora: 'Aurora',
        soundDigital: 'Digital',
        soundElegant: 'Elegant',
    },
};

export default function ProfileScreen({
    transactions,
    language,
    setLanguage,
    categories,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onRestore,
}: ProfileScreenProps) {
    const t = translations[language];
    const { theme, colors, isDark, toggleTheme, accentColor, setAccentColor } = useTheme();
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'goals' | 'tools'>('profile');
    const [userName, setUserName] = useState('Nguyễn Văn A');

    // Index Tracking State
    const [indexSettings, setIndexSettings] = useState({
        usd: true,
        eur: true,
        btc: true,
        eth: true,
    });
    const [isIndexModalVisible, setIsIndexModalVisible] = useState(false);
    const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
    const [isSoundPickerVisible, setIsSoundPickerVisible] = useState(false);
    const [selectedSound, setSelectedSound] = useState('Default');

    const NOTIF_SOUNDS = [
        { id: 'Default', name: t.soundDefault },
        { id: 'Crystal', name: t.soundCrystal },
        { id: 'Aurora', name: t.soundAurora },
        { id: 'Digital', name: t.soundDigital },
        { id: 'Elegant', name: t.soundElegant },
    ];
    const [currentRates, setCurrentRates] = useState<any>(null);

    // Goals State
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [goalType, setGoalType] = useState<Goal['type']>('future');
    const [goalTitle, setGoalTitle] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [goalCurrent, setGoalCurrent] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [goalDesc, setGoalDesc] = useState('');

    // Notification Fields in Reminder Modal
    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [reminderOffset, setReminderOffset] = useState<number>(24 * 60); // default 24h in minutes
    const [customOffsetHours, setCustomOffsetHours] = useState('');

    // Notification Settings Modal
    const [isNotifSettingsVisible, setIsNotifSettingsVisible] = useState(false);
    const [areNotificationsAllowed, setAreNotificationsAllowed] = useState(true);

    // Color Picker Modal
    const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);

    // Tools - Compound Interest State
    const [isCompoundModalVisible, setIsCompoundModalVisible] = useState(false);
    const [cpPrincipal, setCpPrincipal] = useState('');
    const [cpMonthly, setCpMonthly] = useState('');
    const [cpRate, setCpRate] = useState('');
    const [cpYears, setCpYears] = useState('');
    const [cpResult, setCpResult] = useState<{ futureValue: number; totalInterest: number } | null>(null);

    // Dynamic Tools State
    const [dynamicTools, setDynamicTools] = useState<Tool[]>([]);
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [userEmail, setUserEmail] = useState('nguyenvana@gmail.com');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editName, setEditName] = useState(userName);
    const [editEmail, setEditEmail] = useState(userEmail);

    // Auth Modal State
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Category states
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [editCatName, setEditCatName] = useState('');
    const [editCatIcon, setEditCatIcon] = useState('');
    const [editCatType, setEditCatType] = useState<'income' | 'expense'>('expense');
    const [editCatColor, setEditCatColor] = useState('#10b981');

    const defaultAvatar = 'https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light';

    useEffect(() => {
        loadUserInfo();
        fetchRates();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                setUserEmail(user.email || '');
                setEditEmail(user.email || '');
            } else {
                // Keep local override if exists or reset?
                // For now, let's keep local state but maybe indicate guest
            }
        });

        // Listen for dynamic tools
        const q = query(collection(db, 'mini_apps'), orderBy('createdAt', 'desc'));
        const unsubscribeTools = onSnapshot(q, (snapshot) => {
            const toolsList: Tool[] = [];
            snapshot.forEach((doc) => {
                toolsList.push({ id: doc.id, ...doc.data() } as Tool);
            });
            setDynamicTools(toolsList);
        }, (error) => {
            console.error("Firestore Check Error:", error.message);
            // Optionally set an error state here if you want to show it in UI
        });

        return () => {
            unsubscribe();
            unsubscribeTools();
        };
    }, []);

    const loadUserInfo = async () => {
        try {
            const name = await AsyncStorage.getItem('profile_name');
            const email = await AsyncStorage.getItem('profile_email');
            const avatar = await AsyncStorage.getItem('profile_avatar');
            if (name) {
                setUserName(name);
                setEditName(name);
            }
            if (email) {
                setUserEmail(email);
                setEditEmail(email);
            }
            if (avatar) setAvatarUri(avatar);

            const savedGoals = await AsyncStorage.getItem('user_goals');
            if (savedGoals) {
                setGoals(JSON.parse(savedGoals));
            }

            const savedIndexSettings = await AsyncStorage.getItem('index_settings');
            if (savedIndexSettings) {
                setIndexSettings(JSON.parse(savedIndexSettings));
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    };

    const fetchRates = async () => {
        try {
            const { getFinancialRates } = require('../services/finance');
            const rates = await getFinancialRates();
            setCurrentRates(rates);
        } catch (error) {
            console.error('Error fetching rates:', error);
        }
    };

    const handleEditProfile = () => {
        setEditName(userName);
        setEditEmail(userEmail);
        setIsEditingInfo(true);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setAvatarUri(uri);
            await AsyncStorage.setItem('profile_avatar', uri);
        }
    };

    const { totalIncome, totalSavings } = useMemo(() => {
        let inc = 0;
        let exp = 0;
        transactions.forEach((tx) => {
            if (tx.type === 'income') inc += tx.amount;
            else exp += tx.amount;
        });
        return {
            totalIncome: inc,
            totalSavings: Math.max(0, inc - exp),
        };
    }, [transactions]);



    const toggleLanguage = () => {
        setLanguage(language === 'Tiếng Việt' ? 'English' : 'Tiếng Việt');
    };

    const handleSaveInfo = async () => {
        setUserName(editName);
        setUserEmail(editEmail);
        setIsEditingInfo(false);
        try {
            await AsyncStorage.setItem('profile_name', editName);
            await AsyncStorage.setItem('profile_email', editEmail);
        } catch (error) {
            console.error('Error saving user info:', error);
        }
    };

    const toggleIndex = async (key: keyof typeof indexSettings) => {
        const newSettings = { ...indexSettings, [key]: !indexSettings[key] };
        setIndexSettings(newSettings);
        try {
            await AsyncStorage.setItem('index_settings', JSON.stringify(newSettings));
        } catch (error) {
            console.error('Error saving index settings:', error);
        }
    };

    // Auth Handlers
    const handleAuthAction = async () => {
        if (!authEmail || !authPassword) {
            Alert.alert(t.authError, 'Please fill in all fields');
            return;
        }
        setAuthLoading(true);
        try {
            if (authMode === 'login') {
                await signInWithEmailAndPassword(auth, authEmail, authPassword);
            } else {
                await createUserWithEmailAndPassword(auth, authEmail, authPassword);
            }
            setIsAuthModalVisible(false);
            setAuthEmail('');
            setAuthPassword('');
        } catch (error: any) {
            Alert.alert(t.authError, error.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t.deleteAccount,
            t.deleteAccountConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.deleteAccount,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (auth.currentUser) {
                                await deleteUser(auth.currentUser);
                                Alert.alert(t.authSuccess, 'Account deleted');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    // Sync Handlers
    const handleBackup = async () => {
        await SyncService.uploadBackup();
    };

    const handleRestore = async () => {
        await SyncService.downloadBackup(onRestore);
    };


    const handleSaveGoal = async () => {
        if (!goalTitle || !goalAmount) {
            Alert.alert('Error', 'Please enter title and target amount');
            return;
        }

        let notifId;
        if (reminderEnabled && goalDeadline) {
            const triggerDate = NotificationService.calculateTriggerDate(goalDeadline, reminderOffset);
            if (triggerDate && triggerDate > new Date()) {
                // Cancel old one if editing
                if (editingGoal?.notificationId) {
                    await NotificationService.cancelNotification(editingGoal.notificationId);
                }

                notifId = await NotificationService.scheduleReminder(
                    t.goalsTitle + ': ' + goalTitle,
                    `${t.goalAmount}: ${formatLargeNum(parseFloat(goalAmount))}`,
                    triggerDate
                );

                if (!notifId) {
                    Alert.alert('Notification Error', 'Could not schedule notification. Please check permissions.');
                }
            }
        } else if (editingGoal?.notificationId) {
            // If disabled but had one previously
            await NotificationService.cancelNotification(editingGoal.notificationId);
        }

        const newGoal: Goal = {
            id: editingGoal ? editingGoal.id : Date.now().toString(),
            type: goalType,
            title: goalTitle,
            targetAmount: parseFloat(goalAmount) || 0,
            currentAmount: parseFloat(goalCurrent) || 0,
            deadline: goalDeadline,
            description: goalDesc,
            completed: false,
            reminderEnabled: reminderEnabled,
            reminderOffset: reminderOffset,
            notificationId: notifId || undefined,
        };

        let newGoals;
        if (editingGoal) {
            newGoals = goals.map(g => g.id === editingGoal.id ? newGoal : g);
        } else {
            newGoals = [...goals, newGoal];
        }

        setGoals(newGoals);
        await AsyncStorage.setItem('user_goals', JSON.stringify(newGoals));
        setIsGoalModalVisible(false);
        resetGoalForm();
    };

    const handleDeleteGoal = async (id: string) => {
        Alert.alert(
            t.deleteCategory,
            t.deleteAccountConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.deleteCategory,
                    style: 'destructive',
                    onPress: async () => {
                        const goalToDelete = goals.find(g => g.id === id);
                        if (goalToDelete?.notificationId) {
                            await NotificationService.cancelNotification(goalToDelete.notificationId);
                        }
                        const newGoals = goals.filter(g => g.id !== id);
                        setGoals(newGoals);
                        await AsyncStorage.setItem('user_goals', JSON.stringify(newGoals));
                    }
                }
            ]
        );
    };

    const handleEditGoal = (goal: Goal) => {
        setEditingGoal(goal);
        setGoalType(goal.type);
        setGoalTitle(goal.title);
        setGoalAmount(goal.targetAmount.toString());
        setGoalCurrent(goal.currentAmount.toString());
        setGoalDeadline(goal.deadline || '');
        setGoalDesc(goal.description || '');
        setReminderEnabled(goal.reminderEnabled ?? true);
        setReminderOffset(goal.reminderOffset ?? 24 * 60);
        setIsGoalModalVisible(true);
    };

    const resetGoalForm = () => {
        setEditingGoal(null);
        setGoalType('future');
        setGoalTitle('');
        setGoalAmount('');
        setGoalCurrent('');
        setGoalDeadline('');
        setGoalDesc('');
        setReminderEnabled(true);
        setReminderOffset(24 * 60);
    };

    const handleNotificationSettings = async () => {
        const granted = await NotificationService.registerForPushNotificationsAsync();
        setAreNotificationsAllowed(!!granted);
        setIsNotifSettingsVisible(true);
    };

    // Tools Handlers
    const calculateCompoundInterest = () => {
        const P = parseFloat(cpPrincipal) || 0;
        const PMT = parseFloat(cpMonthly) || 0;
        const r = (parseFloat(cpRate) || 0) / 100;
        const t = parseFloat(cpYears) || 0;
        const n = 12; // monthly compounding

        if (t === 0) return;

        // Future Value of a Series formula
        // FV = P * (1 + r/n)^(n*t) + PMT * [((1 + r/n)^(n*t) - 1) / (r/n)]

        const compoundFactor = Math.pow(1 + r / n, n * t);
        const futureValuePrincipal = P * compoundFactor;
        const futureValueSeries = PMT * ((compoundFactor - 1) / (r / n));

        const totalFutureValue = futureValuePrincipal + futureValueSeries;
        const totalInvested = P + (PMT * 12 * t);

        setCpResult({
            futureValue: totalFutureValue,
            totalInterest: totalFutureValue - totalInvested
        });
    };

    const handleDeleteBackup = async () => {
        await SyncService.deleteBackup();
    };

    // Category Handlers
    const handleCategoryAction = (cat?: Category) => {
        if (cat) {
            setSelectedCategory(cat);
            setEditCatName(cat.name);
            setEditCatIcon(cat.icon);
            setEditCatType(cat.type);
            setEditCatColor(cat.color);
        } else {
            setSelectedCategory(null);
            setEditCatName('');
            setEditCatIcon('📁');
            setEditCatType('expense');
            setEditCatColor('#10b981');
        }
        setIsEditingCategory(true);
    };

    const handleSaveCategory = () => {
        if (!editCatName.trim()) return;

        const catData: Category = {
            id: selectedCategory ? selectedCategory.id : Math.random().toString(36).substr(2, 9),
            name: editCatName,
            icon: editCatIcon || '📁',
            type: editCatType,
            color: editCatColor,
        };

        if (selectedCategory) {
            onUpdateCategory(catData);
        } else {
            onAddCategory(catData);
        }
        setIsEditingCategory(false);
    };

    const handleDeleteCategoryClick = (id: string) => {
        onDeleteCategory(id);
    };

    const formatLargeNum = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'tr';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
        return num.toString();
    };

    return (
        <ThemedView style={styles.container}>
            <View style={[styles.tabContainer, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 24 }}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'profile' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('profile')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'profile' ? '#FFF' : colors.textSecondary }]}>
                            {t.profileTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'goals' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('goals')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'goals' ? '#FFF' : colors.textSecondary }]}>
                            {t.goalsTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'tools' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('tools')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'tools' ? '#FFF' : colors.textSecondary }]}>
                            {t.toolsTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'categories' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('categories')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'categories' ? '#FFF' : colors.textSecondary }]}>
                            {t.categoriesTitle}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={styles.content}
            >
                {activeTab === 'profile' && (
                    <>
                        {/* Profile Header */}
                        <ThemedView variant="surface" style={[styles.header, { borderColor: colors.border }]}>
                            <View style={styles.avatarContainer}>
                                <TouchableOpacity
                                    style={[styles.avatar, { borderColor: colors.primary }]}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={{ uri: avatarUri || defaultAvatar }}
                                        style={styles.avatarImage}
                                    />
                                    <View style={[styles.verifiedBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                                        <Ionicons name="camera" size={14} color="#FFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity onPress={() => setIsEditingInfo(true)}>
                                <ThemedText variant="h2" style={styles.name}>
                                    {currentUser ? currentUser.email : (userName || t.guest)}
                                </ThemedText>
                            </TouchableOpacity>
                            <ThemedText variant="body" style={styles.email}>
                                {currentUser ? (currentUser.email || userEmail) : t.loginToSync}
                            </ThemedText>

                            {!currentUser && (
                                <TouchableOpacity
                                    style={[styles.smallButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                                    onPress={() => {
                                        setAuthMode('login');
                                        setIsAuthModalVisible(true);
                                    }}
                                >
                                    <Text style={styles.smallButtonText}>{t.login}</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.statsRow}>
                                <ThemedView variant="surface" style={{ flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                                    <ThemedText variant="small" style={styles.statLabel}>{t.income}</ThemedText>
                                    <ThemedText variant="h3" style={{ color: colors.success }}>
                                        +{formatLargeNum(totalIncome)}
                                    </ThemedText>
                                </ThemedView>
                                <ThemedView variant="surface" style={{ flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                                    <ThemedText variant="small" style={styles.statLabel}>{t.savings}</ThemedText>
                                    <ThemedText variant="h3" style={{ color: colors.primary }}>
                                        {formatLargeNum(totalSavings)}
                                    </ThemedText>
                                </ThemedView>
                            </View>
                        </ThemedView>

                        {/* Sync Section */}
                        <View style={styles.section}>
                            <ThemedText variant="caption" style={styles.sectionTitle}>{t.syncTitle}</ThemedText>
                            <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <MenuItem
                                    icon="cloud-upload-outline"
                                    iconBgColor="#EC4899"
                                    label={t.backup}
                                    onPress={handleBackup}
                                />
                                <MenuItem
                                    icon="cloud-download-outline"
                                    iconBgColor="#F472B6"
                                    label={t.restore}
                                    onPress={handleRestore}
                                />
                                <MenuItem
                                    icon="trash-outline"
                                    iconBgColor="#EF4444"
                                    label={t.deleteBackup}
                                    onPress={handleDeleteBackup}
                                    last
                                />
                            </ThemedView>
                        </View>

                        {/* Account Section */}
                        <View style={styles.section}>
                            <ThemedText variant="caption" style={styles.sectionTitle}>{t.account}</ThemedText>
                            <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <MenuItem
                                    icon="person-outline"
                                    iconBgColor="#EC4899" // Pink
                                    label={t.personalInfo}
                                    onPress={handleEditProfile}
                                />
                                <MenuItem
                                    icon="analytics-outline"
                                    iconBgColor="#D946EF" // Purple
                                    label={t.indexTracking}
                                    onPress={() => setIsIndexModalVisible(true)}
                                />
                                <MenuItem
                                    icon="lock-closed-outline"
                                    iconBgColor="#F472B6" // Light pink
                                    label={t.security}
                                    onPress={() => setIsPrivacyModalVisible(true)}
                                    last={!currentUser}
                                />
                                {currentUser && (
                                    <MenuItem
                                        icon="trash-outline"
                                        iconBgColor="#EF4444" // Red
                                        label={t.deleteAccount}
                                        onPress={handleDeleteAccount}
                                        last
                                    />
                                )}
                            </ThemedView>
                        </View>

                        {/* Appearance Section */}
                        <View style={styles.section}>
                            <ThemedText variant="caption" style={styles.sectionTitle}>{t.appearance}</ThemedText>
                            <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <MenuItem
                                    icon="color-palette-outline"
                                    iconBgColor="#A855F7"
                                    label={t.accentColor}
                                    value={t[`color${accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}` as keyof typeof t] as string}
                                    valueColor={ACCENT_COLORS[accentColor]}
                                    onPress={() => setIsColorPickerVisible(true)}
                                    last
                                />
                            </ThemedView>
                        </View>

                        {/* Settings Section */}
                        <View style={styles.section}>
                            <ThemedText variant="caption" style={styles.sectionTitle}>{t.settings}</ThemedText>
                            <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <MenuItem
                                    icon="notifications-outline"
                                    iconBgColor="#E879F9"
                                    label={t.notifications}
                                    onPress={handleNotificationSettings}
                                />
                                <MenuItem
                                    icon="moon-outline"
                                    iconBgColor="#D946EF"
                                    label={t.theme}
                                    value={theme === 'light' ? t.light : t.dark}
                                    onPress={toggleTheme}
                                    valueColor={theme === 'light' ? '#EC4899' : '#F472B6'}
                                />
                                <MenuItem
                                    icon="globe-outline"
                                    iconBgColor="#EC4899"
                                    label={t.lang}
                                    value={language}
                                    onPress={toggleLanguage}
                                    valueColor="#EC4899"
                                    last
                                />
                            </ThemedView>
                        </View>

                        {/* Logout Button */}
                        {currentUser && (
                            <TouchableOpacity
                                style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2', borderColor: 'rgba(239, 68, 68, 0.2)' }]}
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutText}>{t.logout}</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {activeTab === 'goals' && (
                    <View style={styles.categoriesContainer}>
                        <TouchableOpacity
                            style={[styles.addCategoryBtn, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.1)' : '#FCE7F3', borderColor: colors.primary }]}
                            onPress={() => {
                                resetGoalForm();
                                setIsGoalModalVisible(true);
                            }}
                        >
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>{t.addGoal}</ThemedText>
                        </TouchableOpacity>

                        {(['future', 'debt', 'plan'] as const).map((type) => {
                            const typeGoals = goals.filter(g => g.type === type);
                            if (typeGoals.length === 0) return null;

                            let sectionTitle = t.typeFuture;
                            if (type === 'debt') sectionTitle = t.typeDebt;
                            if (type === 'plan') sectionTitle = t.typePlan;

                            return (
                                <View key={type} style={styles.section}>
                                    <ThemedText variant="caption" style={styles.sectionTitle}>{sectionTitle}</ThemedText>
                                    <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                        {typeGoals.map((g, idx) => (
                                            <TouchableOpacity
                                                key={g.id}
                                                activeOpacity={0.7}
                                                onPress={() => handleEditGoal(g)}
                                            >
                                                <View style={styles.menuItem}>
                                                    <View style={styles.menuLeft}>
                                                        <View style={[styles.menuIconBox, { backgroundColor: type === 'debt' ? '#fee2e2' : '#e0e7ff' }]}>
                                                            <Ionicons
                                                                name={type === 'debt' ? 'alert-circle' : (type === 'future' ? 'rocket' : 'calendar')}
                                                                size={20}
                                                                color={type === 'debt' ? '#EF4444' : '#6366F1'}
                                                            />
                                                        </View>
                                                        <View>
                                                            <ThemedText variant="bodyBold">{g.title}</ThemedText>
                                                            <ThemedText variant="caption" style={{ color: colors.textSecondary }}>
                                                                {formatLargeNum(g.currentAmount)} / {formatLargeNum(g.targetAmount)}
                                                            </ThemedText>
                                                        </View>
                                                    </View>
                                                    <View style={styles.menuRight}>
                                                        <ThemedText style={[styles.menuValue, { color: g.currentAmount >= g.targetAmount ? colors.success : colors.textSecondary }]}>
                                                            {Math.round((g.currentAmount / g.targetAmount) * 100)}%
                                                        </ThemedText>
                                                        <TouchableOpacity onPress={() => handleDeleteGoal(g.id)} style={{ marginLeft: 8 }}>
                                                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                                {idx !== typeGoals.length - 1 && (
                                                    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ThemedView>
                                </View>
                            );
                        })}
                    </View>
                )}

                {activeTab === 'tools' && (
                    <View style={styles.categoriesContainer}>
                        {/* Native Tools */}
                        <View style={styles.section}>
                            <ThemedText variant="caption" style={styles.sectionTitle}>{t.utilityTools}</ThemedText>
                            <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => setIsCompoundModalVisible(true)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 4 }}>
                                        <View style={[styles.menuIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', width: 48, height: 48, borderRadius: 16 }]}>
                                            <Ionicons name="trending-up" size={24} color={colors.success} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText variant="bodyBold" style={{ fontSize: 16 }}>
                                                {t.compoundInterest}
                                            </ThemedText>
                                            <ThemedText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                                                {t.toolDesc_compound}
                                            </ThemedText>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    </View>
                                </TouchableOpacity>
                            </ThemedView>
                        </View>

                        {/* Dynamic Mini Apps */}
                        <View style={{ marginTop: 24, marginBottom: 8 }}>
                            <ThemedText variant="caption" style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 0 }]}>Mini Apps & Games</ThemedText>
                        </View>

                        <View style={{ gap: 12 }}>
                            {dynamicTools.map((tool) => (
                                <ThemedView
                                    key={tool.id}
                                    variant="surface"
                                    style={{ padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
                                    onTouchEnd={() => setActiveTool(tool)}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                        <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', width: 48, height: 48, borderRadius: 16 }]}>
                                            <Text style={{ fontSize: 24 }}>{tool.icon}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText variant="bodyBold" style={{ fontSize: 16 }}>
                                                {tool.title}
                                            </ThemedText>
                                            {tool.description ? (
                                                <ThemedText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                                                    {tool.description}
                                                </ThemedText>
                                            ) : null}
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                    </View>
                                </ThemedView>
                            ))}
                            {dynamicTools.length === 0 && (
                                <ThemedText style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>
                                    No apps available.
                                </ThemedText>
                            )}
                        </View>
                    </View>
                )}

                {activeTab === 'categories' && (
                    <View style={styles.categoriesContainer}>
                        <TouchableOpacity
                            style={[styles.addCategoryBtn, { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.1)' : '#FCE7F3', borderColor: colors.primary }]}
                            onPress={() => handleCategoryAction()}
                        >
                            <Ionicons name="add-circle" size={24} color={colors.primary} />
                            <ThemedText style={[styles.addCategoryText, { color: colors.primary }]}>{t.addCategory}</ThemedText>
                        </TouchableOpacity>

                        <View style={styles.catTypeTabs}>
                            <TouchableOpacity
                                style={[styles.catTypeTab, editCatType === 'expense' && { borderBottomColor: colors.primary }]}
                                onPress={() => setEditCatType('expense')}
                            >
                                <ThemedText style={[styles.catTypeTabText, editCatType === 'expense' && { color: colors.primary }]}>
                                    {t.expenseTab}
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.catTypeTab, editCatType === 'income' && { borderBottomColor: colors.primary }]}
                                onPress={() => setEditCatType('income')}
                            >
                                <ThemedText style={[styles.catTypeTabText, editCatType === 'income' && { color: colors.primary }]}>
                                    {t.incomeTab}
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                            {categories.filter(c => c.type === editCatType).map((cat, idx, arr) => (
                                <View key={cat.id}>
                                    <View style={styles.menuItem}>
                                        <View style={styles.menuLeft}>
                                            <Text style={{ fontSize: 24, marginRight: 12 }}>{cat.icon}</Text>
                                            <ThemedText variant="bodyBold">{cat.name}</ThemedText>
                                        </View>
                                        <View style={styles.menuRight}>
                                            <TouchableOpacity onPress={() => handleCategoryAction(cat)}>
                                                <Ionicons name="pencil" size={20} color={colors.primary} style={{ marginRight: 15 }} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteCategoryClick(cat.id)}>
                                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    {idx !== arr.length - 1 && (
                                        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
                                    )}
                                </View>
                            ))}
                        </ThemedView>
                    </View>
                )}
            </ScrollView>

            {/* Auth Modal */}
            <Modal
                visible={isAuthModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsAuthModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {authMode === 'login' ? t.login : t.register}
                        </Text>

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.email}</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={authEmail}
                            onChangeText={setAuthEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholder="example@email.com"
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.password}</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={authPassword}
                            onChangeText={setAuthPassword}
                            secureTextEntry
                            placeholder="********"
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <TouchableOpacity onPress={handleAuthAction} style={[styles.modalButton, styles.saveButton, { marginBottom: 12, backgroundColor: '#10b981', flex: 0, width: '100%' }]}>
                            {authLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>{authMode === 'login' ? t.login : t.register}</Text>}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                            <Text style={{ color: isDark ? '#FFF' : '#000' }}>{authMode === 'login' ? t.noAccount : t.hasAccount} </Text>
                            <TouchableOpacity onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                                <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{authMode === 'login' ? t.register : t.login}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, { marginTop: 20 }]}
                            onPress={() => setIsAuthModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Category Edit Modal */}
            <Modal
                visible={isEditingCategory}
                transparent
                animationType="fade"
                onRequestClose={() => setIsEditingCategory(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {selectedCategory ? t.editCategory : t.addCategory}
                        </Text>

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.catName}</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={editCatName}
                            onChangeText={setEditCatName}
                            placeholder="Tên danh mục..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.catIcon}</Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={editCatIcon}
                            onChangeText={setEditCatIcon}
                            placeholder="Dùng emoji (vd: 💰)"
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.catColor}</Text>
                        <View style={styles.colorPicker}>
                            {['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'].map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorCircle, { backgroundColor: c, borderWidth: editCatColor === c ? 3 : 0, borderColor: isDark ? '#FFF' : '#000' }]}
                                    onPress={() => setEditCatColor(c)}
                                />
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsEditingCategory(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveCategory}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


            {/* Goal Modal */}
            <Modal
                visible={isGoalModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsGoalModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {editingGoal ? t.editGoal : t.addGoal}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalType}</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                                {(['subscription', 'debt', 'plan', 'future'] as const).map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setGoalType(type)}
                                        style={[{
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            borderRadius: 8,
                                            backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                            borderWidth: 1,
                                            borderColor: 'transparent'
                                        }, goalType === type && {
                                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                            borderColor: '#ab10b9'
                                        }]}
                                    >
                                        <Text style={{
                                            fontWeight: goalType === type ? 'bold' : 'normal',
                                            color: goalType === type ? '#ab10b9' : (isDark ? '#FFF' : '#000')
                                        }}>
                                            {type === 'future' ? t.typeFuture : (type === 'debt' ? t.typeDebt : (type === 'plan' ? t.typePlan : t.typeSubscription))}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalTitle}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={goalTitle}
                                onChangeText={setGoalTitle}
                                placeholder={t.goalTitle}
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalAmount}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={goalAmount}
                                onChangeText={setGoalAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalCurrent}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={goalCurrent}
                                onChangeText={setGoalCurrent}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalDeadline}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={goalDeadline}
                                onChangeText={setGoalDeadline}
                                placeholder="DD/MM/YYYY"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="notifications" size={20} color={isDark ? '#FFF' : '#000'} />
                                        <Text style={[styles.inputLabel, isDark && styles.textDark, { marginBottom: 0 }]}>{t.reminderEnable}</Text>
                                    </View>
                                    <Switch
                                        value={reminderEnabled}
                                        onValueChange={setReminderEnabled}
                                        trackColor={{ false: '#767577', true: '#10b981' }}
                                    />
                                </View>

                                {reminderEnabled && (
                                    <View>
                                        <Text style={[styles.inputLabel, isDark && styles.textDark, { fontSize: 12, marginBottom: 8 }]}>{t.reminderTime}</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {[
                                                { label: t.remindOnDay, val: 0 },
                                                { label: t.remind24h, val: 24 * 60 },
                                                { label: t.remind3Day, val: 3 * 24 * 60 },
                                            ].map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.val}
                                                    style={[{
                                                        paddingVertical: 6,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 8,
                                                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                                    }, reminderOffset === opt.val && {
                                                        backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                                                        borderWidth: 1,
                                                        borderColor: '#10b981'
                                                    }]}
                                                    onPress={() => setReminderOffset(opt.val)}
                                                >
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: reminderOffset === opt.val ? '#10b981' : (isDark ? '#9CA3AF' : '#6B7280')
                                                    }}>
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={[{
                                                        paddingVertical: 6,
                                                        paddingHorizontal: 12,
                                                        borderRadius: 8,
                                                        backgroundColor: isDark ? '#374151' : '#F3F4F6',
                                                    }, ![0, 1440, 4320].includes(reminderOffset) && {
                                                        backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
                                                        borderWidth: 1,
                                                        borderColor: '#10b981'
                                                    }]}
                                                    onPress={() => {
                                                        // Just select it, let input drive value
                                                        if ([0, 1440, 4320].includes(reminderOffset)) setReminderOffset(-1);
                                                    }}
                                                >
                                                    <Text style={{
                                                        fontSize: 12,
                                                        color: ![0, 1440, 4320].includes(reminderOffset) ? '#10b981' : (isDark ? '#9CA3AF' : '#6B7280')
                                                    }}>
                                                        {t.remindCustom}
                                                    </Text>
                                                </TouchableOpacity>
                                                {![0, 1440, 4320].includes(reminderOffset) && (
                                                    <TextInput
                                                        style={[styles.input, isDark && styles.inputDark, { width: 60, marginBottom: 0, padding: 6, textAlign: 'center' }]}
                                                        keyboardType="numeric"
                                                        placeholder="2"
                                                        onChangeText={(txt) => {
                                                            setCustomOffsetHours(txt);
                                                            const hours = parseFloat(txt);
                                                            if (!isNaN(hours)) setReminderOffset(hours * 60);
                                                        }}
                                                    />
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsGoalModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: '#ab10b9' }]}
                                onPress={handleSaveGoal}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notification Settings Modal */}
            <Modal
                visible={isNotifSettingsVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsNotifSettingsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {t.notifSettings}
                        </Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <Text style={[styles.menuLabel, isDark && styles.textDark, { fontSize: 16 }]}>{t.allowNotif}</Text>
                            <Switch
                                value={areNotificationsAllowed}
                                onValueChange={async (val) => {
                                    if (val) {
                                        const granted = await NotificationService.registerForPushNotificationsAsync();
                                        setAreNotificationsAllowed(!!granted);
                                        if (!granted) Alert.alert('Permission Denied', 'Please enable notifications in system settings.');
                                    } else {
                                        setAreNotificationsAllowed(false);
                                        // In reality, can't "un-grant" from app, but simply won't schedule future ones
                                    }
                                }}
                                trackColor={{ false: '#767577', true: '#10b981' }}
                            />
                        </View>

                        <TouchableOpacity
                            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}
                            onPress={() => setIsSoundPickerVisible(true)}
                        >
                            <Text style={[styles.menuLabel, isDark && styles.textDark, { fontSize: 16 }]}>{t.sound}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ color: '#6B7280', marginRight: 8 }}>
                                    {NOTIF_SOUNDS.find(s => s.id === selectedSound)?.name || t.soundDefault}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary, flex: 1 }]}
                                onPress={() => setIsNotifSettingsVisible(false)}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Compound Interest Modal */}
            <Modal
                visible={isCompoundModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsCompoundModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {t.compoundInterest}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.principal}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpPrincipal}
                                onChangeText={setCpPrincipal}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.monthlyContribution}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpMonthly}
                                onChangeText={setCpMonthly}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.interestRate}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpRate}
                                onChangeText={setCpRate}
                                keyboardType="numeric"
                                placeholder="7"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.years}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpYears}
                                onChangeText={setCpYears}
                                keyboardType="numeric"
                                placeholder="10"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            {cpResult && (
                                <View style={{ padding: 16, backgroundColor: isDark ? '#374151' : '#ecfdf5', borderRadius: 12, marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>{t.futureValue}:</Text>
                                        <Text style={{ fontWeight: 'bold', color: '#10b981', fontSize: 16 }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cpResult.futureValue)}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>{t.totalInterest}:</Text>
                                        <Text style={{ fontWeight: 'bold', color: '#059669' }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cpResult.totalInterest)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                onPress={() => setIsCompoundModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary, flex: 1 }]}
                                onPress={calculateCompoundInterest}
                            >
                                <Text style={styles.saveButtonText}>{t.calculate}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                visible={isEditingInfo}
                transparent
                animationType="slide"
                onRequestClose={() => setIsEditingInfo(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {t.editProfile}
                        </Text>

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>
                            {t.displayName}
                        </Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={editName}
                            onChangeText={setEditName}
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <Text style={[styles.inputLabel, isDark && styles.textDark]}>
                            {t.email}
                        </Text>
                        <TextInput
                            style={[styles.input, isDark && styles.inputDark]}
                            value={editEmail}
                            onChangeText={setEditEmail}
                            keyboardType="email-address"
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                onPress={() => setIsEditingInfo(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary, flex: 1 }]}
                                onPress={handleSaveInfo}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Index Tracking Modal */}
            <Modal
                visible={isIndexModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsIndexModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {t.indexTracking}
                        </Text>

                        <View style={{ gap: 16, marginBottom: 20 }}>
                            <View style={styles.indexSwitchRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="cash-outline" size={24} color="#22C55E" />
                                    <View>
                                        <Text style={[styles.menuLabel, isDark && styles.textDark]}>{t.trackUsd}</Text>
                                        {currentRates?.usd && <Text style={{ fontSize: 12, color: '#6B7280' }}>1 USD = {currentRates.usd.toLocaleString()} VND</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={indexSettings.usd}
                                    onValueChange={() => toggleIndex('usd')}
                                    trackColor={{ false: '#767577', true: '#10b981' }}
                                />
                            </View>

                            <View style={styles.indexSwitchRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="cash-outline" size={24} color="#3B82F6" />
                                    <View>
                                        <Text style={[styles.menuLabel, isDark && styles.textDark]}>{t.trackEur}</Text>
                                        {currentRates?.eur && <Text style={{ fontSize: 12, color: '#6B7280' }}>1 EUR = {currentRates.eur.toLocaleString()} VND</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={indexSettings.eur}
                                    onValueChange={() => toggleIndex('eur')}
                                    trackColor={{ false: '#767577', true: '#10b981' }}
                                />
                            </View>

                            <View style={styles.indexSwitchRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="logo-bitcoin" size={24} color="#F97316" />
                                    <View>
                                        <Text style={[styles.menuLabel, isDark && styles.textDark]}>{t.trackBtc}</Text>
                                        {currentRates?.btc && <Text style={{ fontSize: 12, color: '#6B7280' }}>1 BTC = ${currentRates.btc.toLocaleString()}</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={indexSettings.btc}
                                    onValueChange={() => toggleIndex('btc')}
                                    trackColor={{ false: '#767577', true: '#10b981' }}
                                />
                            </View>

                            <View style={styles.indexSwitchRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="diamond-outline" size={24} color="#6366F1" />
                                    <View>
                                        <Text style={[styles.menuLabel, isDark && styles.textDark]}>{t.trackEth}</Text>
                                        {currentRates?.eth && <Text style={{ fontSize: 12, color: '#6B7280' }}>1 ETH = ${currentRates.eth.toLocaleString()}</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={indexSettings.eth}
                                    onValueChange={() => toggleIndex('eth')}
                                    trackColor={{ false: '#767577', true: '#10b981' }}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.saveButton,
                                { backgroundColor: colors.primary, flex: 0, width: '100%', marginTop: 10 }
                            ]}
                            onPress={() => setIsIndexModalVisible(false)}
                        >
                            <Text style={styles.saveButtonText}>{t.save}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Browser Modal for Mini Apps */}
            <Modal
                visible={!!activeTool}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setActiveTool(null)}
            >
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
                    }}>
                        <TouchableOpacity onPress={() => setActiveTool(null)}>
                            <Text style={{ color: '#3B82F6', fontSize: 16 }}>Done</Text>
                        </TouchableOpacity>
                        <Text style={[styles.menuLabel, isDark && styles.textDark, { fontSize: 16 }]}>{activeTool?.title}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    {activeTool && (
                        <WebView
                            source={activeTool.htmlContent ? { html: activeTool.htmlContent } : { uri: activeTool.url || '' }}
                            style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#FFFFFF' }}
                            startInLoadingState
                            renderLoading={() => <ActivityIndicator style={{ position: 'absolute', top: '50%', left: '50%' }} />}
                            originWhitelist={['*']}
                        />
                    )}
                </View>
            </Modal>

            {/* Color Picker Modal */}
            <Modal
                visible={isColorPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsColorPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <ThemedText variant="h2" style={{ marginBottom: 24 }}>{t.chooseColor}</ThemedText>

                        <View style={{ gap: 12 }}>
                            {(Object.keys(ACCENT_COLORS) as AccentColorKey[]).map((colorKey) => (
                                <TouchableOpacity
                                    key={colorKey}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: isDark ? colors.surface : '#F9FAFB' },
                                        accentColor === colorKey && { borderColor: ACCENT_COLORS[colorKey], borderWidth: 2 }
                                    ]}
                                    onPress={() => {
                                        setAccentColor(colorKey);
                                        setIsColorPickerVisible(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: ACCENT_COLORS[colorKey],
                                            }}
                                        />
                                        <ThemedText variant="bodyBold">
                                            {t[`color${colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}` as keyof typeof t] as string}
                                        </ThemedText>
                                    </View>
                                    {accentColor === colorKey && (
                                        <Ionicons name="checkmark-circle" size={24} color={ACCENT_COLORS[colorKey]} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                { backgroundColor: colors.primary, marginTop: 20, flex: 0, width: '100%' }
                            ]}
                            onPress={() => setIsColorPickerVisible(false)}
                        >
                            <Text style={styles.saveButtonText}>{t.cancel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* Sound Picker Modal */}
            <Modal
                visible={isSoundPickerVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setIsSoundPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                        <ThemedText variant="h2" style={{ marginBottom: 24 }}>{t.selectSound}</ThemedText>

                        <View style={{ gap: 12 }}>
                            {NOTIF_SOUNDS.map((sound) => (
                                <TouchableOpacity
                                    key={sound.id}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: isDark ? colors.surface : '#F9FAFB' },
                                        selectedSound === sound.id && { borderColor: colors.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => {
                                        setSelectedSound(sound.id);
                                        setIsSoundPickerVisible(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                backgroundColor: isDark ? '#374151' : '#E5E7EB',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Ionicons name="musical-notes-outline" size={20} color={colors.primary} />
                                        </View>
                                        <ThemedText variant="bodyBold">
                                            {sound.name}
                                        </ThemedText>
                                    </View>
                                    {selectedSound === sound.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                { backgroundColor: colors.primary, marginTop: 20, flex: 0, width: '100%' }
                            ]}
                            onPress={() => setIsSoundPickerVisible(false)}
                        >
                            <Text style={styles.saveButtonText}>{t.cancel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Privacy & Security Modal */}
            <Modal
                visible={isPrivacyModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsPrivacyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark, { width: '90%' }]}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 16
                            }}>
                                <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                            </View>
                            <ThemedText variant="h2" style={{ textAlign: 'center' }}>{t.privacyTitle}</ThemedText>
                        </View>

                        <Text style={[
                            { fontSize: 15, lineHeight: 22, color: isDark ? '#D1D5DB' : '#4B5563', marginBottom: 20, textAlign: 'center' }
                        ]}>
                            {t.privacySecurityDesc}
                        </Text>

                        <View style={{ gap: 12, marginBottom: 24 }}>
                            <ThemedText variant="body">{t.privacyBullet1}</ThemedText>
                            <ThemedText variant="body">{t.privacyBullet2}</ThemedText>
                            <ThemedText variant="body">{t.privacyBullet3}</ThemedText>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                { backgroundColor: colors.primary, flex: 0, width: '100%' }
                            ]}
                            onPress={() => setIsPrivacyModalVisible(false)}
                        >
                            <Text style={styles.saveButtonText}>{t.save}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const MenuItem = ({
    icon,
    iconBgColor = '#6B7280',
    label,
    value,
    onPress,
    last,
    valueColor
}: {
    icon: any;
    iconBgColor?: string;
    label: string;
    value?: string;
    onPress: () => void;
    last?: boolean;
    valueColor?: string;
}) => {
    const { colors, isDark } = useTheme();
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
        >
            <View style={styles.menuItem}>
                <View style={styles.menuLeft}>
                    <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : iconBgColor + '15' }]}>
                        <View style={styles.iconCircle}>
                            <Ionicons name={icon} size={20} color={isDark ? iconBgColor : iconBgColor} />
                        </View>
                    </View>
                    <ThemedText variant="bodyBold">{label}</ThemedText>
                </View>
                <View style={styles.menuRight}>
                    {value && <ThemedText variant="body" style={{ color: valueColor || colors.textSecondary }}>{value}</ThemedText>}
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
            </View>
            {!last && (
                <View style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginLeft: 64, // 16(padding) + 36(icon) + 12(gap)
                }} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    headerDark: {
        shadowColor: 'transparent',
        borderWidth: 1,
        borderColor: '#374151',
    },
    avatarContainer: {
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarDark: {
        borderColor: '#374151',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 4,
        backgroundColor: '#10b981',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
        marginTop: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    statBoxDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    incomeText: {
        color: '#10b981',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    menuCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    menuCardDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    menuItemBorderDark: {
        borderBottomColor: '#374151',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIconBoxDark: {
        backgroundColor: '#374151',
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuValue: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 18,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    logoutButtonDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f43f5e',
    },
    textDark: {
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '85%',
    },
    modalContentDark: {
        backgroundColor: '#1F2937',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        marginBottom: 16,
    },
    inputDark: {
        backgroundColor: '#374151',
        color: '#FFFFFF',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    saveButton: {
        backgroundColor: '#111827',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 60,
        gap: 16,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#10b981',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    categoriesContainer: {
        flex: 1,
    },
    addCategoryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        gap: 8,
    },
    addCategoryBtnDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    addCategoryText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    catTypeTabs: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    catTypeTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    catTypeTabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    catTypeTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    catTypeTabTextActive: {
        color: '#10b981',
    },
    colorPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    colorCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    textDark70: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    smallButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    colorOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    smallButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    indexSwitchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
