import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, Dimensions, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ThemedView, ThemedText } from '../components/ThemedComponents';
import { formatCurrency } from '../utils/currency';
import { CartesianChart, BarGroup, PolarChart, Pie } from 'victory-native';
import { translations } from '../constants/translations';
import { Transaction, Category } from '../types';

interface StatisticsScreenProps {
    transactions: Transaction[];
    categories: Category[];
    navigation: any;
    language: 'Tiếng Việt' | 'English';
    theme: 'light' | 'dark';
}

export default function StatisticsScreen({
    transactions,
    categories,
    navigation,
    language,
    theme,
}: StatisticsScreenProps) {
    const { colors } = useTheme();
    const t = translations[language];
    const isDark = theme === 'dark';

    const [isAmountVisible, setIsAmountVisible] = useState(true);
    const [selectedTimeRange, setSelectedTimeRange] = useState('month');
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    const toggleAmountVisibility = () => setIsAmountVisible(prev => !prev);

    const balance = useMemo(() => {
        return transactions.reduce((acc, tx) => {
            return acc + (tx.type === 'income' ? tx.amount : -tx.amount);
        }, 0);
    }, [transactions]);

    const trendData = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        let startDate = new Date(now);
        let periods = 7;
        let dayIncrement = 1;

        if (selectedTimeRange === '7days') {
            startDate.setDate(now.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            periods = 7;
            dayIncrement = 1;
        } else if (selectedTimeRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            periods = 5;
            dayIncrement = 6;
        } else {
            // 30 days
            startDate.setDate(now.getDate() - 29);
            startDate.setHours(0, 0, 0, 0);
            periods = 6;
            dayIncrement = 5;
        }

        const dataPoints = [];
        for (let i = 0; i < periods; i++) {
            const pStart = new Date(startDate);
            pStart.setDate(startDate.getDate() + (i * dayIncrement));
            const pEnd = new Date(pStart);
            pEnd.setDate(pStart.getDate() + dayIncrement - 1);
            pEnd.setHours(23, 59, 59, 999);

            let income = 0;
            let expense = 0;

            transactions.forEach(tx => {
                const txDate = new Date(tx.date);
                if (txDate >= pStart && txDate <= pEnd) {
                    if (tx.type === 'income') income += tx.amount;
                    else expense += tx.amount;
                }
            });

            let label = '';
            if (dayIncrement === 1) {
                label = pStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            } else {
                label = `${pStart.getDate()}/${pStart.getMonth() + 1}`;
            }

            dataPoints.push({ label, income, expense });
        }

        return dataPoints;
    }, [transactions, selectedTimeRange]);

    const pieData = useMemo(() => {
        const expenses = transactions.filter(tx => tx.type === 'expense');
        const grouped = expenses.reduce((acc, tx) => {
            const catId = tx.categoryId;
            if (!acc[catId]) acc[catId] = 0;
            acc[catId] += tx.amount;
            return acc;
        }, {} as Record<string, number>);

        const total = Object.values(grouped).reduce((a, b) => a + b, 0);

        return Object.keys(grouped)
            .map(catId => {
                const val = grouped[catId];
                return {
                    x: catId,
                    y: val,
                    label: categories.find(c => c.id === catId)?.name || 'Unknown',
                    color: categories.find(c => c.id === catId)?.color || '#999',
                    value: val,
                    percentage: total > 0 ? Math.round((val / total) * 100) : 0
                };
            })
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);

    const filteredTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions]);

    const TimeChip = ({ label, value }: { label: string, value: string }) => (
        <TouchableOpacity
            style={[
                styles.timeChip,
                selectedTimeRange === value && styles.timeChipActive,
                isDark && styles.timeChipDark
            ]}
            onPress={() => setSelectedTimeRange(value)}
        >
            <Text style={[
                styles.timeChipText,
                selectedTimeRange === value && styles.timeChipTextActive,
                isDark && !selectedTimeRange && styles.textLight
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
    return (
        <ThemedView style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
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

                    <View style={{ height: 200, width: '100%', justifyContent: 'center' }}>
                        {trendData.some(d => d.income > 0 || d.expense > 0) ? (
                            <CartesianChart
                                data={trendData}
                                xKey="label"
                                yKeys={['income', 'expense']}
                                domainPadding={{ left: 20, right: 20, top: 20 }}
                                axisOptions={{
                                    font: undefined,
                                    tickCount: 5,
                                    labelColor: isDark ? '#9CA3AF' : '#6B7280',
                                    lineColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                    labelOffset: 8,
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
                        ) : (
                            <Text style={styles.noData}>{t.noTx}</Text>
                        )}
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
                                {pieData.slice(0, 6).map((item) => (
                                    <View key={item.label} style={styles.pieLabelRow}>
                                        <View style={styles.pieLabelLeft}>
                                            <View
                                                style={[styles.pieDot, { backgroundColor: item.color }]}
                                            />
                                            <Text style={[styles.pieLabelText, isDark && styles.textLight, { flex: 1 }]} numberOfLines={1}>
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
        </ThemedView >
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerDark: {
        // backgroundColor: '#111827',
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
    timeChipDark: {
        backgroundColor: '#374151',
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
