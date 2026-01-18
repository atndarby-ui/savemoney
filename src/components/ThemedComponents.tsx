import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewProps, TextProps, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADII, SHADOWS } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ThemedViewProps extends ViewProps {
    color?: string; // Override background color
    variant?: 'primary' | 'secondary' | 'surface' | 'background';
}

export const ThemedView = ({ style, color, variant = 'background', ...props }: ThemedViewProps) => {
    const { colors } = useTheme();

    let backgroundColor = colors.background;
    if (variant === 'surface') backgroundColor = colors.surface;
    if (variant === 'primary') backgroundColor = colors.primary;
    if (variant === 'secondary') backgroundColor = colors.secondary;
    if (color) backgroundColor = color;

    return <View style={[{ backgroundColor }, style]} {...props} />;
};

interface ThemedTextProps extends TextProps {
    variant?: keyof typeof TYPOGRAPHY;
    color?: string; // Override text color
    secondary?: boolean;
}

export const ThemedText = ({ style, variant = 'body', color, secondary, ...props }: ThemedTextProps) => {
    const { colors } = useTheme();

    let textColor = secondary ? colors.textSecondary : colors.text;
    if (color) textColor = color;

    return (
        <Text
            style={[
                TYPOGRAPHY[variant],
                { color: textColor },
                style
            ]}
            {...props}
        />
    );
};

interface GlassViewProps extends ViewProps {
    children: ReactNode;
    intensity?: number;
}

// Simple glassmorphism using semi-transparent backgrounds (compatible with all platforms)
export const GlassView = ({ style, children, intensity = 50, ...props }: GlassViewProps) => {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[
                styles.glass,
                {
                    backgroundColor: colors.surfaceGlass,
                    borderColor: colors.border,
                    borderWidth: 1,
                    ...SHADOWS.glass,
                },
                style
            ]}
            {...props}
        >
            {children}
        </View>
    );
};

interface GradientButtonProps extends ViewProps {
    colors?: string[];
    children: ReactNode;
    onPress?: () => void;
}

// Simple wrapper for LinearGradient if available, otherwise fallback
// Simple wrapper for LinearGradient if available, otherwise fallback
export const GradientView = ({ colors: customColors, style, children, ...props }: any) => {
    const { colors } = useTheme();

    // We expect colors.gradients to exist on the theme object now
    const gradientColors = customColors || (colors.gradients ? colors.gradients.primary : ['#EC4899', '#F472B6']);

    return (
        <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={style}
            {...props}
        >
            {children}
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    glass: {
        borderRadius: RADII.xl,
        overflow: 'hidden',
    }
});
