import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    ScrollView, TextInput, FlatList, KeyboardAvoidingView, Platform, Image, Alert
} from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../../utils/constants';
import { supabase } from '../../services/supabase';
import PrimaryButton from '../../components/PrimaryButton';
import { USE_DUMMY_DATA, DUMMY_TICKETS, DUMMY_MESSAGES } from '../../utils/dummyData';


const PAGE_SIZE = 20;

const CANNED_RESPONSES = [
    "🚀 5 mins away!",
    "👨‍🍳 We've noted your feedback and will improve quality tomorrow.",
    "✅ Issue resolved. Thank you for your patience!",
    "🌧️ Delivery delayed due to heavy rain. Sorry for the inconvenience.",
    "💳 Please check the Ledger tab to view your bill details.",
];

const PRIORITY_MAP = {
    'Delivery is Late': 'RED',
    'Food Quality': 'YELLOW',
};

export default function AdminInbox() {
    const [tickets, setTickets] = useState([]);
    const [activeTicket, setActiveTicket] = useState(null);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [messages, setMessages] = useState([]);
    const [replyMsg, setReplyMsg] = useState('');
    const [msgPage, setMsgPage] = useState(0);
    const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
    const flatListRef = useRef(null);

    // ─── Fetch Tickets ─────────────────────────────────────────────────────────
    const fetchTickets = async () => {
        const { data } = await supabase
            .from('support_tickets')
            .select('*, users(name, address)')
            .order('created_at', { ascending: false });

        if (data) {
            const formatted = data.map(t => ({
                id: t.ticket_id,
                user: t.users?.name || 'Unknown User',
                address: t.users?.address || '',
                category: t.category,
                rawCategory: t.category,
                status: t.status,
                priority: PRIORITY_MAP[t.category] || 'GRAY',
            }));
            // Sort: RED first, YELLOW second, GRAY last
            formatted.sort((a, b) => {
                const order = { RED: 0, YELLOW: 1, GRAY: 2 };
                return order[a.priority] - order[b.priority];
            });
            if (formatted.length > 0) {
                setTickets(formatted);
            } else if (USE_DUMMY_DATA) {
                setTickets(DUMMY_TICKETS);
            }
        } else if (USE_DUMMY_DATA) {
            setTickets(DUMMY_TICKETS);
        }
    };

    // ─── Fetch Messages (paginated) ────────────────────────────────────────────
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
        if (reversed.length > 0) {
            if (page === 0) setMessages(reversed);
            else setMessages(prev => [...reversed, ...prev]);
        } else if (USE_DUMMY_DATA && page === 0) {
            setMessages(DUMMY_MESSAGES[ticketId] || []);
        }
        setHasMoreMsgs((data?.length || 0) === PAGE_SIZE);
        setMsgPage(page);
    };

    // ─── Realtime subscriptions ────────────────────────────────────────────────
    useEffect(() => {
        fetchTickets();
        // registerAdminNotifications();

        const ticketChannel = supabase.channel('admin_tickets')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
                fetchTickets();
                const cat = payload.new.category;
                if (PRIORITY_MAP[cat] === 'RED') {
                    Alert.alert('🚨 Urgent Ticket!', `New "${cat}" issue raised. Tap to view.`);
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
            .subscribe();

        return () => supabase.removeChannel(ticketChannel);
    }, []);

    useEffect(() => {
        if (!activeTicket?.id) return;

        const msgChannel = supabase.channel(`admin_msg_${activeTicket.id}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'messages',
                filter: `ticket_id=eq.${activeTicket.id}`
            }, (payload) => {
                if (payload.new.sender_type === 'USER') {
                    setMessages(prev => [...prev, payload.new]);
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(msgChannel);
    }, [activeTicket?.id]);



    // ─── Broadcast ────────────────────────────────────────────────────────────
    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        const { error } = await supabase.from('notices').insert({
            message: broadcastMsg,
            audience_type: 'ALL'
        });
        if (!error) {
            alert(`📣 Megaphone: "${broadcastMsg}" sent successfully to all customers.`);
            setBroadcastMsg('');
        }
    };

    // ─── Reply ────────────────────────────────────────────────────────────────
    const handleReply = async () => {
        if (!replyMsg.trim() || !activeTicket) return;
        const { error } = await supabase.from('messages').insert({
            ticket_id: activeTicket.id,
            sender_type: 'ADMIN',
            text: replyMsg
        });
        if (!error) {
            setReplyMsg('');
            fetchMessages(activeTicket.id, 0);
        }
    };

    // ─── Close Ticket ─────────────────────────────────────────────────────────
    const handleCloseTicket = async () => {
        if (!activeTicket) return;
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: 'CLOSED' })
            .eq('ticket_id', activeTicket.id);
        if (!error) {
            setActiveTicket(null);
            setMessages([]);
            fetchTickets();
        }
    };

    const openTicketDetails = (t) => {
        setActiveTicket(t);
        fetchMessages(t.id, 0);
    };

    // ─── Render: Megaphone ────────────────────────────────────────────────────
    const renderMegaphone = () => (
        <View style={styles.megaphoneCard}>
            <Text style={styles.sectionTitle}>📣 The Megaphone</Text>
            <Text style={styles.muted}>Blast a notice to all customers instantly. No more 50 phone calls!</Text>
            <TextInput
                style={styles.broadcastInput}
                placeholder="e.g. Heavy rain today. Deliveries delayed by 30 mins."
                placeholderTextColor={COLORS.textMuted}
                value={broadcastMsg}
                onChangeText={setBroadcastMsg}
                multiline
            />
            <PrimaryButton title="🚀 Blast to All Customers" onPress={handleBroadcast} style={{ marginTop: 10 }} />
        </View>
    );

    // ─── Render: Active Chat ──────────────────────────────────────────────────
    const renderChat = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <View style={{ flex: 1, backgroundColor: COLORS.glassBackground, borderRadius: 16, marginTop: 15 }}>
                {/* Header */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => { setActiveTicket(null); setMessages([]); }}>
                        <Text style={{ color: COLORS.primaryRed, fontWeight: 'bold', fontSize: 15 }}>{'← Back'}</Text>
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={styles.chatName}>{activeTicket.user}</Text>
                        {activeTicket.address ? <Text style={styles.chatAddress}>{activeTicket.address}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={handleCloseTicket}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Close</Text>
                    </TouchableOpacity>
                </View>

                {/* Load More */}
                {hasMoreMsgs && (
                    <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchMessages(activeTicket.id, msgPage + 1)}>
                        <Text style={styles.loadMoreText}>↑ Load older messages</Text>
                    </TouchableOpacity>
                )}

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id?.toString()}
                    contentContainerStyle={{ padding: 15 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    renderItem={({ item }) => (
                        <View style={[styles.bubble, item.sender_type === 'ADMIN' ? styles.myBubble : styles.userBubble]}>
                            {item.image_url ? (
                                <Image source={{ uri: item.image_url }} style={styles.chatImage} resizeMode="cover" />
                            ) : null}
                            <Text style={item.sender_type === 'ADMIN' ? styles.myMsgText : styles.userMsgText}>{item.text}</Text>
                        </View>
                    )}
                />

                {/* Canned Responses */}
                {activeTicket.status === 'OPEN' && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cannedRow}
                    >
                        {CANNED_RESPONSES.map((r, i) => (
                            <TouchableOpacity key={i} style={styles.cannedBtn} onPress={() => setReplyMsg(r)}>
                                <Text style={styles.cannedText}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Reply Input */}
                {activeTicket.status === 'OPEN' && (
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder={`Reply to ${activeTicket.user}...`}
                            placeholderTextColor={COLORS.textMuted}
                            value={replyMsg}
                            onChangeText={setReplyMsg}
                        />
                        <PrimaryButton title="Send" onPress={handleReply} style={{ marginLeft: 10 }} />
                    </View>
                )}
            </View>
        </KeyboardAvoidingView>
    );

    // ─── Render: Ticket List ──────────────────────────────────────────────────
    const openCount = tickets.filter(t => t.status === 'OPEN').length;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                {renderMegaphone()}

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 8 }}>
                    <Text style={styles.sectionTitle}>📥 Priority Support Inbox</Text>
                    {openCount > 0 && (
                        <View style={styles.openBadge}>
                            <Text style={styles.openBadgeText}>{openCount} open</Text>
                        </View>
                    )}
                </View>

                {activeTicket ? renderChat() : (
                    tickets.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Text style={{ fontSize: 40 }}>🎉</Text>
                            <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>No tickets! Inbox Zero achieved.</Text>
                        </View>
                    ) : tickets.map(t => (
                        <TouchableOpacity key={t.id} style={styles.ticketCard} onPress={() => openTicketDetails(t)}>
                            <View style={styles.ticketLeft}>
                                <View style={[
                                    styles.priorityDot,
                                    t.priority === 'RED' ? { backgroundColor: '#EF4444' } :
                                    t.priority === 'YELLOW' ? { backgroundColor: '#F59E0B' } :
                                    { backgroundColor: '#9CA3AF' }
                                ]} />
                                <View>
                                    <Text style={styles.ticketUser}>{t.user}</Text>
                                    <Text style={styles.ticketCategory}>{t.category}</Text>
                                    {t.address ? <Text style={styles.ticketAddress}>📍 {t.address}</Text> : null}
                                </View>
                            </View>
                            <Text style={[styles.ticketStatus, t.status === 'CLOSED' && { color: COLORS.successGreen }]}>
                                {t.status}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundDark },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textLight },
    muted: { color: COLORS.textMuted, fontSize: 13, marginBottom: 15, marginTop: 4 },
    megaphoneCard: { backgroundColor: COLORS.glassBackground, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderDark },
    broadcastInput: { backgroundColor: COLORS.backgroundDark, borderWidth: 1, borderColor: COLORS.primaryRed, borderRadius: 12, padding: 15, color: COLORS.textLight, minHeight: 80, textAlignVertical: 'top' },
    openBadge: { backgroundColor: '#FEE2E2', marginLeft: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    openBadgeText: { color: '#EF4444', fontWeight: 'bold', fontSize: 12 },
    ticketCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.glassBackground, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderDark, marginBottom: 10 },
    ticketLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    priorityDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15, marginTop: 4 },
    ticketUser: { fontSize: 16, color: COLORS.textLight, fontWeight: 'bold' },
    ticketCategory: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
    ticketAddress: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    ticketStatus: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.borderDark },
    chatName: { fontSize: 16, color: COLORS.textLight, fontWeight: 'bold' },
    chatAddress: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    loadMoreBtn: { alignItems: 'center', paddingVertical: 10 },
    loadMoreText: { color: COLORS.primaryRed, fontWeight: '600', fontSize: 13 },
    cannedRow: { paddingHorizontal: 15, paddingVertical: 10, gap: 8 },
    cannedBtn: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    cannedText: { fontSize: 13, color: '#374151', fontWeight: '500' },
    inputRow: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: COLORS.borderDark },
    input: { flex: 1, backgroundColor: COLORS.backgroundDark, borderWidth: 1, borderColor: COLORS.borderDark, borderRadius: 25, paddingHorizontal: 15, height: 45, color: COLORS.textLight },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
    myBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primaryRed, borderBottomRightRadius: 4 },
    userBubble: { alignSelf: 'flex-start', backgroundColor: '#374151', borderBottomLeftRadius: 4 },
    myMsgText: { color: COLORS.white, fontSize: 15, lineHeight: 22 },
    userMsgText: { color: COLORS.textLight, fontSize: 15, lineHeight: 22 },
    chatImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 6 },
});
