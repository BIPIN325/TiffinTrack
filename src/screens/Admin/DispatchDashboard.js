import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SafeAreaView,
    ActivityIndicator, Alert, TouchableOpacity, Animated, Switch
} from 'react-native';
import { COLORS, SIZES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { USE_DUMMY_DATA, DUMMY_DISPATCH } from '../../utils/dummyData';
import { Flame, MapPin, Check, Zap, Pause } from 'lucide-react-native';

const DispatchDashboard = () => {
    const { signOut } = useAuth();

    const [dispatchList, setDispatchList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mealFilter, setMealFilter] = useState('LUNCH');
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for the fire icon
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        ).start();
    }, []); // Run once on mount

    const fetchDispatchQueue = async (filter = mealFilter) => {
        const mealField = filter === 'LUNCH' ? 'is_lunch_active' : 'is_dinner_active';
        const { data } = await supabase
            .from('users')
            .select('user_id, name, address, phone, status')
            .in('status', ['ACTIVE', 'PAUSED'])
            .eq(mealField, true);

        if (data) {
            const today = new Date().toISOString().split('T')[0];
            const { data: ledgers } = await supabase
                .from('ledger_entries')
                .select('user_id, admin_status, status')
                .eq('delivery_date', today)
                .eq('meal_type', filter);

            const sentUserIds = ledgers?.filter(l => l.admin_status === 'SENT').map(l => l.user_id) || [];
            const pausedUserIds = ledgers?.filter(l => l.status?.startsWith('CANCELLED_')).map(l => l.user_id) || [];

            const list = data.map(u => {
                let status = 'PENDING';
                const isManuallyPaused = pausedUserIds.includes(u.user_id);
                const isVacationPaused = u.status === 'PAUSED';
                
                if (isManuallyPaused || isVacationPaused) status = 'PAUSED';
                else if (sentUserIds.includes(u.user_id)) status = 'SENT';
                
                return { 
                    id: u.user_id, 
                    name: u.name, 
                    address: u.address || 'Address Unmapped', 
                    phone: u.phone, 
                    status,
                    pauseType: isVacationPaused ? 'VACATION' : (isManuallyPaused ? 'MANUAL' : null)
                };
            });
            if (list.length > 0) {
                setDispatchList(list);
            } else if (USE_DUMMY_DATA) {
                setDispatchList(DUMMY_DISPATCH);
            }
        } else if (USE_DUMMY_DATA) {
            setDispatchList(DUMMY_DISPATCH);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchDispatchQueue();

        const channel = supabase.channel('ledger_dispatch_changes')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ledger_entries' }, (payload) => {
                const newEntry = payload.new;
                const today = new Date().toISOString().split('T')[0];
                if (newEntry.delivery_date === today && newEntry.meal_type === mealFilter) {
                    if (newEntry.status?.startsWith('CANCELLED_')) {
                        setDispatchList(prev => {
                            const user = prev.find(u => u.id === newEntry.user_id);
                            if (user && user.status !== 'PAUSED') {
                                Alert.alert("⏸️ Meal Paused", `${user.name} (${user.address}) paused their ${mealFilter.toLowerCase()}.`);
                            }
                            return prev.map(item => item.id === newEntry.user_id ? { ...item, status: 'PAUSED', pauseType: 'MANUAL' } : item);
                        });
                    }
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                const updatedUser = payload.new;
                setDispatchList(prev => {
                    return prev.map(item => {
                        if (item.id === updatedUser.user_id) {
                            const isPaused = updatedUser.status === 'PAUSED';
                            if (isPaused && item.status !== 'PAUSED') {
                                Alert.alert("🏝️ Vacation Alert", `${updatedUser.name} just went on vacation mode.`);
                            }
                            return { 
                                ...item, 
                                status: isPaused ? 'PAUSED' : (item.status === 'PAUSED' ? 'PENDING' : item.status),
                                pauseType: isPaused ? 'VACATION' : null
                            };
                        }
                        return item;
                    });
                });
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [mealFilter]);

    const sendPushNotification = async (userId, title, body) => {
        // Simulation of Expo Push Notification
        console.log(`[PUSH] Sending to User:${userId} - ${title}: ${body}`);
    };

    const sendSMSAlert = async (phone, message) => {
        // Simulation of SMS Gateway (e.g. Twilio)
        console.log(`[SMS] Sending to ${phone}: ${message}`);
    };

    const handleMarkAllSent = async () => {
        const pendingCount = dispatchList.filter(u => u.status === 'PENDING').length;
        if (pendingCount === 0) return;

        Alert.alert(
            "🚀 Bulk Dispatch",
            `Mark all ${pendingCount} items as SENT? This will notify all customers.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Mark All Sent",
                    onPress: async () => {
                        const pendingItems = dispatchList.filter(u => u.status === 'PENDING');
                        for (const item of pendingItems) {
                            await handleMarkSent(item.id, true);
                        }
                        Alert.alert("🚀 Bulk Sent", `Success! ${pendingCount} meals are now out for delivery.`);
                    }
                }
            ]
        );
    };

    const handleMarkSent = async (id, silent = false) => {
        const user = dispatchList.find(u => u.id === id);
        setDispatchList(prev => prev.map(item => item.id === id ? { ...item, status: 'SENT' } : item));
        
        const today = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('ledger_entries').insert({
            user_id: id,
            meal_type: mealFilter,
            delivery_date: today,
            status: 'UNBILLED',
            amount: 80, // Default price, should be dynamic in prod
            admin_status: 'SENT'
        });

        if (!error) {
            await sendPushNotification(id, "🚀 Out for Delivery!", `Your ${mealFilter.toLowerCase()} has left the kitchen and is on its way!`);
            if (!silent) {
                Alert.alert("🚀 Out for Delivery!", "Push notification sent to customer.");
            }
        }
    };

    const handleManualOverride = async (user) => {
        Alert.alert(
            '🛡️ Anti-Fraud Override',
            `This bypasses user verification and marks the tiffin as RECEIVED. A direct SMS alert will be sent to the customer for security.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Send SMS',
                    style: 'destructive',
                    onPress: async () => {
                        const today = new Date().toISOString().split('T')[0];
                        const { error } = await supabase.from('ledger_entries').upsert({
                            user_id: user.id,
                            meal_type: mealFilter,
                            delivery_date: today,
                            status: 'UNBILLED',
                            amount: 80,
                            admin_status: 'SENT',
                            user_status: 'RECEIVED'
                        }, { onConflict: 'user_id, meal_type, delivery_date' });

                        if (!error) {
                            await sendSMSAlert(user.phone, `[TiffinTrack] Your admin has manually marked today's ${mealFilter.toLowerCase()} as DELIVERED. If you didn't receive it, please contact support immediately.`);
                            setDispatchList(prev => prev.map(item => item.id === user.id ? { ...item, status: 'SENT' } : item));
                            Alert.alert('✅ Override Complete', `SMS alert successfully dispatched to ${user.phone}.`);
                        }
                    }
                }
            ]
        );
    };

    // ── Computed Lists ──────────────────────────────────────────────
    const activeList = dispatchList.filter(u => u.status !== 'PAUSED');
    const pausedList = dispatchList.filter(u => u.status === 'PAUSED');
    const sentList = activeList.filter(u => u.status === 'SENT');
    const pendingList = activeList.filter(u => u.status === 'PENDING');
    
    // MATHEMATICALLY PERFECT COUNT: Total to cook for shift
    const toPrepare = activeList.length; 
    
    const mealLabel = mealFilter === 'LUNCH' ? 'Lunches' : 'Dinners';

    // Extract unique areas for route header
    const getAreaFromAddress = (addr) => {
        if (!addr) return 'Other';
        const parts = addr.split(',');
        return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    };
    const allAreas = [...new Set(activeList.map(u => getAreaFromAddress(u.address)))];
    const routeLabel = allAreas.length > 2
        ? `${allAreas[0]} & ${allAreas.length - 1} more`
        : allAreas.join(' & ') || 'All Areas';

    if (loading) return (
        <SafeAreaView style={styles.container}>
            <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.primaryRed} size="large" />
                <Text style={styles.loadingText}>Loading dispatch...</Text>
            </View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* ═══════════════════════════════════════════════════════
                    DARK HERO HEADER
                ═══════════════════════════════════════════════════════ */}
                <View style={styles.heroSection}>
                    {/* Exit button */}
                    <TouchableOpacity style={styles.exitBtn} onPress={signOut}>
                        <Text style={styles.exitArrow}>{'‹'}</Text>
                        <Text style={styles.exitText}>Exit</Text>
                    </TouchableOpacity>

                    {/* Fire badge + Title */}
                    <View style={styles.titleRow}>
                        <Animated.View style={[styles.fireBadge, { transform: [{ scale: pulseAnim }] }]}>
                            <Flame size={22} color={COLORS.primaryRed} strokeWidth={2.5} />
                        </Animated.View>
                        <Text style={styles.heroTitle}>LIVE DISPATCH DASHBOARD</Text>
                    </View>

                    {/* Big meal count */}
                    <View style={styles.bigCountRow}>
                        <Text style={styles.bigNumber}>{toPrepare} </Text>
                        <Text style={styles.bigLabel}>{mealLabel}</Text>
                    </View>
                    <Text style={styles.heroSub}>Total requirement for this shift</Text>

                    {/* Stats pill */}
                    <View style={styles.statsPill}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>TO PACK</Text>
                            <Text style={styles.statValue}>{pendingList.length}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statLabel, { color: '#10B981' }]}>ALREADY SENT</Text>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{sentList.length}</Text>
                        </View>
                    </View>
                </View>

                {/* ═══════════════════════════════════════════════════════
                    CONTENT AREA (Light background below hero)
                ═══════════════════════════════════════════════════════ */}
                <View style={styles.contentArea}>

                    {/* ── Meal Filter Tabs ─────────────────────────────── */}
                    <View style={styles.filterSection}>
                        {['LUNCH', 'DINNER'].map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[styles.filterTab, mealFilter === f && styles.filterTabActive]}
                                onPress={() => { setMealFilter(f); setLoading(true); fetchDispatchQueue(f); }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.filterEmoji}>{f === 'LUNCH' ? '☀️' : '🌙'}</Text>
                                <Text style={[styles.filterText, mealFilter === f && styles.filterTextActive]}>
                                    {f === 'LUNCH' ? 'Lunch' : 'Dinner'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Route Header ─────────────────────────────────── */}
                    <View style={styles.routeHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeTitle}>Route: {routeLabel}</Text>
                            <Text style={styles.routeSorted}>Sorted by area • {pendingList.length} pending</Text>
                        </View>
                        {pendingList.length > 0 && (
                            <TouchableOpacity style={styles.bulkSentBtn} onPress={handleMarkAllSent}>
                                <Text style={styles.bulkSentText}>Mark All Sent</Text>
                                <Check size={14} color="#FFF" strokeWidth={3} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ═══════════════════════════════════════════════════
                        PENDING / PREP CARDS
                    ═══════════════════════════════════════════════════ */}
                    {pendingList.map((user) => (
                        <View key={user.id} style={styles.userCard}>
                            {/* Orange left accent */}
                            <View style={styles.cardAccentOrange} />
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarLetter}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                                        <View style={styles.addressRow}>
                                            <MapPin size={12} color="#9CA3AF" strokeWidth={2} />
                                            <Text style={styles.userAddress} numberOfLines={1}>{getAreaFromAddress(user.address)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    <Switch
                                        value={false}
                                        onValueChange={() => handleMarkSent(user.id)}
                                        trackColor={{ false: '#E5E7EB', true: `${COLORS.successGreen}60` }}
                                        thumbColor={'#D1D5DB'}
                                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                                    />
                                    <View style={styles.prepBadge}>
                                        <Text style={styles.prepBadgeText}>PREP</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}

                    {/* ═══════════════════════════════════════════════════
                        SENT CARDS
                    ═══════════════════════════════════════════════════ */}
                    {sentList.map(user => (
                        <View key={user.id} style={styles.userCard}>
                            {/* Green left accent */}
                            <View style={styles.cardAccentGreen} />
                            <View style={styles.cardContent}>
                                <View style={styles.cardLeft}>
                                    <View style={styles.avatarCircle}>
                                        <Text style={styles.avatarLetter}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.userInfo}>
                                        <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                                        <View style={styles.addressRow}>
                                            <MapPin size={12} color="#9CA3AF" strokeWidth={2} />
                                            <Text style={styles.userAddress} numberOfLines={1}>{getAreaFromAddress(user.address)}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.cardRight}>
                                    <View style={styles.sentRow}>
                                        <View style={styles.sentBadge}>
                                            <Text style={styles.sentBadgeText}>SENT</Text>
                                        </View>
                                        <View style={styles.sentCheckCircle}>
                                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.overrideBtn} 
                                        onPress={() => handleManualOverride(user)}
                                    >
                                        <Zap size={12} color="#9CA3AF" />
                                        <Text style={styles.overrideText}>OVERRIDE</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}



                </View>

                {/* Bottom spacer for tab bar */}
                <View style={{ height: 100 }} />

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    scrollContent: { paddingBottom: 30 },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#6B7280', marginTop: 12, fontSize: 14 },

    /* ── Hero Section ─────────────────────────────────────────────── */
    heroSection: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 28,
    },
    exitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 28,
    },
    exitArrow: { color: '#9CA3AF', fontSize: 24, marginRight: 6, fontWeight: '300' },
    exitText: { color: '#9CA3AF', fontSize: 16, fontWeight: '500' },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    fireBadge: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    heroTitle: {
        color: '#E5E7EB',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1.8,
    },
    bigCountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    bigNumber: {
        color: '#F9FAFB',
        fontSize: 48,
        fontWeight: '800',
        lineHeight: 54,
    },
    bigLabel: {
        color: COLORS.primaryRed,
        fontSize: 40,
        fontWeight: '800',
        lineHeight: 46,
    },
    heroSub: {
        color: '#6B7280',
        fontSize: 15,
        marginBottom: 26,
        marginTop: 4,
    },
    statsPill: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 18,
    },
    statLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.4,
        marginBottom: 6,
    },
    statValue: {
        color: '#F9FAFB',
        fontSize: 30,
        fontWeight: '800',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginVertical: 14,
    },

    /* ── Content Area (below hero) ────────────────────────────────── */
    contentArea: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 6,
        paddingBottom: 20,
        marginTop: -4,
    },

    /* ── Filter Tabs ──────────────────────────────────────────────── */
    filterSection: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 6,
        gap: 10,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    filterTabActive: {
        backgroundColor: COLORS.primaryRed,
        borderColor: COLORS.primaryRed,
    },
    filterEmoji: { fontSize: 16 },
    filterText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6B7280',
    },
    filterTextActive: { color: '#FFFFFF' },

    /* ── Route Header ─────────────────────────────────────────────── */
    routeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 22,
        marginTop: 22,
        marginBottom: 16,
    },
    routeTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    routeSorted: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    bulkSentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    bulkSentText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
    },

    /* ── User Cards ───────────────────────────────────────────────── */
    userCard: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardAccentOrange: {
        width: 5,
        backgroundColor: '#F59E0B',
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
    },
    cardAccentGreen: {
        width: 5,
        backgroundColor: '#10B981',
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
    },
    cardAccentYellow: {
        width: 5,
        backgroundColor: '#FBBF24',
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
    },
    cardContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingLeft: 14,
        paddingRight: 16,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1E293B',
        borderWidth: 2.5,
        borderColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarLetter: {
        color: '#F9FAFB',
        fontSize: 17,
        fontWeight: '700',
    },
    userInfo: { flex: 1 },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    userAddress: {
        fontSize: 13,
        color: '#9CA3AF',
        flex: 1,
    },
    cardRight: {
        alignItems: 'flex-end',
        marginLeft: 10,
    },

    /* ── PREP badge ───────────────────────────────────────────────── */
    prepBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 2,
    },
    prepBadgeText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },

    /* ── SENT badge ───────────────────────────────────────────────── */
    sentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sentBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 10,
    },
    sentBadgeText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    sentCheckCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
    },

    /* ── Override ─────────────────────────────────────────────────── */
    overrideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    overrideText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
    },

    /* ── Paused ───────────────────────────────────────────────────── */
    pausedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        marginTop: 22,
        marginBottom: 14,
        gap: 8,
    },
    pausedHeaderText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#92400E',
    },
    skipBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    skipBadgeText: {
        color: '#D97706',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

export default DispatchDashboard;
