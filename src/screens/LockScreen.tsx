import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    Alert,
    Platform,
    Modal,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SecurityService } from '../services/SecurityService';
import { COLORS } from '../constants/theme'; // Assuming this exists or I'll use common colors

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintQuestion, setHintQuestion] = useState<string | null>(null);
    const [showHintInput, setShowHintInput] = useState(false);
    const [hintAnswerInput, setHintAnswerInput] = useState('');

    const [keyboardType, setKeyboardType] = useState<'default' | 'numeric' | 'number-pad'>('default');

    useEffect(() => {
        checkPasswordType();
        checkBiometrics();
        loadHint();
    }, []);

    const checkPasswordType = async () => {
        const isNum = await SecurityService.isPasswordNumeric();
        setKeyboardType(isNum ? 'number-pad' : 'default');
    };

    // Auto-prompt biometrics if enabled
    useEffect(() => {
        (async () => {
            const bioEnabled = await SecurityService.isBiometricsEnabled();
            if (bioEnabled) {
                // Small delay to ensure UI is ready or simply just call it
                setTimeout(() => handleBiometricAuth(), 500);
            }
        })();
    }, []);

    const checkBiometrics = async () => {
        const bioEnabled = await SecurityService.isBiometricsEnabled();
        const hasHardware = await SecurityService.hasHardwareAsync();
        setIsBiometricAvailable(bioEnabled && hasHardware);
    };

    const loadHint = async () => {
        const q = await SecurityService.getHintQuestion();
        setHintQuestion(q);
    };

    const handleNumberPress = (num: string) => {
        if (password.length < 6) {
            setPassword(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setPassword(prev => prev.slice(0, -1));
        setError('');
    };

    const handleSubmit = async () => {
        const isValid = await SecurityService.validatePassword(password);
        if (isValid) {
            onUnlock();
        } else {
            setError('Incorrect password');
            setPassword('');
        }
    };

    const handleBiometricAuth = async () => {
        const success = await SecurityService.authenticateBiometric();
        if (success) {
            onUnlock();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={{ width: 80, height: 80, borderRadius: 20 }}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Enter your password to continue</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setError('');
                    }}
                    autoFocus={false}
                    keyboardType={keyboardType}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>Unlock</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    {isBiometricAvailable && (
                        <TouchableOpacity style={styles.footerButton} onPress={handleBiometricAuth}>
                            <Ionicons name="finger-print-outline" size={32} color={'#10b981'} />
                            <Text style={styles.footerText}>Use Biometrics</Text>
                        </TouchableOpacity>
                    )}

                    {hintQuestion && (
                        <TouchableOpacity style={styles.footerButton} onPress={() => setShowHintInput(true)}>
                            <Ionicons name="help-circle-outline" size={32} color={'#10b981'} />
                            <Text style={styles.footerText}>Hint</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Hint Input Modal Overlay */}
                <Modal
                    visible={showHintInput}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowHintInput(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Password Recovery</Text>
                            <Text style={styles.modalSubtitle}>{hintQuestion}</Text>

                            <TextInput
                                style={styles.modalInput}
                                placeholder="Answer"
                                placeholderTextColor="#999"
                                value={hintAnswerInput}
                                onChangeText={setHintAnswerInput}
                                autoFocus
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#333' }]}
                                    onPress={() => {
                                        setShowHintInput(false);
                                        setHintAnswerInput('');
                                    }}
                                >
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#10b981' }]}
                                    onPress={async () => {
                                        const valid = await SecurityService.checkHintAnswer(hintAnswerInput);
                                        if (valid) {
                                            setShowHintInput(false);
                                            onUnlock();
                                        } else {
                                            Alert.alert('Error', 'Incorrect answer');
                                        }
                                    }}
                                >
                                    <Text style={styles.buttonText}>Unlock</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Deep dark background
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '80%',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#999',
        marginBottom: 30,
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 15,
        color: '#fff',
        fontSize: 16,
        marginBottom: 15,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#10b981',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4444',
        marginBottom: 10,
    },
    footer: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%'
    },
    footerButton: {
        alignItems: 'center',
        padding: 10
    },
    footerText: {
        color: '#999',
        fontSize: 12,
        marginTop: 5
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 24,
        textAlign: 'center',
    },
    modalInput: {
        width: '100%',
        height: 50,
        backgroundColor: '#333',
        borderRadius: 12,
        paddingHorizontal: 15,
        color: '#fff',
        fontSize: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#444',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
