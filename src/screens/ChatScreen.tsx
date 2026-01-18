import { useTheme } from '../context/ThemeContext';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Keyboard,
    Modal,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay
} from 'react-native-reanimated';
import { Transaction, Message } from '../types';

interface ChatScreenProps {
    transactions: Transaction[];
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    selectedPersonalityId: string;
    setSelectedPersonalityId: (id: string) => void;
    language: 'Tiếng Việt' | 'English';
    theme: 'light' | 'dark';
    navigation: any;
    route: any;
}

const TypingIndicator = ({ isDark }: { isDark: boolean }) => {
    const Dot = ({ delay }: { delay: number }) => {
        const translateY = useSharedValue(0);

        useEffect(() => {
            translateY.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(-6, { duration: 400 }),
                        withTiming(0, { duration: 400 })
                    ),
                    -1,
                    true
                )
            );
        }, []);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ translateY: translateY.value }],
        }));

        return (
            <Animated.View
                style={[
                    styles.dot,
                    isDark ? styles.dotDark : styles.dotLight,
                    animatedStyle
                ]}
            />
        );
    };

    return (
        <View style={styles.typingContainer}>
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
        </View>
    );
};

const TypewriterText = ({ text, isDark, onComplete, scrollRef }: { text: string; isDark: boolean; onComplete?: () => void; scrollRef?: React.RefObject<ScrollView | null> }) => {
    const [displayedText, setDisplayedText] = useState('');

    // Simple interval-based typewriter
    useEffect(() => {
        let i = 0;
        setDisplayedText('');

        const timer = setInterval(() => {
            if (i < text.length) {
                // Maximum burst: 15 characters per tick
                const nextI = Math.min(i + 15, text.length);
                setDisplayedText(text.substring(0, nextI));
                i = nextI;
                if (i % 30 === 0 && scrollRef?.current) {
                    scrollRef.current.scrollToEnd({ animated: true });
                }
            } else {
                clearInterval(timer);
                scrollRef?.current?.scrollToEnd({ animated: true });
                onComplete?.();
            }
        }, 5); // 5ms interval + 15 chars/tick = Extreme speed

        return () => clearInterval(timer);
    }, [text]);

    return (
        <View>
            <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
                {displayedText}
            </Text>
        </View>
    );
};
const translations = {
    'Tiếng Việt': {
        askAI: 'Giải cứu cái ví',
        placeholder: 'Hỏi han gì tôi đi, đừng ngại...',
        thinking: 'Đợi xíu, đang dùng não to để tính...',
        clearHistory: 'Xóa lịch sử',
        confirmClear: 'Xác nhận xóa toàn bộ lịch sử trò chuyện?',
        cancel: 'Hủy',
        delete: 'Xóa',
    },
    'English': {
        askAI: 'Wallet Rescue',
        placeholder: 'Ask me anything, don\'t be shy...',
        thinking: 'Wait a sec, brain is processing...',
        clearHistory: 'Clear History',
        confirmClear: 'Are you sure you want to clear all chat history?',
        cancel: 'Cancel',
        delete: 'Delete',
    },
};

const formatAIResponse = (text: string, isDark: boolean) => {
    return (
        <Text style={[styles.messageText, isDark && styles.messageTextDark]}>
            {text}
        </Text>
    );
};

