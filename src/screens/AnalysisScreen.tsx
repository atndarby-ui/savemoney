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

interface AnalysisScreenProps {
    transactions: Transaction[];
    language: 'Tiếng Việt' | 'English';
    theme: 'light' | 'dark';
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
    theme,
    navigation,
}: AnalysisScreenProps) {
    const t = translations[language];
    const isDark = theme === 'dark';
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
                        <Text style={styles.budgetIcon}>{icon}</Text>
                        <Text style={[styles.budgetLabel, isDark && styles.textDark]}>{label}</Text>
                    </View>
                    <Text style={[styles.budgetText, isDark && styles.textLight]}>
                        {formatCurrency(left)} {t.left}
                    </Text>
                </View>
                <View style={[styles.progressBg, isDark && styles.progressBgDark]}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
            <View style={[styles.header, isDark && styles.headerDark]}>
                <View style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>🎯</Text>
                </View>
                <View>
                    <Text style={[styles.headerTitle, isDark && styles.textDark]}>{t.askAI}</Text>
                    <Text style={[styles.headerSubtitle, isDark && styles.textLight]}>{t.aiName}</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {/* Spending Plan Summary */}
                <View style={[styles.planCard, isDark && styles.planCardDark]}>
                    <Text style={[styles.planTitle, isDark && styles.textDark]}>{t.spendingPlan}</Text>
                    <Text style={styles.planSubtitle}>{selectedMethod.description}</Text>

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
                        style={[styles.aiButton, { borderColor: selectedMethod.color }]}
                        onPress={handleAskAI}
                    >
                        <Text style={[styles.aiButtonText, { color: selectedMethod.color }]}>✨ {t.askAIAction}</Text>
                    </TouchableOpacity>
                </View>

                {/* Method Grid */}
                <Text style={[styles.sectionHeader, isDark && styles.textDark]}>{t.savingMethods}</Text>
                <View style={styles.methodGrid}>
                    {SAVING_METHODS.map(method => (
                        <TouchableOpacity
                            key={method.id}
                            style={[
                                styles.methodCard,
                                isDark && styles.methodCardDark,
                                selectedMethodId === method.id && { borderColor: method.color, borderWidth: 2 }
                            ]}
                            onPress={() => handleMethodSelect(method.id)}
                        >
                            <View style={[styles.methodIconBox, { backgroundColor: method.color + '20' }]}>
                                <Text style={styles.methodIconSmall}>{method.icon}</Text>
                            </View>
                            <Text style={[styles.methodTitle, isDark && styles.textDark]}>{method.title}</Text>
                            <Text style={styles.methodSubtitle} numberOfLines={1}>{method.subtitle}</Text>

                            <TouchableOpacity
                                style={[
                                    styles.miniAction,
                                    { backgroundColor: selectedMethodId === method.id ? method.color : '#9CA3AF' }
                                ]}
                                onPress={() => handleMethodSelect(method.id)}
                            >
                                <Text style={styles.miniActionText}>{t.btnAction}</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    containerDark: {
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 60,
    },
    headerDark: {
        backgroundColor: '#111827',
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconText: {
        fontSize: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    content: {
        padding: 20,
        paddingBottom: 120,
    },
    planCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 24,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    planCardDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    planTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    planSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 24,
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
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    budgetText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9CA3AF',
    },
    progressBg: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBgDark: {
        backgroundColor: '#111827',
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
    aiButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    methodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    methodCard: {
        width: (width - 56) / 2,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 1,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    methodCardDark: {
        backgroundColor: '#1F2937',
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
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    methodSubtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 12,
    },
    miniAction: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    miniActionText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textLight: {
        color: '#9CA3AF',
    },
});
