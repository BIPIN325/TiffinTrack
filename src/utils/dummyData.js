/**
 * Dummy data for Admin screens — used as fallback when Supabase returns empty.
 * Toggle USE_DUMMY_DATA to false once you have real users in the database.
 */

export const USE_DUMMY_DATA = true;

// ─── Shared Mock Store (Persists while app is open) ──────────────────────────
const MOCK_STORE = {
    rate_tiers: [
        { id: 'tier-01', tier_name: 'Student Veg', price_per_meal: 60, created_at: '2026-01-01T10:00:00Z' },
        { id: 'tier-02', tier_name: 'Standard', price_per_meal: 80, created_at: '2026-01-01T10:00:00Z' },
        { id: 'tier-03', tier_name: 'Premium', price_per_meal: 100, created_at: '2026-01-01T10:00:00Z' },
        { id: 'tier-04', tier_name: 'Corporate', price_per_meal: 120, created_at: '2026-01-01T10:00:00Z' },
        { id: 'tier-05', tier_name: 'Lite (Roti + Sabzi)', price_per_meal: 50, created_at: '2026-02-15T10:00:00Z' },
    ],
    users: [],
    pending_users: [],
};

// ─── Helper Functions ────────────────────────────────────────────────────────
export const getDummyTiers = () => MOCK_STORE.rate_tiers;
export const addDummyTier = (tier) => {
    MOCK_STORE.rate_tiers.push(tier);
    return MOCK_STORE.rate_tiers;
};
export const updateDummyTier = (id, updates) => {
    MOCK_STORE.rate_tiers = MOCK_STORE.rate_tiers.map(t => t.id === id ? { ...t, ...updates } : t);
    return MOCK_STORE.rate_tiers;
};
export const deleteDummyTier = (id) => {
    MOCK_STORE.rate_tiers = MOCK_STORE.rate_tiers.filter(t => t.id !== id);
    return MOCK_STORE.rate_tiers;
};

// ─── Original Constants (Still exported for compatibility) ───────────────────
export const DUMMY_RATE_TIERS = MOCK_STORE.rate_tiers;

// ─── Delivery Zones ─────────────────────────────────────────────────────────────
export const DUMMY_ZONES = [
    { id: 'zone-01', zone_name: 'Sanpada', daily_delivery_fee: 0 },
    { id: 'zone-02', zone_name: 'Powai', daily_delivery_fee: 10 },
    { id: 'zone-03', zone_name: 'Dombivli', daily_delivery_fee: 15 },
    { id: 'zone-04', zone_name: 'Andheri', daily_delivery_fee: 10 },
    { id: 'zone-05', zone_name: 'Airoli', daily_delivery_fee: 0 },
    { id: 'zone-06', zone_name: 'Vashi', daily_delivery_fee: 0 },
    { id: 'zone-07', zone_name: 'Nerul', daily_delivery_fee: 5 },
    { id: 'zone-08', zone_name: 'Dadar', daily_delivery_fee: 20 },
];

