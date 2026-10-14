import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, SafeAreaView, ActivityIndicator, TouchableOpacity, Switch, Image } from 'react-native';
import { Plane } from 'lucide-react-native';
import TiffinCard from '../../components/TiffinCard';
import StatusBadge from '../../components/StatusBadge';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CustomerDashboard = () => {
    const { user, signOut } = useAuth();
    const { colors } = useTheme();
    const navigation = useNavigation();
    
    const [lunchPaused, setLunchPaused] = useState(false);
    const [dinnerPaused, setDinnerPaused] = useState(false);
    const [lunchStatus, setLunchStatus] = useState('PENDING');
    const [dinnerStatus, setDinnerStatus] = useState('PENDING');
    const [isVacationActive, setIsVacationActive] = useState(false);
    const [realUserId, setRealUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState('https://i.pravatar.cc/150?img=11');
    const [ledgerMap, setLedgerMap] = useState({});
    const [scrollerDates, setScrollerDates] = useState([]);
    const scrollRef = React.useRef(null);

    const loadAvatar = async (uid) => {
        if (!uid) return;
        const stored = await AsyncStorage.getItem(`avatar_${uid}`);
        if (stored) setAvatarUrl(stored);
    };

    useFocusEffect(
        useCallback(() => {
            if (user?.id) loadAvatar(user.id);
        }, [user])
    );

    const fetchDashData = async () => {
        let activeUserId = user?.id;
        
        if (activeUserId === 'preview-user-123') {
            const { data: mockUser } = await supabase.from('users').select('user_id').limit(1).single();
            if (mockUser) activeUserId = mockUser.user_id;
        }

        if (!activeUserId) { setLoading(false); return; }

        // Fetch 30-day block for the scroller
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 15);
        const fromStr = dateFrom.toISOString().split('T')[0];

        const { data: monthPauses } = await supabase
            .from('ledger_entries')
            .select('delivery_date, status, user_status, meal_type')
            .eq('user_id', activeUserId)
            .gte('delivery_date', fromStr);
            
        if (monthPauses) {
            const map = {};
            monthPauses.forEach(entry => {
                const day = entry.delivery_date;
                if (!map[day]) map[day] = { received: false, fee: false, free: false };
                if (entry.status === 'CANCELLED_FEE') map[day].fee = true;
                if (entry.status === 'CANCELLED_FREE') map[day].free = true;
                if (entry.user_status === 'RECEIVED') map[day].received = true;
            });
            setLedgerMap(map);
            
            // Extract today's explicit details for the main TiffinCard
            const today = new Date().toISOString().split('T')[0];
            const tEntryLunch = monthPauses.find(p => p.delivery_date === today && p.meal_type === 'LUNCH');
            const tEntryDinner = monthPauses.find(p => p.delivery_date === today && p.meal_type === 'DINNER');
            
            if (tEntryLunch) {
                if (tEntryLunch.status?.startsWith('CANCELLED')) setLunchPaused(true);
                if (tEntryLunch.user_status) setLunchStatus(tEntryLunch.user_status);
            }
            if (tEntryDinner) {
                if (tEntryDinner.status?.startsWith('CANCELLED')) setDinnerPaused(true);
                if (tEntryDinner.user_status) setDinnerStatus(tEntryDinner.user_status);
            }
        }
        
        const { data: userData } = await supabase.from('users').select('status').eq('user_id', activeUserId).single();
        if (userData) {
            setIsVacationActive(userData.status === 'PAUSED');
        }
        
        setRealUserId(activeUserId);
        await loadAvatar(activeUserId);
        setLoading(false);
    };

    useEffect(() => {
        const dates = [];
        const today = new Date();
        for (let i = -15; i <= 15; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            dates.push(d);
        }
        setScrollerDates(dates);
        fetchDashData();
        
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTo({ x: 15 * 72 - 150, animated: false });
        }, 500);
    }, []);

    const isPastCutoff = (mealType) => {
        const hour = new Date().getHours();
        if (mealType === 'lunch') return hour >= 10; 
        if (mealType === 'dinner') return hour >= 17; 
        return false;
    };

    const handleTiffinArrival = async (isLunch, isReceived) => {
        const today = new Date().toISOString().split('T')[0];
        const mType = isLunch ? 'LUNCH' : 'DINNER';
        const newStatus = isReceived ? 'RECEIVED' : 'DISPUTE';

        const { data: existing } = await supabase.from('ledger_entries').select('id').eq('user_id', realUserId).eq('delivery_date', today).eq('meal_type', mType).single();
        
        if (existing) {
             await supabase.from('ledger_entries').update({ user_status: newStatus }).eq('id', existing.id);
        } else {
             // Fake ledger entry logic for demo bypass:
             await supabase.from('ledger_entries').insert({ user_id: realUserId, meal_type: mType, delivery_date: today, user_status: newStatus, status: 'DELIVERED', amount: 100 });
        }
        
        if (isLunch) setLunchStatus(newStatus);
        else setDinnerStatus(newStatus);

        if (!isReceived) Alert.alert("Issue Reported", "Your kitchen admin has been instantly notified of your dispute.");
    };

    const handlePause = (mealType) => {
        if (isPastCutoff(mealType)) {
            Alert.alert('Lock-Out', `It is past the strict cut-off time. ${mealType.toUpperCase()} is locked and preparing.`);
            return;
        }
        
        Alert.alert(
            'Confirm Pause', 
            `Are you sure you want to pause your ${mealType} today?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Pause Meal', 
                    style: 'destructive', 
                    onPress: async () => {
                        const today = new Date().toISOString().split('T')[0];
                        await supabase.from('ledger_entries').insert({
                            user_id: realUserId,
                            meal_type: mealType.toUpperCase(),
                            delivery_date: today,
                            status: 'CANCELLED_FREE', // Free because it's before cutoff
                            amount: 0
                        });
                        
                        if (mealType === 'lunch') setLunchPaused(true);
                        else setDinnerPaused(true);
                    }
                }
            ]
        );
    };

    if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator color={COLORS.primaryRed} style={{marginTop: 50}} /></SafeAreaView>;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <View style={[styles.header, { backgroundColor: colors.backgroundDark }]}>
                <View>
                    <Text style={[styles.greeting, { color: colors.textDark }]}>Hi 👋</Text>
                    <View style={styles.locationRow}>
                        <Text style={[styles.locationText, { color: colors.textMuted }]}>📍 Sector 15, Vashi</Text>
                    </View>
                </View>
                <Image source={{uri: avatarUrl}} style={styles.avatarObj} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Vacation Mode Toggle */}
                <View style={[styles.vacationCard, { backgroundColor: colors.glassBackground }]}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.backgroundDark }, isVacationActive && styles.iconCircleActive]}>
                        <Plane size={20} color={isVacationActive ? COLORS.warningOrange : colors.textMuted} />
                    </View>
                    <View style={styles.vacationTextWrap}>
                        <Text style={[styles.vacationTitle, { color: colors.textDark }]}>Vacation Mode</Text>
                        <Text style={[styles.vacationSub, { color: colors.textMuted }]}>Pause all deliveries</Text>
                    </View>
                    <Switch 
                        value={isVacationActive} 
                        onValueChange={async (val) => {
                            setIsVacationActive(val);
                            const newStatus = val ? 'PAUSED' : 'ACTIVE';
                            await supabase.from('users').update({ status: newStatus }).eq('user_id', realUserId);
                            Alert.alert(
                                val ? "🏝️ Vacation Mode ON" : "🏠 Vacation Mode OFF",
                                val ? "All your future meals are now paused indefinitely." : "Welcome back! Your meals will resume as per schedule."
                            );
                        }} 
                        trackColor={{ false: colors.borderDark, true: COLORS.warningOrange }}
                        thumbColor={colors.white}
                    />
                </View>

                {/* Conditional Rendering: Vacation Active vs Tiffin Card */}
                {isVacationActive ? (
                    <View style={[styles.vacationBlankLayout, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }]}>
                        <Plane size={60} color={`${COLORS.warningOrange}80`} style={{marginBottom: 16}} />
                        <Text style={[styles.vacationBlankTitle, { color: colors.textDark }]}>Vacation Mode Active</Text>
                        <Text style={[styles.vacationBlankSub, { color: colors.textMuted }]}>
                            Your meals are currently paused. Enjoy your time off!
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Daily Menu Preview Card (The "Karela" Integration) */}
                        <View style={[styles.tiffinCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderPink, marginBottom: 20 }]}>
                            <View style={styles.tagRow}>
                                <View style={[styles.mealTag, { backgroundColor: colors.badgePinkBg }]}>
                                    <Text style={[styles.mealTagText, { color: colors.badgePinkText }]}>TODAY'S LUNCH MENU</Text>
                                </View>
                                {lunchPaused ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                                        <Text style={[styles.statusBadgeText, { color: '#991B1B' }]}>Paused</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusBadge, { backgroundColor: colors.badgeGreenBg }]}>
                                        <Text style={[styles.statusBadgeText, { color: colors.badgeGreenText }]}>
                                            Prep in Progress
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Text style={[styles.menuTitle, { color: colors.textDark, marginBottom: 16 }]}>What's cooking today?</Text>
                            
                            <View style={styles.menuTagsContainer}>
                                <View style={[styles.menuItemTag, { backgroundColor: '#F0FDF4' }]}>
                                    <Text style={[styles.menuItemText, { color: '#166534' }]}>🫓 4 Butter Rotis</Text>
                                </View>
                                <View style={[styles.menuItemTag, { backgroundColor: '#FFFBEB' }]}>
                                    <Text style={[styles.menuItemText, { color: '#B45309' }]}>🍛 Dal Makhani</Text>
                                </View>
                                <View style={[styles.menuItemTag, { backgroundColor: '#FDF2F8' }]}>
                                    <Text style={[styles.menuItemText, { color: '#9D174D' }]}>🥗 Karela Sabzi</Text>
                                </View>
                                <View style={[styles.menuItemTag, { backgroundColor: '#EFF6FF' }]}>
                                    <Text style={[styles.menuItemText, { color: '#1E40AF' }]}>🍚 Jeera Rice</Text>
                                </View>
                            </View>

                            {lunchPaused ? (
                                <View style={styles.pausedBanner}>
                                    <Text style={styles.pausedBannerText}>⏸️ Lunch Meal Paused</Text>
                                </View>
                            ) : isPastCutoff('lunch') ? (
                                <View style={[styles.pausedBanner, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1 }]}>
                                    <Text style={[styles.pausedBannerText, { color: '#6B7280' }]}>⏰ Cut-off Reached (Prep Started)</Text>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={styles.pauseBtn}
                                    onPress={() => handlePause('lunch')}
                                >
                                    <Text style={styles.pauseBtnText}>⏸️ Pause Meal (Dislike Karela?)</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={[styles.tiffinCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderPink }]}>
                        <View style={styles.tagRow}>
                            <View style={[styles.mealTag, { backgroundColor: colors.badgePinkBg }]}>
                                <Text style={[styles.mealTagText, { color: colors.badgePinkText }]}>LUNCH TRACKER</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: colors.badgeGreenBg }]}>
                                <Text style={[styles.statusBadgeText, { color: colors.badgeGreenText }]}>
                                    {lunchStatus === 'RECEIVED' ? '✅ Delivered' : lunchStatus === 'DISPUTE' ? '🚨 Disputed' : '🔔 Arriving soon'}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.timeText, { color: colors.textDark }]}>Verify Delivery</Text>
                        
                        <Text style={[styles.menuTitle, { color: colors.textDark }]}>Has your tiffin arrived?</Text>
                        <Text style={[styles.menuText, { color: colors.textMuted }]}>
                            Verify your delivery below. If there's an issue, tapping 'No' immediately triggers a dispute alert on your Admin's dashboard.
                        </Text>

                        <View style={[styles.divider, { backgroundColor: colors.borderDark }]} />

                        {lunchStatus === 'PENDING' ? (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.btnYes} onPress={() => handleTiffinArrival(true, true)}>
                                    <Text style={styles.btnYesText}>✓ Yes, Received</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnNo, { borderColor: COLORS.primaryRed, backgroundColor: colors.glassBackground }]} onPress={() => handleTiffinArrival(true, false)}>
                                    <Text style={styles.btnNoText}>✕ No, Issue</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.actionRow, { justifyContent: 'center' }]}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: lunchStatus === 'RECEIVED' ? COLORS.successGreen : COLORS.primaryRed }}>
                                    {lunchStatus === 'RECEIVED' ? 'Marked as Received' : 'Dispute sent to Admin'}
                                </Text>
                            </View>
                        )}
                        
                    </View>
                    </>
                )}

                {/* Upcoming Schedule Row Mockup */}
                <Text style={[styles.sectionHeader, { color: colors.textDark }]}>Upcoming Schedule</Text>
                <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.scheduleScroll} contentContainerStyle={{ paddingRight: 40 }}>
                    {scrollerDates.map((dateObj, i) => {
                        const dateStr = dateObj.toISOString().split('T')[0];
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dayNum = dateObj.getDate();
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        let dotStyle = styles.dotOrange; 
                        if (isToday) dotStyle = styles.dotWhite; 
                        else if (ledgerMap[dateStr]?.received) dotStyle = styles.dotGreen;
                        else if (ledgerMap[dateStr]?.free) dotStyle = styles.dotGray;
                        else if (ledgerMap[dateStr]?.fee) dotStyle = styles.dotOrange;
                        else if (dateObj > new Date()) dotStyle = styles.dotOrange;
                        else dotStyle = styles.dotGray;

                        return (
                            <View key={dateStr} style={[styles.dayCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }, isToday && styles.dayCardActive]}>
                                <Text style={[isToday ? styles.dayTopTextActive : styles.dayTopText, !isToday && { color: colors.textMuted }]}>{dayName}</Text>
                                <Text style={[isToday ? styles.dayMidTextActive : styles.dayMidText, !isToday && { color: colors.textDark }]}>{dayNum}</Text>
                                <View style={dotStyle} />
                            </View>
                        );
                    })}
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    logoutText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500', marginBottom: 6 },
    greeting: { fontSize: 28, fontWeight: '900', color: COLORS.textDark },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    locationText: { fontSize: 14, color: COLORS.textMuted },
    avatarObj: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.borderDark },
    
    scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
    
    // Vacation Card
    vacationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glassBackground, padding: 16, borderRadius: 20, marginBottom: 24, ...SHADOWS.light },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.backgroundDark, justifyContent: 'center', alignItems: 'center' },
    iconCircleActive: { backgroundColor: '#FFF3E0' }, // Very light orange background
    vacationTextWrap: { flex: 1, marginLeft: 16 },
    vacationTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
    vacationSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
    
    // Vacation Blank Slate
    vacationBlankLayout: { backgroundColor: COLORS.glassBackground, borderRadius: 24, padding: 40, borderWidth: 1, borderColor: COLORS.borderDark, marginBottom: 30, alignItems: 'center', ...SHADOWS.light },
    vacationBlankTitle: { fontSize: 20, fontWeight: '900', color: '#132A3E', marginBottom: 12, textAlign: 'center' },
    vacationBlankSub: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
    
    // Tiffin Card
    tiffinCard: { backgroundColor: COLORS.glassBackground, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: COLORS.borderPink, marginBottom: 30, ...SHADOWS.light },
    tagRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    mealTag: { backgroundColor: COLORS.badgePinkBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    mealTagText: { color: COLORS.badgePinkText, fontWeight: 'bold', fontSize: 12, letterSpacing: 0.5 },
    statusBadge: { backgroundColor: COLORS.badgeGreenBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusBadgeText: { color: COLORS.badgeGreenText, fontWeight: 'bold', fontSize: 12 },
    timeText: { fontSize: 32, fontWeight: '900', color: '#132A3E', marginBottom: 24 },
    menuTitle: { fontSize: 18, fontWeight: 'bold', color: '#132A3E', marginBottom: 8 },
    menuText: { fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },
    divider: { height: 1, backgroundColor: COLORS.borderDark, marginVertical: 24 },
    questionText: { fontSize: 16, fontWeight: '600', color: '#132A3E', textAlign: 'center', marginBottom: 16 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    btnYes: { flex: 1, backgroundColor: COLORS.successGreen, paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginRight: 8 },
    btnYesText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
    btnNo: { flex: 1, backgroundColor: COLORS.white, paddingVertical: 14, borderRadius: 30, alignItems: 'center', marginLeft: 8, borderWidth: 1.5, borderColor: COLORS.primaryRed },
    btnNoText: { color: COLORS.primaryRed, fontWeight: 'bold', fontSize: 16 },


    // Daily Menu Preview
    menuTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    menuItemTag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    menuItemText: { fontSize: 14, fontWeight: '600' },
    pausedBanner: { padding: 14, backgroundColor: '#FEF2F2', borderRadius: 30, alignItems: 'center' },
    pausedBannerText: { color: '#991B1B', fontWeight: 'bold', fontSize: 15 },
    pauseBtn: { padding: 14, backgroundColor: '#FFF0F0', borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
    pauseBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 15 },

    // Upcoming Schedule
    sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#132A3E', marginBottom: 16 },
    scheduleScroll: { overflow: 'visible' },
    dayCard: { width: 60, height: 80, backgroundColor: COLORS.glassBackground, borderRadius: 16, alignItems: 'center', paddingVertical: 12, marginRight: 12, borderWidth: 1, borderColor: COLORS.borderDark, ...SHADOWS.light },
    dayCardActive: { backgroundColor: COLORS.primaryRed, borderColor: COLORS.primaryRed },
    dayTopText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
    dayMidText: { fontSize: 20, fontWeight: 'bold', color: '#132A3E', marginBottom: 8 },
    dayTopTextActive: { fontSize: 12, color: COLORS.borderPink, fontWeight: '600', marginBottom: 4 },
    dayMidTextActive: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 8 },
    dotWhite: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.white },
    dotGreen: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.successGreen },
    dotOrange: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.warningOrange },
    dotGray: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.textMuted },
});

export default CustomerDashboard;
