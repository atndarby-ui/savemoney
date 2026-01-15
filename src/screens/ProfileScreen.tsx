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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category } from '../types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface ProfileScreenProps {
    transactions: Transaction[];
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    language: 'Tiếng Việt' | 'English';
    setLanguage: (lang: 'Tiếng Việt' | 'English') => void;
    categories: Category[];
    onAddCategory: (cat: Category) => void;
    onUpdateCategory: (cat: Category) => void;
    onDeleteCategory: (id: string) => void;
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
        categoriesTitle: 'Danh mục',
        profileTitle: 'Hồ sơ',
        addCategory: 'Thêm danh mục',
        editCategory: 'Sửa danh mục',
        deleteCategory: 'Xóa danh mục',
        catName: 'Tên danh mục',
        catIcon: 'Biểu tượng',
        catType: 'Loại',
        catColor: 'Màu sắc',
        incomeTab: 'Thu nhập',
        expenseTab: 'Chi tiêu',
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
        categoriesTitle: 'Categories',
        profileTitle: 'Profile',
        addCategory: 'Add Category',
        editCategory: 'Edit Category',
        deleteCategory: 'Delete Category',
        catName: 'Category Name',
        catIcon: 'Icon (Emoji)',
        catType: 'Type',
        catColor: 'Color',
        incomeTab: 'Income',
        expenseTab: 'Expense',
    },
};

