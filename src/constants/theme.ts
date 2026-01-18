/**
 * Modern 2026 Gen Z Design System
 * Focus: Vibrant, Neon, Glassmorphism, Deep Depth
 */

export type ThemeType = 'light' | 'dark';
export type AccentColorType = 'pink' | 'purple' | 'blue' | 'green' | 'orange' | 'red';

interface ColorPalette {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceGlass: string;
    text: string;
    textSecondary: string;
    accent: string;
    error: string;
    success: string;
    border: string;
    cardShadow: string;
    gradients: {
        primary: string[];
        secondary: string[];
        accent: string[];
        darkBg: string[];
    };
}

export const PALETTES: Record<AccentColorType, Record<ThemeType, ColorPalette>> = {
    pink: {
        light: {
            primary: '#EC4899', // Hot Pink
            secondary: '#F472B6', // Light Pink
            background: '#FFF5F7', // Very light pink tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#D946EF', // Fuchsia
            error: '#EF4444',
            success: '#10B981',
            border: 'rgba(236, 72, 153, 0.1)',
            cardShadow: '#EC4899',
            gradients: {
                primary: ['#EC4899', '#F472B6'],
                secondary: ['#F472B6', '#FBCFE8'],
                accent: ['#D946EF', '#E879F9'],
                darkBg: ['#0F0A0D', '#1C1419'],
            }
        },
        dark: {
            primary: '#F472B6',
            secondary: '#EC4899',
            background: '#0F0A0D', // Dark with pink tint
            surface: '#1C1419',
            surfaceGlass: 'rgba(28, 20, 25, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#E879F9',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(244, 114, 182, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#EC4899', '#F472B6'],
                secondary: ['#F472B6', '#831843'],
                accent: ['#D946EF', '#E879F9'],
                darkBg: ['#0F0A0D', '#1C1419'],
            }
        }
    },
    purple: {
        light: {
            primary: '#A855F7', // Purple 500
            secondary: '#C084FC', // Purple 400
            background: '#FAF5FF', // Light purple tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#D8B4FE',
            error: '#EF4444',
            success: '#10B981',
            border: 'rgba(168, 85, 247, 0.1)',
            cardShadow: '#A855F7',
            gradients: {
                primary: ['#A855F7', '#C084FC'],
                secondary: ['#C084FC', '#E9D5FF'],
                accent: ['#9333EA', '#A855F7'],
                darkBg: ['#0D0A0F', '#18141F'],
            }
        },
        dark: {
            primary: '#C084FC',
            secondary: '#A855F7',
            background: '#0D0A0F', // Dark with purple tint
            surface: '#18141F',
            surfaceGlass: 'rgba(24, 20, 31, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#D8B4FE',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(192, 132, 252, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#A855F7', '#C084FC'],
                secondary: ['#C084FC', '#581C87'],
                accent: ['#9333EA', '#A855F7'],
                darkBg: ['#0D0A0F', '#18141F'],
            }
        }
    },
    blue: {
        light: {
            primary: '#3B82F6', // Blue 500
            secondary: '#60A5FA', // Blue 400
            background: '#EFF6FF', // Light blue tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#93C5FD',
            error: '#EF4444',
            success: '#10B981',
            border: 'rgba(59, 130, 246, 0.1)',
            cardShadow: '#3B82F6',
            gradients: {
                primary: ['#3B82F6', '#60A5FA'],
                secondary: ['#60A5FA', '#BFDBFE'],
                accent: ['#2563EB', '#3B82F6'],
                darkBg: ['#0A0D0F', '#111827'],
            }
        },
        dark: {
            primary: '#60A5FA',
            secondary: '#3B82F6',
            background: '#0B1120', // Dark with blue tint
            surface: '#111827',
            surfaceGlass: 'rgba(17, 24, 39, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#93C5FD',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(96, 165, 250, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#3B82F6', '#60A5FA'],
                secondary: ['#3B82F6', '#1E3A8A'],
                accent: ['#2563EB', '#3B82F6'],
                darkBg: ['#0B1120', '#111827'],
            }
        }
    },
    green: {
        light: {
            primary: '#10B981', // Emerald 500
            secondary: '#34D399', // Emerald 400
            background: '#F0FDF4', // Light green tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#6EE7B7',
            error: '#EF4444',
            success: '#059669',
            border: 'rgba(16, 185, 129, 0.1)',
            cardShadow: '#10B981',
            gradients: {
                primary: ['#10B981', '#34D399'],
                secondary: ['#34D399', '#A7F3D0'],
                accent: ['#059669', '#10B981'],
                darkBg: ['#064E3B', '#065F46'],
            }
        },
        dark: {
            primary: '#34D399',
            secondary: '#10B981',
            background: '#040F0A', // Much darker, almost black green
            surface: '#0D1A14',
            surfaceGlass: 'rgba(13, 26, 20, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#6EE7B7',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(52, 211, 153, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#10B981', '#34D399'],
                secondary: ['#10B981', '#064E3B'],
                accent: ['#059669', '#10B981'],
                darkBg: ['#040F0A', '#0D1A14'],
            }
        }
    },
    orange: {
        light: {
            primary: '#F97316', // Orange 500
            secondary: '#FB923C', // Orange 400
            background: '#FFF7ED', // Light orange tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#FDBA74',
            error: '#EF4444',
            success: '#10B981',
            border: 'rgba(249, 115, 22, 0.1)',
            cardShadow: '#F97316',
            gradients: {
                primary: ['#F97316', '#FB923C'],
                secondary: ['#FB923C', '#FED7AA'],
                accent: ['#EA580C', '#F97316'],
                darkBg: ['#0F0804', '#1F120A'],
            }
        },
        dark: {
            primary: '#FB923C',
            secondary: '#F97316',
            background: '#0F0804', // Much darker, almost black orange
            surface: '#1F120A',
            surfaceGlass: 'rgba(31, 18, 10, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#FDBA74',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(251, 146, 60, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#F97316', '#FB923C'],
                secondary: ['#F97316', '#7C2D12'],
                accent: ['#EA580C', '#F97316'],
                darkBg: ['#0F0804', '#1F120A'],
            }
        }
    },
    red: {
        light: {
            primary: '#EF4444', // Red 500
            secondary: '#F87171', // Red 400
            background: '#FEF2F2', // Light red tint
            surface: '#FFFFFF',
            surfaceGlass: 'rgba(255, 255, 255, 0.85)',
            text: '#1F2937',
            textSecondary: '#6B7280',
            accent: '#FCA5A5',
            error: '#B91C1C',
            success: '#10B981',
            border: 'rgba(239, 68, 68, 0.1)',
            cardShadow: '#EF4444',
            gradients: {
                primary: ['#EF4444', '#F87171'],
                secondary: ['#F87171', '#FECACA'],
                accent: ['#DC2626', '#EF4444'],
                darkBg: ['#0F0404', '#1F0A0A'],
            }
        },
        dark: {
            primary: '#F87171',
            secondary: '#EF4444',
            background: '#0F0404', // Much darker, almost black red
            surface: '#1F0A0A',
            surfaceGlass: 'rgba(31, 10, 10, 0.7)',
            text: '#F9FAFB',
            textSecondary: '#D1D5DB',
            accent: '#FCA5A5',
            error: '#F87171',
            success: '#34D399',
            border: 'rgba(248, 113, 113, 0.15)',
            cardShadow: '#000000',
            gradients: {
                primary: ['#EF4444', '#F87171'],
                secondary: ['#EF4444', '#991B1B'],
                accent: ['#DC2626', '#EF4444'],
                darkBg: ['#0F0404', '#1F0A0A'],
            }
        }
    }
};

// Fallback for direct usage (though we should avoid using this directly in components)
export const COLORS = PALETTES.pink;

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const RADII = {
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    full: 9999,
};

export const SHADOWS = {
    light: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
    },
    dark: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 32,
        elevation: 20,
    },
    glass: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 5,
    },
};

export const TYPOGRAPHY = {
    h1: { fontSize: 32, fontWeight: '800' as '800', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700' as '700', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '700' as '700', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400' as '400', lineHeight: 24 },
    bodyBold: { fontSize: 16, fontWeight: '600' as '600', lineHeight: 24 },
    caption: { fontSize: 13, fontWeight: '500' as '500', lineHeight: 18 },
    small: { fontSize: 11, fontWeight: '500' as '500', lineHeight: 14 },
    button: { fontSize: 14, fontWeight: '600' as '600', lineHeight: 20 },
};
