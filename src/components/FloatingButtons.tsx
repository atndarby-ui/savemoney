import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '../constants';

interface FloatingButtonsProps {
    navigation: any;
    theme?: 'light' | 'dark';
}

export default function FloatingButtons({ navigation, theme = 'light' }: FloatingButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isDark = theme === 'dark';

    // Animate when recording state changes
    useEffect(() => {
        if (recording) {
            // Scale up and start pulsing
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.5,
                    useNativeDriver: true,
                    friction: 5,
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(pulseAnim, {
                            toValue: 1.1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ])
                ),
            ]).start();
        } else {
            // Scale back to normal
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
            pulseAnim.setValue(1);
        }
    }, [recording]);

    // --- AI PROCESSING ---
    const processContentWithGemini = async (base64Data: string, mimeType: string, type: 'image' | 'audio', localUri?: string) => {
        setIsLoading(true);
        try {
            const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) {
                Alert.alert('Lỗi', 'Chưa cấu hình API Key cho Gemini.');
                setIsLoading(false);
                return;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const categoryIds = CATEGORIES.map(c => c.id).join(', ');
            // Get local date in YYYY-MM-DD format
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayISO = `${year}-${month}-${day}`;

            let promptText = "";
            if (type === 'image') {
                promptText = `
                Analyze this receipt/image. Extract ONLY the TOTAL amount and summarized information into a SINGLE transaction inside a JSON ARRAY.
                TODAY'S DATE IS: ${todayISO} (Use this if no date is found on receipt).
                
                CRITICAL RULES:
                1. DO NOT list individual items. Only extract the TOTAL amount shown at the bottom of the receipt.
                2. ALWAYS return an ARRAY containing exactly ONE transaction object, even if the receipt has many lines.
                3. The "note" should be a summary (e.g., "Hóa đơn [Tên cửa hàng]" or "Chi tiêu tổng hợp").
                4. Do not create separate transactions for different items. Combine everything into one total.
                
                Example Input: Receipt from "Coffee House" showing 5 items totaling 250,000.
                Correct Output:
                [
                    {"amount": 250000, "category": "food", "date": "${todayISO}", "note": "Hóa đơn Coffee House", "type": "expense"}
                ]
                
                JSON Format (ARRAY):
                [
                    {
                        "amount": number (INTEGER only, e.g. 50000),
                        "category": string (must be one of: ${categoryIds}),
                        "date": string (ISO 8601 YYYY-MM-DD),
                        "note": string (Summarized description in Vietnamese),
                        "type": "expense" | "income"
                    }
                ]
                
                Return ONLY JSON ARRAY. No markdown, no explanations.
                `;
            } else {
                promptText = `
                Listen to this audio command in Vietnamese. Extract ALL transaction details into a JSON ARRAY.
                TODAY'S DATE IS: ${todayISO}.
                
                CRITICAL RULES:
                1. FIRST, check if you can hear ANY clear speech in the audio. If the audio is SILENT, has NO speech, or is UNCLEAR, you MUST return: {"error": "NO_SPEECH_DETECTED"}
                2. DO NOT return the example data below if you don't actually hear those exact words!
                3. If user mentions MULTIPLE expenses with DIFFERENT amounts (e.g., "đi chợ 150k, trả tiền người yêu 20k, massage 30k"), you MUST create SEPARATE transactions for EACH.
                4. ALWAYS return an ARRAY, even if there's only 1 transaction.
                5. Do NOT combine multiple expenses into one transaction!
                6. Each transaction needs its own amount, category, and specific note.
                
                Example Input (Audio): "Đi chợ 150 nghìn, trả tiền người yêu 20 nghìn, massage 30 nghìn"
                Correct Output:
                [
                    {"amount": 150000, "category": "food", "date": "${todayISO}", "note": "Đi chợ", "type": "expense"},
                    {"amount": 20000, "category": "other", "date": "${todayISO}", "note": "Trả tiền người yêu", "type": "expense"},
                    {"amount": 30000, "category": "health", "date": "${todayISO}", "note": "Massage", "type": "expense"}
                ]
                
                IMPORTANT: The above is just an EXAMPLE. Do NOT return this data unless you actually hear these EXACT words in the audio!
                
                WRONG Output (DO NOT DO THIS):
                [
                    {"amount": 150000, "category": "other", "date": "${todayISO}", "note": "Đi chợ 150.000, trả tiền cho người yêu hết 20.000, massage hết 30.000", "type": "expense"}
                ]
                
                JSON Format (ARRAY):
                [
                    {
                        "amount": number (INTEGER value, e.g. 50000),
                        "category": string (must be one of: ${categoryIds}),
                        "date": string (ISO 8601 YYYY-MM-DD. Use ${todayISO} if not specified),
                        "note": string (Description in Vietnamese for THIS specific expense only),
                        "type": "expense" | "income"
                    }
                ]
                
                Return ONLY JSON ARRAY or {"error": "NO_SPEECH_DETECTED"}. No markdown code blocks, no explanations.
                `;
            }

            const result = await model.generateContent([
                { inlineData: { data: base64Data, mimeType: mimeType } },
                { text: promptText }
            ]);

            const responseText = result.response.text();
            console.log("AI Response:", responseText); // Debug

            // Find JSON block (array or object) with more resilience
            const jsonMatch = responseText.match(/\[[^\]]*\]|\{[^}]*\}/);
            if (!jsonMatch) {
                throw new Error("Invalid JSON response");
            }

            let parsedData;
            try {
                // Clean up any potential markdown or extra chars around the JSON
                const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                parsedData = JSON.parse(cleanJson);
            } catch (err) {
                console.error("JSON Parse Error:", err);
                throw new Error("Could not parse AI response");
            }

            // Check if AI detected no speech
            if (parsedData.error === "NO_SPEECH_DETECTED") {
                Alert.alert('Không nghe rõ', 'Không thể nghe rõ âm thanh. Vui lòng thử lại và nói rõ hơn.');
                setIsLoading(false);
                return;
            }

            // Ensure parsedData is an array
            const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];

            // Validate and Clean Each Transaction
            const validatedTransactions = dataArray.map(data => {
                // Ensure amount is a number and absolute
                if (data.amount !== undefined) {
                    const rawAmount = typeof data.amount === 'string'
                        ? parseInt(data.amount.replace(/[^0-9]/g, ''))
                        : Math.round(Math.abs(data.amount));
                    data.amount = isNaN(rawAmount) ? 0 : rawAmount;
                } else {
                    data.amount = 0;
                }

                // Ensure category is valid or fallback to 'other'
                const validIds = CATEGORIES.map(c => c.id);
                if (!data.category || !validIds.includes(data.category)) {
                    data.category = 'other';
                }

                // Ensure type is valid
                if (!['income', 'expense'].includes(data.type)) {
                    data.type = 'expense';
                }

                // Map category to correct type if possible (auto-correct AI mistakes)
                const catInfo = CATEGORIES.find(c => c.id === data.category);
                if (catInfo) {
                    data.type = catInfo.type;
                }

                // Ensure date is a valid ISO string with current time if only date provided
                if (data.date && typeof data.date === 'string' && data.date.length === 10) {
                    const now = new Date();
                    const [y, m, d] = data.date.split('-').map(Number);
                    const txDate = new Date();
                    txDate.setFullYear(y, m - 1, d);
                    txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                    data.date = txDate.toISOString();
                }

                return data;
            });

            // Navigate to AddTransaction with all transactions
            navigation.navigate('AddTransaction', {
                initialData: {
                    ...validatedTransactions[0], // First transaction as initial data
                    imageUri: localUri
                },
                multipleTransactions: validatedTransactions.length > 1 ? validatedTransactions : null,
                transactionCount: validatedTransactions.length
            });

        } catch (error) {
            console.error(error);
            Alert.alert('Lỗi AI', 'Không thể xử lý yêu cầu. Vui lòng thử lại rõ ràng hơn.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- SCAN RECEIPT ---
    const handleScanReceipt = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cần quyền truy cập', 'Vui lòng cấp quyền camera để chụp hóa đơn.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.6,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const capturedUri = result.assets[0].uri;
                const fileName = `receipt_${Date.now()}.jpg`;
                const permanentUri = `${FileSystem.documentDirectory}${fileName}`;

                // Move to permanent storage
                await FileSystem.copyAsync({
                    from: capturedUri,
                    to: permanentUri
                });

                await processContentWithGemini(result.assets[0].base64, 'image/jpeg', 'image', permanentUri);
            }
        } catch (error) {
            console.log("Image picker error:", error);
            Alert.alert('Lỗi', 'Không thể mở camera.');
        }
    };

    // --- TAP TO SPEAK ---
    const toggleRecording = async () => {
        if (recording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const startRecording = async () => {
        try {
            if (permissionResponse?.status !== 'granted') {
                console.log("Requesting permission..");
                await requestPermission();
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Lỗi', 'Không thể ghi âm.');
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording..');
        if (!recording) return;

        try {
            const recordingStatus = await recording.getStatusAsync();
            const durationMillis = recordingStatus.durationMillis || 0;

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            console.log('Recording stopped and stored at', uri);
            console.log('Recording duration:', durationMillis, 'ms');

            // Check if recording is too short (less than 300ms)
            if (durationMillis < 300) {
                Alert.alert('Ghi âm quá ngắn', 'Vui lòng giữ nút mic và nói rõ ràng hơn.');
                return;
            }

            if (uri) {
                const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                await processContentWithGemini(base64Audio, 'audio/mp4', 'audio');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Scan Receipt Button */}
            <TouchableOpacity
                style={[
                    styles.floatingButton,
                    styles.scanButton,
                    isDark && styles.buttonDark,
                    isLoading && styles.buttonDisabled
                ]}
                onPress={handleScanReceipt}
                disabled={isLoading || !!recording}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    <Ionicons name="camera" size={24} color="#FFFFFF" />
                )}
            </TouchableOpacity>

            {/* Voice Input Button */}
            <Animated.View
                style={{
                    transform: [
                        { scale: Animated.multiply(scaleAnim, pulseAnim) }
                    ]
                }}
            >
                <TouchableOpacity
                    style={[
                        styles.floatingButton,
                        styles.voiceButton,
                        isDark && styles.buttonDark,
                        recording && styles.recordingButton,
                        isLoading && styles.buttonDisabled
                    ]}
                    onPress={toggleRecording}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons
                            name={recording ? "stop" : "mic"}
                            size={24}
                            color="#FFFFFF"
                        />
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100, // Above the tab bar
        right: 16,
        gap: 12,
    },
    floatingButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    scanButton: {
        backgroundColor: '#00D9FF', // Bright Cyan for camera
    },
    voiceButton: {
        backgroundColor: '#8B5CF6', // Vibrant Purple for voice
    },
    recordingButton: {
        backgroundColor: '#FF6B6B', // Bright Coral Red when recording
    },
    buttonDark: {
        shadowColor: '#10b981',
        shadowOpacity: 0.5,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
