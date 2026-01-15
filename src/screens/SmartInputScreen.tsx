import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Alert,
    ActivityIndicator,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { CATEGORIES } from '../constants';

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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

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
                Analyze this receipt/image. Extract transaction details into a JSON object.
                TODAY'S DATE IS: ${todayISO} (Use this if no date is found on receipt).
                
                JSON Format:
                {
                    "amount": number (INTEGER only, e.g. 50000),
                    "category": string (must be one of: ${categoryIds}),
                    "date": string (ISO 8601 YYYY-MM-DD),
                    "note": string (Short description in Vietnamese),
                    "type": "expense" | "income"
                }
                Return ONLY JSON. No explanations.
                `;
            } else {
                promptText = `
                Listen to this audio command in Vietnamese. Extract details into a JSON object.
                TODAY'S DATE IS: ${todayISO}.
                
                {
                    "amount": number (INTEGER value, e.g. 50000),
                    "category": string (must be one of: ${categoryIds}),
                    "date": string (ISO 8601 YYYY-MM-DD. Use ${todayISO} if not specified),
                    "note": string (Description in Vietnamese),
                    "type": "expense" | "income"
                }
                Return ONLY JSON. No explanations.
                `;
            }

            const result = await model.generateContent([
                { inlineData: { data: base64Data, mimeType: mimeType } },
                { text: promptText }
            ]);

            const responseText = result.response.text();
            console.log("AI Response:", responseText); // Debug

            // Find JSON block with more resilience
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("Invalid JSON response");
            }

            let data;
            try {
                // Clean up any potential markdown or extra chars around the JSON
                const cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                data = JSON.parse(cleanJson);
            } catch (err) {
                console.error("JSON Parse Error:", err);
                throw new Error("Could not parse AI response");
            }

            // Validate and Clean Data
            if (data.amount !== undefined) {
                // Ensure amount is a number and absolute
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

            // Navigate to AddTransaction with data
            navigation.navigate('AddTransaction', {
                initialData: {
                    ...data,
                    imageUri: localUri
                }
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
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            console.log('Recording stopped and stored at', uri);

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
                                <Ionicons name={recording ? "stop" : "mic"} size={44} color="#FFFFFF" />
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
                                <Ionicons name="camera" size={26} color="#6366F1" />
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
