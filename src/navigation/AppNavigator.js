import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppContext';

import AuthStack from './AuthStack';
import CustomerStack from './CustomerStack';
import AdminStack from './AdminStack';

const AppNavigator = () => {
    const { session, user } = useAuth();
    const { userRole } = useAppConfig();

    return (
        <NavigationContainer>
            {session && user ? (
                userRole === 'admin' ? <AdminStack /> : <CustomerStack />
            ) : (
                <AuthStack />
            )}
        </NavigationContainer>
    );
};

export default AppNavigator;
