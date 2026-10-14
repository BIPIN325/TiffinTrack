import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../utils/constants';

const TiffinCard = ({ title, date, meals, children }) => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardTitle}>{title}</Text>
                    {date && <Text style={styles.cardDate}>{date}</Text>}
                </View>
                {/* Status or Extra Actions could go here */}
            </View>
            <View style={styles.mealList}>
                {meals && meals.map((meal, index) => (
                    <View key={index} style={styles.mealItem}>
                        <Text style={styles.mealIcon}>{meal.icon}</Text>
                        <Text style={styles.mealText}>{meal.name}</Text>
                    </View>
                ))}
            </View>
            {children && <View style={styles.actionsContainer}>{children}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLORS.textLight, // Using light color for cards inside Midnight Glass background
        borderRadius: SIZES.radius,
        padding: SIZES.large,
        marginVertical: SIZES.small,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.light,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.medium,
    },
    cardTitle: {
        fontSize: SIZES.large,
        fontWeight: 'bold',
        color: COLORS.textDark,
    },
    cardDate: {
        fontSize: SIZES.font,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    mealList: {
        marginTop: SIZES.small,
    },
    mealItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.small,
        backgroundColor: COLORS.backgroundLight,
        padding: SIZES.small,
        borderRadius: 12,
    },
    mealIcon: {
        fontSize: 18,
        marginRight: SIZES.small,
    },
    mealText: {
        fontSize: SIZES.medium,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    actionsContainer: {
        marginTop: SIZES.medium,
        paddingTop: SIZES.medium,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        flexDirection: 'row',
        justifyContent: 'space-between',
    }
});

export default TiffinCard;
