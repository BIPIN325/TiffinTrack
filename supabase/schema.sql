-- TiffinTrack Supabase Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 0: kitchens (The Master Providers)
CREATE TABLE kitchens (
    kitchen_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_name TEXT NOT NULL,
    kitchen_code TEXT UNIQUE NOT NULL, -- e.g. "SHARMA99"
    owner_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 1: rate_tiers
CREATE TABLE rate_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    price_per_meal NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: delivery_zones
CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    daily_delivery_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: users (Customers)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- Maps to auth.users id
    kitchen_id UUID REFERENCES kitchens(kitchen_id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    rate_tier_id UUID REFERENCES rate_tiers(id),
    zone_id UUID REFERENCES delivery_zones(id),
    is_lunch_active BOOLEAN DEFAULT false,
    is_dinner_active BOOLEAN DEFAULT false,
    status TEXT CHECK (status IN ('PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED')) DEFAULT 'PENDING',
    vacation_periods JSONB DEFAULT '[]'::jsonb, -- Array of {start_date, end_date}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 4: ledger_entries (Dynamic Khata)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    kitchen_id UUID REFERENCES kitchens(kitchen_id),
    meal_type TEXT CHECK (meal_type IN ('LUNCH', 'DINNER')),
    delivery_date DATE NOT NULL,
    status TEXT CHECK (status IN ('UNBILLED', 'BILLED', 'PAID', 'CANCELLED_FREE', 'CANCELLED_FEE')),
    amount NUMERIC NOT NULL,
    admin_status TEXT CHECK (admin_status IN ('PENDING', 'SENT', 'RECEIVED')) DEFAULT 'PENDING',
    user_status TEXT CHECK (user_status IN ('PENDING', 'RECEIVED', 'DISPUTE')) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 5: global_settings (Kitchen-level Rules)
CREATE TABLE global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE UNIQUE,
    accepting_new_subscriptions BOOLEAN DEFAULT true,
    kitchen_active_today BOOLEAN DEFAULT true,
    lunch_dispatch_time TIME,
    dinner_dispatch_time TIME,
    pause_buffer_hours INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Admins can only read/update their own kitchen's data
-- Note: Assuming auth.users contains app_metadata->>'role' = 'admin' and app_metadata->>'kitchen_id'
-- Read Users
CREATE POLICY "Admins read own users" ON users
FOR SELECT USING (
  auth.uid() IN (SELECT user_id FROM kitchens WHERE kitchen_id = users.kitchen_id)
);

-- Add your fully developed RLS, Triggers, and Cron jobs to Supabase dashboard from these baseline tables.

-- Table 6: notices (Inbox Broadcasts)
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    audience_type TEXT CHECK (audience_type IN ('ALL', 'ACTIVE', 'SUSPENDED')) DEFAULT 'ALL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 7: support_tickets (Priority Support Inbox)
CREATE TABLE support_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('Food Quality', 'Delivery is Late', 'Billing/Payment Issue', 'Other')),
    status TEXT CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 8: messages (1-on-1 Chat log)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    sender_type TEXT CHECK (sender_type IN ('ADMIN', 'USER')),
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Table 9: daily_menus (Dynamic Menu Integration)
CREATE TABLE daily_menus (
    menu_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"emoji":"🍛","name":"Dal Rice","qty":"1 bowl"},...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(kitchen_id, date)
);

ALTER TABLE daily_menus ENABLE ROW LEVEL SECURITY;

-- Additional columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Table 10: analytics_snapshots (Daily aggregation for dashboard charts)
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kitchen_id UUID REFERENCES kitchens(kitchen_id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    total_pauses INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(kitchen_id, snapshot_date)
);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

