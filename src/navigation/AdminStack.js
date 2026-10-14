import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../utils/constants';
import { Truck, Map, Users, FileText, Inbox, Settings } from 'lucide-react-native';

import DispatchDashboard from '../screens/Admin/DispatchDashboard';
import LiveTrackingMap from '../screens/Admin/LiveTrackingMap';
import UserManagement from '../screens/Admin/UserManagement';
import UserDetail from '../screens/Admin/UserDetail';
import RateTierManager from '../screens/Admin/RateTierManager';
import AdminInbox from '../screens/Admin/AdminInbox';
import AnalyticsDashboard from '../screens/Admin/AnalyticsDashboard';
import GlobalSettings from '../screens/Admin/GlobalSettings';

const Tab = createBottomTabNavigator();
const CustomerStack = createNativeStackNavigator();

// Nested stack navigator for the Customers tab
const CustomerStackNavigator = () => (
    <CustomerStack.Navigator screenOptions={{ headerShown: false }}>
        <CustomerStack.Screen name="CustomerHub" component={UserManagement} />
        <CustomerStack.Screen name="UserDetail" component={UserDetail} />
        <CustomerStack.Screen name="RateTierManager" component={RateTierManager} />
    </CustomerStack.Navigator>
);

const ICON_MAP = {
    Dispatch: Truck,
    Map: Map,
    Customers: Users,
    Billing: FileText,
    Inbox: Inbox,
    Settings: Settings,
};

const AdminStack = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerStyle: { backgroundColor: '#111827' },
                headerTintColor: '#F9FAFB',
                headerShadowVisible: false,
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#1A2332',
                    borderTopWidth: 0,
                    borderTopColor: '#1F2937',
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 8,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    position: 'absolute',
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2,
                },
                tabBarIcon: ({ focused, color }) => {
                    const IconComponent = ICON_MAP[route.name];
                    return (
                        <View style={{
                            width: 36, height: 36, borderRadius: 12,
                            justifyContent: 'center', alignItems: 'center',
                            backgroundColor: focused ? `${COLORS.primaryRed}25` : 'transparent',
                        }}>
                            <IconComponent
                                size={22}
                                color={focused ? '#FFFFFF' : '#9CA3AF'}
                                strokeWidth={focused ? 2.2 : 1.8}
                            />
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen
                name="Dispatch"
                component={DispatchDashboard}
                options={{ headerShown: false, title: 'Dispatch', tabBarLabel: 'Dispatch' }}
            />
            <Tab.Screen
                name="Map"
                component={LiveTrackingMap}
                options={{ title: 'Map', headerTitle: 'Live Tracking', tabBarLabel: 'Map' }}
            />
            <Tab.Screen
                name="Customers"
                component={CustomerStackNavigator}
                options={{ headerShown: false, title: 'Customers', tabBarLabel: 'Customers' }}
            />
            <Tab.Screen
                name="Billing"
                component={AnalyticsDashboard}
                options={{ title: 'Billing', headerTitle: 'Analytics & Billing', tabBarLabel: 'Billing' }}
            />
            <Tab.Screen
                name="Inbox"
                component={AdminInbox}
                options={{ title: 'Inbox', headerTitle: 'Priority Inbox', tabBarLabel: 'Inbox' }}
            />
            <Tab.Screen
                name="Settings"
                component={GlobalSettings}
                options={{ title: 'Settings', headerTitle: 'Kitchen Settings', tabBarLabel: 'Settings' }}
            />
        </Tab.Navigator>
    );
};

export default AdminStack;
