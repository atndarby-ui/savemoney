import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, AccentColorType, ThemeType } from '../constants/theme';

export const ACCENT_COLORS: Record<AccentColorType, string> = {
    pink: '#EC4899',
    purple: '#A855F7',
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F97316',
    red: '#EF4444',
};

export type AccentColorKey = AccentColorType;

// Infer the palette type from the constant to ensure full compatibility
type ThemeColors = typeof PALETTES['pink']['light'];

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    toggleTheme: () => void;
    setTheme: (theme: ThemeType) => void;
    isDark: boolean;
    accentColor: AccentColorKey;
    setAccentColor: (color: AccentColorKey) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme();
    const [theme, setThemeState] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');
    const [accentColor, setAccentColorState] = useState<AccentColorKey>('pink');

    useEffect(() => {
        loadTheme();
        loadAccentColor();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('app_theme');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeState(savedTheme);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const loadAccentColor = async () => {
        try {
            const savedColor = await AsyncStorage.getItem('app_accent_color');
            if (savedColor && savedColor in ACCENT_COLORS) {
                setAccentColorState(savedColor as AccentColorKey);
            }
        } catch (error) {
            console.error('Failed to load accent color', error);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('app_theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const setAccentColor = async (color: AccentColorKey) => {
        setAccentColorState(color);
        try {
            await AsyncStorage.setItem('app_accent_color', color);
        } catch (error) {
            console.error('Failed to save accent color', error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    // Select the correct full palette based on accent color and theme mode
    const activePalette = PALETTES[accentColor][theme];

    const value = {
        theme,
        colors: activePalette,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        accentColor,
        setAccentColor,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

