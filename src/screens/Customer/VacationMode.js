import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Modal, KeyboardAvoidingView, ScrollView, Platform, ActionSheetIOS } from 'react-native';
import { UtensilsCrossed, Clock, LogOut, ArrowLeft, Camera, Moon, ChevronRight, Sun } from 'lucide-react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

const VacationMode = () => {
    const { user, signOut } = useAuth();
    const { theme, colors, setTheme } = useTheme();
    
    // Editable Profile State
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [sub, setSub] = useState('lunch');
    const [isEditing, setIsEditing] = useState(false);
    const [isPrefEditing, setIsPrefEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [realUserId, setRealUserId] = useState(null);
    const [showLunchPicker, setShowLunchPicker] = useState(false);
    const [showDinnerPicker, setShowDinnerPicker] = useState(false);
    
    const [userData, setUserData] = useState({ name: '', phone: '', address: '', email: '', lunch_time: '13:30', dinner_time: '20:00', avatar: 'https://i.pravatar.cc/150?img=11' });
    const [editData, setEditData] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', lunch_time: '13:30', dinner_time: '20:00', avatar: 'https://i.pravatar.cc/150?img=11', avatarBase64: null });

    const splitName = (fullName) => {
        const parts = (fullName || '').split(' ');
        const first = parts[0] || '';
        const last = parts.slice(1).join(' ') || '';
        return { first, last };
    };

    useEffect(() => {
        const fetchUserData = async () => {
            let activeUserId = user?.id;
            if (activeUserId === 'preview-user-123') {
                const { data: mockUser } = await supabase.from('users').select('user_id').limit(1).single();
                if (mockUser) activeUserId = mockUser.user_id;
            }
            if (!activeUserId) return;
            
            setRealUserId(activeUserId);
            const { data, error } = await supabase.from('users').select('name, phone, address, email, avatar_url, is_lunch_active, is_dinner_active, lunch_time, dinner_time').eq('user_id', activeUserId).single();
            if (data) {
                if (data.is_lunch_active && data.is_dinner_active) setSub('both');
                else if (data.is_dinner_active) setSub('dinner');
                else setSub('lunch');

                const fetched = { 
                    name: data.name || '', 
                    phone: data.phone || '', 
                    address: data.address || '',
                    email: data.email || '',
                    lunch_time: data.lunch_time ? data.lunch_time.substring(0,5) : '13:30',
                    dinner_time: data.dinner_time ? data.dinner_time.substring(0,5) : '20:00',
                    avatar: data.avatar_url || 'https://i.pravatar.cc/150?img=11'
                };
                setUserData(fetched);
                
                const { first, last } = splitName(fetched.name);
                setEditData({ firstName: first, lastName: last, phone: fetched.phone, email: fetched.email, address: fetched.address, lunch_time: fetched.lunch_time, dinner_time: fetched.dinner_time, avatar: fetched.avatar, avatarBase64: null });
            }
        };
        fetchUserData();
    }, []);

    const formatTo12Hour = (timeStr) => {
        if (!timeStr) return '';
        let [h, m] = timeStr.split(':');
        let hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    const handleLunchChange = (event, selectedDate) => {
        setShowLunchPicker(false);
        if (selectedDate) {
            const t = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
            setEditData({...editData, lunch_time: t});
        }
    };

    const handleDinnerChange = (event, selectedDate) => {
        setShowDinnerPicker(false);
        if (selectedDate) {
            const t = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
            setEditData({...editData, dinner_time: t});
        }
    };

    const schedulePushNotifications = async (lTime, dTime, isL, isD) => {
        // Disabled expo-notifications in Expo Go SDK 53
        // We will simulate this inside CustomerDashboard.js natively!
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Required", "Please allow camera roll access to upload an avatar.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setEditData({ ...editData, avatar: result.assets[0].uri, avatarBase64: result.assets[0].base64 });
        }
    };

    const handleGetLocation = async () => {
        setFetchingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Allow location access to auto-fill your address.');
                setFetchingLocation(false);
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            let geocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
            if (geocode.length > 0) {
                const place = geocode[0];
                const addr = `${place.name ? place.name + ', ' : ''}${place.street ? place.street + ', ' : ''}${place.city}, ${place.region} ${place.postalCode}`;
                setEditData({ ...editData, address: addr });
            }
        } catch (error) {
            Alert.alert('Error', 'Could not fetch location.');
        }
        setFetchingLocation(false);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        let finalAvatarUrl = editData.avatar;

        if (editData.avatarBase64) {
            const filePath = `${realUserId}/${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(editData.avatarBase64), {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                finalAvatarUrl = publicUrl;
            } else {
                Alert.alert("Upload Error", uploadError.message);
            }
        }

        const fullName = `${editData.firstName} ${editData.lastName}`.trim();

        try {
            const { error } = await supabase.from('users').update({
                name: fullName,
                phone: editData.phone,
                email: editData.email,
                address: editData.address,
                avatar_url: finalAvatarUrl
            }).eq('user_id', realUserId);
            
            if (!error) {
                setUserData({ ...userData, name: fullName, phone: editData.phone, email: editData.email, address: editData.address, avatar: finalAvatarUrl });
                setIsEditing(false);
            } else {
                Alert.alert("Update Failed", error.message);
            }
        } catch (err) {
            Alert.alert("Error", "Could not save profile details.");
        }
        setSaving(false);
    };

    const handleMealSave = async (newSub) => {
        setSub(newSub);
        let is_lunch = newSub === 'lunch' || newSub === 'both';
        let is_dinner = newSub === 'dinner' || newSub === 'both';
        await supabase.from('users').update({ is_lunch_active: is_lunch, is_dinner_active: is_dinner }).eq('user_id', realUserId);
        
        // Re-schedule notifications immediately reflecting sub changes
        await schedulePushNotifications(userData.lunch_time, userData.dinner_time, is_lunch, is_dinner);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={[styles.title, { color: colors.textDark }]}>Profile & Settings</Text>
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* User Identity Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }]}>
                    <Image source={{uri: userData.avatar}} style={styles.avatarPlaceholder} />
                    <View style={styles.profileTextWrap}>
                        <Text style={[styles.userName, { color: colors.textDark }]}>{userData.name || 'Loading...'}</Text>
                        <Text style={[styles.userSub, { color: colors.textMuted }]}>{userData.phone || '...'}</Text>
                        {userData.email ? <Text style={[styles.userSub, { color: colors.textMuted }]}>{userData.email}</Text> : null}
                    </View>
                </View>

                {/* Meal Subscription Toggle */}
                <View style={[styles.sectionHeader, { justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <UtensilsCrossed size={20} color={colors.textDark} style={styles.iconSpaced} />
                        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Meal Subscription</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsPrefEditing(!isPrefEditing)} style={styles.prefEditBtn}>
                        <Text style={styles.prefEditBtnText}>{isPrefEditing ? 'Save Settings' : 'Edit Settings'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.segmentContainer, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }, !isPrefEditing && { opacity: 0.7 }]}>
                    <TouchableOpacity disabled={!isPrefEditing} onPress={() => handleMealSave('lunch')} style={[styles.segment, sub === 'lunch' && styles.segmentActive]}>
                        <Text style={[styles.segmentText, { color: colors.textMuted }, sub === 'lunch' && styles.segmentTextActive]}>Lunch</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={!isPrefEditing} onPress={() => handleMealSave('dinner')} style={[styles.segment, sub === 'dinner' && styles.segmentActive]}>
                        <Text style={[styles.segmentText, { color: colors.textMuted }, sub === 'dinner' && styles.segmentTextActive]}>Dinner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity disabled={!isPrefEditing} onPress={() => handleMealSave('both')} style={[styles.segment, sub === 'both' && styles.segmentActive]}>
                        <Text style={[styles.segmentText, { color: colors.textMuted }, sub === 'both' && styles.segmentTextActive]}>Both</Text>
                    </TouchableOpacity>
                </View>

                {/* Expected Arrival TimesPanel */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                    <Clock size={20} color={colors.textDark} style={styles.iconSpaced} />
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Expected Arrival Times</Text>
                </View>

                <View style={[styles.timeCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }, !isPrefEditing && { opacity: 0.7 }]}>
                    <TouchableOpacity disabled={!isPrefEditing} onPress={() => setShowLunchPicker(true)} style={styles.timeRow}>
                        <Text style={[styles.timeLabel, { color: colors.textDark }, sub === 'dinner' && styles.timeLabelDisabled]}>Lunch Delivery</Text>
                        <View style={[styles.timeBadge, sub === 'dinner' && styles.timeBadgeDisabled]}>
                            <Text style={[styles.timeVal, sub === 'dinner' && styles.timeValDisabled]}>
                                {formatTo12Hour(userData.lunch_time)} {isPrefEditing ? '✏️' : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    
                    <View style={[styles.divider, { backgroundColor: colors.borderDark }]} />
                    
                    <TouchableOpacity disabled={!isPrefEditing} onPress={() => setShowDinnerPicker(true)} style={styles.timeRow}>
                        <Text style={[styles.timeLabel, { color: colors.textDark }, sub === 'lunch' && styles.timeLabelDisabled]}>Dinner Delivery</Text>
                        <View style={[styles.timeBadge, sub === 'lunch' && styles.timeBadgeDisabled]}>
                            <Text style={[styles.timeVal, sub === 'lunch' && styles.timeValDisabled]}>
                                {formatTo12Hour(userData.dinner_time)} {isPrefEditing ? '✏️' : ''}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                
                {showLunchPicker && (
                    <DateTimePicker
                        value={new Date(new Date().setHours(parseInt(editData.lunch_time.split(':')[0]), parseInt(editData.lunch_time.split(':')[1])))}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={async (e, d) => {
                            handleLunchChange(e, d);
                            if (d) {
                                const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                await supabase.from('users').update({ lunch_time: `${t}:00` }).eq('user_id', realUserId);
                                setUserData({...userData, lunch_time: t});
                                await schedulePushNotifications(t, userData.dinner_time, sub==='lunch'||sub==='both', sub==='dinner'||sub==='both');
                            }
                        }}
                    />
                )}

                {showDinnerPicker && (
                    <DateTimePicker
                        value={new Date(new Date().setHours(parseInt(editData.dinner_time.split(':')[0]), parseInt(editData.dinner_time.split(':')[1])))}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={async (e, d) => {
                            handleDinnerChange(e, d);
                            if (d) {
                                const t = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                await supabase.from('users').update({ dinner_time: `${t}:00` }).eq('user_id', realUserId);
                                setUserData({...userData, dinner_time: t});
                                await schedulePushNotifications(userData.lunch_time, t, sub==='lunch'||sub==='both', sub==='dinner'||sub==='both');
                            }
                        }}
                    />
                )}

                <Text style={[styles.footerNote, { color: colors.textMuted }]}>
                    Tap a time block to edit it. Delivery status will be confirmed on the dashboard at the set times.
                </Text>

                {/* Appearance Settings */}
                <TouchableOpacity
                    style={[styles.menuButton, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }]}
                    onPress={() => {
                        const options = ['Dark Mode', 'Light Mode', 'Cancel'];
                        if (Platform.OS === 'ios') {
                            ActionSheetIOS.showActionSheetWithOptions(
                                { options, cancelButtonIndex: 2, title: 'Choose Appearance' },
                                (idx) => {
                                    if (idx === 0) setTheme('dark');
                                    if (idx === 1) setTheme('light');
                                }
                            );
                        } else {
                            Alert.alert('Appearance', 'Select Theme', [
                                { text: '🌙 Dark Mode', onPress: () => setTheme('dark') },
                                { text: '☀️ Light Mode', onPress: () => setTheme('light') },
                                { text: 'Cancel', style: 'cancel' },
                            ]);
                        }
                    }}
                >
                    <View style={[styles.menuIconBox, { backgroundColor: colors.backgroundDark }]}>
                        {theme === 'dark'
                            ? <Sun size={20} color={colors.textLight} />
                            : <Moon size={20} color={colors.textLight} />}
                    </View>
                    <View style={styles.menuTextWrap}>
                        <Text style={[styles.menuHeading, { color: colors.textLight }]}>Appearance</Text>
                        <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                            {theme === 'dark' ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
                        </Text>
                    </View>
                    <ChevronRight size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <LogOut size={24} color="#4B5563" />
                    <Text style={styles.logoutButtonText}>Log out</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* FULL SCREEN EDIT PROFILE MODAL */}
            <Modal visible={isEditing} animationType="slide" presentationStyle="formSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                        <View style={styles.modalHeaderRow}>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.backBtn}>
                                <ArrowLeft size={24} color="#1A1B41" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>User Profile</Text>
                            <View style={{width: 24}} />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <View style={styles.avatarEditWrapper}>
                                <Image source={{uri: editData.avatar}} style={styles.avatarLarge} />
                                <TouchableOpacity style={styles.cameraIconBtn} onPress={handlePickImage}>
                                    <Camera size={16} color="#1A1B41" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.floatingLabel}>First Name</Text>
                                <TextInput style={styles.floatingInput} value={editData.firstName} onChangeText={(t) => setEditData({...editData, firstName: t})} placeholder="John" placeholderTextColor="#A0AEC0" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.floatingLabel}>Last Name</Text>
                                <TextInput style={styles.floatingInput} value={editData.lastName} onChangeText={(t) => setEditData({...editData, lastName: t})} placeholder="Doe" placeholderTextColor="#A0AEC0" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.floatingLabel}>E-Mail</Text>
                                <TextInput style={styles.floatingInput} value={editData.email} onChangeText={(t) => setEditData({...editData, email: t})} placeholder="johndoe@gmail.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#A0AEC0" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.floatingLabel}>Mobile</Text>
                                <TextInput style={styles.floatingInput} value={editData.phone} onChangeText={(t) => setEditData({...editData, phone: t})} placeholder="+91-123456789" keyboardType="phone-pad" placeholderTextColor="#A0AEC0" />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.floatingLabel}>Address</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TextInput 
                                        style={[styles.floatingInput, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }]} 
                                        value={editData.address} 
                                        onChangeText={(t) => setEditData({...editData, address: t})} 
                                        placeholder="123 Main St, City" 
                                        placeholderTextColor="#A0AEC0" 
                                        multiline
                                    />
                                    <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation} disabled={fetchingLocation}>
                                        {fetchingLocation ? <ActivityIndicator size="small" color="#1A1B41" /> : <Text style={{fontSize: 20}}>📍</Text>}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveGiantBtn} onPress={handleSaveProfile} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveGiantBtnText}>SAVE</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    header: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: '900', color: '#132A3E' },
    editBtnText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primaryRed },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    
    // Profile Card
    profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassBackground, padding: 20, borderRadius: 20, marginBottom: 32, borderWidth: 1, borderColor: COLORS.borderDark, ...SHADOWS.light },
    avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.textMuted },
    profileTextWrap: { marginLeft: 16, flex: 1 },
    userName: { fontSize: 18, fontWeight: 'bold', color: '#132A3E', marginBottom: 4 },
    userSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
    
    // Section Headers
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    iconSpaced: { marginRight: 8 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#132A3E' },
    prefEditBtn: { backgroundColor: `${COLORS.primaryRed}15`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    prefEditBtnText: { color: COLORS.primaryRed, fontWeight: 'bold', fontSize: 13 },

    // Segment Toggle
    segmentContainer: { flexDirection: 'row', backgroundColor: COLORS.glassBackground, borderRadius: 16, padding: 4, marginBottom: 32, borderWidth: 1, borderColor: COLORS.borderDark, ...SHADOWS.light },
    segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    segmentActive: { backgroundColor: COLORS.successGreen },
    segmentText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
    segmentTextActive: { color: COLORS.white },

    // Time Card
    timeCard: { backgroundColor: COLORS.glassBackground, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.borderDark, marginBottom: 16, ...SHADOWS.light },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeLabel: { fontSize: 16, color: '#132A3E', fontWeight: '500' },
    timeLabelDisabled: { color: COLORS.textMuted },
    timeBadge: { backgroundColor: COLORS.badgePinkBg, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    timeVal: { fontSize: 15, fontWeight: 'bold', color: COLORS.badgePinkText },
    timeBadgeDisabled: { backgroundColor: COLORS.backgroundDark },
    timeValDisabled: { color: COLORS.textMuted },
    divider: { height: 1, backgroundColor: COLORS.borderDark, marginVertical: 16 },

    footerNote: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, paddingHorizontal: 4, marginBottom: 24 },

    menuButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassBackground, padding: 16, borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: COLORS.borderDark, ...SHADOWS.light },
    menuIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.backgroundDark, justifyContent: 'center', alignItems: 'center' },
    menuTextWrap: { flex: 1, marginLeft: 16 },
    menuHeading: { fontSize: 16, fontWeight: 'bold', color: COLORS.textLight },
    menuSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },

    logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassBackground, paddingVertical: 18, paddingHorizontal: 24, marginTop: 16, marginHorizontal: -20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.borderDark },
    logoutButtonText: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginLeft: 16 },

    /* --- EDIT Modal Styles --- */
    modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    backBtn: { padding: 4 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1B41' },
    modalContent: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' },

    avatarEditWrapper: { position: 'relative', marginTop: 24, marginBottom: 40 },
    avatarLarge: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#E2E8F0' },
    cameraIconBtn: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#FFF', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', ...SHADOWS.light },

    inputGroup: { width: '100%', marginBottom: 20 },
    floatingLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
    floatingInput: { width: '100%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, color: '#1A1B41', ...SHADOWS.light },
    locationBtn: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, borderTopRightRadius: 24, borderBottomRightRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 0, justifyContent: 'center', height: 56, ...SHADOWS.light },

    saveGiantBtn: { width: '100%', backgroundColor: '#1A1B41', paddingVertical: 18, borderRadius: 24, alignItems: 'center', marginTop: 12, ...SHADOWS.medium },
    saveGiantBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});

export default VacationMode;
