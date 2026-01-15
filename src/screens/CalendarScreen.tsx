import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Modal,
    Image,
    Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, DailySummary, Category } from '../types';
import { formatCurrency, formatCompactCurrency, isSameDay } from '../utils/format';
import { Ionicons } from '@expo/vector-icons';
import FloatingButtons from '../components/FloatingButtons';

interface CalendarScreenProps {
    transactions: Transaction[];
    categories: Category[];
    onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
    onUpdateTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    navigation: any;
    language: 'Tiếng Việt' | 'English';
    theme: 'light' | 'dark';
}

const translations = {
    'Tiếng Việt': {
        overview: 'TỔNG QUAN',
        monthLabel: 'Tháng',
        income: 'THU NHẬP',
        expense: 'CHI TIÊU',
        details: 'Chi tiết ngày',
        noTx: 'Chưa có giao dịch nào',
        netCashflow: 'DÒNG TIỀN RÒNG (THÁNG)',
        days: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    },
    'English': {
        overview: 'OVERVIEW',
        monthLabel: 'Month',
        income: 'INCOME',
        expense: 'EXPENSE',
        details: 'Daily Details',
        noTx: 'No transactions yet',
        netCashflow: 'NET CASHFLOW (MONTH)',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
};

export default function CalendarScreen({
    transactions,
    categories,
    navigation,
    language,
    theme,
}: CalendarScreenProps) {
    const t = translations[language];
    const isDark = theme === 'dark';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');

    const defaultAvatar = 'https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light';

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadUserData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadUserData = async () => {
        const avatar = await AsyncStorage.getItem('profile_avatar');
        const name = await AsyncStorage.getItem('profile_name');
        setAvatarUri(avatar);
        if (name) setUserName(name);
    };

    // Calendar logic
    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        const startDay = date.getDay();
        for (let i = 0; i < startDay; i++) days.push(null);
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const dailySummaries = useMemo(() => {
        const summaries: Record<string, DailySummary> = {};
        transactions.forEach((tx) => {
            const d = new Date(tx.date);
            const key = d.toDateString();
            if (!summaries[key]) summaries[key] = { date: d, income: 0, expense: 0 };
            if (tx.type === 'income') summaries[key].income += tx.amount;
            else summaries[key].expense += tx.amount;
        });
        return summaries;
    }, [transactions]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const currentSummary = useMemo(() => {
        let inc = 0,
            exp = 0;
        transactions.forEach((tx) => {
            const tDate = new Date(tx.date);
            if (
                tDate.getMonth() === currentDate.getMonth() &&
                tDate.getFullYear() === currentDate.getFullYear()
            ) {
                if (tx.type === 'income') inc += tx.amount;
                else exp += tx.amount;
            }
        });
        return { income: inc, expense: exp };
    }, [transactions, currentDate]);

    const selectedDayTransactions = useMemo(() => {
        return transactions.filter((tx) => isSameDay(new Date(tx.date), selectedDate));
    }, [transactions, selectedDate]);

    const selectedDaySummary = useMemo(() => {
        return selectedDayTransactions.reduce(
            (acc, tx) => {
                if (tx.type === 'income') acc.inc += tx.amount;
                else acc.exp += tx.amount;
                return acc;
            },
            { inc: 0, exp: 0 }
        );
    }, [selectedDayTransactions]);

    const netCashflow = currentSummary.income - currentSummary.expense;

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.content}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={[styles.profileButton, isDark && styles.profileButtonDark]}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImageHeader} />
                            ) : (
                                <Ionicons name="person-circle-outline" size={32} color={isDark ? '#FFF' : '#374151'} />
                            )}
                        </TouchableOpacity>
                        <View>
                            <Text style={[styles.subtitle, isDark && styles.textLight]}>
                                {t.overview}
                            </Text>
                            <Text style={[styles.title, isDark && styles.textDark]}>
                                {userName ? (language === 'Tiếng Việt' ? `Chào, ${userName}` : `Hi, ${userName}`) : (language === 'Tiếng Việt'
                                    ? `Tháng ${currentDate.getMonth() + 1}`
                                    : currentDate.toLocaleString('en-US', {
                                        month: 'long',
                                        year: 'numeric',
                                    }))}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.monthButtons}>
                        <TouchableOpacity
                            style={[styles.monthButton, isDark && styles.monthButtonDark]}
                            onPress={() => changeMonth(-1)}
                        >
                            <Ionicons name="chevron-back" size={20} color={isDark ? '#FFF' : '#374151'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.monthButton, isDark && styles.monthButtonDark]}
                            onPress={() => changeMonth(1)}
                        >
                            <Ionicons name="chevron-forward" size={20} color={isDark ? '#FFF' : '#374151'} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar Grid */}
                <View style={[styles.calendarCard, isDark && styles.calendarCardDark]}>
                    <View style={styles.weekDays}>
                        {t.days.map((d, i) => (
                            <Text key={i} style={[styles.weekDay, isDark && styles.textLight]}>
                                {d}
                            </Text>
                        ))}
                    </View>
                    <View style={styles.daysGrid}>
                        {daysInMonth.map((date, index) => {
                            if (!date)
                                return <View key={`empty-${index}`} style={styles.dayCell} />;
                            const summary = dailySummaries[date.toDateString()];
                            const isSelected = isSameDay(date, selectedDate);
                            const hasIncome = summary && summary.income > 0;
                            const hasExpense = summary && summary.expense > 0;

                            return (
                                <TouchableOpacity
                                    key={date.toISOString()}
                                    style={styles.dayCell}
                                    onPress={() => setSelectedDate(date)}
                                >
                                    <View
                                        style={[
                                            styles.dayCircle,
                                            isSelected && styles.dayCircleSelected,
                                            isSelected && isDark && styles.dayCircleSelectedDark,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                isSelected && styles.dayTextSelected,
                                                !isSelected && isDark && styles.textLight,
                                            ]}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </View>
                                    <View style={styles.indicators}>
                                        {hasIncome && <View style={[styles.dotIndicator, styles.incomeDot]} />}
                                        {hasExpense && <View style={[styles.dotIndicator, styles.expenseDot]} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
                        <View style={[styles.iconCircle, styles.incomeIconBg]}>
                            <Ionicons name="arrow-down" size={16} color="#10b981" />
                        </View>
                        <Text style={[styles.summaryLabel, isDark && styles.textLight]}>
                            {t.income}
                        </Text>
                        <Text style={[styles.summaryValue, styles.incomeText]}>
                            {formatCompactCurrency(selectedDaySummary.inc)}
                        </Text>
                    </View>
                    <View style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
                        <View style={[styles.iconCircle, styles.expenseIconBg]}>
                            <Ionicons name="arrow-up" size={16} color="#f43f5e" />
                        </View>
                        <Text style={[styles.summaryLabel, isDark && styles.textLight]}>
                            {t.expense}
                        </Text>
                        <Text style={[styles.summaryValue, isDark && styles.textDark]}>
                            {formatCompactCurrency(selectedDaySummary.exp)}
                        </Text>
                    </View>
                </View>

                {/* Selected Day Transactions */}
                <View style={[styles.transactionsCard, isDark && styles.transactionsCardDark]}>
                    <View style={styles.transactionsHeader}>
                        <View style={styles.dateTag}>
                            <Text style={[styles.dateTagText, isDark && styles.textDark]}>
                                {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
                            </Text>
                        </View>
                        <Text style={[styles.detailsLabel, isDark && styles.textLight]}>
                            {t.details}
                        </Text>
                    </View>

                    {selectedDayTransactions.length === 0 ? (
                        <Text style={[styles.noTxText, isDark && styles.textLight]}>
                            {t.noTx}
                        </Text>
                    ) : (
                        selectedDayTransactions.map((tx) => {
                            const cat = categories.find((c) => c.id === tx.categoryId);
                            return (
                                <TouchableOpacity
                                    key={tx.id}
                                    style={styles.txItem}
                                    onPress={() => navigation.navigate('AddTransaction', {
                                        initialData: {
                                            ...tx,
                                            category: tx.categoryId,
                                            date: tx.date.toISOString(),
                                        }
                                    })}
                                >
                                    <View style={styles.txLeft}>
                                        <View
                                            style={[styles.txIcon, isDark && styles.txIconDark]}
                                        >
                                            <Text style={styles.txIconText}>{cat?.icon}</Text>
                                        </View>
                                        <View>
                                            <Text style={[styles.txName, isDark && styles.textDark]}>
                                                {cat?.name}
                                            </Text>
                                            {tx.note && (
                                                <Text style={[styles.txNote, isDark && styles.textLight]}>
                                                    {tx.note}
                                                </Text>
                                            )}
                                            {tx.imageUri && (
                                                <TouchableOpacity
                                                    style={styles.receiptTag}
                                                    onPress={() => setViewerImage(tx.imageUri || null)}
                                                >
                                                    <Ionicons name="image-outline" size={12} color="#10b981" />
                                                    <Text style={styles.receiptTagText}>Đã đính kèm HĐ</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                    <Text
                                        style={[
                                            styles.txAmount,
                                            tx.type === 'expense'
                                                ? isDark
                                                    ? styles.textDark
                                                    : styles.expenseAmount
                                                : styles.incomeAmount,
                                        ]}
                                    >
                                        {tx.type === 'expense' ? '-' : '+'}
                                        {formatCurrency(tx.amount)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Net Cashflow */}
                <View style={[styles.cashflowCard, isDark && styles.cashflowCardDark]}>
                    <Text style={[styles.cashflowLabel, isDark && styles.cashflowLabelDark]}>
                        {t.netCashflow}
                    </Text>
                    <Text style={styles.cashflowValue}>
                        {netCashflow > 0 ? '+' : ''}
                        {formatCurrency(netCashflow)}
                    </Text>
                </View>
                {/* Image Viewer Modal */}
                <Modal
                    visible={!!viewerImage}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setViewerImage(null)}
                >
                    <View style={styles.modalContainer}>
                        <Pressable style={styles.modalOverlay} onPress={() => setViewerImage(null)} />
                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setViewerImage(null)}
                            >
                                <Ionicons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>
                            {viewerImage && (
                                <Image
                                    source={{ uri: viewerImage }}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                    </View>
                </Modal>
            </ScrollView>

            {/* Floating Action Buttons */}
            <FloatingButtons navigation={navigation} theme={theme} />
        </View>
    );
}

const { width } = Dimensions.get('window');
const daySize = (width - 92) / 7;

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
        paddingBottom: 100,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    profileButtonDark: {
        backgroundColor: '#1F2937',
        shadowColor: 'transparent',
    },
    avatarImageHeader: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    monthButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    monthButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    monthButtonDark: {
        backgroundColor: '#1F2937',
        shadowColor: 'transparent',
    },
    calendarCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    calendarCardDark: {
        backgroundColor: '#1F2937',
        shadowColor: 'transparent',
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    weekDay: {
        width: daySize,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: daySize,
        height: daySize + 12,
        alignItems: 'center',
        marginBottom: 4,
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCircleSelected: {
        backgroundColor: '#111827',
    },
    dayCircleSelectedDark: {
        backgroundColor: '#10b981',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    indicators: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 6,
        height: 4,
    },
    dotIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    incomeDot: {
        backgroundColor: '#10b981',
    },
    expenseDot: {
        backgroundColor: '#f43f5e',
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    summaryCardDark: {
        backgroundColor: '#1F2937',
        shadowColor: 'transparent',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    incomeIconBg: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    expenseIconBg: {
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    incomeText: {
        color: '#10b981',
    },
    transactionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        marginBottom: 20,
        minHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    transactionsCardDark: {
        backgroundColor: '#1F2937',
        shadowColor: 'transparent',
    },
    transactionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    dateTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dateTagText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111827',
    },
    detailsLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#4B5563',
    },
    noTxText: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        paddingVertical: 40,
    },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    txIcon: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    txIconDark: {
        backgroundColor: '#374151',
    },
    txIconText: {
        fontSize: 20,
    },
    txName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    txNote: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    receiptTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    receiptTagText: {
        fontSize: 10,
        color: '#10b981',
        fontWeight: '600',
    },
    txAmount: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    expenseAmount: {
        color: '#111827',
    },
    incomeAmount: {
        color: '#10b981',
    },
    cashflowCard: {
        backgroundColor: '#111827',
        borderRadius: 28,
        padding: 28,
        marginBottom: 32,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
    },
    cashflowCardDark: {
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
    },
    cashflowLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    cashflowLabelDark: {
        color: '#FFFFFF',
        opacity: 0.9,
    },
    cashflowValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textLight: {
        color: '#9CA3AF',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImage: {
        width: width,
        height: width * 1.5,
        maxHeight: '80%',
    },
});
