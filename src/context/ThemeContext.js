import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme_preference';

export const LIGHT_THEME = {
    backgroundLight: '#FFFFFF',
    backgroundDark: '#F9F9FB',
    glassBackground: '#FFFFFF',
    primaryRed: '#FF6B6B',
    successGreen: '#10B981',
    warningOrange: '#F59E0B',
    badgeGreenBg: '#EAF8F0',
    badgeGreenText: '#10B981',
    badgePinkBg: '#FFEBEB',
    badgePinkText: '#FF6B6B',
    textDark: '#1E293B',
    textLight: '#18181b',
    textMuted: '#94a3b8',
    white: '#FFFFFF',
    borderLight: '#F3F4F6',
    borderDark: '#f4f4f5',
    borderPink: '#FFEBEB',
    statusBarStyle: 'dark',
};

export const DARK_THEME = {
    backgroundLight: '#1E2533',
    backgroundDark: '#0F172A',
    glassBackground: '#1E2533',
    primaryRed: '#FF6B6B',
    successGreen: '#10B981',
    warningOrange: '#F59E0B',
    badgeGreenBg: '#10B98120',
    badgeGreenText: '#10B981',
    badgePinkBg: '#FF6B6B20',
    badgePinkText: '#FF6B6B',
    textDark: '#F1F5F9',
    textLight: '#E2E8F0',
    textMuted: '#64748B',
    white: '#1E2533',
    borderLight: '#334155',
    borderDark: '#334155',
    borderPink: '#FF6B6B30',
    statusBarStyle: 'light',
};

const ThemeContext = createContext({
    theme: 'light',
    colors: LIGHT_THEME,
    setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState('light');

    useEffect(() => {
        AsyncStorage.getItem(THEME_KEY).then(saved => {
            if (saved) setThemeState(saved);
        });
    }, []);

    const setTheme = async (newTheme) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem(THEME_KEY, newTheme);
    };

    const colors = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    return (
        <ThemeContext.Provider value={{ theme, colors, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
