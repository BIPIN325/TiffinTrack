import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(() => {
            // Failsafe for dummy credentials to prevent infinite loading (blank screen)
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithOTP = async (phone) => {
        const { data, error } = await supabase.auth.signInWithOtp({
            phone: phone,
        });
        return { data, error };
    };

    const verifyOTP = async (phone, token) => {
        const { data, error } = await supabase.auth.verifyOtp({
            phone,
            token,
            type: 'sms',
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            setUser(null);
            setSession(null);
        }
        return { error };
    };

    const bypassLogin = () => {
        setUser({ id: 'preview-user-123' });
        setSession({ access_token: 'preview-session' });
    };

    const value = {
        user,
        session,
        loading,
        signInWithOTP,
        verifyOTP,
        signOut,
        bypassLogin,
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};