const personalities = [
    {
        id: 'super_accountant',
        icon: '🤪',
        name: { 'Tiếng Việt': 'Kế toán siêu cấp', English: 'Super Accountant' },
        intro: {
            'Tiếng Việt': 'Chào bạn thân mến! Tôi là Kế toán siêu cấp. Tôi ở đây để giúp bạn quản lý xu dính túi để không phải ăn mì tôm qua ngày. Bạn cần "khám túi" hay muốn tôi "phán" gì về thói quen vung tay quá trán của mình không? 😎',
            English: "Hey there! I'm your Super VIP Accounting Professor. I'm here to help you manage your coins so you don't end up living on cup noodles. Need a 'wallet checkup' or want me to 'judge' your spending habits? 😎"
        },
        systemPrompt: (language: string) => `
You are a Super Accountant (Kế toán siêu cấp) with a VERY HUMOROUS, WITTY, and FRIENDLY personality.
Your goal is to provide deep financial insights but make the user laugh or smile. Use emojis moderately.
Be a bit "sassy" if the user spends too much on things they don't need, but always stay helpful.
Respond ONLY in ${language}.`
    },
    {
        id: 'serious_advisor',
        icon: '👨‍💼',
        name: { 'Tiếng Việt': 'Cố vấn tài chính', English: 'Financial Advisor' },
        intro: {
            'Tiếng Việt': 'Chào bạn. Tôi là Cố vấn tài chính của bạn. Tôi sẽ cung cấp các phân tích dữ liệu chính xác và lời khuyên chiến lược để giúp bạn đạt được các mục tiêu tài chính dài hạn. Chúng ta bắt đầu phân tích chứ?',
            English: "Hello. I am your Financial Advisor. I provide precise data analysis and strategic advice to help you reach your long-term financial goals. Shall we begin the analysis?"
        },
        systemPrompt: (language: string) => `
You are a Serious Financial Advisor (Cố vấn tài chính). 
You are professional, logical, and focused on data-driven insights and long-term financial planning.
Provide structured, clear, and formal advice. Use bold text for important figures.
Respond ONLY in ${language}.`
    },
    {
        id: 'shopping_buddy',
        icon: '💅',
        name: { 'Tiếng Việt': 'Bạn thân shopping', English: 'Shopping Buddy' },
        intro: {
            'Tiếng Việt': 'Hế lô bấy bê! Tui là bạn thân shopping của bà/ông nè. Tui sẽ canh chừng cái ví cho bà, khi nào thấy bà vung tay quá trán là tui la lên liền nha. Sẵn sàng xem hôm nay mình đã "đốt" bao nhiêu tiền chưa?',
            English: "Hey bestie! I'm your Shopping Buddy. I'll keep an eye on your wallet for you, and I'll scream if I see you overspending. Ready to see how much money we 'burned' today?"
        },
        systemPrompt: (language: string) => `
You are a Shopping Buddy (Bạn thân shopping). 
You are very casual, friendly, and use slang. You are supportive but honest about bad spending habits.
Talk to the user like a close friend. Use plenty of emojis.
Respond ONLY in ${language}.`
    },
    {
        id: 'financial_philosopher',
        icon: '🧘',
        name: { 'Tiếng Việt': 'Triết gia tài chính', English: 'Money Philosopher' },
        intro: {
            'Tiếng Việt': 'Chào người tìm kiếm sự thông thái. Tôi là Triết gia tài chính. Hãy cùng xem xét cách bạn sử dụng tiền bạc để phản ánh những giá trị sống đích thực của mình. Bạn muốn suy ngẫm về điều gì hôm nay?',
            English: "Welcome, seeker of wisdom. I am the Money Philosopher. Let us examine how your usage of money reflects your true life values. What would you like to reflect on today?"
        },
        systemPrompt: (language: string) => `
You are a Financial Philosopher (Triết gia tài chính). 
You provide deep, thoughtful, and philosophical insights about money and life.
Focus on the relationship between spending, happiness, and values.
Use calm, poetic, and insightful language.
Respond ONLY in ${language}.`
    }
];

