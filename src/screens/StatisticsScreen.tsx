import React, { useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Ionicons } from '@expo/vector-icons';
// import { VictoryArea, VictoryChart, VictoryPie } from 'victory-native';
import { CartesianChart, BarGroup, Pie, PolarChart } from 'victory-native';
import { useFont } from '@shopify/react-native-skia';
import { Transaction, TimeRange, Category } from '../types';
import { formatCurrency, formatCompactCurrency } from '../utils/format';

// For labels in Victory Native, it's recommended to load a font using useFont from @shopify/react-native-skia
// const inter = require('../../assets/fonts/Inter-Regular.ttf'); 

interface StatisticsScreenProps {
    transactions: Transaction[];
    categories: Category[];
    onUpdateTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    navigation: any;
    language: 'Tiếng Việt' | 'English';
    theme: 'light' | 'dark';
}

const translations = {
    'Tiếng Việt': {
        availableBalance: 'Số dư khả dụng',
        trend: 'Xu hướng',
        income: 'Thu nhập',
        expense: 'Chi tiêu',
        spendingStructure: 'Cơ cấu chi tiêu',
        transactions: 'Giao dịch',
        seeAll: 'Xem tất cả',
        days7: '7 ngày',
        month: 'Tháng',
        days30: '30 ngày',
        noTx: 'Chưa có giao dịch nào',
    },
    'English': {
        availableBalance: 'Available Balance',
        trend: 'Trend',
        income: 'Income',
        expense: 'Expense',
        spendingStructure: 'Spending Structure',
        transactions: 'Transactions',
        seeAll: 'See all',
        days7: '7 Days',
        month: 'Month',
        days30: '30 Days',
        noTx: 'No transactions yet',
    },
};