export default function ProfileScreen({
    transactions,
    theme,
    setTheme,
    language,
    setLanguage,
    categories,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
}: ProfileScreenProps) {
    const t = translations[language];
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<'profile' | 'categories'>('profile');
    const [userName, setUserName] = useState('Nguyễn Văn A');
    const [userEmail, setUserEmail] = useState('nguyenvana@gmail.com');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editName, setEditName] = useState(userName);
    const [editEmail, setEditEmail] = useState(userEmail);

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
        } catch (error) {
            console.error('Error loading user info:', error);
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

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

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
        <View style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.tabContainer, isDark && styles.tabContainerDark]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                    onPress={() => setActiveTab('profile')}
                >
                    <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText, isDark && activeTab !== 'profile' && styles.textDark70]}>
                        {t.profileTitle}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
                    onPress={() => setActiveTab('categories')}
                >
                    <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText, isDark && activeTab !== 'categories' && styles.textDark70]}>
                        {t.categoriesTitle}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.content}
            >
                {activeTab === 'profile' ? (
                    <>
                        {/* Profile Header */}
                        <View style={[styles.header, isDark && styles.headerDark]}>
                            <View style={styles.avatarContainer}>
                                <TouchableOpacity
                                    style={[styles.avatar, isDark && styles.avatarDark]}
                                    onPress={pickImage}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={{ uri: avatarUri || defaultAvatar }}
                                        style={styles.avatarImage}
                                    />
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="camera" size={14} color="#FFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.name, isDark && styles.textDark]}>{userName}</Text>
                            <Text style={styles.email}>{userEmail}</Text>

                            <View style={styles.statsRow}>
                                <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                                    <Text style={styles.statLabel}>{t.income}</Text>
                                    <Text style={[styles.statValue, styles.incomeText]}>
                                        +{formatLargeNum(totalIncome)}
                                    </Text>
                                </View>
                                <View style={[styles.statBox, isDark && styles.statBoxDark]}>
                                    <Text style={styles.statLabel}>{t.savings}</Text>
                                    <Text style={[styles.statValue, isDark && styles.textDark]}>
                                        {formatLargeNum(totalSavings)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Account Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.account}</Text>
                            <View style={[styles.menuCard, isDark && styles.menuCardDark]}>
                                <MenuItem
                                    icon="person"
                                    iconBgColor="#8B5CF6" // Purple
                                    label={t.personalInfo}
                                    onPress={handleEditProfile}
                                    isDark={isDark}
                                />
                                <MenuItem
                                    icon="card"
                                    iconBgColor="#3B82F6" // Blue
                                    label={t.paymentMethods}
                                    onPress={() => { }}
                                    isDark={isDark}
                                />
                                <MenuItem
                                    icon="lock-closed"
                                    iconBgColor="#F59E0B" // Yellow/Orange
                                    label={t.security}
                                    onPress={() => { }}
                                    isDark={isDark}
                                    last
                                />
                            </View>
                        </View>

                        {/* Settings Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t.settings}</Text>
                            <View style={[styles.menuCard, isDark && styles.menuCardDark]}>
                                <MenuItem
                                    icon="notifications"
                                    iconBgColor="#F59E0B"
                                    label={t.notifications}
                                    onPress={() => { }}
                                    isDark={isDark}
                                />
                                <MenuItem
                                    icon="moon"
                                    iconBgColor="#6366F1"
                                    label={t.theme}
                                    value={theme === 'light' ? t.light : t.dark}
                                    onPress={toggleTheme}
                                    isDark={isDark}
                                    valueColor={theme === 'light' ? '#10b981' : '#FBBF24'}
                                />
                                <MenuItem
                                    icon="globe"
                                    iconBgColor="#3B82F6" // Blue
                                    label={t.lang}
                                    value={language}
                                    onPress={toggleLanguage}
                                    isDark={isDark}
                                    valueColor="#10b981"
                                    last
                                />
                            </View>
                        </View>

                        {/* Logout Button */}
                        <TouchableOpacity style={[styles.logoutButton, isDark && styles.logoutButtonDark]}>
                            <Text style={styles.logoutText}>{t.logout}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.categoriesContainer}>
                        <TouchableOpacity
                            style={[styles.addCategoryBtn, isDark && styles.addCategoryBtnDark]}
                            onPress={() => handleCategoryAction()}
                        >
                            <Ionicons name="add-circle" size={24} color="#10b981" />
                            <Text style={[styles.addCategoryText, isDark && styles.textDark]}>{t.addCategory}</Text>
                        </TouchableOpacity>

                        <View style={styles.catTypeTabs}>
                            <TouchableOpacity
                                style={[styles.catTypeTab, editCatType === 'expense' && styles.catTypeTabActive]}
                                onPress={() => setEditCatType('expense')}
                            >
                                <Text style={[styles.catTypeTabText, editCatType === 'expense' && styles.catTypeTabTextActive]}>
                                    {t.expenseTab}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.catTypeTab, editCatType === 'income' && styles.catTypeTabActive]}
                                onPress={() => setEditCatType('income')}
                            >
                                <Text style={[styles.catTypeTabText, editCatType === 'income' && styles.catTypeTabTextActive]}>
                                    {t.incomeTab}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.menuCard, isDark && styles.menuCardDark]}>
                            {categories.filter(c => c.type === editCatType).map((cat, idx, arr) => (
                                <View key={cat.id} style={[styles.menuItem, idx !== arr.length - 1 && styles.menuItemBorder, isDark && styles.menuItemBorderDark]}>
                                    <View style={styles.menuLeft}>
                                        <Text style={{ fontSize: 24, marginRight: 12 }}>{cat.icon}</Text>
                                        <Text style={[styles.menuLabel, isDark && styles.textDark]}>{cat.name}</Text>
                                    </View>
                                    <View style={styles.menuRight}>
                                        <TouchableOpacity onPress={() => handleCategoryAction(cat)}>
                                            <Ionicons name="pencil" size={20} color="#3B82F6" style={{ marginRight: 15 }} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteCategoryClick(cat.id)}>
                                            <Ionicons name="trash" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

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

            {/* Edit Modal */}
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
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setIsEditingInfo(false)}
                            >
                                <Text style={styles.cancelButtonText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSaveInfo}
                            >
                                <Text style={styles.saveButtonText}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const MenuItem = ({
    icon,
    iconBgColor = '#6B7280',
    label,
    value,
    onPress,
    isDark,
    last,
    valueColor
}: {
    icon: any;
    iconBgColor?: string;
    label: string;
    value?: string;
    onPress: () => void;
    isDark: boolean;
    last?: boolean;
    valueColor?: string;
}) => (
    <TouchableOpacity
        style={[styles.menuItem, !last && styles.menuItemBorder, isDark && !last && styles.menuItemBorderDark]}
        onPress={onPress}
    >
        <View style={styles.menuLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : iconBgColor + '15' }]}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'transparent' : 'transparent' }]}>
                    <Ionicons name={icon} size={20} color={isDark ? iconBgColor : iconBgColor} />
                </View>
            </View>
            <Text style={[styles.menuLabel, isDark && styles.textDark]}>{label}</Text>
        </View>
        <View style={styles.menuRight}>
            {value && <Text style={[styles.menuValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>}
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    headerDark: {
        backgroundColor: '#1F2937',
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
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
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
        backgroundColor: '#F9FAFB',
        gap: 16,
    },
    tabContainerDark: {
        backgroundColor: '#111827',
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
});
