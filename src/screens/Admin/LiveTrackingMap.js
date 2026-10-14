import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    TouchableOpacity, Alert, Linking
} from 'react-native';
import PrimaryButton from '../../components/PrimaryButton';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import { USE_DUMMY_DATA, DUMMY_DELIVERIES } from '../../utils/dummyData';

export default function LiveTrackingMap() {
    const [deliveries, setDeliveries] = useState([]);
    const [trackingLink, setTrackingLink] = useState(null);

    useEffect(() => {
        fetchRouteList();
    }, []);

    const fetchRouteList = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('ledger_entries')
            .select('*, users(name, address, phone)')
            .eq('delivery_date', today)
            .eq('meal_type', 'LUNCH')
            .eq('admin_status', 'SENT');

        if (data) {
            // Group by area (extract area from address)
            const list = data.map(d => ({
                id: d.id,
                name: d.users?.name || 'Unknown',
                address: d.users?.address || 'No address',
                phone: d.users?.phone || '',
                area: (d.users?.address || '').split(',').pop()?.trim() || 'Other',
                delivered: d.user_status === 'RECEIVED',
            }));
            // Sort by area for route optimization
            list.sort((a, b) => a.area.localeCompare(b.area));
            if (list.length > 0) {
                setDeliveries(list);
            } else if (USE_DUMMY_DATA) {
                setDeliveries(DUMMY_DELIVERIES);
            }
        } else if (USE_DUMMY_DATA) {
            setDeliveries(DUMMY_DELIVERIES);
        }
    };

    const handleGenerateLink = () => {
        const linkId = `route-${Date.now().toString(36)}`;
        const link = `tiffintrack.com/track/${linkId}`;
        setTrackingLink(link);
        Alert.alert(
            "📍 Tracking Link Generated",
            `Link: ${link}\n\nThis link expires in 3 hours. Send it to your delivery boy on WhatsApp.`,
            [
                { text: 'Copy & Share', onPress: () => {
                    try { Linking.openURL(`whatsapp://send?text=Open this to start tracking: ${link}`); }
                    catch (_) { Alert.alert('Link copied', link); }
                }},
                { text: 'OK' }
            ]
        );
    };

    const handleNavigate = (address) => {
        const encoded = encodeURIComponent(address);
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
    };

    const deliveredCount = deliveries.filter(d => d.delivered).length;
    const totalCount = deliveries.length;

    // Group deliveries by area
    const areas = {};
    deliveries.forEach(d => {
        if (!areas[d.area]) areas[d.area] = [];
        areas[d.area].push(d);
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* ── Map Placeholder & Progress ──────────────────── */}
                <View style={styles.mapContainer}>
                    <View style={styles.mapPlaceholder}>
                        <Text style={styles.mapIcon}>🗺️</Text>
                        <Text style={styles.mapText}>Live Map View</Text>
                        <Text style={styles.mapSub}>Requires Google Maps API key in production</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: totalCount > 0 ? `${(deliveredCount / totalCount) * 100}%` : '0%' }]} />
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={styles.progressText}>{deliveredCount} / {totalCount} Delivered</Text>
                        {trackingLink && <Text style={styles.trackingActive}>📡 Tracking Active</Text>}
                    </View>
                </View>

                {/* ── Generate Tracking Link ───────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📡 App-Free Tracking</Text>
                    <Text style={styles.cardSub}>Generate a 3-hour temporary web link. The delivery boy clicks it in Chrome — no app download needed. GPS pings every 15 seconds.</Text>
                    <PrimaryButton title="Generate Tracking Link" onPress={handleGenerateLink} style={{ marginTop: 12 }} />
                </View>

                {/* ── Route-Optimized Delivery List ────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>🚗 Optimized Route</Text>
                    <Text style={styles.cardSub}>Deliveries sorted by area. Tap navigate for Google Maps directions.</Text>

                    {Object.keys(areas).length === 0 ? (
                        <Text style={styles.emptyText}>No dispatched deliveries yet for today.</Text>
                    ) : Object.entries(areas).map(([area, items]) => (
                        <View key={area} style={{ marginBottom: 16 }}>
                            <View style={styles.areaHeader}>
                                <Text style={styles.areaTitle}>📍 {area}</Text>
                                <Text style={styles.areaCount}>{items.length} stops</Text>
                            </View>

                            {items.map((item, idx) => (
                                <View key={item.id} style={styles.routeItem}>
                                    <View style={styles.routeNumber}>
                                        <Text style={styles.routeNumText}>{idx + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.routeName}>{item.name}</Text>
                                        <Text style={styles.routeAddr}>{item.address}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.navBtn} onPress={() => handleNavigate(item.address)}>
                                        <Text style={styles.navBtnText}>🧭 Go</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scroll: { paddingBottom: 100 },

    // Map
    mapContainer: { backgroundColor: '#111827' },
    mapPlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center' },
    mapIcon: { fontSize: 40, marginBottom: 8 },
    mapText: { color: '#F9FAFB', fontSize: 18, fontWeight: 'bold' },
    mapSub: { color: '#6B7280', fontSize: 12, marginTop: 4 },
    progressBar: { height: 6, backgroundColor: '#1F2937', marginHorizontal: 20 },
    progressFill: { height: 6, backgroundColor: COLORS.successGreen, borderRadius: 3 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
    progressText: { color: '#F9FAFB', fontWeight: 'bold', fontSize: 14 },
    trackingActive: { color: COLORS.successGreen, fontWeight: '600', fontSize: 13 },

    // Cards
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 16, ...SHADOWS.light },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    cardSub: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
    emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 20 },

    // Areas
    areaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    areaTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
    areaCount: { fontSize: 12, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },

    // Route Items
    routeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    routeNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryRed, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    routeNumText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    routeName: { fontSize: 14, fontWeight: '600', color: '#111827' },
    routeAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    navBtn: { backgroundColor: '#ECFDF5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    navBtnText: { color: '#065F46', fontWeight: 'bold', fontSize: 14 },
});
