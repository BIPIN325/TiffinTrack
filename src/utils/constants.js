export const COLORS = {
  // Saffron & Slate minimal light theme -> Updated to Screenshot Saffron / Pink
  backgroundLight: '#FFFFFF', // Clean white for content cards
  backgroundDark: '#F9F9FB', // Very light grey for app backgrounds
  glassBackground: '#FFFFFF', // Solid white cards
  
  // Accents & Functional
  primaryRed: '#FF6B6B', // Custom Vibrant Red/Pink for active elements
  successGreen: '#10B981', // Emerald Green 
  warningOrange: '#F59E0B',
  
  // Sub-Tags
  badgeGreenBg: '#EAF8F0', // Light green background
  badgeGreenText: '#10B981', // Dark green text 
  badgePinkBg: '#FFEBEB', // Light pink background
  badgePinkText: '#FF6B6B', // Red pink text
  
  // Text
  textDark: '#1E293B', // Bold dark text
  textLight: '#18181b', // Main paragraph text
  textMuted: '#94a3b8',
  white: '#FFFFFF',

  // Borders
  borderLight: '#F3F4F6',
  borderDark: '#f4f4f5',
  borderPink: '#FFEBEB', // Signature pink tiffin border
};

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 20,
  extraLarge: 24,
  radius: 28, // High border-radius for organic curves (24-32px)
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.textDark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dark: {
    shadowColor: COLORS.backgroundDark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
