-- Run this script in your Supabase SQL Editor to populate the database with mock customers!

ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;

-- Create default Admin Kitchen
INSERT INTO kitchens (kitchen_name, kitchen_code, owner_phone)
VALUES ('Sharma Tiffin Service', 'ADMIN99', '+919876543210')
ON CONFLICT (kitchen_code) DO NOTHING;

-- Insert Mock Users safely via DO block
DO $$
DECLARE
    k_id UUID;
    z_id UUID;
BEGIN
    SELECT kitchen_id INTO k_id FROM kitchens WHERE kitchen_code = 'ADMIN99' LIMIT 1;
    
    INSERT INTO delivery_zones (kitchen_id, zone_name) VALUES (k_id, 'Green Park') RETURNING id INTO z_id;

    -- Insert mock active users targeting this kitchen
    INSERT INTO users (kitchen_id, name, phone, zone_id, address, is_lunch_active, is_dinner_active, status)
    VALUES 
        (k_id, 'John Doe', '+910000000001', z_id, 'Flat 4A, Green Park', true, true, 'ACTIVE'),
        (k_id, 'Alice Smith', '+910000000002', z_id, 'Tower B, Office 2', true, false, 'ACTIVE'),
        (k_id, 'Bob Johnson', '+910000000003', z_id, 'Plot 18, Block D', true, true, 'ACTIVE'),
        (k_id, 'Neha Gupta', '+910000000004', z_id, 'Floor 3, Tech Park', true, false, 'ACTIVE'),
        (k_id, 'Rahul Varma', '+910000000005', z_id, 'Villa 12, Palm Springs', true, true, 'ACTIVE')
    ON CONFLICT (phone) DO NOTHING;
END $$;
