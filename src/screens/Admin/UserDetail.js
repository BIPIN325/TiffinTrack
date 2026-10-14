import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView, Image,
    TouchableOpacity, Alert, Modal, TextInput, FlatList, ActivityIndicator
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';
import {
    USE_DUMMY_DATA, DUMMY_RATE_TIERS, DUMMY_ZONES, 
    DUMMY_LEDGER_ENTRIES, getDummyTiers
} from '../../utils/dummyData';
import {
    ChevronLeft, Phone, MapPin, Calendar, CreditCard,
    Ban, Play, Tag, Map, Pause
} from 'lucide-react-native';

const UserDetail = ({ route, navigation }) => {
    const { user: passedUser } = route.params;
    const [user, setUser] = useState(passedUser);
    const [ledger, setLedger] = useState([]);
    const [rateTiers, setRateTiers] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNote, setCreditNote] = useState('');
    const [creditType, setCreditType] = useState('Discount');

    const [showTierModal, setShowTierModal] = useState(false);
    const [showZoneModal, setShowZoneModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // Ledger
        const { data: ledgerData } = await supabase
            .from('ledger_entries')
            .select('*')
            .eq('user_id', user.user_id)
            .order('delivery_date', { ascending: false })
            .limit(20);

        if (ledgerData && ledgerData.length > 0) {
            setLedger(ledgerData);
        } else if (USE_DUMMY_DATA && DUMMY_LEDGER_ENTRIES[user.user_id]) {
            setLedger(DUMMY_LEDGER_ENTRIES[user.user_id]);
        }

        // Rate tiers
        const { data: tiers } = await supabase.from('rate_tiers').select('*');
        if (tiers && tiers.length > 0) {
            setRateTiers(tiers);
        } else if (USE_DUMMY_DATA) {
            setRateTiers(getDummyTiers());
        }

        // Zones
        const { data: zoneData } = await supabase.from('delivery_zones').select('*');
        if (zoneData && zoneData.length > 0) {
            setZones(zoneData);
        } else if (USE_DUMMY_DATA) {
            setZones(DUMMY_ZONES);
        }

        setLoading(false);
    };

    const statusColor = (s) => {
        if (s === 'ACTIVE') return '#10B981';
        if (s === 'SUSPENDED') return '#EF4444';
        if (s === 'PAUSED') return '#F59E0B';
        if (s === 'PENDING') return '#3B82F6';
        return '#6B7280';
    };

    const runningBalance = ledger.reduce((sum, e) => sum + Number(e.amount), 0);

    // ── Actions ─────────────────────────────────────────────
    const handleApplyCredit = async () => {
        if (!creditAmount) return;
        const today = new Date().toISOString().split('T')[0];
        if (!USE_DUMMY_DATA) {
            await supabase.from('ledger_entries').insert({
                user_id: user.user_id,
                meal_type: 'LUNCH',
                delivery_date: today,
                status: 'UNBILLED',
                amount: -Math.abs(Number(creditAmount)),
                admin_status: 'SENT',
                user_status: 'RECEIVED'
            });
        }
        const newEntry = {
            id: `led-${Date.now()}`,
            meal_type: 'LUNCH',
            delivery_date: today,
            status: 'UNBILLED',
            amount: -Math.abs(Number(creditAmount)),
            admin_status: 'SENT',
            user_status: 'RECEIVED',
            note: `${creditType}: ${creditNote || 'Admin credit'}`
        };
        setLedger(prev => [newEntry, ...prev]);
        Alert.alert('💰 Credit Applied', `₹${creditAmount} ${creditType.toLowerCase()} added to ${user.name}'s ledger.`);
        setShowCreditModal(false);
        setCreditAmount('');
        setCreditNote('');
    };

    const handleChangeTier = async (tier) => {
        if (!USE_DUMMY_DATA) {
            await supabase.from('users').update({ rate_tier_id: tier.id }).eq('user_id', user.user_id);
        }
        setUser(prev => ({ ...prev, rate_tier_id: tier.id, rate_tiers: { tier_name: tier.tier_name, price_per_meal: tier.price_per_meal } }));
        setShowTierModal(false);
        Alert.alert('🏷️ Tier Changed', `${user.name} is now on "${tier.tier_name}" (₹${tier.price_per_meal}/meal).`);
    };

    const handleChangeZone = async (zone) => {
        if (!USE_DUMMY_DATA) {
            await supabase.from('users').update({ zone_id: zone.id }).eq('user_id', user.user_id);
        }
        setUser(prev => ({ ...prev, zone_id: zone.id, delivery_zones: { zone_name: zone.zone_name } }));
        setShowZoneModal(false);
        Alert.alert('📍 Zone Changed', `${user.name} assigned to "${zone.zone_name}".`);
    };

    const handleToggleStatus = async (newStatus) => {
        const confirmMsg = newStatus === 'SUSPENDED'
            ? `Suspend ${user.name}? They won't receive meals.`
            : `Reactivate ${user.name}?`;

        Alert.alert(
            newStatus === 'SUSPENDED' ? '🚫 Suspend User?' : '✅ Reactivate User?',
            confirmMsg,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm', onPress: async () => {
                        if (!USE_DUMMY_DATA) {
                            await supabase.from('users').update({ status: newStatus }).eq('user_id', user.user_id);
                        }
                        setUser(prev => ({ ...prev, status: newStatus }));
                        // If resuming from vacation (PAUSED) to ACTIVE
                        const actionLabel = newStatus === 'PAUSED' ? 'Paused (Vacation)' : newStatus;
                        Alert.alert('✅ Done', `${user.name}'s status is now ${actionLabel}.`);
                    }
                }
            ]
        );
    };

    // ── Render ───────────────────────────────────────────────
    const creditColors = ['#10B981', '#3B82F6', '#F59E0B'];
    const creditTypes = ['Discount', 'Refund', 'Correction'];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#F9FAFB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Customer Profile</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primaryRed} style={{ marginTop: 40 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.scroll}>

                    {/* ── Profile Card ─────────────────────────────────── */}
                    <View style={styles.profileCard}>
                        <Image
                            source={{ uri: user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=111827&color=F9FAFB&size=120` }}
                            style={styles.avatar}
                        />
                        <Text style={styles.profileName}>{user.name}</Text>
                        <View style={[styles.statusBadgeLarge, { backgroundColor: `${statusColor(user.status)}15` }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor(user.status) }]} />
                            <Text style={[styles.statusTextLarge, { color: statusColor(user.status) }]}>{user.status}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Phone size={14} color="#6B7280" />
                            <Text style={styles.infoText}>{user.phone}</Text>
                        </View>
                        {user.address ? (
                            <View style={styles.infoRow}>
                                <MapPin size={14} color="#6B7280" />
                                <Text style={styles.infoText}>{user.address}</Text>
                            </View>
                        ) : null}
                        <View style={styles.infoRow}>
                            <Calendar size={14} color="#6B7280" />
                            <Text style={styles.infoText}>
                                Joined {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>

                    {/* ── Subscription Info ────────────────────────────── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>📋 Subscription</Text>

                        <TouchableOpacity style={styles.detailRow} onPress={() => setShowTierModal(true)}>
                            <View style={styles.detailLeft}>
                                <Tag size={16} color="#6366F1" />
                                <Text style={styles.detailLabel}>Rate Tier</Text>
                            </View>
                            <View style={styles.detailRight}>
                                <Text style={styles.detailValue}>
                                    {user.rate_tiers?.tier_name || 'Not Set'} • ₹{user.rate_tiers?.price_per_meal || '—'}/meal
                                </Text>
                                <Text style={styles.changeLink}> Change ›</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.detailRow} onPress={() => setShowZoneModal(true)}>
                            <View style={styles.detailLeft}>
                                <Map size={16} color="#F59E0B" />
                                <Text style={styles.detailLabel}>Delivery Zone</Text>
                            </View>
                            <View style={styles.detailRight}>
                                <Text style={styles.detailValue}>{user.delivery_zones?.zone_name || 'Not Set'}</Text>
                                <Text style={styles.changeLink}> Change ›</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.mealRow}>
                            <View style={[styles.mealTag, user.is_lunch_active && styles.mealTagActive]}>
                                <Text style={[styles.mealTagText, user.is_lunch_active && styles.mealTagTextActive]}>
                                    ☀️ Lunch {user.is_lunch_active ? 'ON' : 'OFF'}
                                </Text>
                            </View>
                            <View style={[styles.mealTag, user.is_dinner_active && styles.mealTagActive]}>
                                <Text style={[styles.mealTagText, user.is_dinner_active && styles.mealTagTextActive]}>
                                    🌙 Dinner {user.is_dinner_active ? 'ON' : 'OFF'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Quick Actions ────────────────────────────────── */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
                        <View style={styles.actionsGrid}>
                            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#EEF2FF' }]} onPress={() => setShowTierModal(true)}>
                                <Tag size={22} color="#6366F1" />
                                <Text style={[styles.actionCardText, { color: '#3730A3' }]}>Change Tier</Text>
                            </TouchableOpacity>

                            {user.status === 'ACTIVE' ? (
                                <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FFF7ED' }]} onPress={() => handleToggleStatus('PAUSED')}>
                                    <Pause size={22} color="#F59E0B" />
                                    <Text style={[styles.actionCardText, { color: '#92400E' }]}>Pause (Vacation)</Text>
                                </TouchableOpacity>
                            ) : user.status === 'PAUSED' ? (
                                <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ECFDF5' }]} onPress={() => handleToggleStatus('ACTIVE')}>
                                    <Play size={22} color="#10B981" />
                                    <Text style={[styles.actionCardText, { color: '#065F46' }]}>Resume</Text>
                                </TouchableOpacity>
                            ) : null}

                            {user.status !== 'SUSPENDED' ? (
                                <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#FEF2F2' }]} onPress={() => handleToggleStatus('SUSPENDED')}>
                                    <Ban size={22} color="#EF4444" />
                                    <Text style={[styles.actionCardText, { color: '#991B1B' }]}>Suspend</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#ECFDF5' }]} onPress={() => handleToggleStatus('ACTIVE')}>
                                    <Play size={22} color="#10B981" />
                                    <Text style={[styles.actionCardText, { color: '#065F46' }]}>Reactivate</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* ── Ledger ───────────────────────────────────────── */}
                    <View style={styles.sectionCard}>
                        <View style={styles.ledgerHeader}>
                            <Text style={styles.sectionTitle}>📒 Ledger</Text>
                            <View style={[styles.balanceBadge, { backgroundColor: runningBalance >= 0 ? '#FEF3C7' : '#ECFDF5' }]}>
                                <Text style={[styles.balanceText, { color: runningBalance >= 0 ? '#92400E' : '#065F46' }]}>
                                    Balance: ₹{Math.abs(runningBalance)}
                                    {runningBalance < 0 ? ' CR' : ' DR'}
                                </Text>
                            </View>
                        </View>

                        {ledger.length === 0 ? (
                            <Text style={styles.emptyLedger}>No ledger entries yet.</Text>
                        ) : (
                            ledger.map((entry) => (
                                <View key={entry.id} style={styles.ledgerRow}>
                                    <View style={styles.ledgerLeft}>
                                        <Text style={styles.ledgerDate}>
                                            {new Date(entry.delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </Text>
                                        <Text style={styles.ledgerMeal}>
                                            {entry.meal_type} • {entry.status}
                                        </Text>
                                        {entry.note ? <Text style={styles.ledgerNote}>{entry.note}</Text> : null}
                                    </View>
                                    <Text style={[
                                        styles.ledgerAmount,
                                        { color: Number(entry.amount) < 0 ? '#10B981' : '#111827' }
                                    ]}>
                                        {Number(entry.amount) < 0 ? '−' : '+'}₹{Math.abs(Number(entry.amount))}
                                    </Text>
                                </View>
                            ))
                        )}
                    </View>

                </ScrollView>
            )}

            {/* ── Credit Modal ────────────────────────────────────── */}
            <Modal visible={showCreditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>💰 Apply Credit / Discount</Text>
                        <Text style={styles.modalSub}>For: {user.name}</Text>

                        {/* Credit Type Selector */}
                        <Text style={styles.inputLabel}>Credit Type</Text>
                        <View style={styles.typeRow}>
                            {creditTypes.map((type, i) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, creditType === type && { backgroundColor: creditColors[i], borderColor: creditColors[i] }]}
                                    onPress={() => setCreditType(type)}
                                >
                                    <Text style={[styles.typeChipText, creditType === type && { color: '#FFF' }]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Amount (₹)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                            value={creditAmount}
                            onChangeText={setCreditAmount}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Note (optional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Loyalty discount for March"
                            placeholderTextColor="#9CA3AF"
                            value={creditNote}
                            onChangeText={setCreditNote}
                        />

                        <PrimaryButton title="Apply Credit" onPress={handleApplyCredit} style={{ marginTop: 20 }} />
                        <PrimaryButton title="Cancel" type="outline" onPress={() => setShowCreditModal(false)} style={{ marginTop: 10 }} />
                    </View>
                </View>
            </Modal>

            {/* ── Tier Picker Modal ───────────────────────────────── */}
            <Modal visible={showTierModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🏷️ Select Rate Tier</Text>
                        <Text style={styles.modalSub}>Assign a pricing tier to {user.name}</Text>
                        {rateTiers.map((tier) => (
                            <TouchableOpacity
                                key={tier.id}
                                style={[
                                    styles.pickerItem,
                                    user.rate_tier_id === tier.id && styles.pickerItemActive
                                ]}
                                onPress={() => handleChangeTier(tier)}
                            >
                                <Text style={styles.pickerName}>{tier.tier_name}</Text>
                                <Text style={styles.pickerPrice}>₹{tier.price_per_meal}/meal</Text>
                            </TouchableOpacity>
                        ))}
                        <PrimaryButton title="Cancel" type="outline" onPress={() => setShowTierModal(false)} style={{ marginTop: 14 }} />
                    </View>
                </View>
            </Modal>

            {/* ── Zone Picker Modal ──────────────────────────────── */}
            <Modal visible={showZoneModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>📍 Select Delivery Zone</Text>
                        <Text style={styles.modalSub}>Assign a delivery zone to {user.name}</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {zones.map((zone) => (
                                <TouchableOpacity
                                    key={zone.id}
                                    style={[
                                        styles.pickerItem,
                                        user.zone_id === zone.id && styles.pickerItemActive
                                    ]}
                                    onPress={() => handleChangeZone(zone)}
                                >
                                    <Text style={styles.pickerName}>{zone.zone_name}</Text>
                                    {zone.daily_delivery_fee > 0 && (
                                        <Text style={styles.pickerPrice}>+₹{zone.daily_delivery_fee} fee</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <PrimaryButton title="Cancel" type="outline" onPress={() => setShowZoneModal(false)} style={{ marginTop: 14 }} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },

    // Header
    header: {
        backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 16, paddingTop: 12,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#1F2937',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },

    scroll: { padding: 16, paddingBottom: 100 },

    // Profile Card
    profileCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center',
        marginBottom: 16, ...SHADOWS.light,
    },
    avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#E5E7EB', marginBottom: 14 },
    profileName: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    statusBadgeLarge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 14 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusTextLarge: { fontWeight: 'bold', fontSize: 13 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    infoText: { fontSize: 14, color: '#6B7280', marginLeft: 8 },

    // Section Card
    sectionCard: {
        backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 16, ...SHADOWS.light,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 14 },

    // Detail Rows
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    detailLeft: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { fontSize: 14, color: '#374151', marginLeft: 8, fontWeight: '500' },
    detailRight: { flexDirection: 'row', alignItems: 'center' },
    detailValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
    changeLink: { color: COLORS.primaryRed, fontWeight: '600', fontSize: 13 },

    // Meal Tags
    mealRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
    mealTag: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
        backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    },
    mealTagActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
    mealTagText: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
    mealTagTextActive: { color: '#065F46' },

    // Actions Grid
    actionsGrid: { flexDirection: 'row', gap: 10 },
    actionCard: {
        flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    },
    actionCardText: { fontSize: 12, fontWeight: '700', marginTop: 6 },

    // Ledger
    ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    balanceText: { fontSize: 13, fontWeight: 'bold' },
    emptyLedger: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
    ledgerRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    ledgerLeft: {},
    ledgerDate: { fontSize: 13, fontWeight: '700', color: '#111827' },
    ledgerMeal: { fontSize: 11, color: '#6B7280', marginTop: 1, letterSpacing: 0.5 },
    ledgerNote: { fontSize: 11, color: '#6366F1', fontWeight: '500', marginTop: 2, fontStyle: 'italic' },
    ledgerAmount: { fontSize: 15, fontWeight: '800' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '88%', backgroundColor: '#FFF', borderRadius: 22, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    modalInput: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111827',
    },

    // Type Selector
    typeRow: { flexDirection: 'row', gap: 8 },
    typeChip: {
        flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
        borderColor: '#E5E7EB', alignItems: 'center',
    },
    typeChipText: { fontWeight: '700', color: '#6B7280', fontSize: 13 },

    // Picker Items
    pickerItem: {
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
        backgroundColor: '#F9FAFB', marginBottom: 6, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
    },
    pickerItemActive: { backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#6366F1' },
    pickerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    pickerPrice: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});

export default UserDetail;
