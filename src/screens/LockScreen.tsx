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
    Platform
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

    useEffect(() => {
        checkBiometrics();
        loadHint();
    }, []);

    // Auto-prompt biometrics if enabled
    useEffect(() => {
        (async () => {
            const bioEnabled = await SecurityService.isBiometricsEnabled();
            if (bioEnabled) {
                handleBiometricAuth();
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
        if (password.length < 6) { // Assume 6 digit pin for now, or variable length? 
            // User might have alphanumeric password. 
            // But typically "App Lock" uses PIN pad or standard keyboard.
            // Based on user request "password", it could be text.
            // Let's support text input but start with a PIN pad styled view if it looks like digits, 
            // or just a TextInput for maximum flexibility.
            // Since user said "pass", I'll use a TextInput but styled nicely.
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
            // Trigger haptic?
        }
    };

    // If password changes and length matches standard length (e.g. 4 or 6), maybe auto submit?
    // But we don't know the user's password length preference yet. 
    // We'll trust the "Go" button or explicit submit.

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
                    <Ionicons name="lock-closed" size={48} color={COLORS.primary || '#10b981'} />
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
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>Unlock</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    {isBiometricAvailable && (
                        <TouchableOpacity style={styles.footerButton} onPress={handleBiometricAuth}>
                            <Ionicons name="finger-print-outline" size={32} color={COLORS.primary || '#10b981'} />
                            <Text style={styles.footerText}>Use Biometrics</Text>
                        </TouchableOpacity>
                    )}

                    {hintQuestion && (
                        <TouchableOpacity style={styles.footerButton} onPress={() => Alert.alert('Password Hint', hintQuestion)}>
                            <Ionicons name="help-circle-outline" size={32} color={COLORS.primary || '#10b981'} />
                            <Text style={styles.footerText}>Hint</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // Primary opacity
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
        backgroundColor: COLORS.primary || '#10b981',
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
    }
});
