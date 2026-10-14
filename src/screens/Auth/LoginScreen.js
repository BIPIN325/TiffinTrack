import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppConfig } from '../../context/AppContext';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SIZES } from '../../utils/constants';
import { supabase } from '../../services/supabase';

const LoginScreen = ({ navigation, route }) => {
    const { signInWithOTP, verifyOTP, bypassLogin } = useAuth();
    const registerData = route.params?.registerData;
    const { setUserRole } = useAppConfig();

    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [kitchenCode, setKitchenCode] = useState('');
    const [step, setStep] = useState(1); // 1: Phone, 2: OTP & Kitchen Code
    const [loading, setLoading] = useState(false);

    const handleSendOTP = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }
        setLoading(true);
        const cleanPhone = phone.replace(/\s+/g, '');
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
        const { error } = await signInWithOTP(formattedPhone);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setStep(2);
        }
        setLoading(false);
    };

    const handleVerify = async () => {
        if (!otp || !kitchenCode) {
            Alert.alert('Error', 'Please enter both OTP and Kitchen Code');
            return;
        }
        setLoading(true);
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        const { data, error } = await verifyOTP(formattedPhone, otp);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            // Registration Insert Check — creates user with PENDING status
            if (registerData) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const isLunch = registerData.subscription === 'lunch' || registerData.subscription === 'both';
                    const isDinner = registerData.subscription === 'dinner' || registerData.subscription === 'both';

                    // Look up the kitchen by the code from registration
                    const codeToUse = registerData.kitchen_code || kitchenCode.trim().toUpperCase();
                    let kitchenId = null;
                    const { data: kitchenData } = await supabase
                        .from('kitchens')
                        .select('kitchen_id')
                        .ilike('kitchen_code', codeToUse)
                        .limit(1)
                        .single();
                    if (kitchenData) kitchenId = kitchenData.kitchen_id;

                    await supabase.from('users').insert({
                        user_id: user.id,
                        kitchen_id: kitchenId,
                        name: registerData.name,
                        phone: registerData.phone,
                        address: registerData.address,
                        diet: registerData.diet,
                        is_lunch_active: isLunch,
                        is_dinner_active: isDinner,
                        status: 'PENDING', // ← New users start as PENDING until admin approves
                    });
                }
            }

            // Role assignment based on kitchen code
            if (kitchenCode.toLowerCase() === 'admin99') {
                setUserRole('admin');
            } else {
                setUserRole('customer');
            }
        }
        setLoading(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
                <View style={styles.header}>
                    <Text style={styles.title}>TiffinTrack</Text>
                    <Text style={styles.subtitle}>Midnight Glass UI</Text>
                </View>

                {step === 1 ? (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 9876543210"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                        <PrimaryButton title="Send OTP" onPress={handleSendOTP} disabled={loading} style={styles.button} />

                        <View style={styles.footerHelp}>
                            <Text style={styles.mutedText}>{registerData ? 'Profile Staged! Enter OTP.' : "Don't have an account? "} </Text>
                            {!registerData && <Text style={styles.linkText} onPress={() => navigation.navigate('Register')}>Register</Text>}
                        </View>
                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <Text style={styles.label}>Enter OTP</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="6-digit OTP"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="number-pad"
                            secureTextEntry={true}
                            value={otp}
                            onChangeText={setOtp}
                        />

                        <Text style={[styles.label, { marginTop: SIZES.large }]}>Kitchen Code (The Handshake)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. SHARMA99"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="characters"
                            value={kitchenCode}
                            onChangeText={setKitchenCode}
                        />

                        {registerData && (
                            <View style={styles.pendingNote}>
                                <Text style={styles.pendingNoteText}>
                                    ⏳ After login, your profile will be pending admin approval. You'll get full access once approved.
                                </Text>
                            </View>
                        )}

                        <PrimaryButton title="Verify & Login" onPress={handleVerify} disabled={loading} style={styles.button} />
                        <Text style={[styles.mutedText, { marginTop: SIZES.medium, textAlign: 'center' }]} onPress={() => setStep(1)}>
                            Back to Phone Entry
                        </Text>
                    </View>
                )}

                {/* Prototype testing bypass buttons */}
                <View style={{ marginTop: SIZES.extraLarge * 1.5, borderTopWidth: 1, borderTopColor: COLORS.borderDark, paddingTop: SIZES.large }}>
                    <Text style={[styles.mutedText, { textAlign: 'center', marginBottom: SIZES.small }]}>Prototype Testing Mode</Text>
                    <PrimaryButton title="👁️ Preview as Customer" type="outline" onPress={() => { setUserRole('customer'); bypassLogin(); }} style={{ marginBottom: SIZES.small }} />
                    <PrimaryButton title="👁️ Preview as Admin" type="ghost" onPress={() => { setUserRole('admin'); bypassLogin(); }} />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundDark,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: SIZES.extraLarge,
    },
    header: {
        alignItems: 'center',
        marginBottom: SIZES.extraLarge * 2,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.textLight,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: SIZES.medium,
        color: COLORS.textMuted,
    },
    formContainer: {
        backgroundColor: COLORS.glassBackground,
        padding: SIZES.extraLarge,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.borderDark,
    },
    label: {
        color: COLORS.textLight,
        fontSize: SIZES.font,
        marginBottom: SIZES.base,
        fontWeight: '600',
    },
    input: {
        backgroundColor: COLORS.backgroundDark,
        color: COLORS.textLight,
        paddingHorizontal: SIZES.medium,
        paddingVertical: SIZES.medium,
        borderRadius: 16,
        fontSize: SIZES.medium,
        borderWidth: 1,
        borderColor: COLORS.borderDark,
    },
    button: {
        marginTop: SIZES.extraLarge,
    },
    footerHelp: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SIZES.extraLarge,
    },
    mutedText: {
        color: COLORS.textMuted,
        fontSize: SIZES.font,
    },
    linkText: {
        color: COLORS.primaryRed,
        fontWeight: 'bold',
        fontSize: SIZES.font,
    },
    pendingNote: {
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 12,
        marginTop: SIZES.medium,
    },
    pendingNoteText: {
        color: '#92400E',
        fontSize: 13,
        lineHeight: 19,
    },
});

export default LoginScreen;