// ─── Users (Customers) ─────────────────────────────────────────────────────────
export const DUMMY_USERS = [
    {
        user_id: 'dummy-001',
        name: 'Bipin Desai',
        phone: '+91 98765 43210',
        address: 'B-12, Sanpada CHS, Sector 5, Sanpada',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: true,
        is_dinner_active: true,
        created_at: '2026-02-15T10:00:00Z',
        rate_tier_id: 'tier-02',
        zone_id: 'zone-01',
        rate_tiers: { tier_name: 'Standard', price_per_meal: 80 },
        delivery_zones: { zone_name: 'Sanpada' },
    },
    {
        user_id: 'dummy-002',
        name: 'Priya Sharma',
        phone: '+91 99887 76543',
        address: 'A-304, Hiranandani, Powai',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: true,
        is_dinner_active: false,
        created_at: '2026-02-20T10:00:00Z',
        rate_tier_id: 'tier-03',
        zone_id: 'zone-02',
        rate_tiers: { tier_name: 'Premium', price_per_meal: 100 },
        delivery_zones: { zone_name: 'Powai' },
    },
    {
        user_id: 'dummy-003',
        name: 'Rahul Mehta',
        phone: '+91 87654 32109',
        address: 'C-701, Lodha Palava, Dombivli East',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: true,
        is_dinner_active: true,
        created_at: '2026-03-01T10:00:00Z',
        rate_tier_id: 'tier-02',
        zone_id: 'zone-03',
        rate_tiers: { tier_name: 'Standard', price_per_meal: 80 },
        delivery_zones: { zone_name: 'Dombivli' },
    },
    {
        user_id: 'dummy-004',
        name: 'Anjali Kulkarni',
        phone: '+91 91234 56789',
        address: '15, SV Road, Andheri West',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: false,
        is_dinner_active: true,
        created_at: '2026-03-05T10:00:00Z',
        rate_tier_id: 'tier-05',
        zone_id: 'zone-04',
        rate_tiers: { tier_name: 'Lite (Roti + Sabzi)', price_per_meal: 50 },
        delivery_zones: { zone_name: 'Andheri' },
    },
    {
        user_id: 'dummy-005',
        name: 'Vikram Joshi',
        phone: '+91 70123 45678',
        address: 'D-202, Airoli Heights, Airoli',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: true,
        is_dinner_active: true,
        created_at: '2026-03-10T10:00:00Z',
        rate_tier_id: 'tier-02',
        zone_id: 'zone-05',
        rate_tiers: { tier_name: 'Standard', price_per_meal: 80 },
        delivery_zones: { zone_name: 'Airoli' },
    },
    {
        user_id: 'dummy-006',
        name: 'Meera Patil',
        phone: '+91 81234 67890',
        address: '8-B, Palm Beach Road, Vashi',
        avatar_url: null,
        status: 'ACTIVE',
        is_lunch_active: true,
        is_dinner_active: false,
        created_at: '2026-03-12T10:00:00Z',
        rate_tier_id: 'tier-02',
        zone_id: 'zone-06',
        rate_tiers: { tier_name: 'Standard', price_per_meal: 80 },
        delivery_zones: { zone_name: 'Vashi' },
    },
    {
        user_id: 'dummy-007',
        name: 'Arjun Nair',
        phone: '+91 99001 12233',
        address: 'E-105, Sagar Complex, Nerul',
        avatar_url: null,
        status: 'PAUSED',
        is_lunch_active: true,
        is_dinner_active: true,
        created_at: '2026-03-15T10:00:00Z',
        rate_tier_id: 'tier-03',
        zone_id: 'zone-07',
        rate_tiers: { tier_name: 'Premium', price_per_meal: 100 },
        delivery_zones: { zone_name: 'Nerul' },
    },
    {
        user_id: 'dummy-008',
        name: 'Sneha Iyer',
        phone: '+91 77665 54433',
        address: '22, Tilak Road, Dadar',
        avatar_url: null,
        status: 'SUSPENDED',
        is_lunch_active: false,
        is_dinner_active: false,
        created_at: '2026-01-10T10:00:00Z',
        rate_tier_id: 'tier-02',
        zone_id: 'zone-08',
        rate_tiers: { tier_name: 'Standard', price_per_meal: 80 },
        delivery_zones: { zone_name: 'Dadar' },
    },
];

export const DUMMY_PENDING_USERS = [
    {
        user_id: 'dummy-p01',
        name: 'Rohan Gupta',
        phone: '+91 88776 65544',
        address: 'F-9, Sector 21, Kharghar',
        status: 'PENDING',
    },
    {
        user_id: 'dummy-p02',
        name: 'Kavita Reddy',
        phone: '+91 99011 22334',
        address: '3rd Floor, Linking Road, Bandra West',
        status: 'PENDING',
    },
    {
        user_id: 'dummy-p03',
        name: 'Deepak Verma',
        phone: '+91 88001 99223',
        address: '12-A, Marine Drive, Churchgate',
        status: 'PENDING',
    },
];

