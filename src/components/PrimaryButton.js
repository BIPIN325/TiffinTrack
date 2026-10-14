import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS, SIZES } from '../utils/constants';

const PrimaryButton = ({ 
    title, 
    onPress, 
    type = 'primary', // 'primary' | 'success' | 'outline' | 'ghost'
    icon,
    disabled = false,
    style
}) => {
    
    const getBackgroundColor = () => {
        if (disabled) return COLORS.textMuted;
        switch (type) {
            case 'primary': return COLORS.primaryRed;
            case 'success': return COLORS.successGreen;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return COLORS.primaryRed;
        }
    };

    const getTextColor = () => {
        if (disabled) return COLORS.textMuted;
        switch (type) {
            case 'outline': return COLORS.primaryRed;
            case 'ghost': return COLORS.textDark;
            default: return COLORS.white; // Always white for primary/success
        }
    };

    const getBorderStyle = () => {
        if (type === 'outline') {
            return {
                borderWidth: 1.5,
                borderColor: COLORS.primaryRed,
            };
        }
        return {};
    };

    return (
        <TouchableOpacity 
            style={[
                styles.button, 
                { backgroundColor: getBackgroundColor() },
                getBorderStyle(),
                style
            ]} 
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
        >
            <View style={styles.contentContainer}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Text style={[styles.title, { color: getTextColor() }]}>{title}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: SIZES.medium,
        paddingHorizontal: SIZES.extraLarge,
        borderRadius: 100, // Pill-shaped buttons
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: SIZES.medium,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    iconContainer: {
        marginRight: 6,
    }
});

export default PrimaryButton;
