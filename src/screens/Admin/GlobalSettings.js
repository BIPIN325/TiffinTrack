import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, ScrollView,
    Switch, TouchableOpacity, Alert, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';

export default function GlobalSettings() {
    const [settings, setSettings] = useState({
        kitchen_active_today: true,
        accepting_new_subscriptions: true,
        lunch_dispatch_time: '10:00',
        dinner_dispatch_time: '18:00',
        pause_buffer_hours: 3,
    });
    const [showLunchPicker, setShowLunchPicker] = useState(false);
    const [showDinnerPicker, setShowDinnerPicker] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase
            .from('global_settings')
            .select('*')
            .limit(1)
            .single();
        if (data) {
            setSettings({
                kitchen_active_today: data.kitchen_active_today ?? true,
                accepting_new_subscriptions: data.accepting_new_subscriptions ?? true,
                lunch_dispatch_time: data.lunch_dispatch_time || '10:00',
                dinner_dispatch_time: data.dinner_dispatch_time || '18:00',
                pause_buffer_hours: data.pause_buffer_hours || 3,
            });
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        const { error } = await supabase
            .from('global_settings')
            .update({
                kitchen_active_today: settings.kitchen_active_today,
                accepting_new_subscriptions: settings.accepting_new_subscriptions,
                lunch_dispatch_time: settings.lunch_dispatch_time,
                dinner_dispatch_time: settings.dinner_dispatch_time,
                pause_buffer_hours: settings.pause_buffer_hours,
            })
            .not('id', 'is', null); // Update all

        setSaving(false);
        if (!error) Alert.alert('✅ Settings Saved', 'Kitchen settings updated instantly for all users.');
        else Alert.alert('Error', 'Failed to save settings. Try again.');
    };

    const handleTimeChange = (field, event, selectedDate) => {
        if (field === 'lunch') setShowLunchPicker(false);
        if (field === 'dinner') setShowDinnerPicker(false);
        if (selectedDate) {
            const h = String(selectedDate.getHours()).padStart(2, '0');
            const m = String(selectedDate.getMinutes()).padStart(2, '0');
            setSettings(prev => ({
                ...prev,
                [field === 'lunch' ? 'lunch_dispatch_time' : 'dinner_dispatch_time']: `${h}:${m}`,
            }));
        }
    };

    const timeToDate = (timeStr) => {
        const [h, m] = (timeStr || '10:00').split(':');
        const d = new Date();
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        return d;
    };

    const SettingRow = ({ label, description, children }) => (
        <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>{label}</Text>
                {description ? <Text style={styles.settingDesc}>{description}</Text> : null}
            </View>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                {/* ── Emergency Controls ────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>🚨 Emergency Controls</Text>

                    <SettingRow
                        label="Kitchen Active Today"
                        description="Turn OFF to halt all dispatches & billing for today."
                    >
                        <Switch
                            value={settings.kitchen_active_today}
                            onValueChange={(v) => setSettings(prev => ({ ...prev, kitchen_active_today: v }))}
                            trackColor={{ false: '#D1D5DB', true: `${COLORS.successGreen}60` }}
                            thumbColor={settings.kitchen_active_today ? COLORS.successGreen : '#9CA3AF'}
                        />
                    </SettingRow>

                    {!settings.kitchen_active_today && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                ⚠️ Kitchen is OFF. No meals will be dispatched or billed. All users will see a "Kitchen Closed" banner.
                            </Text>
                        </View>
                    )}

                    <SettingRow
                        label="Accepting New Subscriptions"
                        description="Turn OFF if your kitchen is at full capacity."
                    >
                        <Switch
                            value={settings.accepting_new_subscriptions}
                            onValueChange={(v) => setSettings(prev => ({ ...prev, accepting_new_subscriptions: v }))}
                            trackColor={{ false: '#D1D5DB', true: `${COLORS.successGreen}60` }}
                            thumbColor={settings.accepting_new_subscriptions ? COLORS.successGreen : '#9CA3AF'}
                        />
                    </SettingRow>
                </View>

                {/* ── Cut-Off Times ─────────────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>⏰ Cut-Off Times</Text>
                    <Text style={styles.cardSub}>Users cannot pause their meal after these times.</Text>

                    <SettingRow label="Lunch Cut-Off">
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowLunchPicker(true)}>
                            <Text style={styles.timeBtnText}>{settings.lunch_dispatch_time}</Text>
                        </TouchableOpacity>
                    </SettingRow>
                    {showLunchPicker && (
                        <DateTimePicker
                            value={timeToDate(settings.lunch_dispatch_time)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(e, d) => handleTimeChange('lunch', e, d)}
                        />
                    )}

                    <SettingRow label="Dinner Cut-Off">
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowDinnerPicker(true)}>
                            <Text style={styles.timeBtnText}>{settings.dinner_dispatch_time}</Text>
                        </TouchableOpacity>
                    </SettingRow>
                    {showDinnerPicker && (
                        <DateTimePicker
                            value={timeToDate(settings.dinner_dispatch_time)}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(e, d) => handleTimeChange('dinner', e, d)}
                        />
                    )}
                </View>

                {/* ── Auto-Approval Rules ───────────────────────────── */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>🤖 Automation Rules</Text>

                    <SettingRow
                        label="Pause Buffer Hours"
                        description="Users must request pause this many hours before cut-off."
                    >
                        <View style={styles.counterRow}>
                            <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => setSettings(prev => ({ ...prev, pause_buffer_hours: Math.max(1, prev.pause_buffer_hours - 1) }))}
                            >
                                <Text style={styles.counterBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.counterVal}>{settings.pause_buffer_hours}h</Text>
                            <TouchableOpacity
                                style={styles.counterBtn}
                                onPress={() => setSettings(prev => ({ ...prev, pause_buffer_hours: prev.pause_buffer_hours + 1 }))}
                            >
                                <Text style={styles.counterBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </SettingRow>

                    <View style={styles.ruleCard}>
                        <Text style={styles.ruleEmoji}>⏳</Text>
                        <Text style={styles.ruleText}>Auto-receive meals if user doesn't respond within 12 hours.</Text>
                    </View>
                    <View style={styles.ruleCard}>
                        <Text style={styles.ruleEmoji}>💳</Text>
                        <Text style={styles.ruleText}>Day 30: Auto-generate invoice. Day 35: Auto-suspend unpaid.</Text>
                    </View>
                </View>

                {/* ── Save Button ───────────────────────────────────── */}
                <PrimaryButton
                    title={saving ? "Saving..." : "💾 Save All Settings"}
                    onPress={saveSettings}
                    disabled={saving}
                    style={{ marginTop: 8, marginBottom: 30 }}
                />

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    scroll: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOWS.light },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
    cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
    settingDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, maxWidth: '80%' },
    warningBox: { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginTop: 8 },
    warningText: { color: '#92400E', fontSize: 13, lineHeight: 20 },
    timeBtn: { backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    timeBtnText: { color: '#F9FAFB', fontWeight: 'bold', fontSize: 16 },
    counterRow: { flexDirection: 'row', alignItems: 'center' },
    counterBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    counterVal: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 14 },
    ruleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginTop: 10 },
    ruleEmoji: { fontSize: 22, marginRight: 12 },
    ruleText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 20 },
});
