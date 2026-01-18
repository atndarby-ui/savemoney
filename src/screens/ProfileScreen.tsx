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
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Linking,
    AppState
} from 'react-native';
import CalendarScreen from './CalendarScreen';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category } from '../types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker'; // Removed to prevent crash on non-dev builds
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, deleteUser, User } from 'firebase/auth';
import { SyncService } from '../services/SyncService';
import { NotificationService } from '../services/NotificationService';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Database } from '../services/Database';
import { SecurityService } from '../services/SecurityService';
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
    type: 'future' | 'debt' | 'plan' | 'subscription' | 'task';
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    description?: string;
    completed: boolean;
    reminderEnabled?: boolean;
    reminderOffset?: number; // minutes
    reminderExactTime?: string; // ISO string for exact time
    notificationId?: string;
    customSoundUri?: string;
    repeatCount?: number;
    repeatInterval?: number;

    // Subscription specific
    billingCycle?: 'monthly' | 'yearly';
    renewalDate?: string;
    serviceLogo?: string;
    price?: number;

    // Debt specific
    partnerName?: string;
    debtAmount?: number;
    debtType?: 'lending' | 'borrowing';
    dueDate?: string;
    currency?: string;
    proofImage?: string;

    // Task specific
    priority?: 'low' | 'medium' | 'high';
    referenceImage?: string;
    subtasks?: { id: string, title: string, time?: string, completed: boolean }[];
    targetDate?: string;

    // Plan specific
    frequency?: 'daily' | 'weekly' | 'custom';
    weeklyDays?: number[]; // 0=Sunday, 1=Monday, etc.
    customInterval?: number; // days interval for custom
    customStartDate?: string; // DD/MM/YYYY - when to start the custom interval
    inspirationImage?: string;
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
        resetData: 'Đặt lại dữ liệu',
        resetDataConfirm: 'Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu không? Hành động này sẽ xóa tất cả giao dịch, danh mục, cài đặt và đưa ứng dụng về trạng thái ban đầu. KHÔNG THỂ HOÀN TÁC.',
        appLock: 'Khóa ứng dụng',
        setupPassword: 'Thiết lập mật khẩu',
        changePassword: 'Đổi mật khẩu',
        biometrics: 'Sinh trắc học',
        enableBiometrics: 'Bật vân tay/FaceID',
        manageSecurity: 'Quản lý bảo mật',
        enterPassword: 'Nhập mật khẩu',
        setPasswordTitle: 'Đặt mật khẩu mới',
        oldPassword: 'Mật khẩu cũ',
        newPassword: 'Mật khẩu mới',
        confirmPassword: 'Xác nhận lại',
        hintTitle: 'Gợi ý khôi phục',
        hintQuestion: 'Câu hỏi gợi ý',
        hintAnswer: 'Câu trả lời',
        wrongPassword: 'Mật khẩu không đúng',
        passwordsNoMatch: 'Mật khẩu không khớp',
        securityEnabled: 'Đã bật bảo mật',
        securityDisabled: 'Chưa bật bảo mật',
        // Reminders Strings
        addGoal: 'Thêm nhắc nhở', // Renamed
        editGoal: 'Sửa nhắc nhở', // Renamed
        deleteGoal: 'Xóa nhắc nhở',
        deleteGoalConfirm: 'Bạn có chắc chắn muốn xóa nhắc nhở này không?',
        goalType: '1. Loại nhắc nhở', // Added Numbering
        goalTitle: '2. Tên nhắc nhở', // Added Numbering
        goalAmount: 'Số tiền',
        goalCurrent: 'Hiện có',
        goalDeadline: 'Hạn chót / Kỳ hạn',
        goalDesc: 'Mô tả',
        typeFuture: 'Tương lai',
        typeDebt: 'Khoản nợ',
        typePlan: 'Kế hoạch',
        typeSubscription: 'Gói đăng ký',
        typeTask: 'Nhiệm vụ',

        // New Fields & Titles
        subscriptionTitle: 'Thêm gói đăng ký',
        debtTitle: 'Ghi chú khoản nợ',
        taskTitle: 'Thiết lập nhiệm vụ',
        planTitle: 'Lên kế hoạch',

        inputService: 'Tên dịch vụ',
        inputCycle: 'Chu kỳ thanh toán',
        cycleMonthly: 'Hàng tháng',
        cycleYearly: 'Hàng năm',
        inputRenewal: 'Ngày gia hạn',
        uploadLogo: 'Tải logo dịch vụ',

        inputPartner: 'Tên đối tác/người nợ',
        inputDebtAmount: 'Số tiền nợ',
        inputProof: 'Ảnh bằng chứng',
        debtLending: 'Cho vay',
        debtBorrowing: 'Đi vay',

        inputTaskTitle: 'Tiêu đề công việc',
        inputPriority: 'Độ ưu tiên',
        prioLow: 'Thấp',
        prioMedium: 'Trung bình',
        prioHigh: 'Cao',
        uploadRef: 'Ảnh tham khảo',
        taskDetails: 'Chi tiết công việc',
        addSubtask: 'Thêm nhiệm vụ con',
        subtaskPlaceholder: 'Nhập nhiệm vụ con...',

        inputPlanGoal: 'Mục tiêu chính',
        inputFrequency: 'Tần suất',
        freqDaily: 'Hàng ngày',
        freqWeekly: 'Hàng tuần',
        freqCustom: 'Tùy chỉnh',
        selectDays: 'Chọn ngày trong tuần',
        customDays: 'Số ngày',
        everyXDays: 'Mỗi X ngày',
        startDate: 'Ngày bắt đầu',
        uploadInspo: 'Ảnh cảm hứng',

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
        pickSound: 'Chọn từ tệp...',
        reminderExact: 'Giờ cụ thể',
        repeatCount: 'Số lần nhắc lại',
        repeatInterval: 'Khoảng cách (phút)',
        stopNotification: 'Tắt chuông',
        snoozeNotification: 'Nhắc lại sau',
        doneNotification: 'Đã hoàn thành',
        // Tools Strings
        compoundInterest: 'Tính lãi kép',
        principal: 'Vốn ban đầu',
        monthlyContribution: 'Đóng góp hàng tháng',
        interestRate: 'Lãi suất (%/năm)',
        years: 'Số năm',
        calculate: 'Tính toán',
        futureValue: 'Giá trị tương lai',
        totalInterest: 'Tổng lãi nhận được',
        totalInvested: 'Tổng vốn đã đóng',
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
        customSoundUriInput: 'Đường dẫn âm thanh (URI)',
        manualUriPlaceholder: 'file://... hoặc assets/...',
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
        resetData: 'Reset Data',
        resetDataConfirm: 'Are you sure you want to wipe ALL data? This will delete all transactions, categories, settings and reset the app to factory state. THIS CANNOT BE UNDONE.',
        appLock: 'App Lock',
        setupPassword: 'Setup Password',
        changePassword: 'Change Password',
        biometrics: 'Biometrics',
        enableBiometrics: 'Enable Biometrics',
        manageSecurity: 'Manage Security',
        enterPassword: 'Enter Password',
        setPasswordTitle: 'Set New Password',
        oldPassword: 'Old Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        hintTitle: 'Recovery Hint',
        hintQuestion: 'Hint Question',
        hintAnswer: 'Hint Answer',
        wrongPassword: 'Incorrect Password',
        passwordsNoMatch: 'Passwords do not match',
        securityEnabled: 'Security Enabled',
        securityDisabled: 'Security Disabled',
        // Reminders Strings
        addGoal: 'Add Reminder', // Renamed
        editGoal: 'Edit Reminder', // Renamed
        deleteGoal: 'Delete Reminder',
        deleteGoalConfirm: 'Are you sure you want to delete this reminder?',
        goalType: '1. Reminder Type',
        goalTitle: '2. Reminder Title',
        goalAmount: 'Amount',
        goalCurrent: 'Current',
        goalDeadline: 'Deadline / Cycle',
        goalDesc: 'Description',
        typeFuture: 'Future',
        typeDebt: 'Debt',
        typePlan: 'Plan',
        typeSubscription: 'Subscription',
        typeTask: 'Task',

        // New Fields & Titles
        subscriptionTitle: 'Add Subscription',
        debtTitle: 'Record Debt',
        taskTitle: 'Setup Task',
        planTitle: 'Create Plan',

        inputService: 'Service Name',
        inputCycle: 'Billing Cycle',
        cycleMonthly: 'Monthly',
        cycleYearly: 'Yearly',
        inputRenewal: 'Renewal Date',
        uploadLogo: 'Upload Service Logo',

        inputPartner: 'Partner/Debtor Name',
        inputDebtAmount: 'Debt Amount',
        inputProof: 'Proof Image',
        debtLending: 'Lending',
        debtBorrowing: 'Borrowing',

        inputTaskTitle: 'Task Title',
        inputPriority: 'Priority',
        prioLow: 'Low',
        prioMedium: 'Medium',
        prioHigh: 'High',
        uploadRef: 'Reference Image',
        taskDetails: 'Task Details',
        addSubtask: 'Add Subtask',
        subtaskPlaceholder: 'Enter subtask...',

        inputPlanGoal: 'Main Goal',
        inputFrequency: 'Frequency',
        freqDaily: 'Daily',
        freqWeekly: 'Weekly',
        freqCustom: 'Custom',
        selectDays: 'Select days of week',
        customDays: 'Days interval',
        everyXDays: 'Every X days',
        startDate: 'Start Date',
        uploadInspo: 'Inspiration Image',

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
        pickSound: 'Pick from file...',
        reminderExact: 'Exact Time',
        repeatCount: 'Repeat Count',
        repeatInterval: 'Interval (mins)',
        stopNotification: 'Stop Sound',
        snoozeNotification: 'Snooze',
        doneNotification: 'Mark Done',
        // Tools Strings
        compoundInterest: 'Compound Interest',
        principal: 'Principal',
        monthlyContribution: 'Monthly Contribution',
        interestRate: 'Interest Rate (%/year)',
        years: 'Years',
        calculate: 'Calculate',
        futureValue: 'Future Value',
        totalInterest: 'Total Interest',
        totalInvested: 'Total Invested',
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
        customSoundUriInput: 'Custom Sound URI',
        manualUriPlaceholder: 'file://... or assets/...',
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

    // Security State
    const [isSecurityModalVisible, setIsSecurityModalVisible] = useState(false);
    const [isSecurityEnabled, setIsSecurityEnabled] = useState(false); // Helper for UI
    const [passInput, setPassInput] = useState('');
    const [newPassInput, setNewPassInput] = useState('');
    const [confirmPassInput, setConfirmPassInput] = useState('');
    const [hintQInput, setHintQInput] = useState('');
    const [hintAInput, setHintAInput] = useState('');
    const [securityStep, setSecurityStep] = useState<'menu' | 'setup' | 'change' | 'check' | 'hint' | 'disable'>('menu');

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
    const [goalType, setGoalType] = useState<Goal['type']>('subscription'); // Default to subscription

    // Common
    const [goalTitle, setGoalTitle] = useState('');
    const [goalAmount, setGoalAmount] = useState('');
    const [goalCurrent, setGoalCurrent] = useState('');
    const [goalDeadline, setGoalDeadline] = useState('');
    const [goalDesc, setGoalDesc] = useState('');

    // Specific Fields
    // Subscription
    const [subBillingCycle, setSubBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [subServiceLogo, setSubServiceLogo] = useState<string | null>(null);

    // Debt
    const [debtPartner, setDebtPartner] = useState('');
    const [debtOrCredit, setDebtOrCredit] = useState<'lending' | 'borrowing'>('lending'); // 'lending' = you lent, 'borrowing' = you borrowed
    const [debtProofImg, setDebtProofImg] = useState<string | null>(null);

    // Task
    const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [taskRefImg, setTaskRefImg] = useState<string | null>(null);
    const [subtasks, setSubtasks] = useState<{ id: string, title: string, time?: string, completed: boolean }[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [newSubtaskTime, setNewSubtaskTime] = useState('');

    // Plan
    const [planFrequency, setPlanFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [planWeeklyDays, setPlanWeeklyDays] = useState<number[]>([1]); // Default Monday
    const [planCustomInterval, setPlanCustomInterval] = useState<number>(1);
    const [planCustomStartDate, setPlanCustomStartDate] = useState<string>('');
    const [planInspoImg, setPlanInspoImg] = useState<string | null>(null);

    // Date Picker State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
    const [datePickerTarget, setDatePickerTarget] = useState<'deadline' | 'renewal' | 'dueDate' | 'customStart' | 'subtaskTime'>('deadline');
    const [tempDate, setTempDate] = useState(new Date());


    // Notification Fields in Reminder Modal
    const [reminderEnabled, setReminderEnabled] = useState(true);
    const [reminderOffset, setReminderOffset] = useState<number>(0); // 0 means 'On Day' effectively if logic handles it, or use specific flag

    // New Notification State
    const [reminderType, setReminderType] = useState<'offset' | 'exact'>('offset');
    const [exactTime, setExactTime] = useState(new Date());
    const [soundType, setSoundType] = useState<'default' | 'custom'>('default');
    const [customSound, setCustomSound] = useState<{ name: string, uri: string } | null>(null);

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
    const [cpResult, setCpResult] = useState<{ futureValue: number; totalInterest: number; totalInvested: number } | null>(null);

    const [repeatCount, setRepeatCount] = useState<number>(1);
    const [repeatInterval, setRepeatInterval] = useState<number>(5); // Default 5 mins

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
        });

        return () => {
            unsubscribe();
            unsubscribeTools();
        };
    }, []);

    useEffect(() => {
        checkSecurityStatus();
    }, [isSecurityModalVisible]);

    const checkSecurityStatus = async () => {
        const enabled = await SecurityService.isEnabled();
        setIsSecurityEnabled(enabled);
    };

    const handleResetData = () => {
        Alert.alert(
            t.resetData,
            t.resetDataConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.resetData,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await Database.clearAllData();
                            await AsyncStorage.clear();
                            await SecurityService.clearSecuritySettings();
                            onRestore(); // Reloads data
                            Alert.alert(t.authSuccess, 'App has been reset.');
                            // Optionally logout firebase?
                            if (auth.currentUser) await signOut(auth);
                        } catch (e: any) {
                            console.error(e);
                            Alert.alert('Error', e.message);
                        }
                    }
                }
            ]
        );
    };


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
        // Validation per type
        if (!goalTitle && !debtPartner) {
            Alert.alert('Error', 'Please enter a title/name');
            return;
        }

        // Check Notification Permissions if reminder enabled
        if (reminderEnabled) {
            const status = await NotificationService.checkPermissions();
            if (status !== 'granted') {
                Alert.alert(
                    language === 'Tiếng Việt' ? 'Thông báo bị tắt' : 'Notifications Disabled',
                    language === 'Tiếng Việt'
                        ? 'Vui lòng bật thông báo trong Cài đặt để nhận nhắc nhở.'
                        : 'Please enable notifications in Settings to receive reminders.',
                    [
                        { text: t.cancel, style: 'cancel' },
                        {
                            text: language === 'Tiếng Việt' ? 'Mở Cài đặt' : 'Open Settings',
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
                return;
            }
        }

        let notifId;
        let triggerDate: Date | null = null;
        let notifTitle = '';
        let notifBody = '';

        if (reminderEnabled && (goalDeadline || goalType === 'plan')) {
            if (reminderType === 'exact') {
                if (goalDeadline) {
                    // Parse deadline date string (DD/MM/YYYY)
                    const parts = goalDeadline.split('/');
                    if (parts.length === 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        const baseDate = new Date(year, month, day);

                        // Apply exact time hours/minutes
                        triggerDate = new Date(baseDate);
                        triggerDate.setHours(exactTime.getHours(), exactTime.getMinutes(), 0, 0);
                    }
                } else if (goalType === 'plan') {
                    // Plan with frequency (Daily/Weekly/Custom)
                    if (planFrequency === 'custom' && planCustomStartDate) {
                        const parts = planCustomStartDate.split('/');
                        if (parts.length === 3) {
                            const day = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1;
                            const year = parseInt(parts[2], 10);
                            triggerDate = new Date(year, month, day);
                            triggerDate.setHours(exactTime.getHours(), exactTime.getMinutes(), 0, 0);
                        }
                    } else {
                        // Default to today/next occurrence for Daily/Weekly
                        triggerDate = new Date();
                        triggerDate.setHours(exactTime.getHours(), exactTime.getMinutes(), 0, 0);

                        if (planFrequency === 'weekly') {
                            // Find next day in planWeeklyDays
                            let today = triggerDate.getDay();
                            let daysToWait = -1;
                            for (let i = 0; i < 7; i++) {
                                let checkDay = (today + i) % 7;
                                if (planWeeklyDays.includes(checkDay)) {
                                    if (i === 0 && triggerDate <= new Date()) {
                                        // Today but already passed, skip to next check
                                        continue;
                                    }
                                    daysToWait = i;
                                    break;
                                }
                            }
                            if (daysToWait !== -1) {
                                triggerDate.setDate(triggerDate.getDate() + daysToWait);
                            } else {
                                triggerDate = null;
                            }
                        } else if (planFrequency === 'daily') {
                            if (triggerDate <= new Date()) {
                                // If time passed today, schedule for tomorrow
                                triggerDate.setDate(triggerDate.getDate() + 1);
                            }
                        }
                    }
                }
            } else if (goalDeadline || (goalType === 'plan' && planCustomStartDate)) {
                triggerDate = NotificationService.calculateTriggerDate(goalDeadline || planCustomStartDate, reminderOffset);
            }

            console.log(`[handleSaveGoal] Calculated triggerDate: ${triggerDate?.toLocaleString()}`);
            if (triggerDate && triggerDate > new Date()) {
                // Cancel old one
                if (editingGoal?.notificationId) {
                    console.log('Canceling old notification:', editingGoal.notificationId);
                    await NotificationService.cancelNotification(editingGoal.notificationId);
                }

                // Title based on type
                notifTitle = t.goalsTitle;
                if (goalType === 'debt') notifTitle = `${t.typeDebt}: ${debtPartner}`;
                else if (goalType === 'task') notifTitle = `${t.typeTask}: ${goalTitle}`;
                else if (goalType === 'subscription') notifTitle = `${t.typeSubscription}: ${goalTitle}`;
                else if (goalType === 'plan') notifTitle = `${t.typePlan}: ${goalTitle}`;

                // Detailed Body
                const amountNum = parseFloat(goalAmount);
                notifBody = !isNaN(amountNum) && amountNum > 0
                    ? `${t.goalAmount}: ${formatLargeNum(amountNum)}`
                    : (goalTitle || '');

                if (goalType === 'task' && subtasks.length > 0) {
                    const taskLines = subtasks.map(s => `• ${s.time ? `[${s.time}] ` : ''}${s.title}`).join('\n');
                    notifBody = `${t.taskDetails}:\n${taskLines}`;
                }

                console.log('--- Scheduling Notification ---');
                console.log('Title:', notifTitle);
                console.log('Body:', notifBody);
                console.log('Trigger Date:', triggerDate.toLocaleString());
                console.log('Offset (ms):', triggerDate.getTime() - Date.now());

                // Reference Image
                const notifImage = goalType === 'task' ? taskRefImg :
                    goalType === 'debt' ? debtProofImg :
                        goalType === 'subscription' ? subServiceLogo :
                            goalType === 'plan' ? planInspoImg : undefined;

                const isRepeatingPlan = goalType === 'plan' && planFrequency !== 'custom';
                const scheduledIds: string[] = [];
                const finalGoalId = editingGoal ? editingGoal.id : Date.now().toString();

                for (let i = 0; i < repeatCount; i++) {
                    const scheduledTrigger = new Date(triggerDate.getTime() + i * repeatInterval * 60000);
                    const id = await NotificationService.scheduleReminder(
                        notifTitle,
                        notifBody,
                        scheduledTrigger,
                        soundType === 'custom' ? customSound?.uri : undefined,
                        notifImage || undefined,
                        'reminder',
                        isRepeatingPlan && i === 0,
                        finalGoalId
                    );
                    if (id) scheduledIds.push(id);
                }

                notifId = scheduledIds.join(',');
                console.log('New Notification IDs:', notifId);
                console.log('------------------------------');
            } else {
                console.log('No notification scheduled: triggerDate in past or null. triggerDate:', triggerDate);
            }
        } else if (editingGoal?.notificationId) {
            console.log('Reminder disabled or deadline missing. Canceling notification:', editingGoal.notificationId);
            await NotificationService.cancelNotification(editingGoal.notificationId);
        }

        const finalGoalIdForObj = editingGoal ? editingGoal.id : (notifId ? notifId.split(',')[0] : Date.now().toString());

        const newGoal: Goal = {
            id: finalGoalIdForObj,
            type: goalType,
            title: goalTitle || debtPartner || 'Untitled', // Fallback
            targetAmount: parseFloat(goalAmount) || 0,
            currentAmount: parseFloat(goalCurrent) || 0,
            deadline: goalDeadline,
            description: goalDesc,
            completed: editingGoal ? editingGoal.completed : false,
            reminderEnabled: reminderEnabled,
            reminderOffset: reminderType === 'offset' ? reminderOffset : undefined,
            reminderExactTime: reminderType === 'exact' ? exactTime.toISOString() : undefined,
            notificationId: notifId || undefined,
            customSoundUri: (reminderEnabled && soundType === 'custom') ? customSound?.uri : undefined,
            repeatCount: reminderEnabled ? repeatCount : 1,
            repeatInterval: reminderEnabled ? repeatInterval : 5,

            // Subscription specific
            billingCycle: goalType === 'subscription' ? subBillingCycle : undefined,
            serviceLogo: goalType === 'subscription' ? (subServiceLogo || undefined) : undefined,

            // Debt specific
            partnerName: goalType === 'debt' ? debtPartner : undefined,
            debtType: goalType === 'debt' ? debtOrCredit : undefined,
            proofImage: goalType === 'debt' ? (debtProofImg || undefined) : undefined,

            // Task specific
            priority: goalType === 'task' ? taskPriority : undefined,
            referenceImage: goalType === 'task' ? (taskRefImg || undefined) : undefined,
            subtasks: goalType === 'task' ? subtasks : undefined,

            // Plan specific
            frequency: goalType === 'plan' ? planFrequency : undefined,
            weeklyDays: goalType === 'plan' && planFrequency === 'weekly' ? planWeeklyDays : undefined,
            customInterval: goalType === 'plan' && planFrequency === 'custom' ? planCustomInterval : undefined,
            customStartDate: goalType === 'plan' && planFrequency === 'custom' ? planCustomStartDate : undefined,
            inspirationImage: goalType === 'plan' ? (planInspoImg || undefined) : undefined,
        };

        console.log('[handleSaveGoal] Saving Goal Image:',
            goalType === 'plan' ? newGoal.inspirationImage :
                goalType === 'task' ? newGoal.referenceImage :
                    goalType === 'debt' ? newGoal.proofImage :
                        newGoal.serviceLogo
        );

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
            t.deleteGoal,
            t.deleteGoalConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.deleteGoal,
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

        // Load specific fields
        if (goal.type === 'subscription') {
            setSubBillingCycle(goal.billingCycle || 'monthly');
            setSubServiceLogo(goal.serviceLogo || null);
            console.log('[handleEditGoal] Loaded subServiceLogo:', goal.serviceLogo);
        } else if (goal.type === 'debt') {
            setDebtPartner(goal.partnerName || '');
            setDebtOrCredit(goal.debtType || 'lending');
            setDebtProofImg(goal.proofImage || null);
            console.log('[handleEditGoal] Loaded debtProofImage:', goal.proofImage);
        } else if (goal.type === 'task') {
            setTaskPriority(goal.priority || 'medium');
            setTaskRefImg(goal.referenceImage || null);
            setSubtasks(goal.subtasks || []);
            console.log('[handleEditGoal] Loaded taskRefImage:', goal.referenceImage);
        } else if (goal.type === 'plan') {
            setPlanFrequency(goal.frequency || 'daily');
            setPlanWeeklyDays(goal.weeklyDays || [1]);
            setPlanCustomInterval(goal.customInterval || 1);
            setPlanCustomStartDate(goal.customStartDate || '');
            setPlanInspoImg(goal.inspirationImage || null);
            console.log('[handleEditGoal] Loaded planInspoImage:', goal.inspirationImage);
        }

        // Set Notification State
        setReminderEnabled(goal.reminderEnabled !== false); // default true

        if (goal.reminderExactTime) {
            setReminderType('exact');
            setExactTime(new Date(goal.reminderExactTime));
        } else {
            setReminderType('offset');
            setReminderOffset(goal.reminderOffset || 0);
        }

        if (goal.customSoundUri) {
            setSoundType('custom');
            // We don't store the name, so just show "Custom Sound" or extract filename
            const name = goal.customSoundUri.split('/').pop() || 'Custom Sound';
            setCustomSound({ name, uri: goal.customSoundUri });
        } else {
            setSoundType('default');
            setCustomSound(null);
        }

        setRepeatCount(goal.repeatCount || 1);
        setRepeatInterval(goal.repeatInterval || 5);

        setIsGoalModalVisible(true);
    };

    const resetGoalForm = () => {
        setEditingGoal(null);
        // Don't reset type here, let it be passed or default
        setGoalTitle('');
        setGoalAmount('');
        setGoalCurrent('');
        setGoalDeadline('');
        setGoalDesc('');

        setSubBillingCycle('monthly');
        setSubServiceLogo(null);
        setDebtPartner('');
        setDebtOrCredit('lending');
        setDebtProofImg(null);
        setTaskPriority('medium');
        setTaskRefImg(null);
        setSubtasks([]);
        setNewSubtask('');
        setPlanFrequency('daily');
        setPlanWeeklyDays([1]);
        setPlanCustomInterval(1);
        setPlanCustomStartDate('');
        setPlanInspoImg(null);

        // Reset Notif
        setReminderEnabled(true);
        setReminderType('offset');
        setReminderOffset(0);
        setExactTime(new Date());
        setSoundType('default');
        setCustomSound(null);
        setRepeatCount(1);
        setRepeatInterval(5);
    };

    const pickGoalImage = async (setter: (uri: string) => void) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date, forceIos: boolean = false) => {
        if (event.type === 'dismissed' && !forceIos) {
            setShowDatePicker(false);
            return;
        }

        const currentDate = selectedDate || tempDate;
        setShowDatePicker(Platform.OS === 'ios' && !forceIos);
        setTempDate(currentDate);

        if (Platform.OS !== 'ios' || forceIos) {
            // Finalize and format
            const formatted = datePickerMode === 'time'
                ? currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : currentDate.toLocaleDateString('en-GB'); // DD/MM/YYYY

            if (datePickerTarget === 'customStart') {
                setPlanCustomStartDate(formatted);
            } else {
                setGoalDeadline(formatted);
            }
            setShowDatePicker(false);
        }
    };

    // Formatting Helper
    const formatNumberInput = (numStr: string) => {
        if (!numStr) return '';
        return numStr.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleAmountChange = (text: string) => {
        const raw = text.replace(/\./g, '');
        setGoalAmount(raw);
    };

    const pickCustomSound = async () => {
        try {
            // Dynamic import to prevent crash at startup
            const DocumentPicker = require('expo-document-picker');

            if (!DocumentPicker || !DocumentPicker.getDocumentAsync) {
                throw new Error('Module not available');
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setCustomSound({
                    name: result.assets[0].name,
                    uri: result.assets[0].uri
                });
            }
        } catch (err) {
            console.error('Error picking sound:', err);
            Alert.alert(
                language === 'Tiếng Việt' ? 'Không hỗ trợ' : 'Not Supported',
                language === 'Tiếng Việt'
                    ? 'Tính năng chọn tệp yêu cầu Development Build. Hãy dán đường dẫn (URI) thủ công bên dưới.'
                    : 'File picking requires a Development Build. Please paste the URI manually below.'
            );
        }
    };

    // Time Picker independent of Date Picker
    const [showExactTimePicker, setShowExactTimePicker] = useState(false);

    const handleExactTimeChange = (event: any, selectedDate?: Date, forceIos: boolean = false) => {
        if (event.type === 'dismissed' && !forceIos) {
            setShowExactTimePicker(false);
            return;
        }
        const currentDate = selectedDate || exactTime;
        setShowExactTimePicker(Platform.OS === 'ios' && !forceIos);
        setExactTime(currentDate);

        if (datePickerTarget === 'subtaskTime' || forceIos) {
            const formattedTime = currentDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            if (datePickerTarget === 'subtaskTime') {
                setNewSubtaskTime(formattedTime);
            }
        }

        if (Platform.OS !== 'ios' || forceIos) {
            setShowExactTimePicker(false);
        }
    };

    const handleNotificationSettings = async () => {
        const status = await NotificationService.checkPermissions();
        setAreNotificationsAllowed(status === 'granted');
        setIsNotifSettingsVisible(true);
    };

    const formatInputDots = (val: string) => {
        if (!val) return '';
        // Remove all non-numeric and existing dots
        const num = val.replace(/\./g, '').replace(/[^0-9]/g, '');
        if (!num) return '';
        // Add dots every 3 digits
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    const parseCurrencyInput = (val: string) => {
        return parseFloat(val.replace(/\./g, '')) || 0;
    };

    const calculateCompoundInterest = () => {
        const P = parseCurrencyInput(cpPrincipal);
        const PMT = parseCurrencyInput(cpMonthly);
        const rateInput = parseFloat(cpRate);
        const t = parseFloat(cpYears) || 0;
        const n = 12; // monthly compounding

        if (t <= 0) {
            Alert.alert(
                language === 'Tiếng Việt' ? 'Thông tin thiếu' : 'Missing Info',
                language === 'Tiếng Việt' ? 'Vui lòng nhập số năm đầu tư.' : 'Please enter the number of years.'
            );
            return;
        }

        let totalFutureValue;
        if (isNaN(rateInput) || rateInput === 0) {
            totalFutureValue = P + (PMT * 12 * t);
        } else {
            const r = rateInput / 100;
            const compoundFactor = Math.pow(1 + r / n, n * t);
            const futureValuePrincipal = P * compoundFactor;
            const futureValueSeries = PMT * ((compoundFactor - 1) / (r / n));
            totalFutureValue = futureValuePrincipal + futureValueSeries;
        }

        const totalInvested = P + (PMT * 12 * t);

        setCpResult({
            futureValue: totalFutureValue,
            totalInterest: Math.max(0, totalFutureValue - totalInvested),
            totalInvested: totalInvested
        });
    };

    const formatCurrency = (num: number) => {
        try {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                maximumFractionDigits: 0
            }).format(num);
        } catch (e) {
            return num.toLocaleString('vi-VN') + ' ₫';
        }
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
            <View style={[styles.tabContainer, { borderBottomColor: colors.border, borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 8 }]}>
                <View style={{ flexDirection: 'row', width: '100%', gap: 4 }}>
                    <TouchableOpacity
                        style={[styles.tab, { flex: 1, alignItems: 'center' }, activeTab === 'profile' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('profile')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'profile' ? '#FFF' : colors.textSecondary }]}>
                            {t.profileTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { flex: 1, alignItems: 'center' }, activeTab === 'goals' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('goals')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'goals' ? '#FFF' : colors.textSecondary }]}>
                            {t.goalsTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { flex: 1, alignItems: 'center' }, activeTab === 'tools' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('tools')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'tools' ? '#FFF' : colors.textSecondary }]}>
                            {t.toolsTitle}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, { flex: 1, alignItems: 'center' }, activeTab === 'categories' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('categories')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'categories' ? '#FFF' : colors.textSecondary }]}>
                            {t.categoriesTitle}
                        </Text>
                    </TouchableOpacity>
                </View>
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
                                />
                                <MenuItem
                                    icon="shield-checkmark-outline"
                                    iconBgColor="#10B981" // Emerald
                                    label={t.appLock}
                                    value={isSecurityEnabled ? t.securityEnabled : t.securityDisabled}
                                    valueColor={isSecurityEnabled ? colors.success : colors.textSecondary}
                                    onPress={() => setIsSecurityModalVisible(true)}
                                />
                                <MenuItem
                                    icon="refresh-outline"
                                    iconBgColor="#6B7280" // Gray
                                    label={t.resetData}
                                    onPress={handleResetData}
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
                        {/* New 4-Card Creation Row */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                            {[
                                {
                                    type: 'subscription',
                                    title: t.typeSubscription,
                                    color: '#E0BBE4', // Purple Pastel
                                    icon: 'card-outline',
                                    textColor: '#6A1B9A'
                                },
                                {
                                    type: 'debt',
                                    title: t.typeDebt,
                                    color: '#B2F7EF', // Mint Pastel
                                    icon: 'swap-horizontal-outline',
                                    textColor: '#00695C'
                                },
                                {
                                    type: 'task',
                                    title: t.typeTask,
                                    color: '#FFD3B6', // Peach Pastel
                                    icon: 'checkbox-outline',
                                    textColor: '#E65100'
                                },
                                {
                                    type: 'plan',
                                    title: t.typePlan,
                                    color: '#D4F1F4', // Pearl Blue Pastel
                                    icon: 'flag-outline',
                                    textColor: '#0277BD'
                                },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.type}
                                    style={{
                                        width: '48%', // Approx 2 columns
                                        backgroundColor: item.color,
                                        borderRadius: 16,
                                        padding: 16,
                                        minHeight: 100,
                                        justifyContent: 'space-between',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 4,
                                        elevation: 2,
                                    }}
                                    onPress={() => {
                                        resetGoalForm();
                                        setGoalType(item.type as any);
                                        setIsGoalModalVisible(true);
                                    }}
                                >
                                    <View style={{
                                        backgroundColor: 'rgba(255,255,255,0.6)',
                                        width: 36,
                                        height: 36,
                                        borderRadius: 12,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Ionicons name={item.icon as any} size={20} color={item.textColor} />
                                    </View>
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: '700',
                                        color: item.textColor,
                                        marginTop: 8
                                    }}>
                                        {item.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {(['subscription', 'debt', 'task', 'plan', 'future'] as const).map((type) => {
                            const typeGoals = goals.filter(g => g.type === type);
                            if (typeGoals.length === 0) return null;

                            let sectionTitle = t.typeFuture;
                            if (type === 'debt') sectionTitle = t.debtTitle;
                            else if (type === 'plan') sectionTitle = t.planTitle;
                            else if (type === 'subscription') sectionTitle = t.subscriptionTitle;
                            else if (type === 'task') sectionTitle = t.taskTitle;

                            return (
                                <View key={type} style={styles.section}>
                                    <ThemedText variant="caption" style={styles.sectionTitle}>{sectionTitle}</ThemedText>
                                    <ThemedView variant="surface" style={{ padding: 0, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: colors.border }}>
                                        {typeGoals.map((g, idx) => (
                                            <View key={g.id}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    {/* Primary Action Area (Edit) */}
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        onPress={() => handleEditGoal(g)}
                                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16 }}
                                                    >
                                                        <View style={[styles.menuIconBox, {
                                                            backgroundColor: type === 'debt' ? (g.debtType === 'borrowing' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)') :
                                                                type === 'subscription' ? '#F3E5F5' :
                                                                    type === 'task' ? '#FFF3E0' :
                                                                        type === 'plan' ? '#E1F5FE' : '#EEF2FF'
                                                        }]}>
                                                            <Ionicons
                                                                name={
                                                                    type === 'debt' ? (g.debtType === 'borrowing' ? 'arrow-down-circle' : 'arrow-up-circle') :
                                                                        type === 'subscription' ? 'card' :
                                                                            type === 'task' ? 'checkbox' :
                                                                                type === 'plan' ? 'flag' : 'rocket'
                                                                }
                                                                size={20}
                                                                color={
                                                                    type === 'debt' ? (g.debtType === 'borrowing' ? '#EF4444' : '#10B981') :
                                                                        type === 'subscription' ? '#8E24AA' :
                                                                            type === 'task' ? '#EF6C00' :
                                                                                type === 'plan' ? '#0288D1' : '#6366F1'
                                                                }
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, marginLeft: 16 }}>
                                                            <ThemedText variant="bodyBold" numberOfLines={1}>{g.title || g.partnerName}</ThemedText>
                                                            <ThemedText variant="caption" style={{ color: colors.textSecondary }} numberOfLines={1}>
                                                                {type === 'debt' ? `${g.debtType === 'borrowing' ? t.debtBorrowing : t.debtLending}: ${formatLargeNum(g.targetAmount)}` :
                                                                    type === 'plan' ? `${t.inputFrequency}: ${t[`freq${g.frequency?.charAt(0).toUpperCase()}${g.frequency?.slice(1)}` as keyof typeof t] || g.frequency}${g.reminderExactTime ? ` - ${new Date(g.reminderExactTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}` :
                                                                        (g.deadline || t.goalDeadline)}
                                                            </ThemedText>
                                                        </View>
                                                        {(g.proofImage || g.referenceImage || g.inspirationImage || g.serviceLogo) && (
                                                            <Image
                                                                source={{ uri: g.proofImage || g.referenceImage || g.inspirationImage || g.serviceLogo }}
                                                                style={{ width: 34, height: 34, borderRadius: 8, marginRight: 0 }}
                                                            />
                                                        )}
                                                    </TouchableOpacity>

                                                    {/* Standalone Delete Button - Spaced Out */}
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteGoal(g.id)}
                                                        style={{ padding: 20, paddingRight: 24 }}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                                                    </TouchableOpacity>
                                                </View>
                                                {idx !== typeGoals.length - 1 && (
                                                    <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64, marginRight: 20 }} />
                                                )}
                                            </View>
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
                                <TouchableOpacity
                                    key={tool.id}
                                    activeOpacity={0.7}
                                    onPress={() => setActiveTool(tool)}
                                >
                                    <ThemedView
                                        variant="surface"
                                        style={{ padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border }}
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
                                </TouchableOpacity>
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
                    <View style={[styles.modalContent, isDark && styles.modalContentDark, { maxWidth: 550, width: '90%', alignSelf: 'center' }]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                            {editingGoal ? t.editGoal : t.addGoal}
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 600 }}>

                            {/* SUBSCRIPTION MODAL CONTENT (Purple Pastel) */}
                            {goalType === 'subscription' && (
                                <View>
                                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                        <TouchableOpacity onPress={() => pickGoalImage(setSubServiceLogo)}>
                                            <View style={{
                                                width: 80, height: 80, borderRadius: 40,
                                                backgroundColor: '#F3E5F5', alignItems: 'center', justifyContent: 'center',
                                                borderWidth: 1, borderColor: '#CE93D8'
                                            }}>
                                                {subServiceLogo ? (
                                                    <Image source={{ uri: subServiceLogo }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                                                ) : (
                                                    <Ionicons name="cloud-upload-outline" size={30} color="#8E24AA" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                        <Text style={{ marginTop: 8, color: '#8E24AA', fontSize: 12 }}>{t.uploadLogo}</Text>
                                    </View>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputService}</Text>
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={goalTitle}
                                        onChangeText={setGoalTitle}
                                        placeholder="Netflix, Spotify..."
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    />

                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputCycle}</Text>
                                            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#374151' : '#F3F4F6', borderRadius: 12, padding: 4 }}>
                                                <TouchableOpacity
                                                    style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: subBillingCycle === 'monthly' ? (isDark ? '#4B5563' : '#FFFFFF') : 'transparent', alignItems: 'center' }}
                                                    onPress={() => setSubBillingCycle('monthly')}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: subBillingCycle === 'monthly' ? (isDark ? '#FFF' : '#000') : (isDark ? '#9CA3AF' : '#6B7280') }}>Month</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: subBillingCycle === 'yearly' ? (isDark ? '#4B5563' : '#FFFFFF') : 'transparent', alignItems: 'center' }}
                                                    onPress={() => setSubBillingCycle('yearly')}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: subBillingCycle === 'yearly' ? (isDark ? '#FFF' : '#000') : (isDark ? '#9CA3AF' : '#6B7280') }}>Year</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalAmount}</Text>
                                            <TextInput
                                                style={[styles.input, isDark && styles.inputDark]}
                                                value={formatNumberInput(goalAmount)}
                                                onChangeText={handleAmountChange}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            />
                                        </View>
                                    </View>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputRenewal}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setDatePickerMode('date');
                                            setShowDatePicker(true);
                                        }}
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                style={[styles.input, isDark && styles.inputDark]}
                                                value={goalDeadline}
                                                editable={false}
                                                placeholder="DD/MM/YYYY"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* DEBT MODAL CONTENT (Mint Pastel) */}
                            {goalType === 'debt' && (
                                <View>
                                    <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: isDark ? '#374151' : '#E0F2F1', padding: 4, borderRadius: 12 }}>
                                        <TouchableOpacity
                                            style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: debtOrCredit === 'lending' ? '#00796B' : 'transparent', alignItems: 'center' }}
                                            onPress={() => setDebtOrCredit('lending')}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: debtOrCredit === 'lending' ? '#FFF' : '#00796B' }}>Cho vay</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: debtOrCredit === 'borrowing' ? '#D32F2F' : 'transparent', alignItems: 'center' }}
                                            onPress={() => setDebtOrCredit('borrowing')}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: debtOrCredit === 'borrowing' ? '#FFF' : '#D32F2F' }}>Đi vay</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputPartner}</Text>
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={debtPartner}
                                        onChangeText={setDebtPartner}
                                        placeholder="Tên người..."
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    />

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputDebtAmount}</Text>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TextInput
                                            style={[styles.input, isDark && styles.inputDark, { flex: 1 }]}
                                            value={formatNumberInput(goalAmount)}
                                            onChangeText={handleAmountChange}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                        />
                                        <View style={[styles.input, isDark && styles.inputDark, { width: 80, alignItems: 'center', justifyContent: 'center' }]}>
                                            <Text style={{ fontWeight: 'bold', color: isDark ? '#FFF' : '#000' }}>VND</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.goalDeadline}</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setDatePickerMode('date');
                                            setShowDatePicker(true);
                                        }}
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                style={[styles.input, isDark && styles.inputDark]}
                                                value={goalDeadline}
                                                editable={false}
                                                placeholder="DD/MM/YYYY"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={{ marginTop: 10, height: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}
                                        onPress={() => pickGoalImage(setDebtProofImg)}
                                    >
                                        {debtProofImg ? (
                                            <Image source={{ uri: debtProofImg }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                                        ) : (
                                            <>
                                                <Ionicons name="camera-outline" size={30} color={colors.textSecondary} />
                                                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t.inputProof}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* TASK MODAL CONTENT (Peach Pastel) */}
                            {goalType === 'task' && (
                                <View>
                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputTaskTitle}</Text>
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={goalTitle}
                                        onChangeText={setGoalTitle}
                                        placeholder="Công việc cần làm..."
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    />

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputPriority}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                        {['low', 'medium', 'high'].map(p => (
                                            <TouchableOpacity
                                                key={p}
                                                style={{
                                                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
                                                    backgroundColor: taskPriority === p ?
                                                        (p === 'low' ? '#81C784' : p === 'medium' ? '#FFB74D' : '#E57373') :
                                                        (isDark ? '#374151' : '#F3F4F6')
                                                }}
                                                onPress={() => setTaskPriority(p as any)}
                                            >
                                                <Text style={{ color: taskPriority === p ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280'), fontWeight: '600', textTransform: 'capitalize' }}>
                                                    {p}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark, { marginTop: 12 }]}>{t.taskDetails}</Text>
                                    <View style={{ gap: 8, marginBottom: 12 }}>
                                        {subtasks.map((st) => (
                                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? '#374151' : '#F3F4F6', padding: 8, borderRadius: 12 }}>
                                                <TouchableOpacity onPress={() => {
                                                    setSubtasks(subtasks.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s));
                                                }}>
                                                    <Ionicons name={st.completed ? "checkbox" : "square-outline"} size={20} color={st.completed ? "#10B981" : (isDark ? '#9CA3AF' : '#6B7280')} />
                                                </TouchableOpacity>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: isDark ? '#FFF' : '#374151', textDecorationLine: st.completed ? 'line-through' : 'none', fontWeight: '500' }}>{st.title}</Text>
                                                    {st.time && (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            <Ionicons name="time-outline" size={12} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                                            <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}>{st.time}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <TouchableOpacity onPress={() => setSubtasks(subtasks.filter(s => s.id !== st.id))}>
                                                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}

                                        <View style={{ gap: 8 }}>
                                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                                <TextInput
                                                    style={[styles.input, isDark && styles.inputDark, { flex: 1, marginBottom: 0 }]}
                                                    value={newSubtask}
                                                    onChangeText={setNewSubtask}
                                                    placeholder={t.subtaskPlaceholder}
                                                    placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                />
                                                <TouchableOpacity
                                                    style={{ padding: 12, backgroundColor: '#10B981', borderRadius: 12 }}
                                                    onPress={() => {
                                                        if (newSubtask.trim()) {
                                                            setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtask.trim(), time: newSubtaskTime || undefined, completed: false }]);
                                                            setNewSubtask('');
                                                            setNewSubtaskTime('');
                                                        }
                                                    }}
                                                >
                                                    <Ionicons name="add" size={24} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>

                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, backgroundColor: isDark ? '#4B5563' : '#E5E7EB', borderRadius: 8 }}
                                                onPress={() => {
                                                    setDatePickerTarget('subtaskTime');
                                                    setShowExactTimePicker(true);
                                                    setReminderType('exact');
                                                }}
                                            >
                                                <Ionicons name="time-outline" size={16} color={isDark ? '#FFF' : '#374151'} />
                                                <Text style={{ fontSize: 13, color: isDark ? '#FFF' : '#374151' }}>
                                                    {newSubtaskTime || 'Chọn giờ'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: isDark ? '#374151' : '#FFF3E0', borderRadius: 12 }}
                                        onPress={() => pickGoalImage(setTaskRefImg)}
                                    >
                                        <Ionicons name="image-outline" size={24} color="#EF6C00" />
                                        <Text style={{ flex: 1, color: isDark ? '#FFF' : '#EF6C00' }}>{t.uploadRef}</Text>
                                        {taskRefImg && <Ionicons name="checkmark-circle" size={20} color="#EF6C00" />}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* PLAN MODAL CONTENT (Pearl Blue) */}
                            {goalType === 'plan' && (
                                <View>
                                    <TouchableOpacity
                                        style={{ height: 150, backgroundColor: '#E1F5FE', borderRadius: 16, marginBottom: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                                        onPress={() => pickGoalImage(setPlanInspoImg)}
                                    >
                                        {planInspoImg ? (
                                            <Image source={{ uri: planInspoImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                        ) : (
                                            <View style={{ alignItems: 'center' }}>
                                                <Ionicons name="image" size={40} color="#0288D1" />
                                                <Text style={{ marginTop: 8, color: '#0288D1', fontWeight: '600' }}>{t.uploadInspo}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputPlanGoal}</Text>
                                    <TextInput
                                        style={[styles.input, isDark && styles.inputDark]}
                                        value={goalTitle}
                                        onChangeText={setGoalTitle}
                                        placeholder="Mục tiêu (vd: Tập Gym)..."
                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                    />

                                    <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.inputFrequency}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                        {['daily', 'weekly', 'custom'].map(f => (
                                            <TouchableOpacity
                                                key={f}
                                                style={{
                                                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
                                                    backgroundColor: planFrequency === f ? '#0288D1' : (isDark ? '#374151' : '#E1F5FE')
                                                }}
                                                onPress={() => setPlanFrequency(f as any)}
                                            >
                                                <Text style={{ color: planFrequency === f ? '#FFF' : '#0277BD', fontWeight: '600', textTransform: 'capitalize' }}>
                                                    {f === 'daily' ? t.freqDaily : f === 'weekly' ? t.freqWeekly : t.freqCustom}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Weekly Days Selector */}
                                    {planFrequency === 'weekly' && (
                                        <View style={{ marginBottom: 16 }}>
                                            <Text style={[styles.inputLabel, isDark && styles.textDark, { fontSize: 12, marginBottom: 8 }]}>{t.selectDays}</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, index) => (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={{
                                                            width: 40, height: 40, borderRadius: 20,
                                                            backgroundColor: planWeeklyDays.includes(index) ? '#0288D1' : (isDark ? '#374151' : '#E1F5FE'),
                                                            alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                        onPress={() => {
                                                            if (planWeeklyDays.includes(index)) {
                                                                setPlanWeeklyDays(planWeeklyDays.filter(d => d !== index));
                                                            } else {
                                                                setPlanWeeklyDays([...planWeeklyDays, index].sort());
                                                            }
                                                        }}
                                                    >
                                                        <Text style={{ color: planWeeklyDays.includes(index) ? '#FFF' : '#0277BD', fontWeight: '600', fontSize: 12 }}>
                                                            {day}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Custom Interval Input */}
                                    {planFrequency === 'custom' && (
                                        <View style={{ marginBottom: 16 }}>
                                            <Text style={[styles.inputLabel, isDark && styles.textDark, { fontSize: 12 }]}>{t.everyXDays}</Text>
                                            <TextInput
                                                style={[styles.input, isDark && styles.inputDark]}
                                                value={planCustomInterval.toString()}
                                                onChangeText={(text) => setPlanCustomInterval(parseInt(text) || 1)}
                                                keyboardType="number-pad"
                                                placeholder="Số ngày (vd: 3)"
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            />

                                            <Text style={[styles.inputLabel, isDark && styles.textDark, { fontSize: 12, marginTop: 12 }]}>{t.startDate}</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setDatePickerTarget('customStart');
                                                    setDatePickerMode('date');
                                                    setShowDatePicker(true);
                                                }}
                                            >
                                                <View pointerEvents="none">
                                                    <TextInput
                                                        style={[styles.input, isDark && styles.inputDark]}
                                                        value={planCustomStartDate}
                                                        editable={false}
                                                        placeholder="DD/MM/YYYY"
                                                        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                                    />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Shared Reminder Toggle (For all types) */}
                            {/* Card 1: Reminder Enable & Time Selection */}
                            <View style={{ marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: isDark ? '#374151' : '#F9FAFB' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: reminderEnabled ? 16 : 0 }}>
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
                                    <View style={{ marginTop: 8 }}>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            {/* Date Picker - Not needed for Daily/Weekly Plan as it uses frequency */}
                                            {(goalType !== 'plan' || planFrequency === 'custom') && (
                                                <TouchableOpacity
                                                    style={{
                                                        flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
                                                        backgroundColor: isDark ? '#4B5563' : '#E5E7EB', borderRadius: 12
                                                    }}
                                                    onPress={() => {
                                                        setDatePickerTarget(planFrequency === 'custom' ? 'customStart' : 'deadline');
                                                        setDatePickerMode('date');
                                                        setShowDatePicker(true);
                                                    }}
                                                >
                                                    <Ionicons name="calendar-outline" size={18} color={isDark ? '#FFF' : '#374151'} />
                                                    <View>
                                                        <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>{t.startDate}</Text>
                                                        <Text style={{ fontSize: 13, color: isDark ? '#FFF' : '#374151', fontWeight: '600' }}>
                                                            {(planFrequency === 'custom' ? planCustomStartDate : goalDeadline) || 'Chọn ngày'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            )}

                                            {/* Time Picker */}
                                            <TouchableOpacity
                                                style={{
                                                    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
                                                    backgroundColor: isDark ? '#4B5563' : '#E5E7EB', borderRadius: 12
                                                }}
                                                onPress={() => { setReminderType('exact'); setShowExactTimePicker(true); }}
                                            >
                                                <Ionicons name="time-outline" size={18} color={isDark ? '#FFF' : '#374151'} />
                                                <View>
                                                    <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280' }}>{t.reminderTime}</Text>
                                                    <Text style={{ fontSize: 13, color: isDark ? '#FFF' : '#374151', fontWeight: '600' }}>
                                                        {exactTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Repeat Settings */}
                                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>{t.repeatCount}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4B5563' : '#E5E7EB', borderRadius: 12, paddingHorizontal: 8 }}>
                                                    <TouchableOpacity onPress={() => setRepeatCount(Math.max(1, repeatCount - 1))} style={{ padding: 8 }}>
                                                        <Ionicons name="remove-circle-outline" size={20} color={isDark ? '#FFF' : '#374151'} />
                                                    </TouchableOpacity>
                                                    <Text style={{ flex: 1, textAlign: 'center', color: isDark ? '#FFF' : '#374151', fontWeight: 'bold' }}>{repeatCount}x</Text>
                                                    <TouchableOpacity onPress={() => setRepeatCount(Math.min(10, repeatCount + 1))} style={{ padding: 8 }}>
                                                        <Ionicons name="add-circle-outline" size={20} color={isDark ? '#FFF' : '#374151'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 10, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 4 }}>{t.repeatInterval}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4B5563' : '#E5E7EB', borderRadius: 12, paddingHorizontal: 8 }}>
                                                    <TouchableOpacity onPress={() => setRepeatInterval(Math.max(1, repeatInterval - 5))} style={{ padding: 8 }}>
                                                        <Ionicons name="remove-circle-outline" size={20} color={isDark ? '#FFF' : '#374151'} />
                                                    </TouchableOpacity>
                                                    <Text style={{ flex: 1, textAlign: 'center', color: isDark ? '#FFF' : '#374151', fontWeight: 'bold' }}>{repeatInterval}p</Text>
                                                    <TouchableOpacity onPress={() => setRepeatInterval(Math.min(60, repeatInterval + 5))} style={{ padding: 8 }}>
                                                        <Ionicons name="add-circle-outline" size={20} color={isDark ? '#FFF' : '#374151'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Card 2: Sound Selection (Only visible if enabled) */}
                            {reminderEnabled && (
                                <View style={{ marginTop: 12, padding: 16, borderRadius: 16, backgroundColor: isDark ? '#374151' : '#F9FAFB' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                        <Ionicons name="musical-note" size={20} color={isDark ? '#FFF' : '#374151'} />
                                        <Text style={[styles.inputLabel, isDark && styles.textDark, { marginBottom: 0 }]}>{t.sound}</Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                                                backgroundColor: soundType === 'default' ? '#10B981' : (isDark ? '#4B5563' : '#E5E7EB')
                                            }}
                                            onPress={() => setSoundType('default')}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: soundType === 'default' ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280') }}>{t.soundDefault}</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={{
                                                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                                                backgroundColor: soundType === 'custom' ? '#10B981' : (isDark ? '#4B5563' : '#E5E7EB')
                                            }}
                                            onPress={() => setSoundType('custom')}
                                        >
                                            <Text style={{ fontSize: 13, fontWeight: '600', color: soundType === 'custom' ? '#FFF' : (isDark ? '#9CA3AF' : '#6B7280') }}>{t.freqCustom}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {soundType === 'custom' && (
                                        <View style={{ marginTop: 12, gap: 8 }}>
                                            <TouchableOpacity
                                                style={{
                                                    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12,
                                                    backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#10B981'
                                                }}
                                                onPress={pickCustomSound}
                                            >
                                                <Ionicons name="cloud-upload-outline" size={20} color="#10B981" />
                                                <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#D1D5DB' : '#374151' }} numberOfLines={1}>
                                                    {customSound ? customSound.name : t.pickSound}
                                                </Text>
                                                {customSound && (
                                                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setCustomSound(null); }}>
                                                        <Ionicons name="close-circle" size={18} color={colors.error} />
                                                    </TouchableOpacity>
                                                )}
                                            </TouchableOpacity>

                                            <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}>— {language === 'Tiếng Việt' ? 'Hoặc nhập URI thủ công' : 'Or enter URI manually'} —</Text>

                                            <TextInput
                                                style={[styles.input, isDark && styles.inputDark, { marginBottom: 0, fontSize: 12 }]}
                                                value={customSound?.uri || ''}
                                                onChangeText={(text) => setCustomSound({ name: text.split('/').pop() || 'Manual URI', uri: text })}
                                                placeholder={t.manualUriPlaceholder}
                                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsGoalModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, {
                                    backgroundColor: goalType === 'subscription' ? '#8E24AA' :
                                        goalType === 'debt' ? '#00796B' :
                                            goalType === 'task' ? '#EF6C00' :
                                                goalType === 'plan' ? '#0288D1' : '#111827'
                                }]}
                                onPress={handleSaveGoal}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                        {Platform.OS === 'ios' && (showDatePicker || showExactTimePicker) && (
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingHorizontal: 20,
                                paddingVertical: 15,
                                borderBottomWidth: 1,
                                borderBottomColor: isDark ? '#374151' : '#E5E7EB',
                                backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                            }}>
                                <TouchableOpacity onPress={() => { setShowExactTimePicker(false); setShowDatePicker(false); }}>
                                    <Text style={{ color: colors.error || '#FF3B30', fontSize: 17, fontWeight: '600' }}>
                                        {language === 'Tiếng Việt' ? 'Hủy' : 'Cancel'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    if (showDatePicker) handleDateChange({ type: 'set' }, tempDate, true);
                                    if (showExactTimePicker) handleExactTimeChange({ type: 'set' }, exactTime, true);
                                    setShowExactTimePicker(false);
                                    setShowDatePicker(false);
                                }}>
                                    <Text style={{ color: colors.primary || '#007AFF', fontSize: 17, fontWeight: 'bold' }}>
                                        {language === 'Tiếng Việt' ? 'Xong' : 'Done'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                            {showDatePicker && (
                                <RNDateTimePicker
                                    value={tempDate}
                                    mode={datePickerMode}
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                    textColor={isDark ? '#FFFFFF' : '#000000'}
                                    style={{ height: 200, width: '100%', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}
                                />
                            )}
                            {showExactTimePicker && (
                                <RNDateTimePicker
                                    value={exactTime}
                                    mode="time"
                                    is24Hour={true}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleExactTimeChange}
                                    textColor={isDark ? '#FFFFFF' : '#000000'}
                                    style={{ height: 200, width: '100%', backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }}
                                />
                            )}
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
                                        const status = await NotificationService.checkPermissions();
                                        if (status !== 'granted') {
                                            const granted = await NotificationService.registerForPushNotificationsAsync();
                                            if (granted) {
                                                setAreNotificationsAllowed(true);
                                            } else {
                                                Alert.alert(
                                                    language === 'Tiếng Việt' ? 'Quyền bị từ chối' : 'Permission Denied',
                                                    language === 'Tiếng Việt'
                                                        ? 'Vui lòng bật thông báo trong Cài đặt hệ thống.'
                                                        : 'Please enable notifications in system settings.',
                                                    [
                                                        { text: t.cancel, style: 'cancel' },
                                                        {
                                                            text: language === 'Tiếng Việt' ? 'Mở Cài đặt' : 'Open Settings',
                                                            onPress: () => Linking.openSettings()
                                                        }
                                                    ]
                                                );
                                                setAreNotificationsAllowed(false);
                                            }
                                        } else {
                                            setAreNotificationsAllowed(true);
                                        }
                                    } else {
                                        setAreNotificationsAllowed(false);
                                        // In reality, can't "un-grant" fully from app logic alone without system settings, 
                                        // but we can stop scheduling.
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
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, isDark && styles.modalContentDark, { maxHeight: '90%' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={[styles.modalTitle, isDark && styles.textDark, { marginBottom: 0 }]}>
                                {t.compoundInterest}
                            </Text>
                            <TouchableOpacity onPress={() => setIsCompoundModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color={isDark ? '#9CA3AF' : '#6B7280'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.principal}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpPrincipal}
                                onChangeText={(val) => setCpPrincipal(formatInputDots(val))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.monthlyContribution}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpMonthly}
                                onChangeText={(val) => setCpMonthly(formatInputDots(val))}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            />

                            <Text style={[styles.inputLabel, isDark && styles.textDark]}>{t.interestRate}</Text>
                            <TextInput
                                style={[styles.input, isDark && styles.inputDark]}
                                value={cpRate}
                                onChangeText={setCpRate}
                                keyboardType="decimal-pad"
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
                                <View style={{ padding: 16, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#065F46' : '#A7F3D0' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>{t.totalInvested}:</Text>
                                        <Text style={{ fontWeight: 'bold', color: isDark ? '#D1D5DB' : '#4B5563' }}>
                                            {formatCurrency(cpResult.totalInvested)}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563' }}>{t.totalInterest}:</Text>
                                        <Text style={{ fontWeight: 'bold', color: '#059669' }}>
                                            {formatCurrency(cpResult.totalInterest)}
                                        </Text>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: isDark ? '#065F46' : '#A7F3D0', marginVertical: 8 }} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ color: isDark ? '#D1D5DB' : '#4B5563', fontWeight: 'bold' }}>{t.futureValue}:</Text>
                                        <Text style={{ fontWeight: 'bold', color: '#10b981', fontSize: 18 }}>
                                            {formatCurrency(cpResult.futureValue)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={[styles.modalButtons, { marginTop: 10 }]}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                onPress={() => {
                                    setCpPrincipal('');
                                    setCpMonthly('');
                                    setCpRate('');
                                    setCpYears('');
                                    setCpResult(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>{language === 'Tiếng Việt' ? 'Xóa trắng' : 'Clear'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary, flex: 1 }]}
                                onPress={calculateCompoundInterest}
                            >
                                <Text style={styles.saveButtonText}>{t.calculate}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
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
                presentationStyle="fullScreen"
                onRequestClose={() => setActiveTool(null)}
            >
                <View style={[styles.container, { backgroundColor: '#000' }]}>
                    {activeTool && (
                        <View style={{ flex: 1 }}>
                            <WebView
                                source={activeTool.htmlContent ? { html: activeTool.htmlContent } : { uri: activeTool.url || '' }}
                                style={{ flex: 1, backgroundColor: '#000' }}
                                startInLoadingState
                                renderLoading={() => <ActivityIndicator color="#EC4899" style={{ position: 'absolute', top: '50%', left: '50%' }} />}
                                originWhitelist={['*']}
                            />

                            {/* Floating Close Button */}
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    top: Platform.OS === 'ios' ? 60 : 30,
                                    right: 20,
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    zIndex: 100
                                }}
                                onPress={() => setActiveTool(null)}
                            >
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
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
            {/* Security Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isSecurityModalVisible}
                onRequestClose={() => {
                    setIsSecurityModalVisible(false);
                    setSecurityStep('menu');
                    setPassInput('');
                    setNewPassInput('');
                    setConfirmPassInput('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDark && styles.modalContentDark, { height: 'auto', maxHeight: '80%' }]}>
                        <ThemedText variant="h3" style={styles.modalTitle}>
                            {t.manageSecurity}
                        </ThemedText>

                        {!isSecurityEnabled && (
                            <View>
                                <ThemedText style={styles.inputLabel}>{t.newPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={newPassInput}
                                    onChangeText={setNewPassInput}
                                    secureTextEntry
                                    placeholder="******"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                />

                                <ThemedText style={styles.inputLabel}>{t.confirmPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={confirmPassInput}
                                    onChangeText={setConfirmPassInput}
                                    secureTextEntry
                                    placeholder="******"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                        onPress={() => setIsSecurityModalVisible(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: colors.primary, flex: 1 }]}
                                        onPress={async () => {
                                            if (newPassInput.length < 4) {
                                                Alert.alert('Error', 'Password too short');
                                                return;
                                            }
                                            if (newPassInput !== confirmPassInput) {
                                                Alert.alert('Error', t.passwordsNoMatch);
                                                return;
                                            }
                                            await SecurityService.setPassword(newPassInput);
                                            await SecurityService.setEnabled(true);
                                            await checkSecurityStatus();
                                            setIsSecurityModalVisible(false);
                                            setNewPassInput('');
                                            setConfirmPassInput('');
                                        }}
                                    >
                                        <Text style={styles.saveButtonText}>{t.save}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {isSecurityEnabled && securityStep === 'menu' && (
                            <View style={{ gap: 12 }}>
                                <MenuItem
                                    icon="key-outline"
                                    label={t.changePassword}
                                    onPress={() => setSecurityStep('change')}
                                />
                                <MenuItem
                                    icon="finger-print-outline"
                                    label={t.enableBiometrics}
                                    onPress={async () => {
                                        const current = await SecurityService.isBiometricsEnabled();
                                        const avail = await SecurityService.hasHardwareAsync();
                                        if (!avail) {
                                            Alert.alert('Not Supported', 'Biometrics not available on this device');
                                            return;
                                        }
                                        await SecurityService.setBiometricsEnabled(!current);
                                        Alert.alert('Success', !current ? 'Biometrics Enabled' : 'Biometrics Disabled');
                                    }}
                                />
                                <MenuItem
                                    icon="help-buoy-outline"
                                    label={t.hintTitle}
                                    onPress={() => setSecurityStep('hint')}
                                />

                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: colors.error, marginTop: 20 }]}
                                    onPress={() => setSecurityStep('disable')}
                                >
                                    <Text style={styles.saveButtonText}>Disable Security</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton, { marginTop: 10 }]}
                                    onPress={() => setIsSecurityModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {isSecurityEnabled && securityStep === 'change' && (
                            <View>
                                <ThemedText style={styles.inputLabel}>{t.oldPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={passInput}
                                    onChangeText={setPassInput}
                                    secureTextEntry
                                    keyboardType="numeric"
                                />
                                <ThemedText style={styles.inputLabel}>{t.newPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={newPassInput}
                                    onChangeText={setNewPassInput}
                                    secureTextEntry
                                    keyboardType="numeric"
                                />
                                <ThemedText style={styles.inputLabel}>{t.confirmPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={confirmPassInput}
                                    onChangeText={setConfirmPassInput}
                                    secureTextEntry
                                    keyboardType="numeric"
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                        onPress={() => {
                                            setSecurityStep('menu');
                                            setPassInput('');
                                            setNewPassInput('');
                                            setConfirmPassInput('');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: colors.primary, flex: 1 }]}
                                        onPress={async () => {
                                            const valid = await SecurityService.validatePassword(passInput);
                                            if (!valid) {
                                                Alert.alert('Error', t.wrongPassword);
                                                return;
                                            }
                                            if (newPassInput !== confirmPassInput) {
                                                Alert.alert('Error', t.passwordsNoMatch);
                                                return;
                                            }
                                            await SecurityService.setPassword(newPassInput);
                                            Alert.alert('Success', 'Password Changed');
                                            setSecurityStep('menu');
                                            setPassInput('');
                                            setNewPassInput('');
                                            setConfirmPassInput('');
                                        }}
                                    >
                                        <Text style={styles.saveButtonText}>{t.save}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {isSecurityEnabled && securityStep === 'hint' && (
                            <View>
                                <ThemedText style={styles.inputLabel}>{t.hintQuestion}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={hintQInput}
                                    onChangeText={setHintQInput}
                                    placeholder="e.g. First pet's name"
                                    placeholderTextColor="#9CA3AF"
                                />
                                <ThemedText style={styles.inputLabel}>{t.hintAnswer}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={hintAInput}
                                    onChangeText={setHintAInput}
                                    placeholder="..."
                                    placeholderTextColor="#9CA3AF"
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                        onPress={() => {
                                            setSecurityStep('menu');
                                            setHintQInput('');
                                            setHintAInput('');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: colors.primary, flex: 1 }]}
                                        onPress={async () => {
                                            if (!hintQInput || !hintAInput) return;
                                            await SecurityService.setHint(hintQInput, hintAInput);
                                            Alert.alert('Success', 'Hint Saved');
                                            setSecurityStep('menu');
                                            setHintQInput('');
                                            setHintAInput('');
                                        }}
                                    >
                                        <Text style={styles.saveButtonText}>{t.save}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {isSecurityEnabled && securityStep === 'disable' && (
                            <View>
                                <ThemedText style={styles.inputLabel}>{t.enterPassword}</ThemedText>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    value={passInput}
                                    onChangeText={setPassInput}
                                    secureTextEntry
                                    keyboardType="numeric"
                                />
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={[styles.modalButton, styles.cancelButton, { flex: 1 }]}
                                        onPress={() => {
                                            setSecurityStep('menu');
                                            setPassInput('');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalButton, { backgroundColor: colors.error, flex: 1 }]}
                                        onPress={async () => {
                                            const valid = await SecurityService.validatePassword(passInput);
                                            if (!valid) {
                                                Alert.alert('Error', t.wrongPassword);
                                                return;
                                            }
                                            await SecurityService.setEnabled(false);
                                            await checkSecurityStatus();
                                            setIsSecurityModalVisible(false);
                                            setSecurityStep('menu');
                                            setPassInput('');
                                        }}
                                    >
                                        <Text style={styles.saveButtonText}>Confirm Disable</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
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
        width: '90%',
        maxWidth: 550,
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
        padding: 20,
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