export default function ChatScreen({
    transactions,
    messages,
    setMessages,
    selectedPersonalityId,
    setSelectedPersonalityId,
    language,
    theme,
    navigation,
    route,
}: ChatScreenProps) {
    const { colors } = useTheme();
    const t = translations[language];
    const isDark = theme === 'dark';
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [showPersonalityModal, setShowPersonalityModal] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const hasInitialized = useRef(false);
    const lastMessageCount = useRef(messages.length);
    const lastProcessedPrompt = useRef<string | null>(null);

    const activePersonality = personalities.find(p => p.id === selectedPersonalityId) || personalities[0];

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (messages.length === 0 && !hasInitialized.current) {
            setMessages([{ role: 'model', text: activePersonality.intro[language] }]);
            hasInitialized.current = true;
        } else if (messages.length === 0 && hasInitialized.current) {
            // User cleared history
            setMessages([{ role: 'model', text: activePersonality.intro[language] }]);
        }
        // Track message count changes
        lastMessageCount.current = messages.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length]);

    // Handle personality change - only if no user messages yet, update intro
    useEffect(() => {
        if (messages.length === 1 && messages[0].role === 'model' && hasInitialized.current) {
            setMessages([{ role: 'model', text: activePersonality.intro[language] }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPersonalityId, language]);

    // Handle initial prompt from other screens
    useEffect(() => {
        if (route.params?.initialPrompt) {
            const prompt = route.params.initialPrompt;
            // Robust check: don't re-send if the last message in history is already this prompt
            const lastMsg = messages[messages.length - 1];
            if (lastMsg?.role === 'user' && lastMsg.text === prompt) {
                return;
            }

            if (prompt !== lastProcessedPrompt.current) {
                lastProcessedPrompt.current = prompt;
                navigation.setParams({ initialPrompt: undefined });
                handleSend(prompt);
            }
        }
    }, [route.params?.initialPrompt]);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const systemPrompt = `
${activePersonality.systemPrompt(language)}

Ngày: ${todayISO}
Dữ liệu chi tiêu: ${JSON.stringify(transactions.slice(0, 15))}

Quy tắc:
- Chat tự nhiên như bạn bè (Zalo/Messenger). 
- Chỉ nhắc đến tiền khi thực sự cần.
- Không in đậm, không gạch đầu dòng, không đề mục.
- Ngắn gọn, xuống dòng tự nhiên.
`;

    const handleSend = async (directText?: string) => {
        const textToSend = directText || input;
        if (!textToSend.trim() || isLoading) return;

        const userMsg = textToSend.trim();
        const newMessages: Message[] = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) throw new Error('API key not found');

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                // @ts-ignore
                tools: [
                    {
                        googleSearch: {},
                    },
                ],
            });

            const result = await model.generateContent({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...newMessages.map((m) => ({
                        role: m.role,
                        parts: [{ text: m.text }],
                    })),
                ],
            });

            const responseText = result.response.text();
            setMessages([...newMessages, { role: 'model', text: responseText }]);
        } catch (error) {
            console.error(error);
            const errorMsg = language === 'English'
                ? "Oops, my financial brain just short-circuited! Try again?"
                : 'Ối giời ơi, não tài chính của tôi vừa bị chập mạch rồi! Thử lại nha?';
            setMessages([...newMessages, { role: 'model', text: errorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = () => {
        Alert.alert(
            t.clearHistory,
            t.confirmClear,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.delete,
                    style: 'destructive',
                    onPress: () => setMessages([])
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.inner, { backgroundColor: colors.background }]}>
                {/* Header Row */}
                <View style={[styles.headerRow, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                        style={[styles.dropdownTrigger, isDark && styles.dropdownTriggerDark]}
                        onPress={() => setShowPersonalityModal(true)}
                    >
                        <Text style={styles.personalityIcon}>{activePersonality.icon}</Text>
                        <Text style={[styles.activePersonalityName, isDark && styles.textDark]}>
                            {activePersonality.name[language]}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClearHistory}
                    >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>

                {/* Personality Modal */}
                <Modal
                    visible={showPersonalityModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowPersonalityModal(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowPersonalityModal(false)}
                    >
                        <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
                            {personalities.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[
                                        styles.modalItem,
                                        selectedPersonalityId === p.id && styles.modalItemActive,
                                        isDark && styles.modalItemDark
                                    ]}
                                    onPress={() => {
                                        setSelectedPersonalityId(p.id);
                                        setShowPersonalityModal(false);
                                    }}
                                >
                                    <Text style={styles.modalIcon}>{p.icon}</Text>
                                    <Text style={[
                                        styles.modalText,
                                        selectedPersonalityId === p.id && styles.modalTextActive,
                                        isDark && styles.textDark
                                    ]}>
                                        {p.name[language]}
                                    </Text>
                                    {selectedPersonalityId === p.id && (
                                        <Ionicons name="checkmark" size={20} color="#10b981" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                >
                    {messages.map((msg, idx) => {
                        // Check if this is the last message and it's truly new
                        const isLastMessage = idx === messages.length - 1;
                        const isNewMessage = messages.length > lastMessageCount.current;
                        // Never typewrite the intro (first message) or old messages
                        const shouldTypewrite = msg.role === 'model' && isLastMessage && isNewMessage && idx > 0;

                        if (msg.role === 'model') {
                        }
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.messageBubble,
                                    msg.role === 'user'
                                        ? styles.userBubble
                                        : styles.modelBubble,
                                    msg.role === 'user' && isDark && styles.userBubbleDark,
                                    msg.role === 'model' && isDark && styles.modelBubbleDark,
                                ]}
                            >
                                {msg.role === 'model' ? (
                                    shouldTypewrite ? (
                                        <TypewriterText
                                            key={`typewriter - ${idx} `}
                                            text={msg.text}
                                            isDark={isDark}
                                            onComplete={() => { lastMessageCount.current = messages.length; }}
                                            scrollRef={scrollRef}
                                        />
                                    ) : (
                                        <View>{formatAIResponse(msg.text, isDark)}</View>
                                    )
                                ) : (
                                    <Text
                                        style={[
                                            styles.userMessageText,
                                            isDark && styles.userMessageTextDark,
                                        ]}
                                    >
                                        {msg.text}
                                    </Text>
                                )}
                            </View>
                        )
                    })}
                    {isLoading && (
                        <View
                            style={[
                                styles.messageBubble,
                                styles.modelBubble,
                                isDark && styles.modelBubbleDark,
                                { paddingBottom: 12 }
                            ]}
                        >
                            <View style={styles.loadingRow}>
                                <TypingIndicator isDark={isDark} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderTopColor: colors.border },
                    { paddingBottom: isKeyboardVisible ? 8 : 80 }
                ]}>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        value={input}
                        onChangeText={setInput}
                        placeholder={t.placeholder}
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            isDark && styles.sendButtonDark,
                            (!input.trim() || isLoading) && styles.sendButtonDisabled,
                        ]}
                        onPress={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                    >
                        <Text style={styles.sendButtonText}>➤</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    innerDark: {
        backgroundColor: '#111827',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 16,
        backgroundColor: '#111827',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerRowDark: {
        backgroundColor: '#111827',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    dropdownTriggerDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    activePersonalityName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    clearButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 12,
        gap: 4,
    },
    modalContentDark: {
        backgroundColor: '#1F2937',
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    modalItemActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    modalItemDark: {
        // Style for dark mode items if needed
    },
    modalIcon: {
        fontSize: 20,
    },
    modalText: {
        flex: 1,
        fontSize: 15,
        color: '#374151',
        fontWeight: '500',
    },
    modalTextActive: {
        color: '#10b981',
        fontWeight: 'bold',
    },
    personalityIcon: {
        fontSize: 18,
    },
    // Keep internal parts of old styles that might still be useful or cleanup
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 20,
        paddingTop: 20,
        paddingBottom: 20,
        gap: 16,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#111827',
        borderBottomRightRadius: 4,
    },
    userBubbleDark: {
        backgroundColor: '#10b981',
    },
    modelBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modelBubbleDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    userMessageText: {
        fontSize: 14,
        color: '#FFFFFF',
        lineHeight: 20,
    },
    userMessageTextDark: {
        color: '#FFFFFF',
    },
    messageText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 20,
        marginBottom: 4,
    },
    messageTextDark: {
        color: '#F3F4F6',
    },
    boldText: {
        fontWeight: 'bold',
        color: '#111827',
    },
    boldTextDark: {
        color: '#FFFFFF',
    },
    bulletRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    bullet: {
        color: '#F59E0B',
        fontWeight: 'bold',
    },
    bulletContent: {
        flex: 1,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    typingContainer: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
        height: 20,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotLight: {
        backgroundColor: '#10b981',
    },
    dotDark: {
        backgroundColor: '#10b981',
    },
    loadingText: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#6B7280',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    inputContainerDark: {
        backgroundColor: '#1F2937',
        borderTopColor: '#374151',
    },
    input: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        maxHeight: 100,
    },
    inputDark: {
        backgroundColor: '#374151',
        color: '#FFFFFF',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDark: {
        backgroundColor: '#10b981',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        fontSize: 18,
        color: '#FFFFFF',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textLight: {
        color: '#9CA3AF',
    },
});
