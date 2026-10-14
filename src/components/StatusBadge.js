import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../utils/constants';

const StatusBadge = ({ status }) => {
    let backgroundColor = COLORS.borderLight;
    let textColor = COLORS.textMuted;
    let label = status;

    switch (status.toLowerCase()) {
        case 'active':
        case 'received':
        case 'sent':
            backgroundColor = `${COLORS.successGreen}20`; // 20% opacity
            textColor = COLORS.successGreen;
            label = status.charAt(0).toUpperCase() + status.slice(1);
            break;
        case 'paused':
            backgroundColor = `${COLORS.warningOrange}20`;
            textColor = COLORS.warningOrange;
            label = 'Paused';
            break;
        case 'pending':
            backgroundColor = `${COLORS.textMuted}20`;
            textColor = COLORS.textDark;
            label = 'Pending';
            break;
        case 'suspended':
            backgroundColor = `${COLORS.primaryRed}20`;
            textColor = COLORS.primaryRed;
            label = 'Suspended';
            break;
        default:
            break;
    }

    return (
        <View style={[styles.badgeContainer, { backgroundColor }]}>
            <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badgeContainer: {
        paddingVertical: 4,
        paddingHorizontal: SIZES.small,
        borderRadius: 100, // Pill shape
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    badgeText: {
        fontSize: SIZES.font - 2,
        fontWeight: 'bold',
    }
});

export default StatusBadge;
