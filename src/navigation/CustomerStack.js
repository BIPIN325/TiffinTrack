import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { Home, Calendar, User as UserIcon, MessageCircle } from 'lucide-react-native';
import { COLORS } from '../utils/constants';

import CustomerDashboard from '../screens/Customer/CustomerDashboard';
import MonthlyLedger from '../screens/Customer/MonthlyLedger';
import VacationMode from '../screens/Customer/VacationMode';
import InboxScreen from '../screens/Customer/InboxScreen';

const Tab = createBottomTabNavigator();

const CustomerStack = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.primaryRed,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarStyle: {
                    backgroundColor: COLORS.backgroundLight,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.borderDark,
                    elevation: 10,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'Home') return <Home color={color} size={size} />;
                    if (route.name === 'Inbox') return (
                        <View>
                            <MessageCircle color={color} size={size} />
                            {/* Neon green dot for unread messages (placeholder condition) */}
                            <View style={{position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.successGreen}} />
                        </View>
                    );
                    if (route.name === 'Ledger') return <Calendar color={color} size={size} />;
                    if (route.name === 'Profile') return <UserIcon color={color} size={size} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={CustomerDashboard} />
            <Tab.Screen name="Ledger" component={MonthlyLedger} />
            <Tab.Screen name="Profile" component={VacationMode} />
            <Tab.Screen name="Inbox" component={InboxScreen} />
        </Tab.Navigator>
    );
};

export default CustomerStack;
