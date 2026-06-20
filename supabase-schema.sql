-- =============================================
-- DEWA (دەوا) — Supabase Database Schema
-- =============================================

-- 1. PROFILES (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'REP' CHECK (role IN ('ADMIN', 'MANAGER', 'REP')),
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sku TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT '',
  price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  unit_type TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  expiry_date TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  is_sample BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 3. REPS
CREATE TABLE IF NOT EXISTS reps (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 4. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  owner TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  type TEXT DEFAULT 'PHARMACY' CHECK (type IN ('PHARMACY', 'HOSPITAL', 'CLINIC')),
  rep_id TEXT DEFAULT '',
  payment_terms TEXT DEFAULT 'IMMEDIATE',
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 5. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  bonus_pct NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 6. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  contact TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  country TEXT DEFAULT '',
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 7. ORDERS (items stored as JSONB array)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT NOT NULL DEFAULT '',
  client_id TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  rep_id TEXT DEFAULT '',
  rep_name TEXT DEFAULT '',
  warehouse_id TEXT,
  warehouse_name TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'PENDING',
  routing_mode TEXT DEFAULT 'DIRECT',
  bonus_notation TEXT DEFAULT '',
  total_bonus_pct NUMERIC DEFAULT 0,
  warehouse_bonus_pct NUMERIC DEFAULT 0,
  rep_bonus_pct NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 8. DELIVERIES
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT DEFAULT '',
  order_number TEXT DEFAULT '',
  type TEXT DEFAULT 'DIRECT',
  driver TEXT DEFAULT '',
  driver_phone TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  status TEXT DEFAULT 'PENDING',
  items TEXT DEFAULT '',
  dispatched_at TEXT DEFAULT '',
  delivered_at TEXT DEFAULT '',
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 9. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT DEFAULT 'INCOME' CHECK (type IN ('INCOME', 'EXPENSE')),
  description TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  method TEXT DEFAULT 'CASH',
  related_order_id TEXT,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- 10. COMPANY SETTINGS (single row)
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT DEFAULT 'دەوا فارما',
  name_en TEXT DEFAULT 'Dewa Pharma',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT DEFAULT '',
  currency TEXT DEFAULT 'IQD',
  language TEXT DEFAULT 'ckb',
  logo TEXT DEFAULT '',
  profile_pic TEXT DEFAULT ''
);

-- 11. INVOICE TEMPLATES
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL DEFAULT '',
  blocks JSONB DEFAULT '[]'::jsonb,
  show_bonus_col BOOLEAN DEFAULT true,
  default_note TEXT DEFAULT '',
  default_terms TEXT DEFAULT '',
  default_discount NUMERIC DEFAULT 0,
  created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can do everything (company-internal app)
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['profiles','products','clients','reps','warehouses','suppliers','orders','deliveries','transactions','company_settings','invoice_templates'])
  LOOP
    EXECUTE format('CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- =============================================
-- SEED DATA
-- =============================================

-- Default company settings
INSERT INTO company_settings (id, name, name_en, phone, email, city, address, currency, language)
VALUES (1, 'دەوا فارما', 'Dewa Pharma', '0770 000 1234', 'info@dewapharma.com', 'سلێمانی', 'شەقامی سالم، تاوەری ئازادی، نهۆم ٣', 'IQD', 'ckb')
ON CONFLICT (id) DO NOTHING;

-- Seed products
INSERT INTO products (id, name, sku, category, price, stock, unit_type, origin, supplier, expiry_date, batch_number, is_sample, is_active, created_at) VALUES
('p1', 'پاراسیتامۆل ٥٠٠مغ', 'PAR-500', 'ئازارکوژ', 5000, 2400, 'پاکەت', 'تورکیا 🇹🇷', 'مەدیکۆ تورکیا', '2026-08-15', 'BT-2024-001', false, true, '2025-01-10'),
('p2', 'ئەمۆکسیسیلین ٥٠٠مغ', 'AMX-500', 'ئەنتیبایۆتیک', 12000, 1200, 'پاکەت', 'فەرەنسا 🇫🇷', 'فارما فرانسا', '2026-05-20', 'BT-2024-002', false, true, '2025-01-10'),
('p3', 'ئۆمیپرازۆل ٢٠مغ', 'OMP-020', 'گەدە و هەرس', 8500, 800, 'پاکەت', 'ئوردن 🇯🇴', 'جۆردان فارما', '2026-12-01', 'BT-2024-003', false, true, '2025-02-01'),
('p4', 'مێتفۆرمین ٨٥٠مغ', 'MET-850', 'شەکرە', 7500, 650, 'پاکەت', 'هندستان 🇮🇳', 'ئینتا فارما', '2027-03-10', 'BT-2024-004', false, true, '2025-02-15'),
('p5', 'ئازیترۆمایسین ٥٠٠مغ', 'AZT-500', 'ئەنتیبایۆتیک', 15000, 420, 'پاکەت', 'تورکیا 🇹🇷', 'مەدیکۆ تورکیا', '2026-09-30', 'BT-2024-005', false, true, '2025-03-01'),
('p6', 'ئیبوپرۆفین ٤٠٠مغ', 'IBU-400', 'ئازارکوژ', 6000, 1800, 'پاکەت', 'ئوردن 🇯🇴', 'جۆردان فارما', '2027-01-15', 'BT-2024-006', false, true, '2025-03-10'),
('p7', 'سیپرۆفلۆکساسین ٥٠٠مغ', 'CIP-500', 'ئەنتیبایۆتیک', 11000, 350, 'پاکەت', 'هندستان 🇮🇳', 'ئینتا فارما', '2026-07-20', 'BT-2024-007', false, true, '2025-04-01'),
('p8', 'ڤیتامین C ١٠٠٠مغ', 'VTC-1000', 'ڤیتامین', 4500, 3000, 'بوتل', 'سوویسرا 🇨🇭', 'سوویسرا مەد', '2027-06-01', 'BT-2024-008', false, true, '2025-04-15')
ON CONFLICT (id) DO NOTHING;

-- Seed reps
INSERT INTO reps (id, name, phone, city, is_active, created_at) VALUES
('r1', 'ئاکۆ مەحموود', '0770 111 2222', 'سلێمانی', true, '2025-01-01'),
('r2', 'هێمن ئەحمەد', '0750 222 3333', 'سلێمانی', true, '2025-01-01'),
('r3', 'شادی عومەر', '0770 333 4444', 'هەولێر', true, '2025-01-15'),
('r4', 'دانا ڕەسوول', '0750 444 5555', 'دهۆک', true, '2025-02-01'),
('r5', 'ڕێبوار کەریم', '0770 555 6666', 'کەرکوک', true, '2025-02-15')
ON CONFLICT (id) DO NOTHING;

-- Seed clients
INSERT INTO clients (id, name, owner, phone, city, type, rep_id, payment_terms, balance, is_active, created_at) VALUES
('c1', 'دەرمانخانەی ئازادی', 'ئاراس عەبدوڵا', '0770 123 4567', 'سلێمانی', 'PHARMACY', 'r1', 'NET_30', 2500000, true, '2025-01-10'),
('c2', 'نەخۆشخانەی سلێمانی', 'د. کارزان محەمەد', '0750 234 5678', 'سلێمانی', 'HOSPITAL', 'r2', 'NET_30', 8200000, true, '2025-01-15'),
('c3', 'کلینیکی هەنار', 'د. ڕۆژان عومەر', '0770 345 6789', 'هەولێر', 'CLINIC', 'r3', 'IMMEDIATE', 1200000, true, '2025-02-01'),
('c4', 'دەرمانخانەی ڕۆژ', 'سەرهەنگ عەلی', '0750 456 7890', 'دهۆک', 'PHARMACY', 'r4', 'IMMEDIATE', 0, true, '2025-02-10'),
('c5', 'دەرمانخانەی ڕۆشنا', 'نازدار حەسەن', '0770 567 8901', 'کەرکوک', 'PHARMACY', 'r5', 'NET_15', 3400000, true, '2025-03-01'),
('c6', 'نەخۆشخانەی هەولێر', 'د. ئاسۆ کەریم', '0750 678 9012', 'هەولێر', 'HOSPITAL', 'r1', 'NET_30', 5600000, true, '2025-03-15')
ON CONFLICT (id) DO NOTHING;

-- Seed warehouses
INSERT INTO warehouses (id, name, city, address, contact, phone, bonus_pct, is_active, created_at) VALUES
('w1', 'کۆگای هیمۆ لاب', 'سلێمانی', 'شەقامی سالم، نزیک میدیای شار', 'هاوڕێ محەمەد', '0770 100 2000', 20, true, '2025-01-01'),
('w2', 'کۆگای ڕۆشنبیری', 'هەولێر', 'شەقامی ٦٠ مەتری', 'عەلی جەعفەر', '0750 200 3000', 15, true, '2025-01-01'),
('w3', 'کۆگای سەلامەتی', 'دهۆک', 'شەقامی بارزان', 'ئازاد ئەحمەد', '0770 300 4000', 18, true, '2025-02-01')
ON CONFLICT (id) DO NOTHING;

-- Seed suppliers
INSERT INTO suppliers (id, name, contact, phone, email, country, balance, is_active, created_at) VALUES
('s1', 'فارما فرانسا', 'Jean Dupont', '+33 1 4567 8901', 'orders@pharmafrance.com', 'فەرەنسا 🇫🇷', 45000000, true, '2025-01-01'),
('s2', 'مەدیکۆ تورکیا', 'Ahmet Yilmaz', '+90 212 345 6789', 'sales@medicoturkey.com', 'تورکیا 🇹🇷', 32000000, true, '2025-01-01'),
('s3', 'جۆردان فارما', 'خالد المحمد', '+962 6 123 4567', 'info@jordanpharma.com', 'ئوردن 🇯🇴', 15000000, true, '2025-01-15'),
('s4', 'ئینتا فارما', 'Raj Patel', '+91 22 4567 8901', 'export@intapharma.in', 'هندستان 🇮🇳', 28000000, true, '2025-02-01')
ON CONFLICT (id) DO NOTHING;

-- Seed orders
INSERT INTO orders (id, order_number, client_id, client_name, rep_id, rep_name, warehouse_id, warehouse_name, items, status, routing_mode, bonus_notation, total_bonus_pct, warehouse_bonus_pct, rep_bonus_pct, total_amount, notes, created_at) VALUES
('o1', 'ORD-001', 'c1', 'دەرمانخانەی ئازادی', 'r1', 'ئاکۆ مەحموود', 'w1', 'کۆگای هیمۆ لاب', '[{"productId":"p1","productName":"پاراسیتامۆل ٥٠٠مغ","quantity":100,"bonusQty":30,"unitPrice":5000}]', 'PAID', 'WAREHOUSE', '100+50', 50, 20, 30, 500000, '', '2025-10-28'),
('o2', 'ORD-002', 'c2', 'نەخۆشخانەی سلێمانی', 'r2', 'هێمن ئەحمەد', 'w2', 'کۆگای ڕۆشنبیری', '[{"productId":"p2","productName":"ئەمۆکسیسیلین ٥٠٠مغ","quantity":200,"bonusQty":50,"unitPrice":12000}]', 'SHIPPED', 'WAREHOUSE', '200+40', 40, 15, 25, 2400000, '', '2025-10-29'),
('o3', 'ORD-003', 'c3', 'کلینیکی هەنار', 'r3', 'شادی عومەر', NULL, NULL, '[{"productId":"p3","productName":"ئۆمیپرازۆل ٢٠مغ","quantity":80,"bonusQty":14,"unitPrice":8500}]', 'PROCESSING', 'DIRECT', '80+14', 17, 0, 17, 680000, 'گەیاندنی خێرا', '2025-10-29')
ON CONFLICT (id) DO NOTHING;

-- Seed deliveries
INSERT INTO deliveries (id, order_id, order_number, type, driver, driver_phone, destination, status, items, dispatched_at, delivered_at, created_at) VALUES
('d1', 'o1', 'ORD-001', 'WAREHOUSE', 'عومەر سەعید', '0770 900 1111', 'کۆگای هیمۆ لاب — سلێمانی', 'DELIVERED', 'پاراسیتامۆل × ١٢٠', '٢٩/١٠ — ٠٩:٠٠', '٢٩/١٠ — ١٤:٣٠', '2025-10-28'),
('d2', 'o2', 'ORD-002', 'WAREHOUSE', 'ڕۆژگار عەلی', '0750 800 2222', 'کۆگای ڕۆشنبیری — هەولێر', 'IN_TRANSIT', 'ئەمۆکسیسیلین × ٢٣٠', '٢٨/١٠ — ١١:٠٠', '—', '2025-10-29'),
('d3', 'o3', 'ORD-003', 'DIRECT', '', '', 'کلینیکی هەنار — هەولێر', 'PENDING', 'ئۆمیپرازۆل × ٩٤', '—', '—', '2025-10-29')
ON CONFLICT (id) DO NOTHING;

-- Seed transactions
INSERT INTO transactions (id, type, description, amount, method, related_order_id, created_at) VALUES
('t1', 'INCOME', 'پارەدانی دەرمانخانەی ئازادی', 2500000, 'CASH', 'o1', '2025-10-29'),
('t2', 'EXPENSE', 'کڕینی دەرمان لە فارما فرانسا', 8000000, 'TRANSFER', NULL, '2025-10-29'),
('t3', 'INCOME', 'پارەدانی نەخۆشخانەی سلێمانی', 5200000, 'TRANSFER', 'o2', '2025-10-28'),
('t4', 'EXPENSE', 'مووچەی نوێنەران', 3200000, 'CASH', NULL, '2025-10-28')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role, phone, city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'REP'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
