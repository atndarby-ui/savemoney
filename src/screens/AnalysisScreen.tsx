import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    SafeAreaView,
    Platform,
} from 'react-native';
import { Transaction } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ThemedText, ThemedView, GlassView } from '../components/ThemedComponents';
import { SPACING, RADII, COLORS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface AnalysisScreenProps {
    transactions: Transaction[];
    language: 'Tiếng Việt' | 'English';
    navigation: any;
}

const { width } = Dimensions.get('window');

const translations = {
    'Tiếng Việt': {
        askAI: 'Cố vấn Tài chính',
        aiName: 'Kế hoạch & Gợi ý',
        savingMethods: 'Phương pháp Tiết kiệm & Đầu tư',
        left: 'CÒN LẠI',
        spendingPlan: 'Kế hoạch chi tiêu tháng này',
        btnAction: 'Áp dụng',
        askAIAction: 'Hỏi AI về kế hoạch này',
    },
    'English': {
        askAI: 'Financial Advisor',
        aiName: 'Plans & Suggestions',
        savingMethods: 'Saving & Investment Methods',
        left: 'LEFT',
        spendingPlan: 'Monthly Spending Plan',
        btnAction: 'Apply',
        askAIAction: 'Ask AI about this plan',
    },
};

const SAVING_METHODS = [
    {
        id: '503020',
        title: 'Quy tắc 50/30/20',
        subtitle: 'Cân bằng & Bền vững',
        icon: '📊',
        description: 'Dựa trên quy tắc 50/30/20 & Dữ liệu thực tế',
        prompt: 'Dựa trên dữ liệu giao dịch của tôi, hãy phân tích chi tiêu theo quy tắc 50/30/20. Cho tôi biết tôi đã chi bao nhiêu % cho Thiết yếu, Sở thích và Tiết kiệm, và đưa ra lời khuyên cụ thể để tối ưu hóa.',
        color: '#10b981',
        buckets: [
            { label: { 'Tiếng Việt': 'Thiết yếu (50%)', 'English': 'Essential (50%)' }, icon: '🏠', percent: 0.5, categories: ['food', 'transport', 'health', 'home'] },
            { label: { 'Tiếng Việt': 'Sở thích (30%)', 'English': 'Wants (30%)' }, icon: '🍿', percent: 0.3, categories: ['shopping', 'entertainment', 'beauty'] },
            { label: { 'Tiếng Việt': 'Tiết kiệm (20%)', 'English': 'Savings (20%)' }, icon: '💰', percent: 0.2, categories: [], isSavings: true },
        ]
    },
    {
        id: '6jars',
        title: '6 Chiếc hũ',
        subtitle: 'Tự do tài chính',
        icon: '🏺',
        description: 'Phân bổ theo quy tắc 6 chiếc hũ (JARS System)',
        prompt: 'Hãy phân tích chi tiêu của tôi theo phương pháp 6 chiếc hũ (T. Harv Eker). Chia các khoản chi của tôi vào 6 hũ: Thiết yếu, Tiết kiệm, Giáo dục, Hưởng thụ, Tự do tài chính và Từ thiện.',
        color: '#f59e0b',
        buckets: [
            { label: { 'Tiếng Việt': 'Thiết yếu (55%)', 'English': 'Necessities (55%)' }, icon: '🍱', percent: 0.55, categories: ['food', 'transport', 'home'] },
            { label: { 'Tiếng Việt': 'Hưởng thụ (10%)', 'English': 'Play (10%)' }, icon: '🎭', percent: 0.1, categories: ['shopping', 'entertainment'] },
            { label: { 'Tiếng Việt': 'Tự do tài chính (10%)', 'English': 'FFA (10%)' }, icon: '🏛️', percent: 0.1, categories: [], isSavings: true },
            { label: { 'Tiếng Việt': 'Tiết kiệm dài hạn (10%)', 'English': 'LTSS (10%)' }, icon: '⏳', percent: 0.1, categories: [], isSavings: true },
            { label: { 'Tiếng Việt': 'Giáo dục (10%)', 'English': 'Edu (10%)' }, icon: '📚', percent: 0.1, categories: ['education'] },
            { label: { 'Tiếng Việt': 'Từ thiện (5%)', 'English': 'Give (5%)' }, icon: '🎁', percent: 0.05, categories: ['gift'] },
        ]
    },
    {
        id: '8020',
        title: 'Quy tắc 80/20',
        subtitle: 'Đơn giản & Hiệu quả',
        icon: '⚖️',
        description: 'Tập trung tối đa vào mục tiêu tích lũy',
        prompt: 'Tôi muốn áp dụng quy tắc 80/20 (80% chi tiêu, 20% tiết kiệm). Dựa trên dữ liệu tháng này, tôi đã đạt được mục tiêu tiết kiệm chưa?',
        color: '#3b82f6',
        buckets: [
            { label: { 'Tiếng Việt': 'Chi tiêu (80%)', 'English': 'Spending (80%)' }, icon: '💸', percent: 0.8, categories: ['food', 'transport', 'health', 'shopping', 'entertainment', 'home'] },
            { label: { 'Tiếng Việt': 'Tiết kiệm (20%)', 'English': 'Savings (20%)' }, icon: '📈', percent: 0.2, categories: [], isSavings: true },
        ]
    },
    {
        id: 'kakeibo',
        title: 'Sổ tay Kakeibo',
        subtitle: 'Triết lý kiểu Nhật',
        icon: '📓',
        description: 'Tiết kiệm theo tinh thần Kakeibo',
        prompt: 'Phân tích chi tiêu của tôi theo Kakeibo: Tôi thực sự chi bao nhiêu? Tôi có thể cải thiện điều gì cho tháng sau?',
        color: '#ec4899',
        buckets: [
            { label: { 'Tiếng Việt': 'Nhu cầu (60%)', 'English': 'Survival (60%)' }, icon: '🍜', percent: 0.6, categories: ['food', 'transport', 'health'] },
            { label: { 'Tiếng Việt': 'Mong muốn (20%)', 'English': 'Optional (20%)' }, icon: '👟', percent: 0.2, categories: ['shopping', 'entertainment'] },
            { label: { 'Tiếng Việt': 'Kiến thức (10%)', 'English': 'Culture (10%)' }, icon: '🎨', percent: 0.1, categories: ['education'] },
            { label: { 'Tiếng Việt': 'Dự phòng (10%)', 'English': 'Extra (10%)' }, icon: '🛡️', percent: 0.1, categories: [], isSavings: true },
        ]
    }
];

export default function AnalysisScreen({
    transactions,
    language,
    navigation,
}: AnalysisScreenProps) {
    const t = translations[language];
    const { colors, isDark } = useTheme();
    const [selectedMethodId, setSelectedMethodId] = useState('503020');

    const selectedMethod = useMemo(() =>
        SAVING_METHODS.find(m => m.id === selectedMethodId) || SAVING_METHODS[0]
        , [selectedMethodId]);

    const budgetStats = useMemo(() => {
        const now = new Date();
        const currentMonth = transactions.filter(tx => {
            const d = new Date(tx.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const totalIncome = currentMonth.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0) || 10000000;
        const totalExpense = currentMonth.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

        return selectedMethod.buckets.map(bucket => {
            let actual = 0;
            if (bucket.isSavings) {
                const totalBucketsSavingsCount = selectedMethod.buckets.filter(b => b.isSavings).length;
                actual = (totalIncome - totalExpense) / totalBucketsSavingsCount;
            } else {
                actual = currentMonth
                    .filter(tx => tx.type === 'expense' && (bucket.categories as string[]).includes(tx.categoryId))
                    .reduce((sum, tx) => sum + tx.amount, 0);
            }

            return {
                ...bucket,
                actual,
                target: totalIncome * bucket.percent
            };
        });
    }, [transactions, selectedMethod]);

    const formatCurrency = (val: number) => {
        if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + ' TR';
        if (Math.abs(val) >= 1000) return (val / 1000).toFixed(0) + 'K';
        return val.toString();
    };

    const handleMethodSelect = (methodId: string) => {
        setSelectedMethodId(methodId);
    };

    const handleAskAI = () => {
        navigation.navigate('AIChat', { initialPrompt: selectedMethod.prompt });
    };

    const renderProgressBar = (label: string, icon: string, actual: number, target: number, color: string) => {
        const progress = Math.min(1, actual / target);
        const left = Math.max(0, target - actual);
        return (
            <View style={styles.budgetRow}>
                <View style={styles.budgetHeader}>
                    <View style={styles.budgetLabelRow}>
                        <ThemedText style={styles.budgetIcon}>{icon}</ThemedText>
                        <ThemedText variant="bodyBold" style={styles.budgetLabel}>{label}</ThemedText>
                    </View>
                    <ThemedText variant="button" style={{ color: colors.textSecondary }}>
                        {formatCurrency(left)} {t.left}
                    </ThemedText>
                </View>
                <View style={[styles.progressBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <LinearGradient
                        colors={[color, color]} // Can optimize to gradient later if needed
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${progress * 100}%` }]}
                    />
                </View>
            </View>
        );
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                        <Text style={{ fontSize: 24 }}>🎯</Text>
                    </View>
                    <View>
                        <ThemedText variant="h2" style={styles.headerTitle}>{t.askAI}</ThemedText>
                        <ThemedText variant="caption" style={{ color: colors.textSecondary }}>{t.aiName}</ThemedText>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Spending Plan Summary */}
                    <ThemedView variant="surface" style={[styles.planCard, { borderRadius: 24, borderWidth: 1, borderColor: colors.border }]}>
                        <ThemedText variant="h3" style={styles.planTitle}>{t.spendingPlan}</ThemedText>
                        <ThemedText variant="body" style={styles.planSubtitle}>{selectedMethod.description}</ThemedText>

                        {budgetStats.map((stat, idx) => (
                            <View key={idx}>
                                {renderProgressBar(
                                    stat.label[language],
                                    stat.icon,
                                    stat.actual ?? 0,
                                    stat.target,
                                    selectedMethod.color
                                )}
                            </View>
                        ))}

                        <TouchableOpacity
                            style={[
                                styles.aiButton,
                                { borderColor: selectedMethod.color }
                            ]}
                            onPress={handleAskAI}
                        >
                            <ThemedText variant="button" style={{ color: selectedMethod.color }}>✨ {t.askAIAction}</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>

                    {/* Method Grid */}
                    <ThemedText variant="h3" style={styles.sectionHeader}>{t.savingMethods}</ThemedText>
                    <View style={styles.methodGrid}>
                        {SAVING_METHODS.map(method => (
                            <TouchableOpacity
                                key={method.id}
                                style={[
                                    styles.methodCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                                        borderColor: selectedMethodId === method.id ? method.color : 'transparent',
                                        borderWidth: 2
                                    }
                                ]}
                                onPress={() => handleMethodSelect(method.id)}
                            >
                                <View style={[styles.methodIconBox, { backgroundColor: method.color + '20' }]}>
                                    <Text style={styles.methodIconSmall}>{method.icon}</Text>
                                </View>
                                <ThemedText variant="bodyBold" style={styles.methodTitle}>{method.title}</ThemedText>
                                <ThemedText variant="small" style={{ color: colors.textSecondary }} numberOfLines={1}>{method.subtitle}</ThemedText>

                                <View
                                    style={[
                                        styles.miniAction,
                                        { backgroundColor: selectedMethodId === method.id ? method.color : (isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6') }
                                    ]}
                                >
                                    <Text style={[styles.miniActionText, { color: selectedMethodId === method.id ? '#FFF' : colors.textSecondary }]}>{t.btnAction}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 60,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        marginBottom: 2,
    },
    content: {
        padding: 20,
        paddingBottom: 120,
    },
    planCard: {
        padding: 20,
        marginBottom: 30,
    },
    planTitle: {
        marginBottom: 4,
    },
    planSubtitle: {
        marginBottom: 24,
        opacity: 0.7,
    },
    budgetRow: {
        marginBottom: 20,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    budgetLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    budgetIcon: {
        fontSize: 16,
    },
    budgetLabel: {
        // fontSize handled by variant
    },
    progressBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    aiButton: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        marginBottom: 20,
    },
    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    methodCard: {
        width: (width - 56) / 2,
        padding: 16,
        borderRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    methodIconBox: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    methodIconSmall: {
        fontSize: 22,
    },
    methodTitle: {
        marginBottom: 4,
    },
    miniAction: {
        marginTop: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    miniActionText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
});
