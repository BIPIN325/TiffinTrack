import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, FlatList, KeyboardAvoidingView, Platform, Image, ScrollView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import PrimaryButton from '../../components/PrimaryButton';

const PAGE_SIZE = 20;

export default function InboxScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState('NOTICES');

    // Notices
    const [notices, setNotices] = useState([]);
    const [noticesPage, setNoticesPage] = useState(0);
    const [hasMoreNotices, setHasMoreNotices] = useState(false);

    // Support
    const [openTicket, setOpenTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [msgPage, setMsgPage] = useState(0);
    const [hasMoreMsgs, setHasMoreMsgs] = useState(false);

    const flatListRef = useRef(null);

    const categories = [
        '🍲 Food Quality',
        '⏱️ Delivery is Late',
        '💳 Billing/Payment Issue',
        '📅 What is today\'s menu?',
        '💰 What is my current bill?',
        '❓ Other',
    ];

    // ─── Push Notification Registration ──────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        fetchNotices(0);
        checkActiveTicket();
    }, [user]);



    // ─── Notices (with pagination) ────────────────────────────────────────────
    const fetchNotices = async (page = 0) => {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to);

        const results = data && data.length > 0 ? data : [
            { id: 1, message: '🎉 Diwali Special: Tomorrow\'s lunch includes free Gulab Jamun!', created_at: new Date().toISOString() },
            { id: 2, message: '🧾 Your ₹1,800 bill for March has been generated.', created_at: new Date(Date.now() - 86400000).toISOString() }
        ];

        if (page === 0) setNotices(results);
        else setNotices(prev => [...prev, ...results]);

        setHasMoreNotices((data?.length || 0) === PAGE_SIZE);
        setNoticesPage(page);
    };

    // ─── Support Ticket ───────────────────────────────────────────────────────
    const checkActiveTicket = async () => {
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'OPEN')
            .single();
        if (data) {
            setOpenTicket({ id: data.ticket_id, category: data.category, status: data.status });
            fetchMessages(data.ticket_id, 0);
        }
    };

    // ─── Messages (with pagination) ───────────────────────────────────────────
    const fetchMessages = async (ticketId, page = 0) => {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('timestamp', { ascending: false })
            .range(from, to);

        const reversed = (data || []).reverse();
        if (page === 0) setMessages(reversed);
        else setMessages(prev => [...reversed, ...prev]);
        setHasMoreMsgs((data?.length || 0) === PAGE_SIZE);
        setMsgPage(page);
    };

    // ─── Realtime sync ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!openTicket?.id || openTicket.id === 'temp-123') return;

        const msgChannel = supabase.channel(`ticket_${openTicket.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `ticket_id=eq.${openTicket.id}`
            }, (payload) => {
                const msg = payload.new;
                setMessages(prev => [...prev, msg]);
                if (msg.sender_type === 'ADMIN') {
                    Alert.alert('💬 Admin Replied', msg.text);
                }
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'support_tickets',
                filter: `ticket_id=eq.${openTicket.id}`
            }, (payload) => {
                setOpenTicket(prev => ({ ...prev, status: payload.new.status }));
            })
            .subscribe();

        return () => supabase.removeChannel(msgChannel);
    }, [openTicket?.id]);

    // ─── Create Ticket / Auto-Deflect ─────────────────────────────────────────
    const handleCreateTicket = async (cat) => {
        setShowCategoryModal(false);

        // Auto-deflect: Today's Menu
        if (cat === '📅 What is today\'s menu?') {
            const today = new Date().toISOString().split('T')[0];
            const { data: menuData } = await supabase
                .from('daily_menus')
                .select('items')
                .eq('date', today)
                .single();

            let menuText = "Today's menu hasn't been updated yet. Please check back later!";
            if (menuData?.items?.length > 0) {
                const formatted = menuData.items.map(i => `${i.emoji} ${i.name} (${i.qty})`).join('\n');
                menuText = `Today's Menu:\n${formatted}\n\nYou can also check this on your Home Screen!`;
            }
            setOpenTicket({ id: 'temp-menu', category: cat, status: 'CLOSED' });
            setMessages([
                { id: 1, sender_type: 'USER', text: cat },
                { id: 2, sender_type: 'ADMIN', text: menuText }
            ]);
            return;
        }

        // Auto-deflect: My Current Bill
        if (cat === '💰 What is my current bill?') {
            const now = new Date();
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const { data: ledger } = await supabase
                .from('ledger_entries')
                .select('amount')
                .eq('user_id', user.id)
                .gte('delivery_date', monthStart)
                .neq('status', 'CANCELLED_FREE');

            const total = (ledger || []).reduce((sum, e) => sum + Number(e.amount), 0);
            const monthName = now.toLocaleString('default', { month: 'long' });

            setOpenTicket({ id: 'temp-bill', category: cat, status: 'CLOSED' });
            setMessages([
                { id: 1, sender_type: 'USER', text: cat },
                { id: 2, sender_type: 'ADMIN', text: `Your current bill for ${monthName} is ₹${total.toLocaleString()}. You can view the full breakdown and pay in the Ledger tab! 💳` }
            ]);
            return;
        }

        // Real ticket
        const { data, error } = await supabase
            .from('support_tickets')
            .insert({ user_id: user.id, category: cat.replace(/^.*?\s/, ''), status: 'OPEN' })
            .select()
            .single();

        if (data) {
            setOpenTicket({ id: data.ticket_id, category: cat, status: data.status });
            setMessages([]);
        }
    };

    // ─── Send Message ─────────────────────────────────────────────────────────
    const sendMessage = async (imageUrl = null) => {
        if (!chatInput.trim() && !imageUrl) return;
        if (!openTicket || openTicket.id.startsWith('temp-')) return;

        const { error } = await supabase.from('messages').insert({
            ticket_id: openTicket.id,
            sender_type: 'USER',
            text: imageUrl ? '📷 Photo attached' : chatInput,
            image_url: imageUrl || null
        });
        if (!error) setChatInput('');
    };

    // ─── Image Picker ─────────────────────────────────────────────────────────
    const handleAttachImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Camera roll permission is required to attach photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled && result.assets?.length > 0) {
            const asset = result.assets[0];
            const fileName = `ticket_${openTicket.id}_${Date.now()}.jpg`;
            const { data: uploadData, error } = await supabase.storage
                .from('chat-images')
                .upload(fileName, { uri: asset.uri, type: 'image/jpeg', name: fileName });

            if (!error && uploadData) {
                const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName);
                await sendMessage(publicUrl);
            }
        }
    };

    // ─── Render Notices ───────────────────────────────────────────────────────
    const renderNotices = () => (
        <FlatList
            data={notices}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
                <View style={[styles.noticeCard, { backgroundColor: colors.glassBackground, borderColor: colors.borderDark }]}>
                    <Text style={[styles.noticeText, { color: colors.textDark }]}>{item.message}</Text>
                    <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
            )}
            ListFooterComponent={hasMoreNotices ? (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchNotices(noticesPage + 1)}>
                    <Text style={styles.loadMoreText}>Load older notices…</Text>
                </TouchableOpacity>
            ) : null}
        />
    );

    // ─── Render Support ───────────────────────────────────────────────────────
    const renderSupport = () => {
        if (!openTicket) {
            return (
                <View style={styles.centered}>
                    <Text style={[styles.supportTitle, { color: colors.textDark }]}>Need Help? 🙋</Text>
                    <Text style={styles.supportSub}>Our kitchen team typically responds within 10 minutes.</Text>
                    <PrimaryButton title="Raise an Issue" onPress={() => setShowCategoryModal(true)} />
                </View>
            );
        }

        const isFoodQuality = openTicket.category?.includes('Food Quality');
        const isTemp = openTicket.id?.startsWith('temp-');

        return (
            <View style={styles.chatContainer}>
                {/* Chat Header */}
                <View style={[styles.chatHeader, { backgroundColor: colors.glassBackground, borderBottomColor: colors.borderDark }]}>
                    <Text style={[styles.chatHeaderText, { color: colors.textDark }]}>{openTicket.category}</Text>
                    {openTicket.status === 'OPEN' ? (
                        <TouchableOpacity onPress={() => setOpenTicket({ ...openTicket, status: 'CLOSED' })}>
                            <Text style={{ color: COLORS.primaryRed, fontSize: 13, fontWeight: 'bold' }}>Close & Finished</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.closedBadge}>CLOSED</Text>
                    )}
                </View>

                {/* Load More Messages */}
                {hasMoreMsgs && (
                    <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchMessages(openTicket.id, msgPage + 1)}>
                        <Text style={styles.loadMoreText}>↑ Load older messages</Text>
                    </TouchableOpacity>
                )}

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    renderItem={({ item }) => (
                        <View style={[styles.messageBubble, item.sender_type === 'USER' ? styles.myBubble : styles.adminBubble]}>
                            {item.image_url ? (
                                <Image source={{ uri: item.image_url }} style={styles.chatImage} resizeMode="cover" />
                            ) : null}
                            <Text style={item.sender_type === 'USER' ? styles.myMsgText : styles.adminMsgText}>{item.text}</Text>
                        </View>
                    )}
                />

                {/* Input Row */}
                {openTicket.status !== 'CLOSED' && !isTemp && (
                    <View style={[styles.inputRow, { backgroundColor: colors.backgroundLight, borderTopColor: colors.borderDark }]}>
                        {isFoodQuality && (
                            <TouchableOpacity style={styles.attachBtn} onPress={handleAttachImage}>
                                <Text style={{ fontSize: 22 }}>📎</Text>
                            </TouchableOpacity>
                        )}
                        <TextInput
                            style={[styles.input, { color: colors.textDark, backgroundColor: colors.overlay, borderColor: colors.borderDark }]}
                            placeholder="Type your message..."
                            placeholderTextColor={colors.textMuted}
                            value={chatInput}
                            onChangeText={setChatInput}
                        />
                        <PrimaryButton title="Send" onPress={() => sendMessage()} style={{ marginLeft: 10 }} />
                    </View>
                )}
                {openTicket.status === 'CLOSED' && (
                    <View style={[styles.closedFooter, { borderTopColor: colors.borderDark }]}>
                        <PrimaryButton title="Start New Ticket" onPress={() => { setOpenTicket(null); setMessages([]); }} type="outline" />
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.textDark }]}>Communication Hub</Text>
            </View>
            <View style={[styles.tabRow, { borderBottomColor: colors.borderDark }]}>
                <TouchableOpacity style={[styles.tab, activeTab === 'NOTICES' && styles.activeTab]} onPress={() => setActiveTab('NOTICES')}>
                    <Text style={[styles.tabText, activeTab === 'NOTICES' && styles.activeTabText]}>📢 Notices</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'SUPPORT' && styles.activeTab]} onPress={() => setActiveTab('SUPPORT')}>
                    <Text style={[styles.tabText, activeTab === 'SUPPORT' && styles.activeTabText]}>🎫 Support</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                {activeTab === 'NOTICES' ? renderNotices() : renderSupport()}
            </KeyboardAvoidingView>

            {/* Category Modal */}
            {showCategoryModal && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.backgroundLight }]}>
                        <Text style={[styles.modalTitle, { color: colors.textDark }]}>What can we help you with?</Text>
                        <ScrollView>
                            {categories.map((c, i) => (
                                <TouchableOpacity key={i} style={[styles.catBtn, { borderBottomColor: colors.borderDark }]} onPress={() => handleCreateTicket(c)}>
                                    <Text style={[styles.catText, { color: colors.textDark }]}>{c}</Text>
                                    {(c.includes('menu') || c.includes('bill')) && (
                                        <Text style={styles.autoBadge}>⚡ Auto</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <PrimaryButton title="Cancel" type="outline" onPress={() => setShowCategoryModal(false)} style={{ marginTop: 20 }} />
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
    tab: { flex: 1, padding: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primaryRed },
    tabText: { fontSize: 15, color: COLORS.textMuted, fontWeight: 'bold' },
    activeTabText: { color: COLORS.primaryRed },
    listContainer: { padding: 20, paddingBottom: 40 },
    noticeCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, ...SHADOWS.light },
    noticeText: { fontSize: 16, lineHeight: 24 },
    timestamp: { fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
    loadMoreBtn: { alignItems: 'center', paddingVertical: 12 },
    loadMoreText: { color: COLORS.primaryRed, fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    supportTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
    supportSub: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: 30 },
    chatContainer: { flex: 1 },
    chatHeader: { padding: 15, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatHeaderText: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
    closedBadge: { backgroundColor: '#FEE2E2', color: '#991B1B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
    messageList: { padding: 15, paddingBottom: 10 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
    myBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primaryRed, borderBottomRightRadius: 4 },
    adminBubble: { alignSelf: 'flex-start', backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4 },
    myMsgText: { color: COLORS.white, fontSize: 15, lineHeight: 22 },
    adminMsgText: { color: '#111827', fontSize: 15, lineHeight: 22 },
    chatImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
    inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
    attachBtn: { marginRight: 8, padding: 4 },
    input: { flex: 1, borderWidth: 1, borderRadius: 25, paddingHorizontal: 15, height: 45 },
    closedFooter: { padding: 20, borderTopWidth: 1, alignItems: 'center' },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalContent: { width: '88%', maxHeight: '75%', borderRadius: 20, padding: 20, ...SHADOWS.light },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    catBtn: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    catText: { fontSize: 16, fontWeight: '500' },
    autoBadge: { backgroundColor: '#ECFDF5', color: '#065F46', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
});
