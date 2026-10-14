import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList,
    TouchableOpacity, TextInput, Alert, Modal, ActivityIndicator
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';
import { 
    USE_DUMMY_DATA, DUMMY_RATE_TIERS, getDummyTiers, 
    addDummyTier, updateDummyTier, deleteDummyTier 
} from '../../utils/dummyData';
import { ChevronLeft, Plus, Edit3, Trash2, Tag, Users, ChevronRight } from 'lucide-react-native';

const RateTierManager = ({ navigation }) => {
    const [tiers, setTiers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, object = edit
    const [tierName, setTierName] = useState('');
    const [tierPrice, setTierPrice] = useState('');

    useEffect(() => {
        fetchTiers();
    }, []);

    const fetchTiers = async () => {
        // Fetch tiers and use a join or separate count to get usage
        const { data: tierData } = await supabase.from('rate_tiers').select('*').order('price_per_meal', { ascending: true });
        const { data: userData } = await supabase.from('users').select('rate_tier_id');

        if (tierData && tierData.length > 0) {
            const tiersWithCounts = tierData.map(t => ({
                ...t,
                user_count: userData?.filter(u => u.rate_tier_id === t.id).length || 0
            }));
            setTiers(tiersWithCounts);
        } else if (USE_DUMMY_DATA) {
            const dummyTiers = getDummyTiers();
            setTiers(dummyTiers.map(t => ({ 
                ...t, 
                user_count: Math.floor(Math.random() * 20) + 5 
            })));
        }
        setLoading(false);
    };

    const openCreateModal = () => {
        setEditing(null);
        setTierName('');
        setTierPrice('');
        setShowModal(true);
    };

    const openEditModal = (tier) => {
        setEditing(tier);
        setTierName(tier.tier_name);
        setTierPrice(String(tier.price_per_meal));
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!tierName.trim() || !tierPrice.trim()) {
            Alert.alert('Error', 'Please fill in both tier name and price.');
            return;
        }
        const price = Number(tierPrice);
        if (isNaN(price) || price <= 0) {
            Alert.alert('Error', 'Please enter a valid price.');
            return;
        }

        if (editing) {
            // Update
            if (USE_DUMMY_DATA) {
                const updated = updateDummyTier(editing.id, { tier_name: tierName, price_per_meal: price });
                setTiers(updated.map(t => ({ ...t, user_count: Math.floor(Math.random() * 20) + 5 })));
            } else {
                const { error } = await supabase.from('rate_tiers').update({ tier_name: tierName, price_per_meal: price }).eq('id', editing.id);
                if (error) { Alert.alert('Error', 'Failed to update tier.'); return; }
                fetchTiers();
            }
            Alert.alert('✅ Updated', `"${tierName}" updated to ₹${price}/meal.`);
        } else {
            // Create
            if (USE_DUMMY_DATA) {
                const newTierData = { id: `tier-${Date.now()}`, tier_name: tierName, price_per_meal: price, created_at: new Date().toISOString() };
                const updated = addDummyTier(newTierData);
                setTiers(updated.map(t => ({ ...t, user_count: Math.floor(Math.random() * 20) + 5 })));
            } else {
                const { error } = await supabase.from('rate_tiers').insert({ tier_name: tierName, price_per_meal: price });
                if (error) { Alert.alert('Error', 'Failed to create tier.'); return; }
                fetchTiers();
            }
            Alert.alert('🎉 Created', `New tier "${tierName}" at ₹${price}/meal.`);
        }
        setShowModal(false);
    };

    const handleDelete = (tier) => {
        Alert.alert(
            '🗑️ Delete Tier?',
            `Are you sure you want to delete "${tier.tier_name}"? Users on this tier will need to be reassigned.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        if (USE_DUMMY_DATA) {
                            const updated = deleteDummyTier(tier.id);
                            setTiers(updated.map(t => ({ ...t, user_count: Math.floor(Math.random() * 20) + 5 })));
                        } else {
                            await supabase.from('rate_tiers').delete().eq('id', tier.id);
                            fetchTiers();
                        }
                        Alert.alert('Deleted', `"${tier.tier_name}" has been removed.`);
                    }
                }
            ]
        );
    };

    const renderTier = ({ item, index }) => {
        const colors = ['#818CF8', '#34D399', '#F472B6', '#FBBF24', '#60A5FA', '#A78BFA'];
        const accent = colors[index % colors.length];

        return (
            <View style={styles.tierCard}>
                <View style={[styles.tierAccent, { backgroundColor: accent }]} />
                <View style={styles.tierContent}>
                    <TouchableOpacity 
                        style={styles.tierHeader}
                        onPress={() => navigation.navigate('UserManagement', { filterTier: item.id, filterName: item.tier_name })}
                    >
                        <View style={[styles.tierIcon, { backgroundColor: `${accent}18` }]}>
                            <Tag size={18} color={accent} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tierName}>{item.tier_name}</Text>
                            <View style={styles.usageRow}>
                                <Users size={11} color="#6B7280" />
                                <Text style={styles.tierUsage}>{item.user_count || 0} customers</Text>
                            </View>
                        </View>
                        <ChevronRight size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                    <View style={styles.tierFooter}>
                        <View style={styles.priceBox}>
                            <Text style={[styles.tierPrice, { color: accent }]}>₹{item.price_per_meal}</Text>
                            <Text style={styles.tierPriceSub}>/meal</Text>
                        </View>
                        <View style={styles.tierActions}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                                <Edit3 size={17} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { marginLeft: 8 }]} onPress={() => handleDelete(item)}>
                                <Trash2 size={17} color="#EF4444" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#F9FAFB" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Pricing Tiers</Text>
                    <Text style={styles.headerSub}>{tiers.length} tier{tiers.length !== 1 ? 's' : ''} configured</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
                    <Plus size={20} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                    💡 Create custom pricing tiers and assign them to individual customers from their profile.
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primaryRed} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={tiers}
                    keyExtractor={item => item.id}
                    renderItem={renderTier}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>🏷️</Text>
                            <Text style={styles.emptyTitle}>No Pricing Tiers</Text>
                            <Text style={styles.emptySub}>Tap + to create your first rate tier</Text>
                        </View>
                    }
                />
            )}

            {/* Create / Edit Modal */}
            <Modal visible={showModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editing ? '✏️ Edit Tier' : '🏷️ New Pricing Tier'}</Text>
                        <Text style={styles.modalSub}>
                            {editing ? 'Modify the tier name or price.' : 'Set a name and per-meal price for this tier.'}
                        </Text>

                        <Text style={styles.inputLabel}>Tier Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Student Veg, Corporate"
                            placeholderTextColor="#9CA3AF"
                            value={tierName}
                            onChangeText={setTierName}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Price per Meal (₹)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. 80"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={tierPrice}
                            onChangeText={setTierPrice}
                        />

                        <PrimaryButton
                            title={editing ? '💾 Update Tier' : '✨ Create Tier'}
                            onPress={handleSave}
                            style={{ marginTop: 20 }}
                        />
                        <PrimaryButton
                            title="Cancel"
                            type="outline"
                            onPress={() => setShowModal(false)}
                            style={{ marginTop: 10 }}
                        />
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTitle: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold' },
    headerSub: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
    addBtn: {
        width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primaryRed,
        justifyContent: 'center', alignItems: 'center',
    },

    // Info Banner
    infoBanner: { backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#C7D2FE' },
    infoText: { color: '#4338CA', fontSize: 13, lineHeight: 19 },

    // List
    list: { padding: 16, paddingBottom: 100 },

    // Tier Card
    tierCard: {
        backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12,
        flexDirection: 'row', overflow: 'hidden', ...SHADOWS.light,
    },
    tierAccent: { width: 5 },
    tierContent: { flex: 1, padding: 16 },
    tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    tierIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    tierName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    usageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    tierUsage: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    tierFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priceBox: { flexDirection: 'row', alignItems: 'baseline' },
    tierPrice: { fontSize: 24, fontWeight: 'bold' },
    tierPriceSub: { fontSize: 14, color: '#6B7280', marginLeft: 2 },
    tierActions: { flexDirection: 'row' },
    actionBtn: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6',
        justifyContent: 'center', alignItems: 'center',
    },

    // Empty State
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151' },
    emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '88%', backgroundColor: '#FFF', borderRadius: 22, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    modalInput: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111827',
    },
});

export default RateTierManager;
