import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext();

export const useAppConfig = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    // This will hold the kitchen-specific global settings fetched from Supabase
    const [globalSettings, setGlobalSettings] = useState({
        accepting_new_subscriptions: true,
        kitchen_active_today: true,
        lunch_dispatch_time: '12:00:00',
        dinner_dispatch_time: '19:00:00',
        pause_buffer_hours: 3,
    });

    const [userRole, setUserRole] = useState(null); // 'customer' or 'admin'

    const value = {
        globalSettings,
        setGlobalSettings,
        userRole,
        setUserRole
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
