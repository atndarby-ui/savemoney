import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_IS_ENABLED = 'security_is_enabled';
const KEY_PASSWORD = 'security_password'; // Hashed or plain? For local app lock, simple string match is common, but hash is better. 
// For simplicity in this context and since user might want to recover it via hint (which implies we might need to verify against it easily), 
// we'll store it in SecureStore which is already encrypted.

const KEY_USE_BIOMETRICS = 'security_use_biometrics';
const KEY_HINT_QUESTION = 'security_hint_question';
const KEY_HINT_ANSWER = 'security_hint_answer';

let ignoreAppLock = false;

export const SecurityService = {
    setIgnoreAppLock: (ignore: boolean) => {
        ignoreAppLock = ignore;
    },
    shouldIgnoreAppLock: () => {
        return ignoreAppLock;
    },

    // Check if hardware supports biometrics
    hasHardwareAsync: async () => {
        try {
            if (!LocalAuthentication || !LocalAuthentication.hasHardwareAsync) return false;
            return await LocalAuthentication.hasHardwareAsync();
        } catch (e) {
            console.warn('[SecurityService] LocalAuthentication module not found');
            return false;
        }
    },

    // Check if biometrics is enrolled
    isEnrolledAsync: async () => {
        try {
            if (!LocalAuthentication || !LocalAuthentication.isEnrolledAsync) return false;
            return await LocalAuthentication.isEnrolledAsync();
        } catch (e) {
            return false;
        }
    },

    // Enable/Disable Security
    setEnabled: async (enabled: boolean) => {
        try {
            if (enabled) {
                await SecureStore.setItemAsync(KEY_IS_ENABLED, 'true');
            } else {
                await SecureStore.deleteItemAsync(KEY_IS_ENABLED);
                // Do NOT delete other keys to persist settings
            }
        } catch (e) {
            console.error('[SecurityService] SecureStore error:', e);
        }
    },

    isEnabled: async (): Promise<boolean> => {
        try {
            const res = await SecureStore.getItemAsync(KEY_IS_ENABLED);
            return res === 'true';
        } catch (e) {
            return false;
        }
    },

    hasPassword: async (): Promise<boolean> => {
        try {
            const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
            return !!pw;
        } catch (e) { return false; }
    },

    isPasswordNumeric: async (): Promise<boolean> => {
        try {
            const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
            if (!pw) return false;
            return /^\d+$/.test(pw);
        } catch (e) { return false; }
    },

    // Password Management
    setPassword: async (password: string) => {
        try {
            await SecureStore.setItemAsync(KEY_PASSWORD, password);
        } catch (e) { }
    },

    getPassword: async () => {
        try {
            return await SecureStore.getItemAsync(KEY_PASSWORD);
        } catch (e) { return null; }
    },

    validatePassword: async (input: string) => {
        try {
            const stored = await SecureStore.getItemAsync(KEY_PASSWORD);
            return stored === input;
        } catch (e) { return false; }
    },

    // Biometrics Management
    setBiometricsEnabled: async (enabled: boolean) => {
        try {
            if (enabled) {
                await SecureStore.setItemAsync(KEY_USE_BIOMETRICS, 'true');
            } else {
                await SecureStore.deleteItemAsync(KEY_USE_BIOMETRICS);
            }
        } catch (e) { }
    },

    isBiometricsEnabled: async () => {
        try {
            const res = await SecureStore.getItemAsync(KEY_USE_BIOMETRICS);
            return res === 'true';
        } catch (e) { return false; }
    },

    authenticateBiometric: async () => {
        try {
            if (!LocalAuthentication || !LocalAuthentication.authenticateAsync) return false;
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) return false;

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to access Money App',
                fallbackLabel: 'Use Password',
            });

            return result.success;
        } catch (e) {
            console.error('[SecurityService] Biometric auth error:', e);
            return false;
        }
    },

    // Hint Management
    setHint: async (question: string, answer: string) => {
        await SecureStore.setItemAsync(KEY_HINT_QUESTION, question);
        await SecureStore.setItemAsync(KEY_HINT_ANSWER, answer.toLowerCase().trim());
    },

    getHintQuestion: async () => {
        return await SecureStore.getItemAsync(KEY_HINT_QUESTION);
    },

    getHintAnswer: async () => {
        return await SecureStore.getItemAsync(KEY_HINT_ANSWER);
    },

    hasHint: async () => {
        return !!(await SecureStore.getItemAsync(KEY_HINT_QUESTION));
    },

    checkHintAnswer: async (input: string) => {
        const stored = await SecureStore.getItemAsync(KEY_HINT_ANSWER);
        return stored === input.toLowerCase().trim();
    },

    // Clear all security settings (for Reset Data)
    clearSecuritySettings: async () => {
        await SecureStore.deleteItemAsync(KEY_IS_ENABLED);
        await SecureStore.deleteItemAsync(KEY_PASSWORD);
        await SecureStore.deleteItemAsync(KEY_USE_BIOMETRICS);
        await SecureStore.deleteItemAsync(KEY_HINT_QUESTION);
        await SecureStore.deleteItemAsync(KEY_HINT_ANSWER);
    }
};
