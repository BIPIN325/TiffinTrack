import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Alert, Linking
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';
import { USE_DUMMY_DATA, DUMMY_STATS, DUMMY_DISPUTES, DUMMY_UNPAID_USERS } from '../../utils/dummyData';

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState({
        totalActive: 0, totalMeals: 0, revenue: 0, churnRate: 0, mrr: 0,
    });
    const [disputes, setDisputes] = useState([]);
    const [forecastData, setForecastData] = useState([65, 58, 62, 55, 70, 63, 60]);
    const [karelaIndex, setKarelaIndex] = useState([
        { item: '🥬 Karela Sabzi', pauses: 18, pct: 42 },
        { item: '🫘 Lauki Dal', pauses: 12, pct: 28 },
        { item: '🥒 Tinda Masala', pauses: 8, pct: 19 },
        { item: '🍆 Baingan Bharta', pauses: 5, pct: 11 },
    ]);
    const [unpaidUsers, setUnpaidUsers] = useState([]);

    useEffect(() => {
        fetchAnalytics();
        fetchDisputes();
        fetchUnpaidUsers();
    }, []);

    const fetchAnalytics = async () => {
        // Active users count
        const { count: activeCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ACTIVE');

        // This month's meals and revenue
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const { data: ledger } = await supabase
            .from('ledger_entries')
            .select('amount, status')
            .gte('delivery_date', monthStart)
            .not('status', 'in', '(CANCELLED_FREE)');

        const totalMeals = (ledger || []).length;
        const revenue = (ledger || []).reduce((s, e) => s + Number(e.amount), 0);

        const computedStats = {
            totalActive: activeCount || 0,
            totalMeals,
            revenue,
            mrr: revenue || 0,
            churnRate: 2.3,
        };
        if (computedStats.totalActive > 0 || computedStats.totalMeals > 0) {
            setStats(computedStats);
        } else if (USE_DUMMY_DATA) {
            setStats(DUMMY_STATS);
        }
    };

    const fetchDisputes = async () => {
        const { data } = await supabase
            .from('ledger_entries')
            .select('*, users(name, phone, address)')
            .eq('user_status', 'DISPUTE')
            .order('delivery_date', { ascending: false })
            .limit(10);
        if (data && data.length > 0) {
            setDisputes(data);
        } else if (USE_DUMMY_DATA) {
            setDisputes(DUMMY_DISPUTES);
        }
    };

    const fetchUnpaidUsers = async () => {
        const { data } = await supabase
            .from('users')
            .select('user_id, name, phone')
            .eq('status', 'SUSPENDED');
        if (data && data.length > 0) {
            setUnpaidUsers(data);
        } else if (USE_DUMMY_DATA) {
            setUnpaidUsers(DUMMY_UNPAID_USERS);
        }
    };

    const handleResolveDispute = async (entry) => {
        await supabase
            .from('ledger_entries')
            .update({ user_status: 'RECEIVED' })
            .eq('id', entry.id);
        fetchDisputes();
        Alert.alert('✅ Resolved', `Dispute for ${entry.users?.name} marked as received.`);
    };

    const handleCallUser = (phone) => {
        Linking.openURL(`tel:${phone}`);
    };

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxForecast = Math.max(...forecastData);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* ── Revenue Card ──────────────────────────────────────── */}
                <View style={styles.revenueCard}>
                    <Text style={styles.revenueLabel}>Monthly Projected Revenue</Text>
                    <Text style={styles.revenueAmount}>₹{stats.revenue.toLocaleString()}</Text>
                    <View style={styles.revRow}>
                        <View style={styles.revStat}>
                            <Text style={styles.revStatNum}>{stats.totalActive}</Text>
                            <Text style={styles.revStatLabel}>Active Users</Text>
                        </View>
                        <View style={styles.revStat}>
                            <Text style={styles.revStatNum}>{stats.totalMeals}</Text>
                            <Text style={styles.revStatLabel}>Meals Delivered</Text>
                        </View>
                        <View style={styles.revStat}>
                            <Text style={styles.revStatNum}>{stats.churnRate}%</Text>
                            <Text style={styles.revStatLabel}>Churn Rate</Text>
                        </View>
                    </View>
                </View>

                {/* ── 7-Day Forecast Chart ──────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📈 7-Day Meal Forecast</Text>
                    <Text style={styles.cardSub}>Projected meals to prepare (buy raw materials accordingly)</Text>
                    <View style={styles.chartRow}>
                        {forecastData.map((val, i) => (
                            <View key={i} style={styles.chartCol}>
                                <View style={[styles.chartBar, { height: (val / maxForecast) * 100, backgroundColor: i === forecastData.length - 1 ? COLORS.primaryRed : '#E5E7EB' }]} />
                                <Text style={styles.chartLabel}>{dayLabels[i]}</Text>
                                <Text style={styles.chartVal}>{val}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* ── Active Disputes ───────────────────────────────────── */}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.cardTitle}>⚠️ Active Disputes</Text>
                        <View style={styles.disputeBadge}>
                            <Text style={styles.disputeBadgeText}>{disputes.length}</Text>
                        </View>
                    </View>
                    {disputes.length === 0 ? (
                        <Text style={styles.emptyText}>No active disputes 🎉</Text>
                    ) : disputes.map(d => (
                        <View key={d.id} style={styles.disputeCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.disputeName}>{d.users?.name || 'Unknown'}</Text>
                                <Text style={styles.disputeDetail}>📍 {d.users?.address || 'No address'}</Text>
                                <Text style={styles.disputeDetail}>📅 {d.delivery_date} • {d.meal_type}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <TouchableOpacity
                                    style={styles.resolveBtn}
                                    onPress={() => handleResolveDispute(d)}
                                >
                                    <Text style={styles.resolveBtnText}>Resolve</Text>
                                </TouchableOpacity>
                                {d.users?.phone && (
                                    <TouchableOpacity onPress={() => handleCallUser(d.users.phone)}>
                                        <Text style={styles.callText}>📞 Call</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </View>

                {/* ── Karela Index ──────────────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🌶️ Karela Index</Text>
                    <Text style={styles.cardSub}>Menu items that cause the most user pauses</Text>
                    {karelaIndex.map((k, i) => (
                        <View key={i} style={styles.karelaRow}>
                            <Text style={styles.karelaItem}>{k.item}</Text>
                            <View style={styles.karelaBarOuter}>
                                <View style={[styles.karelaBarInner, { width: `${k.pct}%` }]} />
                            </View>
                            <Text style={styles.karelaPct}>{k.pauses} pauses</Text>
                        </View>
                    ))}
                </View>

                {/* ── Dunning / Suspended ───────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🔒 Dunning System (Suspended Users)</Text>
                    <Text style={styles.cardSub}>Auto-suspended for unpaid bills beyond Day 35</Text>
                    {unpaidUsers.length === 0 ? (
                        <Text style={styles.emptyText}>All users are paid up! ✅</Text>
                    ) : unpaidUsers.map(u => (
                        <View key={u.user_id} style={styles.suspendedRow}>
                            <Text style={styles.suspendedName}>{u.name}</Text>
                            <Text style={styles.suspendedPhone}>{u.phone}</Text>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scroll: { padding: 16, paddingBottom: 100 },
    revenueCard: { backgroundColor: '#111827', borderRadius: 20, padding: 24, marginBottom: 16 },
    revenueLabel: { color: '#9CA3AF', fontSize: 14 },
    revenueAmount: { color: '#F9FAFB', fontSize: 44, fontWeight: 'bold', marginVertical: 8 },
    revRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 16 },
    revStat: { alignItems: 'center' },
    revStatNum: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
    revStatLabel: { color: '#6B7280', fontSize: 12, marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOWS.light },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
    emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 20 },

    // Chart
    chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingTop: 20 },
    chartCol: { alignItems: 'center', flex: 1 },
    chartBar: { width: 20, borderRadius: 6, minHeight: 8 },
    chartLabel: { fontSize: 11, color: '#6B7280', marginTop: 6 },
    chartVal: { fontSize: 12, fontWeight: 'bold', color: '#111827', marginTop: 2 },

    // Disputes
    disputeBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    disputeBadgeText: { color: '#D97706', fontWeight: 'bold', fontSize: 13 },
    disputeCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF7ED', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FDBA7440' },
    disputeName: { fontWeight: 'bold', color: '#111827', fontSize: 15 },
    disputeDetail: { color: '#6B7280', fontSize: 13, marginTop: 3 },
    resolveBtn: { backgroundColor: COLORS.successGreen, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    resolveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    callText: { color: COLORS.primaryRed, fontWeight: '600', marginTop: 8, fontSize: 13 },

    // Karela
    karelaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    karelaItem: { width: 120, fontSize: 14, color: '#111827', fontWeight: '500' },
    karelaBarOuter: { flex: 1, height: 10, backgroundColor: '#F3F4F6', borderRadius: 5, marginHorizontal: 10 },
    karelaBarInner: { height: 10, backgroundColor: COLORS.primaryRed, borderRadius: 5 },
    karelaPct: { width: 70, fontSize: 12, color: '#6B7280', textAlign: 'right' },

    // Suspended
    suspendedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    suspendedName: { fontWeight: 'bold', color: '#111827' },
    suspendedPhone: { color: '#6B7280' },
});
