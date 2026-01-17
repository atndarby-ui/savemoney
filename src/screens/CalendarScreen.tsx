import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    Pressable,
    ActivityIndicator,
    Platform,
    UIManager,
    Modal,
} from 'react-native';
import Animated, { LinearTransition, FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, DailySummary, Category } from '../types';
import { formatCurrency, formatCompactCurrency, isSameDay } from '../utils/format';
import { getGoldPrice, getFinancialRates, GoldPrice, FinancialRates } from '../services/finance';
import { getLunarDate } from '../utils/lunar';
import { Ionicons } from '@expo/vector-icons';
import FloatingButtons from '../components/FloatingButtons';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Enable LayoutAnimation on Android
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
        income: 'Thu nhập',
        expense: 'Chi tiêu',
        net: 'Ròng',
        details: 'Chi tiết ngày',
        noTx: 'Chưa có giao dịch nào',
        days: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        sjcBuy: 'SJC Mua',
        sjcSell: 'SJC Bán',
    },
    'English': {
        income: 'Income',
        expense: 'Expense',
        net: 'Net',
        details: 'Daily Details',
        noTx: 'No transactions yet',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        sjcBuy: 'SJC Buy',
        sjcSell: 'SJC Sell',
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
    const [isAmountVisible, setIsAmountVisible] = useState(true);

    // UI State
    const [isExpanded, setIsExpanded] = useState(false);

    // Finance Data State
    const [goldPrice, setGoldPrice] = useState<GoldPrice | null>(null);
    const [rates, setRates] = useState<FinancialRates | null>(null);
    const [isLoadingFinance, setIsLoadingFinance] = useState(false);
    const [indexSettings, setIndexSettings] = useState({
        usd: true,
        eur: true,
        btc: true,
        eth: true,
    });

    // Lunar Data
    const lunarData = useMemo(() => getLunarDate(selectedDate), [selectedDate]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadUserData();
            fetchFinanceData();
        });

        // Initial fetch
        fetchFinanceData();

        // Realtime polling (silent update)
        const interval = setInterval(() => fetchFinanceData(true), 60000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [navigation]);

    const loadUserData = async () => {
        const avatar = await AsyncStorage.getItem('profile_avatar');
        setAvatarUri(avatar);
        const savedSettings = await AsyncStorage.getItem('index_settings');
        if (savedSettings) {
            setIndexSettings(JSON.parse(savedSettings));
        }
        const savedVisibility = await AsyncStorage.getItem('amount_visibility');
        if (savedVisibility !== null) {
            setIsAmountVisible(savedVisibility === 'true');
        }
    };

    const toggleAmountVisibility = async () => {
        const nextValue = !isAmountVisible;
        setIsAmountVisible(nextValue);
        await AsyncStorage.setItem('amount_visibility', nextValue.toString());
    };

    const fetchFinanceData = async (isBackground = false) => {
        if (!isBackground) setIsLoadingFinance(true);
        try {
            const [gold, financialRates] = await Promise.all([
                getGoldPrice(),
                getFinancialRates()
            ]);
            setGoldPrice(gold);
            setRates(financialRates);
        } catch (error) {
            console.error(error);
        } finally {
            if (!isBackground) setIsLoadingFinance(false);
        }
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

    const netCashflow = currentSummary.income - currentSummary.expense;

    const toggleExpand = () => {
        if (isExpanded) {
            // Collapsing: Reset to today
            const today = new Date();
            setSelectedDate(today);
            setCurrentDate(today);
        }
        setIsExpanded(!isExpanded);
    };

    const renderCalendarGrid = () => (
        <View style={{ width: '100%' }}>
            <View style={styles.headerRowCalendar}>
                <Text style={[styles.title, isDark && styles.textDark, { fontSize: 20 }]}>
                    {language === 'Tiếng Việt'
                        ? `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`
                        : currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
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
                            onPress={() => {
                                setSelectedDate(date);
                                // Optional: collapse on select
                                // toggleExpand(); 
                            }}
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
    );

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.content}
            >
                {/* Header Profile & Stats */}
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={[styles.profileButton, isDark && styles.profileButtonDark]}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatarImageHeader} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={40} color={isDark ? '#FFF' : '#374151'} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <View style={styles.statLabelRow}>
                                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                                <Text style={[styles.statLabel, isDark && styles.textLight]}>{t.income}</Text>
                            </View>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>
                                {isAmountVisible ? formatCompactCurrency(currentSummary.income) : '******'}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statLabelRow}>
                                <View style={[styles.dot, { backgroundColor: '#f43f5e' }]} />
                                <Text style={[styles.statLabel, isDark && styles.textLight]}>{t.expense}</Text>
                            </View>
                            <Text style={[styles.statValue, { color: '#f43f5e' }]}>
                                {isAmountVisible ? formatCompactCurrency(currentSummary.expense) : '******'}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <View style={styles.statLabelRow}>
                                <Ionicons name="wallet-outline" size={10} color={isDark ? '#9CA3AF' : '#6B7280'} />
                                <Text style={[styles.statLabel, isDark && styles.textLight, { marginLeft: 4 }]}>{t.net}</Text>
                            </View>
                            <Text style={[styles.statValue, isDark && styles.textDark]}>
                                {isAmountVisible ? formatCurrency(netCashflow) : '******'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={toggleAmountVisibility}
                            style={styles.eyeButton}
                        >
                            <Ionicons
                                name={isAmountVisible ? "eye-outline" : "eye-off-outline"}
                                size={18}
                                color={isDark ? '#9CA3AF' : '#6B7280'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dashboard Layout: Animated Expansion */}
                <View style={styles.dashboardContainer}>
                    {/* Calendar Section (Left when collapsed / Top when expanded) */}
                    <AnimatedTouchableOpacity
                        layout={LinearTransition.duration(600)}
                        style={[
                            styles.cardBase,
                            styles.calendarSection,
                            isDark && styles.cardDark,
                            isExpanded ? { width: '100%' } : { width: '35%' }
                        ]}
                        onPress={toggleExpand}
                        activeOpacity={0.9}
                    >
                        {!isExpanded ? (
                            // Collapsed View: Date Card
                            <View style={styles.collapsedDateView}>
                                <Text style={[styles.dayNameText, isDark && styles.textLight]}>
                                    {language === 'Tiếng Việt'
                                        ? `Thứ ${selectedDate.getDay() + 1 === 1 ? 'CN' : selectedDate.getDay() + 1}`
                                        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selectedDate.getDay()]
                                    }
                                </Text>
                                <Text style={[styles.bigDateText, isDark && styles.textDark]}>
                                    {selectedDate.getDate()}
                                </Text>
                                <Text style={[styles.monthYearText, isDark && styles.textLight]}>
                                    {selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                                </Text>
                                <View style={[styles.lunarBadge, isDark && styles.lunarBadgeDark]}>
                                    <Text style={styles.moonEmoji}>
                                        {lunarData.moonEmoji}
                                    </Text>
                                    <Text style={styles.lunarTextBasic}>
                                        {lunarData.dateString}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            // Expanded View: Full Calendar
                            renderCalendarGrid()
                        )}
                    </AnimatedTouchableOpacity>

                    {/* Finance Section (Right when collapsed / Bottom when expanded) */}
                    <Animated.View
                        layout={LinearTransition.duration(600)}
                        style={[
                            styles.financeSection,
                            isExpanded ? { width: '100%' } : { width: '60%' }
                        ]}
                    >
                        {/* Row 1: Gold Prices */}
                        <View style={[styles.financeRow, isDark && styles.financeRowDark]}>
                            <View style={styles.financeItem}>
                                <Text style={styles.financeLabel}>{t.sjcBuy}</Text>
                                {isLoadingFinance ? (
                                    <ActivityIndicator size="small" color="#EAB308" />
                                ) : (
                                    <Text style={[styles.financeValue, { color: '#EAB308' }]}>
                                        {goldPrice?.buy || '--'}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.financeItem}>
                                <Text style={styles.financeLabel}>{t.sjcSell}</Text>
                                {isLoadingFinance ? (
                                    <ActivityIndicator size="small" color="#EAB308" />
                                ) : (
                                    <Text style={[styles.financeValue, { color: '#EAB308' }]}>
                                        {goldPrice?.sell || '--'}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Exchange Rates Rows */}
                        {(indexSettings.usd || indexSettings.eur) && (
                            <View style={[styles.financeRow, isDark && styles.financeRowDark]}>
                                {indexSettings.usd && (
                                    <View style={styles.financeItem}>
                                        <View style={styles.iconLabelRow}>
                                            <Ionicons name="cash-outline" size={12} color="#22C55E" />
                                            <Text style={styles.financeLabel}>USD</Text>
                                        </View>
                                        {isLoadingFinance ? (
                                            <ActivityIndicator size="small" color="#22C55E" />
                                        ) : (
                                            <Text style={[styles.financeValue, isDark && styles.textDark]}>
                                                {rates?.usd ? rates.usd.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '--'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {indexSettings.usd && indexSettings.eur && <View style={styles.verticalDivider} />}
                                {indexSettings.eur && (
                                    <View style={styles.financeItem}>
                                        <View style={styles.iconLabelRow}>
                                            <Ionicons name="cash-outline" size={12} color="#3B82F6" />
                                            <Text style={styles.financeLabel}>EUR</Text>
                                        </View>
                                        {isLoadingFinance ? (
                                            <ActivityIndicator size="small" color="#3B82F6" />
                                        ) : (
                                            <Text style={[styles.financeValue, isDark && styles.textDark]}>
                                                {rates?.eur ? rates.eur.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '--'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {(indexSettings.btc || indexSettings.eth) && (
                            <View style={[styles.financeRow, isDark && styles.financeRowDark]}>
                                {indexSettings.btc && (
                                    <View style={styles.financeItem}>
                                        <View style={styles.iconLabelRow}>
                                            <Ionicons name="logo-bitcoin" size={12} color="#F97316" />
                                            <Text style={styles.financeLabel}>BTC</Text>
                                        </View>
                                        {isLoadingFinance ? (
                                            <ActivityIndicator size="small" color="#F97316" />
                                        ) : (
                                            <Text style={[styles.financeValue, isDark && styles.textDark]}>
                                                {rates?.btc ? rates.btc.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '--'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                {indexSettings.btc && indexSettings.eth && <View style={styles.verticalDivider} />}
                                {indexSettings.eth && (
                                    <View style={styles.financeItem}>
                                        <View style={styles.iconLabelRow}>
                                            <Ionicons name="diamond-outline" size={12} color="#6366F1" />
                                            <Text style={styles.financeLabel}>ETH</Text>
                                        </View>
                                        {isLoadingFinance ? (
                                            <ActivityIndicator size="small" color="#6366F1" />
                                        ) : (
                                            <Text style={[styles.financeValue, isDark && styles.textDark]}>
                                                {rates?.eth ? rates.eth.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '--'}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </Animated.View>
                </View>

                {/* Selected Day Transactions */}
                <View style={[styles.transactionsCard, isDark && styles.transactionsCardDark]}>
                    <View style={styles.transactionsHeader}>
                        <View style={[styles.dateTag, isDark && styles.dateTagDark]}>
                            <Text style={[styles.dateTagText, isDark && styles.textDark]}>
                                {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
                            </Text>
                        </View>
                        <Text style={[styles.detailsLabel, isDark && styles.textDark]}>
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
                                        {isAmountVisible ? formatCurrency(tx.amount) : '******'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>

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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    profileButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
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
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    statsContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginLeft: 16,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    eyeButton: {
        padding: 4,
        marginLeft: 4,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111827',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#F3F4F6',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },

    // Dashboard Styles
    dashboardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12, // Use gap for spacing
        marginBottom: 24,
        minHeight: 150,
    },
    // dashboardExpanded removed as we use wrapping
    cardBase: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        justifyContent: 'center',
    },
    cardDark: {
        backgroundColor: '#1F2937',
    },
    calendarSection: {
        padding: 12,
        alignItems: 'center',
    },
    financeSection: {
        flexDirection: 'column',
        gap: 10,
    },
    collapsedDateView: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    dayNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 2,
    },
    bigDateText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#111827',
        lineHeight: 46,
    },
    monthYearText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    lunarBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
        marginTop: 6,
    },
    lunarBadgeDark: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
    },
    moonEmoji: {
        fontSize: 12,
    },
    lunarTextBasic: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8B5CF6',
    },

    // Finance Rows
    financeRow: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 16, // bit more padding
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    financeRowDark: {
        backgroundColor: '#1F2937',
    },
    financeItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    financeLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 2,
    },
    financeValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    verticalDivider: {
        width: 1,
        height: '60%',
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    iconLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },

    // Calendar Grid Styles (Expanded)
    headerRowCalendar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    monthButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    monthButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    monthButtonDark: {
        backgroundColor: '#374151',
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: 12,
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
        height: daySize + 8,
        alignItems: 'center',
        marginBottom: 4,
    },
    dayCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
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
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    indicators: {
        flexDirection: 'row',
        gap: 3,
        marginTop: 4,
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

    // Transactions
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
    dateTagDark: {
        backgroundColor: '#374151',
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
