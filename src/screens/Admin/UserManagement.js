import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList, Image,
    ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal,
    ScrollView, Clipboard
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';
import {
    USE_DUMMY_DATA, DUMMY_USERS, DUMMY_PENDING_USERS,
    DUMMY_RATE_TIERS, DUMMY_ZONES
} from '../../utils/dummyData';
import {
    Search, Copy, RefreshCw, Tag, Users, UserCheck, Pause,
    ShieldOff, Clock, ChevronRight, Settings, LayoutGrid, Activity, 
    Coffee, UserX, Timer, Ban, Hourglass, UserPlus
} from 'lucide-react-native';

const STATUS_TABS = ['All', 'Active', 'Paused', 'Suspended', 'Pending'];

const UserManagement = ({ navigation, route }) => {
    const filterTier = route.params?.filterTier;
    const filterName = route.params?.filterName;

    const [allUsers, setAllUsers] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(filterTier ? 'All' : 'All');
    const [rateTiers, setRateTiers] = useState([]);
    const [zones, setZones] = useState([]);
    const [kitchenCode, setKitchenCode] = useState('SHARMA99');

    // Credit modal
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditUser, setCreditUser] = useState(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNote, setCreditNote] = useState('');
    const [creditType, setCreditType] = useState('Discount');

    // Approval modal
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalUser, setApprovalUser] = useState(null);
    const [selectedTierId, setSelectedTierId] = useState(null);
    const [selectedZoneId, setSelectedZoneId] = useState(null);

    useEffect(() => {
        fetchAll();
        const channel = supabase.channel('users_table_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAll())
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchAll = async () => {
        // Users
        const { data: users } = await supabase
            .from('users')
            .select('*, rate_tiers(tier_name, price_per_meal), delivery_zones(zone_name)')
            .order('created_at', { ascending: false });

        if (users && users.length > 0) {
            setAllUsers(users.filter(u => u.status !== 'PENDING'));
            setPendingUsers(users.filter(u => u.status === 'PENDING'));
        } else if (USE_DUMMY_DATA) {
            setAllUsers(DUMMY_USERS.filter(u => u.status !== 'PENDING'));
            setPendingUsers(DUMMY_PENDING_USERS);
        }

        // Rate tiers
        const { data: tiers } = await supabase.from('rate_tiers').select('*');
        if (tiers && tiers.length > 0) {
            setRateTiers(tiers);
        } else if (USE_DUMMY_DATA) {
            setRateTiers(DUMMY_RATE_TIERS);
        }

        // Zones
        const { data: zoneData } = await supabase.from('delivery_zones').select('*');
        if (zoneData && zoneData.length > 0) {
            setZones(zoneData);
        } else if (USE_DUMMY_DATA) {
            setZones(DUMMY_ZONES);
        }

        // Kitchen code
        const { data: kitchen } = await supabase.from('kitchens').select('kitchen_code').limit(1).single();
        if (kitchen) setKitchenCode(kitchen.kitchen_code);

        setLoading(false);
    };

    // ── Actions ────────────────────────────────────────────────
    const handleCopyCode = () => {
        try { Clipboard.setString(kitchenCode); } catch (_) {}
        Alert.alert('📋 Copied!', `Kitchen code "${kitchenCode}" copied. Share it via WhatsApp.`);
    };

    const handleRegenerateCode = () => {
        Alert.alert(
            '🔄 Regenerate Kitchen Code?',
            'The old code will stop working for new sign-ups. Existing customers are not affected.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate', onPress: async () => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        let newCode = '';
                        for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
                        if (!USE_DUMMY_DATA) {
                            await supabase.from('kitchens').update({ kitchen_code: newCode }).not('kitchen_id', 'is', null);
                        }
                        setKitchenCode(newCode);
                        Alert.alert('✅ New Code', `Your kitchen code is now "${newCode}".`);
                    }
                }
            ]
        );
    };

    const openApprovalModal = (user) => {
        setApprovalUser(user);
        setSelectedTierId(rateTiers[0]?.id || null);
        setSelectedZoneId(zones[0]?.id || null);
        setShowApprovalModal(true);
    };

    const handleApprove = async () => {
        if (!approvalUser) return;
        if (!selectedTierId || !selectedZoneId) {
            Alert.alert('Required', 'Please select both a rate tier and a delivery zone.');
            return;
        }

        if (!USE_DUMMY_DATA) {
            const { error } = await supabase.from('users').update({
                status: 'ACTIVE',
                rate_tier_id: selectedTierId,
                zone_id: selectedZoneId,
            }).eq('user_id', approvalUser.user_id);
            if (error) { Alert.alert('Error', 'Failed to approve user.'); return; }
        }

        // Move from pending to active in local state
        const selectedTier = rateTiers.find(t => t.id === selectedTierId);
        const selectedZone = zones.find(z => z.id === selectedZoneId);
        const approvedUser = {
            ...approvalUser,
            status: 'ACTIVE',
            rate_tier_id: selectedTierId,
            zone_id: selectedZoneId,
            rate_tiers: selectedTier ? { tier_name: selectedTier.tier_name, price_per_meal: selectedTier.price_per_meal } : null,
            delivery_zones: selectedZone ? { zone_name: selectedZone.zone_name } : null,
            is_lunch_active: true,
            is_dinner_active: true,
            created_at: approvalUser.created_at || new Date().toISOString(),
        };
        setPendingUsers(prev => prev.filter(u => u.user_id !== approvalUser.user_id));
        setAllUsers(prev => [approvedUser, ...prev]);

        setShowApprovalModal(false);
        Alert.alert('✅ Approved', `${approvalUser.name} is now active on "${selectedTier?.tier_name}" in "${selectedZone?.zone_name}".`);
    };

    const handleApplyCredit = async () => {
        if (!creditUser || !creditAmount) return;
        const today = new Date().toISOString().split('T')[0];
        if (!USE_DUMMY_DATA) {
            await supabase.from('ledger_entries').insert({
                user_id: creditUser.user_id,
                meal_type: 'LUNCH',
                delivery_date: today,
                status: 'UNBILLED',
                amount: -Math.abs(Number(creditAmount)),
                admin_status: 'SENT',
                user_status: 'RECEIVED'
            });
        }
        Alert.alert('💰 Credit Applied', `₹${creditAmount} ${creditType.toLowerCase()} added to ${creditUser.name}'s ledger.`);
        setShowCreditModal(false);
        setCreditAmount('');
        setCreditNote('');
    };

    // ── Filtering ──────────────────────────────────────────────
    const getFilteredUsers = () => {
        let list = activeTab === 'Pending' ? pendingUsers : allUsers;

        // Status filter
        if (activeTab === 'Active') list = list.filter(u => u.status === 'ACTIVE');
        if (activeTab === 'Paused') list = list.filter(u => u.status === 'PAUSED');
        if (activeTab === 'Suspended') list = list.filter(u => u.status === 'SUSPENDED');

        // Tier filter
        if (filterTier) {
            list = list.filter(u => u.rate_tier_id === filterTier);
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(u =>
                u.name?.toLowerCase().includes(q) ||
                u.phone?.includes(q) ||
                u.address?.toLowerCase().includes(q)
            );
        }
        return list;
    };

    const filteredUsers = getFilteredUsers();

    // ── Stats ──────────────────────────────────────────────────
    const stats = {
        total: allUsers.length + pendingUsers.length,
        active: allUsers.filter(u => u.status === 'ACTIVE').length,
        paused: allUsers.filter(u => u.status === 'PAUSED').length,
        suspended: allUsers.filter(u => u.status === 'SUSPENDED').length,
        pending: pendingUsers.length,
    };

    const statusColor = (s) => {
        if (s === 'ACTIVE') return '#10B981';
        if (s === 'SUSPENDED') return '#EF4444';
        if (s === 'PAUSED') return '#F59E0B';
        if (s === 'PENDING') return '#3B82F6';
        return '#6B7280';
    };

    const tabIcon = (tab) => {
        switch (tab) {
            case 'All': return <Users size={14} color={activeTab === tab ? '#FFF' : '#6B7280'} />;
            case 'Active': return <Activity size={14} color={activeTab === tab ? '#FFF' : '#10B981'} />;
            case 'Paused': return <Coffee size={14} color={activeTab === tab ? '#FFF' : '#F59E0B'} />;
            case 'Suspended': return <Ban size={14} color={activeTab === tab ? '#FFF' : '#EF4444'} />;
            case 'Pending': return <Hourglass size={14} color={activeTab === tab ? '#FFF' : '#3B82F6'} />;
        }
    };

    const tabCount = (tab) => {
        switch (tab) {
            case 'All': return stats.total;
            case 'Active': return stats.active;
            case 'Paused': return stats.paused;
            case 'Suspended': return stats.suspended;
            case 'Pending': return stats.pending;
        }
    };

    const tabColor = (tab) => {
        switch (tab) {
            case 'Active': return '#10B981';
            case 'Paused': return '#F59E0B';
            case 'Suspended': return '#EF4444';
            case 'Pending': return '#3B82F6';
            default: return '#6366F1';
        }
    };

    // ── Render Pending Item (for Pending tab) ──────────────────
    const renderPendingItem = ({ item }) => (
        <TouchableOpacity style={styles.pendingCard} onPress={() => openApprovalModal(item)} activeOpacity={0.7}>
            <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=3B82F6&color=FFF&size=80` }}
                style={styles.pendAvatar}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.pendName}>{item.name}</Text>
                <Text style={styles.pendPhone}>{item.phone}</Text>
                {item.address ? <Text style={styles.pendAddress}>📍 {item.address}</Text> : null}
            </View>
            <TouchableOpacity style={styles.approveBtn} onPress={() => openApprovalModal(item)}>
                <Text style={styles.approveBtnText}>Review</Text>
                <ChevronRight size={14} color="#FFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // ── Render User Card ───────────────────────────────────────
    const renderUserItem = ({ item }) => {
        let subText = 'No Plan';
        if (item.is_lunch_active && item.is_dinner_active) subText = 'Lunch & Dinner';
        else if (item.is_lunch_active) subText = 'Lunch Only';
        else if (item.is_dinner_active) subText = 'Dinner Only';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('UserDetail', { user: item })}
                activeOpacity={0.7}
            >
                <View style={styles.profileBox}>
                    <Image
                        source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=111827&color=F9FAFB&size=80` }}
                        style={styles.avatar}
                    />
                    <View style={styles.nameWrap}>
                        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.phone}>{item.phone}</Text>
                        {item.address ? <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text> : null}
                    </View>
                    <ChevronRight size={18} color="#D1D5DB" />
                </View>

                <View style={styles.metaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}12` }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
                    </View>
                    <View style={styles.tierBadge}>
                        <Tag size={12} color="#6366F1" />
                        <Text style={styles.rateTierText}>{item.rate_tiers?.tier_name || 'Standard'} • ₹{item.rate_tiers?.price_per_meal || '80'}</Text>
                    </View>
                    <Text style={styles.subText}>{subText}</Text>
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.creditBtn}
                        onPress={(e) => { e.stopPropagation(); setCreditUser(item); setShowCreditModal(true); }}
                    >
                        <Text style={styles.creditBtnText}>💳 Add Credit</Text>
                    </TouchableOpacity>
                    <Text style={styles.viewProfile}>View Profile ›</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const creditTypes = ['Discount', 'Refund', 'Correction'];
    const creditColors = ['#10B981', '#3B82F6', '#F59E0B'];

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Kitchen Code Banner ─────────────────────────────── */}
            <View style={styles.banner}>
                <View style={styles.bannerTop}>
                    <View>
                        <Text style={styles.bannerLabel}>Your Kitchen Code</Text>
                        <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
                            <Text style={styles.codeText}>{kitchenCode}</Text>
                            <Copy size={16} color="#FFFFFF90" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.bannerButtons}>
                        <TouchableOpacity style={styles.regenBtn} onPress={handleRegenerateCode}>
                            <RefreshCw size={16} color="#9CA3AF" />
                            <Text style={styles.regenText}>Regenerate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tierMgmtBtn} onPress={() => navigation.navigate('RateTierManager')}>
                            <Settings size={16} color="#FFF" />
                            <Text style={styles.tierMgmtText}>Rate Tiers</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.bannerSub}>Share this code with new customers via WhatsApp</Text>
            </View>

            {/* ── Stats Bar ──────────────────────────────────────── */}
            <View style={styles.statsBar}>
                <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={[styles.statVal, { color: '#4338CA' }]}>{stats.active}</Text>
                    <Text style={styles.statTit}>Active</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[styles.statVal, { color: '#92400E' }]}>{stats.paused}</Text>
                    <Text style={styles.statTit}>Vacation</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.statVal, { color: '#065F46' }]}>{stats.pending}</Text>
                    <Text style={styles.statTit}>Pending</Text>
                </View>
            </View>

            {/* ── Active Filter Banner ────────────────────────────── */}
            {filterTier && (
                <View style={styles.filterBanner}>
                    <Tag size={14} color="#6366F1" />
                    <Text style={styles.filterText}>Showing users on tier: <Text style={{ fontWeight: 'bold' }}>{filterName}</Text></Text>
                    <TouchableOpacity onPress={() => navigation.setParams({ filterTier: null, filterName: null })}>
                        <Text style={styles.clearFilter}>Clear</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Search Bar ─────────────────────────────────────── */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Search size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, phone, or address..."
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {/* ── Status Filter Tabs ─────────────────────────────── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                {STATUS_TABS.map(tab => {
                    const isActive = activeTab === tab;
                    const color = tabColor(tab);
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabPill, isActive && { backgroundColor: color }]}
                            onPress={() => setActiveTab(tab)}
                        >
                            {tabIcon(tab)}
                            <Text style={[styles.tabText, isActive && { color: '#FFF' }]}>{tab}</Text>
                            <View style={[styles.tabCount, isActive && { backgroundColor: '#FFFFFF30' }]}>
                                <Text style={[styles.tabCountText, isActive && { color: '#FFF' }]}>{tabCount(tab)}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primaryRed} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    contentContainerStyle={styles.list}
                    data={filteredUsers}
                    keyExtractor={item => item.user_id}
                    renderItem={activeTab === 'Pending' ? renderPendingItem : renderUserItem}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>
                                {activeTab === 'Pending' ? '🎉' : '🔍'}
                            </Text>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'Pending' ? 'No Pending Approvals' : 'No customers found'}
                            </Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'Pending'
                                    ? 'All sign-ups have been reviewed!'
                                    : 'Try adjusting your search or filters'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── Approval Modal ─────────────────────────────────── */}
            <Modal visible={showApprovalModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🤝 Approve Customer</Text>
                        <Text style={styles.modalSub}>
                            Set up {approvalUser?.name}'s subscription before approving.
                        </Text>

                        {/* User Info */}
                        <View style={styles.approvalInfo}>
                            <Text style={styles.approvalName}>{approvalUser?.name}</Text>
                            <Text style={styles.approvalPhone}>{approvalUser?.phone}</Text>
                            {approvalUser?.address ? <Text style={styles.approvalAddress}>📍 {approvalUser?.address}</Text> : null}
                        </View>

                        {/* Tier Picker */}
                        <Text style={styles.inputLabel}>Rate Tier *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                            <View style={styles.chipRow}>
                                {rateTiers.map(tier => (
                                    <TouchableOpacity
                                        key={tier.id}
                                        style={[styles.tierChip, selectedTierId === tier.id && styles.tierChipActive]}
                                        onPress={() => setSelectedTierId(tier.id)}
                                    >
                                        <Text style={[styles.tierChipName, selectedTierId === tier.id && { color: '#FFF' }]}>
                                            {tier.tier_name}
                                        </Text>
                                        <Text style={[styles.tierChipPrice, selectedTierId === tier.id && { color: '#FFFFFFBB' }]}>
                                            ₹{tier.price_per_meal}/meal
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Zone Picker */}
                        <Text style={styles.inputLabel}>Delivery Zone *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                            <View style={styles.chipRow}>
                                {zones.map(zone => (
                                    <TouchableOpacity
                                        key={zone.id}
                                        style={[styles.zoneChip, selectedZoneId === zone.id && styles.zoneChipActive]}
                                        onPress={() => setSelectedZoneId(zone.id)}
                                    >
                                        <Text style={[styles.zoneChipName, selectedZoneId === zone.id && { color: '#FFF' }]}>
                                            📍 {zone.zone_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <PrimaryButton title="✅ Approve & Activate" onPress={handleApprove} style={{ marginTop: 16 }} />
                        <PrimaryButton title="Cancel" type="outline" onPress={() => setShowApprovalModal(false)} style={{ marginTop: 10 }} />
                    </View>
                </View>
            </Modal>

            {/* ── Credit Modal ───────────────────────────────────── */}
            <Modal visible={showCreditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>💰 Apply Credit / Discount</Text>
                        <Text style={styles.modalSub}>For: {creditUser?.name}</Text>

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
                            style={styles.creditInput}
                            placeholder="Enter amount"
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                            value={creditAmount}
                            onChangeText={setCreditAmount}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 14 }]}>Note (optional)</Text>
                        <TextInput
                            style={styles.creditInput}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },

    // Banner
    banner: { backgroundColor: '#111827', padding: 16, paddingTop: 42, paddingBottom: 12 },
    bannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bannerLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
    codeBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: COLORS.primaryRed, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    },
    codeText: { color: '#FFF', fontWeight: 'bold', fontSize: 20, letterSpacing: 3 },
    bannerButtons: { alignItems: 'flex-end', gap: 6 },
    regenBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1F2937',
    },
    regenText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
    tierMgmtBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#6366F1',
    },
    tierMgmtText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    bannerSub: { color: '#6B7280', fontSize: 11, marginTop: 8 },

    // Stats Bar
    statsBar: {
        flexDirection: 'row', padding: 16, paddingBottom: 10, gap: 10,
    },
    statCard: {
        flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    statVal: { fontSize: 18, fontWeight: 'bold' },
    statTit: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Filter Banner
    filterBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
        marginHorizontal: 16, marginBottom: 10, paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 10, borderWidth: 1, borderColor: '#C7D2FE',
    },
    filterText: { flex: 1, fontSize: 13, color: '#4338CA', marginLeft: 8 },
    clearFilter: { fontSize: 13, fontWeight: 'bold', color: COLORS.primaryRed },

    // Search
    searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827' },

    // Tabs
    tabsContainer: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    tabPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25,
        backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F3F4F6', marginRight: 10,
    },
    tabText: { fontSize: 13, fontWeight: '700', color: '#374151' },
    tabCount: {
        backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, marginLeft: 2,
    },
    tabCountText: { fontSize: 11, fontWeight: 'bold', color: '#6B7280' },

    // List
    list: { padding: 16, paddingTop: 6, marginTop: 6, paddingBottom: 100 },

    // Empty State
    emptyState: { alignItems: 'center', paddingTop: 50 },
    emptyEmoji: { fontSize: 40, marginBottom: 10 },
    emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151' },
    emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

    // Pending Card
    pendingCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
        padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE',
    },
    pendAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE' },
    pendName: { fontWeight: 'bold', color: '#111827', fontSize: 15 },
    pendPhone: { color: '#6B7280', fontSize: 13, marginTop: 2 },
    pendAddress: { color: '#6B7280', fontSize: 12, marginTop: 2 },
    approveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    },
    approveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    // User Card
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 10, ...SHADOWS.light },
    profileBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E5E7EB' },
    nameWrap: { marginLeft: 12, flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    phone: { fontSize: 13, color: '#6B7280', marginTop: 1 },
    address: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },

    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
    statusText: { fontWeight: 'bold', fontSize: 11 },
    tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    rateTierText: { fontSize: 12, color: '#4338CA', fontWeight: '600' },
    subText: { fontSize: 12, color: '#6B7280' },

    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
    creditBtn: {},
    creditBtnText: { color: COLORS.primaryRed, fontWeight: '600', fontSize: 13 },
    viewProfile: { color: '#6B7280', fontSize: 12, fontWeight: '500' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 22, padding: 22, maxHeight: '85%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    modalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    creditInput: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, height: 50, fontSize: 16, color: '#111827',
    },

    // Type Selector
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    typeChip: {
        flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
        borderColor: '#E5E7EB', alignItems: 'center',
    },
    typeChipText: { fontWeight: '700', color: '#6B7280', fontSize: 13 },

    // Approval Modal
    approvalInfo: {
        backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14, marginBottom: 16,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    approvalName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    approvalPhone: { fontSize: 13, color: '#6B7280', marginTop: 3 },
    approvalAddress: { fontSize: 12, color: '#6B7280', marginTop: 3 },

    chipRow: { flexDirection: 'row', gap: 8 },
    tierChip: {
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
        backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 100,
    },
    tierChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    tierChipName: { fontSize: 14, fontWeight: '700', color: '#111827' },
    tierChipPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },

    zoneChip: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
        backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
    },
    zoneChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    zoneChipName: { fontSize: 13, fontWeight: '600', color: '#111827' },
});

export default UserManagement;
