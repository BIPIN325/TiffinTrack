import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
    ScrollView, Platform, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SIZES } from '../../utils/constants';
import { supabase } from '../../services/supabase';

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [diet, setDiet] = useState('');
    const [subscription, setSubscription] = useState('both'); // lunch, dinner, both
    const [kitchenCode, setKitchenCode] = useState('');
    const [codeStatus, setCodeStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'

    // Time states
    const [lunchTime, setLunchTime] = useState('13:00');
    const [dinnerTime, setDinnerTime] = useState('20:00');
    const [locLoading, setLocLoading] = useState(false);

    const handleGetLocation = async () => {
        setLocLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Allow location access to auto-fill address.');
            setLocLoading(false);
            return;
        }

        try {
            let location = await Location.getCurrentPositionAsync({});
            let geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            if (geocode.length > 0) {
                const place = geocode[0];
                setAddress(`${place.name || ''} ${place.street || ''}, ${place.city || ''}`);
            }
        } catch (e) {
            Alert.alert('Error', 'Could not fetch location.');
        }
        setLocLoading(false);
    };

    const handleValidateCode = async (code) => {
        setKitchenCode(code);
        if (code.length < 3) {
            setCodeStatus(null);
            return;
        }

        setCodeStatus('checking');
        const { data } = await supabase
            .from('kitchens')
            .select('kitchen_id, kitchen_name')
            .ilike('kitchen_code', code.trim())
            .limit(1)
            .single();

        if (data) {
            setCodeStatus('valid');
        } else {
            // For prototype mode, accept common test codes
            if (code.toUpperCase() === 'SHARMA99' || code.toUpperCase() === 'ADMIN99') {
                setCodeStatus('valid');
            } else {
                setCodeStatus('invalid');
            }
        }
    };

    const handleCompleteSetup = () => {
        if (!name || !address || !phone || !diet) {
            Alert.alert("Error", "Please fill all essential details and preferences.");
            return;
        }
        if (!kitchenCode.trim()) {
            Alert.alert("Kitchen Code Required", "Ask your tiffin provider for their unique Kitchen Code to connect your account.");
            return;
        }
        if (codeStatus === 'invalid') {
            Alert.alert("Invalid Code", "The kitchen code you entered doesn't match any kitchen. Please check with your tiffin provider.");
            return;
        }

        // Push data back to Login Screen so it can create the row when OTP resolves
        Alert.alert(
            "✅ Profile Saved",
            "Your profile will be sent for admin approval once you verify your number. You'll be able to use the app as soon as the admin approves you.",
            [{ text: 'Continue to OTP', onPress: () => {
                navigation.navigate('Login', {
                    registerData: {
                        name, phone, address, diet, subscription,
                        lunch_time: lunchTime, dinner_time: dinnerTime,
                        kitchen_code: kitchenCode.trim().toUpperCase(),
                    }
                });
            }}]
        );
    };

    const getCodeBorderColor = () => {
        if (codeStatus === 'valid') return '#10B981';
        if (codeStatus === 'invalid') return '#EF4444';
        if (codeStatus === 'checking') return '#F59E0B';
        return COLORS.borderDark;
    };

    const getCodeStatusText = () => {
        if (codeStatus === 'valid') return '✅ Kitchen found! You\'ll appear in their pending approvals.';
        if (codeStatus === 'invalid') return '❌ No kitchen found with this code. Check with your provider.';
        if (codeStatus === 'checking') return '🔍 Checking...';
        return null;
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
                <ScrollView contentContainerStyle={{ padding: SIZES.large }}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Welcome to TiffinTrack</Text>
                        <Text style={styles.subtitle}>Let's personalize your meals</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {/* ── Kitchen Code (The Handshake) ─────────────── */}
                        <Text style={styles.sectionHeader}>🤝 Connect to Your Kitchen</Text>
                        <Text style={styles.sectionSub}>
                            Enter the Kitchen Code given by your tiffin service provider
                        </Text>
                        <View style={[styles.codeInputWrap, { borderColor: getCodeBorderColor() }]}>
                            <TextInput
                                style={styles.codeInput}
                                placeholder="e.g. SHARMA99"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="characters"
                                value={kitchenCode}
                                onChangeText={handleValidateCode}
                            />
                            {codeStatus === 'checking' && (
                                <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 8 }} />
                            )}
                            {codeStatus === 'valid' && (
                                <Text style={styles.codeIcon}>✅</Text>
                            )}
                            {codeStatus === 'invalid' && (
                                <Text style={styles.codeIcon}>❌</Text>
                            )}
                        </View>
                        {getCodeStatusText() && (
                            <Text style={[styles.codeStatusText, {
                                color: codeStatus === 'valid' ? '#10B981' : codeStatus === 'invalid' ? '#EF4444' : '#F59E0B'
                            }]}>
                                {getCodeStatusText()}
                            </Text>
                        )}

                        {/* ── Essential Details ──────────────────────────── */}
                        <Text style={[styles.sectionHeader, { marginTop: SIZES.extraLarge }]}>Essential Details</Text>
                        <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} placeholderTextColor={COLORS.textMuted} />
                        <TextInput style={[styles.input, { marginTop: SIZES.small }]} placeholder="Mobile Number (+91)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholderTextColor={COLORS.textMuted} />

                        <View style={{ flexDirection: 'row', marginTop: SIZES.small, alignItems: 'center' }}>
                            <TextInput style={[styles.input, { flex: 1, marginRight: SIZES.small }]} placeholder="Delivery Address / Flat No." value={address} onChangeText={setAddress} placeholderTextColor={COLORS.textMuted} />
                            <PrimaryButton title="📍 Auto" type="outline" onPress={handleGetLocation} disabled={locLoading} style={{ paddingHorizontal: 10, paddingVertical: 14 }} />
                        </View>

                        {/* ── Smart Preferences ─────────────────────────── */}
                        <Text style={[styles.sectionHeader, { marginTop: SIZES.extraLarge }]}>Smart Preferences</Text>
                        <View style={styles.row}>
                            <PrimaryButton title="Veg 🥗" type={diet === 'veg' ? 'success' : 'outline'} onPress={() => setDiet('veg')} style={styles.flexBtn} />
                            <View style={{ width: 10 }} />
                            <PrimaryButton title="Non-Veg 🍗" type={diet === 'non-veg' ? 'primary' : 'outline'} onPress={() => setDiet('non-veg')} style={styles.flexBtn} />
                        </View>

                        <Text style={[styles.label, { marginTop: SIZES.medium }]}>Subscription Type</Text>
                        <View style={styles.row}>
                            <PrimaryButton title="Lunch ☀️" type={subscription === 'lunch' ? 'primary' : 'outline'} onPress={() => setSubscription('lunch')} style={styles.flexBtn} />
                            <View style={{ width: 6 }} />
                            <PrimaryButton title="Both ↻" type={subscription === 'both' ? 'primary' : 'outline'} onPress={() => setSubscription('both')} style={styles.flexBtn} />
                            <View style={{ width: 6 }} />
                            <PrimaryButton title="Dinner 🌙" type={subscription === 'dinner' ? 'primary' : 'outline'} onPress={() => setSubscription('dinner')} style={styles.flexBtn} />
                        </View>

                        {/* ── Pending Info ────────────────────────────────── */}
                        <View style={styles.pendingInfo}>
                            <Text style={styles.pendingInfoEmoji}>⏳</Text>
                            <Text style={styles.pendingInfoText}>
                                After registration, your profile will be sent to the kitchen admin for approval. You'll receive access once approved.
                            </Text>
                        </View>

                        <PrimaryButton title="Create Profile & Send OTP" onPress={handleCompleteSetup} style={styles.button} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    keyboardView: { flex: 1 },
    header: { alignItems: 'center', marginVertical: SIZES.extraLarge },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.textLight, marginBottom: 8 },
    subtitle: { fontSize: SIZES.medium, color: COLORS.textMuted },
    formContainer: { backgroundColor: COLORS.glassBackground, padding: SIZES.large, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.borderDark },
    sectionHeader: { color: COLORS.textLight, fontSize: SIZES.large, marginBottom: SIZES.small, fontWeight: 'bold' },
    sectionSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: SIZES.small, lineHeight: 19 },
    label: { color: COLORS.textLight, fontSize: SIZES.font, marginBottom: SIZES.base, fontWeight: '600' },
    input: { backgroundColor: COLORS.glassBackground, color: COLORS.textDark, paddingHorizontal: SIZES.medium, paddingVertical: 14, borderRadius: 12, fontSize: SIZES.medium, borderWidth: 1, borderColor: COLORS.borderDark },

    // Kitchen Code
    codeInputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFBEB', borderWidth: 2, borderRadius: 14,
        paddingHorizontal: SIZES.medium, height: 54,
    },
    codeInput: {
        flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111827',
        letterSpacing: 2,
    },
    codeIcon: { fontSize: 18, marginRight: 4 },
    codeStatusText: { fontSize: 12, marginTop: 6, fontWeight: '500', lineHeight: 18 },

    // Pending Info
    pendingInfo: {
        flexDirection: 'row', backgroundColor: '#EEF2FF', borderRadius: 14,
        padding: 14, marginTop: SIZES.extraLarge, alignItems: 'center',
        borderWidth: 1, borderColor: '#C7D2FE',
    },
    pendingInfoEmoji: { fontSize: 24, marginRight: 12 },
    pendingInfoText: { flex: 1, fontSize: 13, color: '#3730A3', lineHeight: 19 },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    flexBtn: { flex: 1, paddingHorizontal: 0 },
    button: { marginTop: SIZES.extraLarge * 1.5 },
});

export default RegisterScreen;
