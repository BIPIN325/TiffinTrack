import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';

const MonthlyLedger = () => {
    const { user } = useAuth();
    const { colors } = useTheme();
    
    const [ledgerMap, setLedgerMap] = useState({});
    const [stats, setStats] = useState({ received: 0, fees: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const perMealRate = 80;

    const fetchLedgerData = async () => {
        let activeUserId = user?.id;
        
        // Mock Bypass Handler
        if (activeUserId === 'preview-user-123') {
            const { data: mockUser } = await supabase.from('users').select('user_id').limit(1).single();
            if (mockUser) activeUserId = mockUser.user_id;
        }
        if (!activeUserId) {
            setLoading(false); return;
        }

        // Fetch recent ledger entries
        const { data } = await supabase
            .from('ledger_entries')
            .select('*')
            .eq('user_id', activeUserId)
            .order('delivery_date', { ascending: false })
            .limit(60);
            
        if (data) {
            let rCount = 0;
            let fAmount = 0;
            const mappedDays = {};
            const dayLogs = {}; // Tracking meals per day for Combos

            data.forEach(entry => {
                const day = parseInt(entry.delivery_date.split('-')[2], 10);
                if (!dayLogs[day]) dayLogs[day] = { receivedCount: 0, status: null };
                
                // Merge status (Fee takes strict priority visually)
                if (entry.status === 'CANCELLED_FEE') {
                    dayLogs[day].status = 'FEE';
                    fAmount += Number(entry.amount);
                } else if (entry.status === 'CANCELLED_FREE') {
                    if (dayLogs[day].status !== 'FEE' && dayLogs[day].status !== 'RECEIVED') {
                        dayLogs[day].status = 'FREE';
                    }
                } else {
                    dayLogs[day].status = 'RECEIVED';
                    dayLogs[day].receivedCount += 1;
                }
            });

            // Calculate costs dynamically assessing Combos per day
            let totalMealCost = 0;
            Object.keys(dayLogs).forEach(day => {
                mappedDays[day] = dayLogs[day].status;
                const count = dayLogs[day].receivedCount;
                
                if (count === 2) {
                    totalMealCost += 150; // Discounted Combo Pricing!
                    rCount += 2;
                } else if (count === 1) {
                    totalMealCost += 80; // Standard single pricing
                    rCount += 1;
                }
            });

            setStats({ received: rCount, mealCost: totalMealCost, total: totalMealCost });
            setLedgerMap(mappedDays);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLedgerData();
    }, []);

    if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator color={COLORS.primaryRed} style={{marginTop: 50}} /></SafeAreaView>;
    
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <View style={[styles.header, { backgroundColor: colors.glassBackground, borderBottomColor: colors.borderDark }]}>
                <Text style={[styles.title, { color: colors.textLight }]}>Monthly Ledger</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Current Bill Card */}
                <View style={[styles.billCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }]}>
                    <Text style={[styles.cardHeader, { color: colors.textMuted }]}>Current Bill ({new Date().toLocaleString('default', { month: 'long' })})</Text>
                    <Text style={[styles.billAmount, { color: colors.textLight }]}>₹{stats.total.toLocaleString()}</Text>
                    
                    <View style={styles.billBreakdown}>
                        <View style={styles.row}>
                            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Meals Received ({stats.received} qty)</Text>
                            <Text style={[styles.breakdownValue, { color: colors.textLight }]}>₹{(stats.mealCost || 0).toLocaleString()}</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.borderDark }]} />

                        <View style={styles.row}>
                            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', color: colors.textLight }]}>Total Amount</Text>
                            <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: colors.textLight }]}>₹{stats.total.toLocaleString()}</Text>
                        </View>
                    </View>

                    <PrimaryButton 
                        title="💳 Pay Now" 
                        type="success" 
                        onPress={() => alert('Linking to UPI/Razorpay')} 
                        style={{ marginTop: SIZES.large }}
                    />
                </View>

                {/* 30 Days Grid */}
                <Text style={[styles.pastDaysTitle, { color: colors.textLight }]}>Past 30 Days</Text>
                
                <View style={[styles.historyCard, { backgroundColor: colors.glassBackground }]}>
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={styles.dotGreen} />
                            <Text style={[styles.legendText, { color: colors.textMuted }]}>Received</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={styles.dotOrange} />
                            <Text style={[styles.legendText, { color: colors.textMuted }]}>Late Cancel (Fee)</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={styles.dotGray} />
                            <Text style={[styles.legendText, { color: colors.textMuted }]}>Paused</Text>
                        </View>
                    </View>
                    
                    <View style={styles.grid}>
                        {Array.from({ length: 30 }).map((_, i) => {
                            const dayNum = i + 1;
                            let cellStyle = styles.cellFuture;
                            let textStyle = styles.textFuture;
                            
                            if (ledgerMap[dayNum] === 'RECEIVED') {
                                cellStyle = styles.cellReceived;
                                textStyle = styles.textReceived;
                            } else if (ledgerMap[dayNum] === 'FEE') {
                                cellStyle = styles.cellFee;
                                textStyle = styles.textFee;
                            } else if (ledgerMap[dayNum] === 'FREE') {
                                cellStyle = styles.cellPaused;
                                textStyle = styles.textPaused;
                            }

                            return (
                                <View key={i} style={[styles.cell, cellStyle]}>
                                    <Text style={[styles.cellText, textStyle]}>{dayNum}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    header: { padding: SIZES.large, paddingTop: 50, backgroundColor: COLORS.glassBackground, borderBottomWidth: 1, borderBottomColor: COLORS.borderDark },
    title: { fontSize: SIZES.extraLarge, fontWeight: 'bold', color: COLORS.textLight },
    scrollContent: { padding: SIZES.large, paddingBottom: 100 },
    billCard: { backgroundColor: COLORS.glassBackground, borderRadius: SIZES.radius, padding: SIZES.large, borderWidth: 1, borderColor: COLORS.borderDark },
    cardHeader: { color: COLORS.textMuted, fontSize: SIZES.medium, marginBottom: 4 },
    billAmount: { fontSize: 48, fontWeight: 'bold', color: COLORS.textLight, marginBottom: SIZES.medium },
    billBreakdown: { marginTop: SIZES.small },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    breakdownLabel: { color: COLORS.textMuted, fontSize: SIZES.font },
    breakdownValue: { color: COLORS.textLight, fontSize: SIZES.font },
    divider: { height: 1, backgroundColor: COLORS.borderDark, marginVertical: SIZES.small },
    pastDaysTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textLight, marginTop: 32, marginBottom: 16 },
    historyCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, ...SHADOWS.light },
    legend: { flexDirection: 'row', justifyContent: 'flex-start', flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
    dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
    dotOrange: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 6 },
    dotGray: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', marginRight: 6 },
    legendText: { fontSize: 13, color: '#334155', fontWeight: '500' },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginHorizontal: -4 },
    cell: { width: '12%', aspectRatio: 1, margin: '1.14%', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cellText: { fontSize: 15 },
    
    cellReceived: { backgroundColor: '#ECFDF5' }, 
    textReceived: { color: '#10B981', fontWeight: 'bold' },
    
    cellFee: { backgroundColor: '#FFF7ED' },      
    textFee: { color: '#F59E0B', fontWeight: 'bold' },
    
    cellPaused: { backgroundColor: '#F1F5F9' },   
    textPaused: { color: '#94A3B8', fontWeight: 'bold' },
    
    cellFuture: { backgroundColor: '#F8FAFC' },   
    textFuture: { color: '#CBD5E1', fontWeight: '600' },
});

export default MonthlyLedger;
