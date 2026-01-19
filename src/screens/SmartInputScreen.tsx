import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { CATEGORIES } from '../constants';
import { SecurityService } from '../services/SecurityService';

interface SmartInputScreenProps {
    navigation: any;
    route: any;
}

export default function SmartInputScreen({ navigation }: SmartInputScreenProps) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Get from context/props if possible
    const isDark = theme === 'dark';

    const [isLoading, setIsLoading] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    const handleClose = () => {
        navigation.goBack();
    };

    const handleManualInput = () => {
        // Navigate to manual input modal
        navigation.navigate('AddTransaction');
    };

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
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const seconds = String(now.getSeconds()).padStart(2, '0');
                    // Convert YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss.sssZ (local time approximation)
                    // Actually, simpler to just use Date object and then back to string
                    const [y, m, d] = data.date.split('-').map(Number);
                    const txDate = new Date();
                    txDate.setFullYear(y, m - 1, d);
                    // Keep current time
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

            SecurityService.setIgnoreAppLock(true);
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // SKIP CROP - ONE STEP ONLY!
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
                // Note: HIGH_QUALITY preset usually outputs .m4a
                await processContentWithGemini(base64Audio, 'audio/mp4', 'audio');
            }
        } catch (error) {
            console.error(error);
        }
    };


    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleClose}
            />
            <View style={styles.sheet}>
                <View style={styles.content}>
                    {/* Handle for sheet */}
                    <View style={styles.header}>
                        <View style={styles.handle} />
                    </View>

                    <Text style={[styles.title, isDark && styles.textDark]}>
                        AI Smart Input
                    </Text>

                    <Text style={[styles.subtitle, isDark && styles.textLight]}>
                        Nói, chụp ảnh hoặc nhập văn bản.{'\n'}
                        Gemini sẽ tự động điền form cho bạn.
                    </Text>

                    {/* Mic Button */}
                    <View style={styles.micContainer}>
                        <TouchableOpacity
                            style={[
                                styles.micButton,
                                isDark && styles.micButtonDark,
                                recording && styles.micButtonRecording
                            ]}
                            onPress={toggleRecording}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" size="large" />
                            ) : (
                                recording ? (
                                    <Ionicons name="stop" size={44} color="#FFFFFF" />
                                ) : (
                                    <Image
                                        source={require('../../assets/icons/3d/fab_mic.png')}
                                        style={{ width: 60, height: 60 }}
                                        resizeMode="contain"
                                    />
                                )
                            )}
                        </TouchableOpacity>
                        <Text style={[styles.micLabel, isDark && styles.textLight]}>
                            {recording ? 'ĐANG NGHE...' : (isLoading ? 'ĐANG XỬ LÝ...' : 'CHẠM ĐỂ NÓI')}
                        </Text>
                    </View>

                    {/* Actions Row */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, isDark && styles.actionButtonDark]}
                            onPress={handleScanReceipt}
                            disabled={isLoading || !!recording}
                        >
                            <View style={styles.iconCircle}>
                                <Image
                                    source={require('../../assets/icons/3d/fab_camera.png')}
                                    style={{ width: 34, height: 34 }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={[styles.actionText, isDark && styles.textDark]}>
                                Quét hóa đơn
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, isDark && styles.actionButtonDark]}
                            onPress={handleManualInput}
                            disabled={isLoading || !!recording}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                                <Ionicons name="create" size={26} color="#10B981" />
                            </View>
                            <Text style={[styles.actionText, isDark && styles.textDark]}>
                                Nhập văn bản
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleManualInput} style={styles.manualLink}>
                        <Text style={styles.manualLinkText}>
                            Chuyển sang nhập thủ công
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        height: '65%',
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    sheetDark: {
        backgroundColor: '#111827',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 12,
        width: '100%',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 2.5,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
        fontWeight: '500',
    },
    micContainer: {
        alignItems: 'center',
        marginBottom: 45,
    },
    micButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 12,
    },
    micButtonDark: {
        backgroundColor: '#10b981',
        shadowColor: '#10b981',
    },
    micButtonRecording: {
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444',
    },
    micLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
        marginBottom: 30,
    },
    actionButton: {
        flex: 1,
        height: 110,
        backgroundColor: '#F9FAFB',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    actionButtonDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    manualLink: {
        marginTop: 'auto',
        marginBottom: 35,
    },
    manualLinkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#9CA3AF',
        textDecorationLine: 'underline',
    },
    textDark: {
        color: '#FFFFFF',
    },
    textLight: {
        color: '#9CA3AF',
    },
});