export default function StatisticsScreen({
    transactions,
    categories,
    navigation,
    language,
    theme,
}: StatisticsScreenProps) {
    const t = translations[language];
    const isDark = theme === 'dark';
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const [isAmountVisible, setIsAmountVisible] = useState(true);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadVisibility();
        });
        loadVisibility();
        return unsubscribe;
    }, [navigation]);

    const loadVisibility = async () => {
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

    // Load font for charts
    // const font = useFont(inter, 10); // Optional: can use default if not available

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return transactions
            .filter((tx) => {
                const tDate = new Date(tx.date);
                if (timeRange === 'today') {
                    return tDate >= startOfToday;
                } else if (timeRange === '7days') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 7);
                    return tDate >= d;
                } else if (timeRange === '30days') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 30);
                    return tDate >= d;
                } else {
                    return (
                        tDate.getMonth() === now.getMonth() &&
                        tDate.getFullYear() === now.getFullYear()
                    );
                }
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transactions, timeRange]);

    const { income, expense } = useMemo(() => {
        return filteredTransactions.reduce(
            (acc, t) => {
                if (t.type === 'income') acc.income += t.amount;
                else acc.expense += t.amount;
                return acc;
            },
            { income: 0, expense: 0 }
        );
    }, [filteredTransactions]);

    const balance = income - expense;

    const trendData = useMemo(() => {
        const now = new Date();
        const data: { label: string; income: number; expense: number }[] = [];
        const days = timeRange === '7days' ? 7 : timeRange === 'month' ? now.getDate() : 30;

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);

            const dayTxs = filteredTransactions.filter((tx) => {
                const txDate = new Date(tx.date);
                return (
                    txDate.getDate() === d.getDate() &&
                    txDate.getMonth() === d.getMonth() &&
                    txDate.getFullYear() === d.getFullYear()
                );
            });

            const dayIncome = dayTxs
                .filter((tx) => tx.type === 'income')
                .reduce((s, tx) => s + tx.amount, 0);
            const dayExpense = dayTxs
                .filter((tx) => tx.type === 'expense')
                .reduce((s, tx) => s + tx.amount, 0);

            data.push({
                label: d.getDate().toString(),
                income: dayIncome,
                expense: dayExpense,
            });
        }
        return data;
    }, [filteredTransactions, timeRange]);

    const pieData = useMemo(() => {
        const map = new Map<string, number>();
        const expenseTx = filteredTransactions.filter((t) => t.type === 'expense');
        const totalExp = expenseTx.reduce((sum, t) => sum + t.amount, 0);
        expenseTx.forEach((t) =>
            map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount)
        );
        return Array.from(map.entries())
            .map(([id, value]) => {
                const cat = categories.find((c) => c.id === id);
                return {
                    label: cat?.name || id,
                    value: value,
                    percentage: totalExp > 0 ? Math.round((value / totalExp) * 100) : 0,
                    color: cat?.color || '#cbd5e1',
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    const TimeChip = ({ label, value }: { label: string; value: TimeRange }) => (
        <TouchableOpacity
            style={[
                styles.timeChip,
                timeRange === value && styles.timeChipActive,
                timeRange === value && isDark && styles.timeChipActiveDark,
            ]}
            onPress={() => setTimeRange(value)}
        >
            <Text
                style={[
                    styles.timeChipText,
                    timeRange === value && styles.timeChipTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={[styles.container, isDark && styles.containerDark]}
            contentContainerStyle={styles.content}
        >
            {/* Balance Header */}
            <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, isDark && styles.textLight]}>
                    {t.availableBalance}
                </Text>
                <View style={styles.balanceRow}>
                    <Text style={[styles.currencySymbol, isDark && styles.textMedium]}>
                        ₫
                    </Text>
                    <Text style={[styles.balanceValue, isDark && styles.textDark]}>
                        {isAmountVisible ? formatCurrency(balance) : '******'}
                    </Text>
                    <TouchableOpacity
                        onPress={toggleAmountVisibility}
                        style={{ marginLeft: 8, marginTop: 12 }}
                    >
                        <Ionicons
                            name={isAmountVisible ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color={isDark ? '#9CA3AF' : '#6B7280'}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Time Filters */}
            <View style={styles.timeFilters}>
                <View style={[styles.timeChipsContainer, isDark && styles.timeChipsContainerDark]}>
                    <TimeChip label={t.days7} value="7days" />
                    <TimeChip label={t.month} value="month" />
                    <TimeChip label={t.days30} value="30days" />
                </View>
            </View>

            {/* Trend Card */}
            <View style={[styles.card, isDark && styles.cardDark]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardLabel, isDark && styles.textLight]}>
                        {t.trend}
                    </Text>
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={styles.legendDotIncome} />
                            <Text style={[styles.legendText, isDark && styles.textDark]}>
                                {t.income}
                            </Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={styles.legendDotExpense} />
                            <Text style={[styles.legendText, isDark && styles.textDark]}>
                                {t.expense}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 200, width: '100%' }}>
                    <CartesianChart
                        data={trendData}
                        xKey="label"
                        yKeys={['income', 'expense']}
                        domainPadding={{ left: 20, right: 20, top: 20 }}
                        axisOptions={{
                            font: undefined, // uses default
                            tickCount: 5,
                            labelColor: isDark ? '#9CA3AF' : '#6B7280',
                            lineColor: isDark ? '#374151' : '#E5E7EB',
                        }}
                    >
                        {({ points, chartBounds }) => (
                            <>
                                <BarGroup
                                    chartBounds={chartBounds}
                                    betweenGroupPadding={0.3}
                                >
                                    <BarGroup.Bar
                                        points={points.income}
                                        color="#10b981"
                                    />
                                    <BarGroup.Bar
                                        points={points.expense}
                                        color="#f43f5e"
                                    />
                                </BarGroup>
                            </>
                        )}
                    </CartesianChart>
                </View>
            </View>

            {/* Spending Structure */}
            <View style={[styles.card, isDark && styles.cardDark]}>
                <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                    {t.spendingStructure}
                </Text>
                {pieData.length > 0 ? (
                    <View>
                        <View style={styles.pieContainer}>
                            <View style={{ height: 160, width: 160 }}>
                                <PolarChart
                                    data={pieData}
                                    colorKey="color"
                                    valueKey="value"
                                    labelKey="label"
                                >
                                    <Pie.Chart innerRadius="70%" />
                                </PolarChart>
                            </View>
                            <View style={styles.pieCenter}>
                                <Text style={[styles.pieCenterText, isDark && styles.textLight]}>
                                    {t.expense.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.pieLabels}>
                            {pieData.slice(0, 4).map((item) => (
                                <View key={item.label} style={styles.pieLabelRow}>
                                    <View style={styles.pieLabelLeft}>
                                        <View
                                            style={[styles.pieDot, { backgroundColor: item.color }]}
                                        />
                                        <Text style={[styles.pieLabelText, isDark && styles.textLight]}>
                                            {item.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.piePercent, isDark && styles.textDark]}>
                                        {item.percentage}%
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <Text style={[styles.noData, isDark && styles.textLight]}>
                        {t.noTx}
                    </Text>
                )}
            </View>

            {/* Transactions */}
            <View style={[styles.card, isDark && styles.cardDark]}>
                <View style={styles.txHeader}>
                    <Text style={[styles.cardTitle, isDark && styles.textDark]}>
                        {t.transactions}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                        <Text style={styles.seeAllText}>{t.seeAll}</Text>
                    </TouchableOpacity>
                </View>
                {filteredTransactions.length === 0 ? (
                    <Text style={[styles.noData, isDark && styles.textLight]}>
                        {t.noTx}
                    </Text>
                ) : (
                    filteredTransactions.slice(0, 5).map((tx) => {
                        const cat = categories.find((c) => c.id === tx.categoryId);
                        const isExpense = tx.type === 'expense';
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
                                    <View style={[styles.txIcon, isDark && styles.txIconDark]}>
                                        <Text style={styles.txIconText}>{cat?.icon || '•'}</Text>
                                    </View>
                                    <View>
                                        <Text style={[styles.txName, isDark && styles.textDark]}>
                                            {cat?.name}
                                        </Text>
                                        <Text style={[styles.txTime, isDark && styles.textLight]}>
                                            {new Date(tx.date).toLocaleTimeString(
                                                language === 'Tiếng Việt' ? 'vi-VN' : 'en-US',
                                                { hour: '2-digit', minute: '2-digit' }
                                            )}
                                        </Text>
                                    </View>
                                    {tx.imageUri && (
                                        <TouchableOpacity
                                            style={styles.receiptTag}
                                            onPress={() => setViewerImage(tx.imageUri || null)}
                                        >
                                            <Ionicons name="image-outline" size={12} color="#10b981" />
                                            <Text style={styles.receiptTagText}>HĐ</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text
                                    style={[
                                        styles.txAmount,
                                        isExpense
                                            ? isDark
                                                ? styles.textDark
                                                : styles.expenseText
                                            : styles.incomeText,
                                    ]}
                                >
                                    {isExpense ? '-' : '+'}
                                    {isAmountVisible ? formatCurrency(tx.amount) : '******'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
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
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    content: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 100,
    },
    balanceHeader: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    currencySymbol: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D1D5DB',
        marginTop: 4,
    },
    balanceValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#111827',
    },
    timeFilters: {
        alignItems: 'center',
        marginBottom: 16,
    },
    timeChipsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 4,
        gap: 4,
    },
    timeChipsContainerDark: {
        backgroundColor: '#1F2937',
    },
    timeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    timeChipActive: {
        backgroundColor: '#111827',
    },
    timeChipActiveDark: {
        backgroundColor: '#10b981',
    },
    timeChipText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    timeChipTextActive: {
        color: '#FFFFFF',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
    },
    cardDark: {
        backgroundColor: '#1F2937',
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 16,
    },
    legend: {
        flexDirection: 'row',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDotIncome: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    legendDotExpense: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#f43f5e',
    },
    legendText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111827',
    },
    placeholder: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        paddingVertical: 40,
    },
    pieContainer: {
        alignItems: 'center',
        position: 'relative',
        marginBottom: 20,
    },
    pieCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -30 }, { translateY: -10 }],
    },
    pieCenterText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    pieLabels: {
        gap: 12,
    },
    pieLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pieLabelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pieDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    pieLabelText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6B7280',
    },
    piePercent: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111827',
    },
    noData: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 14,
        paddingVertical: 32,
    },
    txHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#10b981',
    },
    txItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 16,
        backgroundColor: '#F9FAFB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    txIconDark: {
        backgroundColor: '#374151',
    },
    txIconText: {
        fontSize: 18,
    },
    txName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
    },
    txTime: {
        fontSize: 10,
        color: '#9CA3AF',
        marginTop: 2,
    },
    txAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    expenseText: {
        color: '#111827',
    },
    incomeText: {
        color: '#10b981',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textMedium: {
        color: '#6B7280',
    },
    textLight: {
        color: '#9CA3AF',
    },
    receiptTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    receiptTagText: {
        fontSize: 10,
        color: '#10b981',
        fontWeight: '600',
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