// ─── Ledger Entries (per user) ──────────────────────────────────────────────────
export const DUMMY_LEDGER_ENTRIES = {
    'dummy-001': [
        { id: 'led-001', meal_type: 'LUNCH', delivery_date: '2026-04-01', status: 'UNBILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-002', meal_type: 'DINNER', delivery_date: '2026-04-01', status: 'UNBILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-003', meal_type: 'LUNCH', delivery_date: '2026-03-31', status: 'BILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-004', meal_type: 'DINNER', delivery_date: '2026-03-31', status: 'BILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-005', meal_type: 'LUNCH', delivery_date: '2026-03-30', status: 'BILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-c01', meal_type: 'LUNCH', delivery_date: '2026-03-28', status: 'UNBILLED', amount: -200, admin_status: 'SENT', user_status: 'RECEIVED', note: 'Loyalty discount' },
    ],
    'dummy-002': [
        { id: 'led-006', meal_type: 'LUNCH', delivery_date: '2026-04-01', status: 'UNBILLED', amount: 100, admin_status: 'SENT', user_status: 'DISPUTE' },
        { id: 'led-007', meal_type: 'LUNCH', delivery_date: '2026-03-31', status: 'BILLED', amount: 100, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-008', meal_type: 'LUNCH', delivery_date: '2026-03-30', status: 'BILLED', amount: 100, admin_status: 'SENT', user_status: 'RECEIVED' },
    ],
    'dummy-008': [
        { id: 'led-009', meal_type: 'LUNCH', delivery_date: '2026-03-15', status: 'BILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-010', meal_type: 'LUNCH', delivery_date: '2026-03-14', status: 'BILLED', amount: 80, admin_status: 'SENT', user_status: 'RECEIVED' },
        { id: 'led-c02', meal_type: 'LUNCH', delivery_date: '2026-03-10', status: 'UNBILLED', amount: -500, admin_status: 'SENT', user_status: 'RECEIVED', note: 'Refund for overcharge' },
    ],
};

// ─── Dispatch Queue ─────────────────────────────────────────────────────────────
export const DUMMY_DISPATCH = [
    { id: 'dummy-001', name: 'Bipin Desai', address: 'Sanpada', phone: '+91 98765 43210', status: 'PENDING' },
    { id: 'dummy-002', name: 'Priya Sharma', address: 'Powai', phone: '+91 99887 76543', status: 'PENDING' },
    { id: 'dummy-003', name: 'Rahul Mehta', address: 'Dombivli East', phone: '+91 87654 32109', status: 'SENT' },
    { id: 'dummy-004', name: 'Anjali Kulkarni', address: 'Andheri West', phone: '+91 91234 56789', status: 'PENDING' },
    { id: 'dummy-005', name: 'Vikram Joshi', address: 'Airoli', phone: '+91 70123 45678', status: 'PENDING' },
    { id: 'dummy-006', name: 'Meera Patil', address: 'Vashi', phone: '+91 81234 67890', status: 'SENT' },
    { id: 'dummy-007', name: 'Arjun Nair', address: 'Nerul', phone: '+91 99001 12233', status: 'PAUSED' },
];

// ─── Map / Route Deliveries ─────────────────────────────────────────────────────
export const DUMMY_DELIVERIES = [
    { id: 'del-01', name: 'Bipin Desai', address: 'B-12, Sanpada CHS, Sector 5, Sanpada', phone: '+91 98765 43210', area: 'Sanpada', delivered: false },
    { id: 'del-02', name: 'Meera Patil', address: '8-B, Palm Beach Road, Vashi', phone: '+91 81234 67890', area: 'Vashi', delivered: false },
    { id: 'del-03', name: 'Arjun Nair', address: 'E-105, Sagar Complex, Nerul', phone: '+91 99001 12233', area: 'Nerul', delivered: true },
    { id: 'del-04', name: 'Vikram Joshi', address: 'D-202, Airoli Heights, Airoli', phone: '+91 70123 45678', area: 'Airoli', delivered: false },
    { id: 'del-05', name: 'Priya Sharma', address: 'A-304, Hiranandani, Powai', phone: '+91 99887 76543', area: 'Powai', delivered: true },
    { id: 'del-06', name: 'Rahul Mehta', address: 'C-701, Lodha Palava, Dombivli East', phone: '+91 87654 32109', area: 'Dombivli', delivered: false },
    { id: 'del-07', name: 'Anjali Kulkarni', address: '15, SV Road, Andheri West', phone: '+91 91234 56789', area: 'Andheri', delivered: true },
];

// ─── Support Tickets (Inbox) ────────────────────────────────────────────────────
export const DUMMY_TICKETS = [
    { id: 'tkt-01', user: 'Priya Sharma', address: 'Powai', category: 'Delivery is Late', rawCategory: 'Delivery is Late', status: 'OPEN', priority: 'RED' },
    { id: 'tkt-02', user: 'Rahul Mehta', address: 'Dombivli East', category: 'Food Quality', rawCategory: 'Food Quality', status: 'OPEN', priority: 'YELLOW' },
    { id: 'tkt-03', user: 'Vikram Joshi', address: 'Airoli', category: 'Missing Item', rawCategory: 'Missing Item', status: 'OPEN', priority: 'GRAY' },
    { id: 'tkt-04', user: 'Meera Patil', address: 'Vashi', category: 'Delivery is Late', rawCategory: 'Delivery is Late', status: 'CLOSED', priority: 'RED' },
    { id: 'tkt-05', user: 'Bipin Desai', address: 'Sanpada', category: 'Billing Inquiry', rawCategory: 'Billing Inquiry', status: 'OPEN', priority: 'GRAY' },
];

export const DUMMY_MESSAGES = {
    'tkt-01': [
        { id: 'm01', ticket_id: 'tkt-01', sender_type: 'USER', text: 'My lunch hasn\'t arrived yet. It\'s been 2 hours!', timestamp: '2026-04-01T12:00:00Z' },
        { id: 'm02', ticket_id: 'tkt-01', sender_type: 'ADMIN', text: '🚀 5 mins away!', timestamp: '2026-04-01T12:05:00Z' },
        { id: 'm03', ticket_id: 'tkt-01', sender_type: 'USER', text: 'Okay, I\'ll wait. Thank you.', timestamp: '2026-04-01T12:06:00Z' },
    ],
    'tkt-02': [
        { id: 'm04', ticket_id: 'tkt-02', sender_type: 'USER', text: 'The dal was too watery today. Please fix this.', timestamp: '2026-04-01T13:00:00Z' },
        { id: 'm05', ticket_id: 'tkt-02', sender_type: 'USER', text: 'Also roti was cold.', timestamp: '2026-04-01T13:01:00Z' },
    ],
    'tkt-03': [
        { id: 'm06', ticket_id: 'tkt-03', sender_type: 'USER', text: 'I was supposed to get salad but it wasn\'t in the tiffin.', timestamp: '2026-04-01T13:30:00Z' },
    ],
    'tkt-05': [
        { id: 'm07', ticket_id: 'tkt-05', sender_type: 'USER', text: 'I was charged for Sunday but the kitchen was closed. Can I get a credit?', timestamp: '2026-04-01T09:00:00Z' },
        { id: 'm08', ticket_id: 'tkt-05', sender_type: 'ADMIN', text: '💳 Please check the Ledger tab to view your bill details.', timestamp: '2026-04-01T09:15:00Z' },
        { id: 'm09', ticket_id: 'tkt-05', sender_type: 'USER', text: 'I checked but the Sunday charge is still there.', timestamp: '2026-04-01T09:20:00Z' },
    ],
};

// ─── Analytics / Billing ────────────────────────────────────────────────────────
export const DUMMY_STATS = {
    totalActive: 6,
    totalMeals: 342,
    revenue: 27360,
    churnRate: 2.3,
    mrr: 27360,
};

export const DUMMY_DISPUTES = [
    {
        id: 'disp-01',
        delivery_date: '2026-04-01',
        meal_type: 'LUNCH',
        user_status: 'DISPUTE',
        users: { name: 'Priya Sharma', phone: '+91 99887 76543', address: 'Powai' },
    },
    {
        id: 'disp-02',
        delivery_date: '2026-03-31',
        meal_type: 'DINNER',
        user_status: 'DISPUTE',
        users: { name: 'Rahul Mehta', phone: '+91 87654 32109', address: 'Dombivli East' },
    },
];

export const DUMMY_UNPAID_USERS = [
    { user_id: 'dummy-008', name: 'Sneha Iyer', phone: '+91 77665 54433' },
];
