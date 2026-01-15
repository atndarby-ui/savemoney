import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
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

const translations = {
    'Tiếng Việt': {
        askAI: 'Giải cứu cái ví',
        placeholder: 'Hỏi han gì tôi đi, đừng ngại...',
        aiName: 'Kế toán siêu cấp',
        aiIntro:
            'Chào bạn thân mến! Tôi là Kế toán siêu cấp. Tôi ở đây để giúp bạn quản lý xu dính túi để không phải ăn mì tôm qua ngày. Bạn cần "khám túi" hay muốn tôi "phán" gì về thói quen vung tay quá trán của mình không? 😎',
        thinking: 'Đợi xíu, đang dùng não to để tính...',
    },
    'English': {
        askAI: 'Wallet Rescue',
        placeholder: 'Ask me anything, don\'t be shy...',
        aiName: 'Super Accountant',
        aiIntro:
            "Hey there! I'm your Super VIP Accounting Professor. I'm here to help you manage your coins so you don't end up living on cup noodles. Need a 'wallet checkup' or want me to 'judge' your spending habits? 😎",
        thinking: 'Wait a sec, brain is processing...',
    },
};

const formatAIResponse = (text: string, isDark: boolean) => {
    return text.split('\n').map((line, i) => {
        let content = line.trim();
        if (!content) return <View key={i} style={{ height: 8 }} />;

        const isBullet = content.startsWith('* ') || content.startsWith('- ');
        if (isBullet) {
            content = content.replace(/^[*|-]\s+/, '');
        }

        const parts = content.split(/(\*\*.*?\*\*)/g);
        const element = (
            <Text key={i} style={[styles.messageText, isDark && styles.messageTextDark]}>
                {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                            <Text
                                key={j}
                                style={[
                                    styles.boldText,
                                    isDark && styles.boldTextDark,
                                ]}
                            >
                                {part.slice(2, -2)}
                            </Text>
                        );
                    }
                    return part;
                })}
            </Text>
        );

        return isBullet ? (
            <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <View style={styles.bulletContent}>{element}</View>
            </View>
        ) : (
            <Text
                key={i}
                style={[
                    styles.messageText,
                    isDark && styles.messageTextDark,
                ]}
            >
                {element}
            </Text>
        );
    });
};

export default function ChatScreen({
    transactions,
    messages,
    setMessages,
    language,
    theme,
    navigation,
    route,
}: ChatScreenProps) {
    const t = translations[language];
    const isDark = theme === 'dark';
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

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
        if (messages.length === 0) {
            setMessages([{ role: 'model', text: t.aiIntro }]);
        }
    }, []);

    // Handle initial prompt from other screens
    useEffect(() => {
        if (route.params?.initialPrompt) {
            const prompt = route.params.initialPrompt;
            // Clear the param so it doesn't trigger again on re-focus
            navigation.setParams({ initialPrompt: undefined });
            handleSend(prompt);
        }
    }, [route.params?.initialPrompt]);

    useEffect(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages, isLoading]);

    const systemPrompt = `
You are a Super Accountant (Kế toán siêu cấp) with a VERY HUMOROUS, WITTY, and FRIENDLY personality for the Kế toán siêu cấp application.
Your goal is to provide deep financial insights but make the user laugh or smile. Use emojis moderately.
Be a bit "sassy" if the user spends too much on things they don't need, but always stay helpful.

CRITICAL: Respond ONLY in ${language}.

Recent user transaction data:
${JSON.stringify(transactions.slice(0, 50))}

Your instructions:
1. Analyze spending patterns with humor.
2. If they spent too much, roast them gently (e.g., "Mì tôm đang chờ bạn đó!").
3. Give solid financial advice wrapped in a joke.
4. Maintain an encouraging and fun tone.
5. Use bullet points and **bold text** for key numbers.
6. Keep responses under 200 words.
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
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
            setMessages([
                ...newMessages,
                {
                    role: 'model',
                    text:
                        language === 'English'
                            ? "Oops, my financial brain just short-circuited! Try again?"
                            : 'Ối giời ơi, não tài chính của tôi vừa bị chập mạch rồi! Thử lại nha?',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.inner, isDark && styles.innerDark]}>
                {/* Header */}
                <View style={[styles.header, isDark && styles.headerDark]}>
                    <View style={styles.headerIcon}>
                        <Text style={styles.headerIconText}>🤪</Text>
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
                            {t.askAI}
                        </Text>
                        <Text style={[styles.headerSubtitle, isDark && styles.textLight]}>
                            {t.aiName}
                        </Text>
                    </View>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                >
                    {messages.map((msg, idx) => (
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
                                <View>{formatAIResponse(msg.text, isDark)}</View>
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
                    ))}
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
                                <Text style={[styles.loadingText, isDark && styles.textLight]}>
                                    {t.thinking}
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={[
                    styles.inputContainer,
                    isDark && styles.inputContainerDark,
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#111827',
    },
    headerDark: {
        backgroundColor: '#111827',
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerIconText: {
        fontSize: 24,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
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
