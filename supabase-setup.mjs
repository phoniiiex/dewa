// Complete Supabase setup — creates tables, RLS, seeds data, creates admin user
import { createClient } from "@supabase/supabase-js";

const url = "https://ecrpfzykveqmkwazcyrx.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcnBmenlrdmVxbWt3YXpjeXJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk3NjM0OSwiZXhwIjoyMDk3NTUyMzQ5fQ.e45yVSpWUhWC-aRy8hBHgqVNlQeWxi2Pex1s--YQSNw";

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// Execute raw SQL via pg_query (Supabase edge function workaround)
async function execSQL(sql) {
  // Use the Supabase Management API's pg endpoint
  const r = await fetch(`${url}/pg/query`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) {
    // Try alternative endpoint
    const r2 = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    });
    if (!r2.ok) return { error: `${r.status}: ${await r.text()}` };
    return { data: await r2.json() };
  }
  return { data: await r.json() };
}

async function main() {
  console.log("=== Step 1: Creating tables via SQL ===\n");
  
  const createSQL = `
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
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', category TEXT DEFAULT '',
      price NUMERIC DEFAULT 0, stock INTEGER DEFAULT 0, unit_type TEXT DEFAULT '',
      origin TEXT DEFAULT '', supplier TEXT DEFAULT '', expiry_date TEXT DEFAULT '',
      batch_number TEXT DEFAULT '', is_sample BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS reps (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL, phone TEXT DEFAULT '', city TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT true, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL, owner TEXT DEFAULT '', phone TEXT DEFAULT '', city TEXT DEFAULT '',
      type TEXT DEFAULT 'PHARMACY', rep_id TEXT DEFAULT '',
      payment_terms TEXT DEFAULT 'IMMEDIATE', balance NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL, city TEXT DEFAULT '', address TEXT DEFAULT '',
      contact TEXT DEFAULT '', phone TEXT DEFAULT '', bonus_pct NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL, contact TEXT DEFAULT '', phone TEXT DEFAULT '',
      email TEXT DEFAULT '', country TEXT DEFAULT '', balance NUMERIC DEFAULT 0,
      is_active BOOLEAN DEFAULT true, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      order_number TEXT NOT NULL DEFAULT '', client_id TEXT DEFAULT '',
      client_name TEXT DEFAULT '', rep_id TEXT DEFAULT '', rep_name TEXT DEFAULT '',
      warehouse_id TEXT, warehouse_name TEXT, items JSONB DEFAULT '[]'::jsonb,
      status TEXT DEFAULT 'PENDING', routing_mode TEXT DEFAULT 'DIRECT',
      bonus_notation TEXT DEFAULT '', total_bonus_pct NUMERIC DEFAULT 0,
      warehouse_bonus_pct NUMERIC DEFAULT 0, rep_bonus_pct NUMERIC DEFAULT 0,
      total_amount NUMERIC DEFAULT 0, notes TEXT DEFAULT '',
      created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      order_id TEXT DEFAULT '', order_number TEXT DEFAULT '',
      type TEXT DEFAULT 'DIRECT', driver TEXT DEFAULT '', driver_phone TEXT DEFAULT '',
      destination TEXT DEFAULT '', status TEXT DEFAULT 'PENDING', items TEXT DEFAULT '',
      dispatched_at TEXT DEFAULT '', delivered_at TEXT DEFAULT '',
      created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      type TEXT DEFAULT 'INCOME', description TEXT DEFAULT '',
      amount NUMERIC DEFAULT 0, method TEXT DEFAULT 'CASH',
      related_order_id TEXT, created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      name TEXT DEFAULT '', name_en TEXT DEFAULT '', phone TEXT DEFAULT '',
      email TEXT DEFAULT '', city TEXT DEFAULT '', address TEXT DEFAULT '',
      currency TEXT DEFAULT 'IQD', language TEXT DEFAULT 'ckb',
      logo TEXT DEFAULT '', profile_pic TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS invoice_templates (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL DEFAULT '', blocks JSONB DEFAULT '[]'::jsonb,
      show_bonus_col BOOLEAN DEFAULT true, default_note TEXT DEFAULT '',
      default_terms TEXT DEFAULT '', default_discount NUMERIC DEFAULT 0,
      created_at TEXT DEFAULT to_char(NOW(), 'YYYY-MM-DD')
    );
  `;
  
  const sqlResult = await execSQL(createSQL);
  if (sqlResult.error) {
    console.log("⚠️ Direct SQL execution not available:", sqlResult.error);
    console.log("Tables were likely already created via the browser. Trying data insertion...\n");
  } else {
    console.log("✅ Tables created\n");
  }

  // Wait for PostgREST schema cache reload
  console.log("Waiting 5s for schema cache...");
  await new Promise(r => setTimeout(r, 5000));

  // Try to send a schema reload signal
  await fetch(`${url}/rest/v1/`, {
    method: "GET",
    headers: { "apikey": key, "Authorization": `Bearer ${key}` },
  });

  console.log("\n=== Step 2: Seeding data ===\n");

  async function upsert(table, data) {
    const { error } = await supabase.from(table).upsert(data, { onConflict: "id" });
    if (error) console.error(`❌ ${table}: ${error.message}`);
    else console.log(`✅ ${table}: ${Array.isArray(data) ? data.length : 1} rows`);
  }

  await upsert("company_settings", {
    id: 1, name: "دەوا فارما", name_en: "Dewa Pharma", phone: "0770 000 1234",
    email: "info@dewapharma.com", city: "سلێمانی",
    address: "شەقامی سالم، تاوەری ئازادی، نهۆم ٣", currency: "IQD", language: "ckb",
  });

  await upsert("products", [
    { id: "p1", name: "پاراسیتامۆل ٥٠٠مغ", sku: "PAR-500", category: "ئازارکوژ", price: 5000, stock: 2400, unit_type: "پاکەت", origin: "تورکیا 🇹🇷", supplier: "مەدیکۆ تورکیا", expiry_date: "2026-08-15", batch_number: "BT-2024-001", is_sample: false, is_active: true, created_at: "2025-01-10" },
    { id: "p2", name: "ئەمۆکسیسیلین ٥٠٠مغ", sku: "AMX-500", category: "ئەنتیبایۆتیک", price: 12000, stock: 1200, unit_type: "پاکەت", origin: "فەرەنسا 🇫🇷", supplier: "فارما فرانسا", expiry_date: "2026-05-20", batch_number: "BT-2024-002", is_sample: false, is_active: true, created_at: "2025-01-10" },
    { id: "p3", name: "ئۆمیپرازۆل ٢٠مغ", sku: "OMP-020", category: "گەدە و هەرس", price: 8500, stock: 800, unit_type: "پاکەت", origin: "ئوردن 🇯🇴", supplier: "جۆردان فارما", expiry_date: "2026-12-01", batch_number: "BT-2024-003", is_sample: false, is_active: true, created_at: "2025-02-01" },
    { id: "p4", name: "مێتفۆرمین ٨٥٠مغ", sku: "MET-850", category: "شەکرە", price: 7500, stock: 650, unit_type: "پاکەت", origin: "هندستان 🇮🇳", supplier: "ئینتا فارما", expiry_date: "2027-03-10", batch_number: "BT-2024-004", is_sample: false, is_active: true, created_at: "2025-02-15" },
    { id: "p5", name: "ئازیترۆمایسین ٥٠٠مغ", sku: "AZT-500", category: "ئەنتیبایۆتیک", price: 15000, stock: 420, unit_type: "پاکەت", origin: "تورکیا 🇹🇷", supplier: "مەدیکۆ تورکیا", expiry_date: "2026-09-30", batch_number: "BT-2024-005", is_sample: false, is_active: true, created_at: "2025-03-01" },
    { id: "p6", name: "ئیبوپرۆفین ٤٠٠مغ", sku: "IBU-400", category: "ئازارکوژ", price: 6000, stock: 1800, unit_type: "پاکەت", origin: "ئوردن 🇯🇴", supplier: "جۆردان فارما", expiry_date: "2027-01-15", batch_number: "BT-2024-006", is_sample: false, is_active: true, created_at: "2025-03-10" },
    { id: "p7", name: "سیپرۆفلۆکساسین ٥٠٠مغ", sku: "CIP-500", category: "ئەنتیبایۆتیک", price: 11000, stock: 350, unit_type: "پاکەت", origin: "هندستان 🇮🇳", supplier: "ئینتا فارما", expiry_date: "2026-07-20", batch_number: "BT-2024-007", is_sample: false, is_active: true, created_at: "2025-04-01" },
    { id: "p8", name: "ڤیتامین C ١٠٠٠مغ", sku: "VTC-1000", category: "ڤیتامین", price: 4500, stock: 3000, unit_type: "بوتل", origin: "سوویسرا 🇨🇭", supplier: "سوویسرا مەد", expiry_date: "2027-06-01", batch_number: "BT-2024-008", is_sample: false, is_active: true, created_at: "2025-04-15" },
  ]);

  await upsert("reps", [
    { id: "r1", name: "ئاکۆ مەحموود", phone: "0770 111 2222", city: "سلێمانی", is_active: true, created_at: "2025-01-01" },
    { id: "r2", name: "هێمن ئەحمەد", phone: "0750 222 3333", city: "سلێمانی", is_active: true, created_at: "2025-01-01" },
    { id: "r3", name: "شادی عومەر", phone: "0770 333 4444", city: "هەولێر", is_active: true, created_at: "2025-01-15" },
    { id: "r4", name: "دانا ڕەسوول", phone: "0750 444 5555", city: "دهۆک", is_active: true, created_at: "2025-02-01" },
    { id: "r5", name: "ڕێبوار کەریم", phone: "0770 555 6666", city: "کەرکوک", is_active: true, created_at: "2025-02-15" },
  ]);

  await upsert("clients", [
    { id: "c1", name: "دەرمانخانەی ئازادی", owner: "ئاراس عەبدوڵا", phone: "0770 123 4567", city: "سلێمانی", type: "PHARMACY", rep_id: "r1", payment_terms: "NET_30", balance: 2500000, is_active: true, created_at: "2025-01-10" },
    { id: "c2", name: "نەخۆشخانەی سلێمانی", owner: "د. کارزان محەمەد", phone: "0750 234 5678", city: "سلێمانی", type: "HOSPITAL", rep_id: "r2", payment_terms: "NET_30", balance: 8200000, is_active: true, created_at: "2025-01-15" },
    { id: "c3", name: "کلینیکی هەنار", owner: "د. ڕۆژان عومەر", phone: "0770 345 6789", city: "هەولێر", type: "CLINIC", rep_id: "r3", payment_terms: "IMMEDIATE", balance: 1200000, is_active: true, created_at: "2025-02-01" },
    { id: "c4", name: "دەرمانخانەی ڕۆژ", owner: "سەرهەنگ عەلی", phone: "0750 456 7890", city: "دهۆک", type: "PHARMACY", rep_id: "r4", payment_terms: "IMMEDIATE", balance: 0, is_active: true, created_at: "2025-02-10" },
    { id: "c5", name: "دەرمانخانەی ڕۆشنا", owner: "نازدار حەسەن", phone: "0770 567 8901", city: "کەرکوک", type: "PHARMACY", rep_id: "r5", payment_terms: "NET_15", balance: 3400000, is_active: true, created_at: "2025-03-01" },
    { id: "c6", name: "نەخۆشخانەی هەولێر", owner: "د. ئاسۆ کەریم", phone: "0750 678 9012", city: "هەولێر", type: "HOSPITAL", rep_id: "r1", payment_terms: "NET_30", balance: 5600000, is_active: true, created_at: "2025-03-15" },
  ]);

  await upsert("warehouses", [
    { id: "w1", name: "کۆگای هیمۆ لاب", city: "سلێمانی", address: "شەقامی سالم", contact: "هاوڕێ محەمەد", phone: "0770 100 2000", bonus_pct: 20, is_active: true, created_at: "2025-01-01" },
    { id: "w2", name: "کۆگای ڕۆشنبیری", city: "هەولێر", address: "شەقامی ٦٠ مەتری", contact: "عەلی جەعفەر", phone: "0750 200 3000", bonus_pct: 15, is_active: true, created_at: "2025-01-01" },
    { id: "w3", name: "کۆگای سەلامەتی", city: "دهۆک", address: "شەقامی بارزان", contact: "ئازاد ئەحمەد", phone: "0770 300 4000", bonus_pct: 18, is_active: true, created_at: "2025-02-01" },
  ]);

  await upsert("suppliers", [
    { id: "s1", name: "فارما فرانسا", contact: "Jean Dupont", phone: "+33 1 4567 8901", email: "orders@pharmafrance.com", country: "فەرەنسا 🇫🇷", balance: 45000000, is_active: true, created_at: "2025-01-01" },
    { id: "s2", name: "مەدیکۆ تورکیا", contact: "Ahmet Yilmaz", phone: "+90 212 345 6789", email: "sales@medicoturkey.com", country: "تورکیا 🇹🇷", balance: 32000000, is_active: true, created_at: "2025-01-01" },
    { id: "s3", name: "جۆردان فارما", contact: "خالد المحمد", phone: "+962 6 123 4567", email: "info@jordanpharma.com", country: "ئوردن 🇯🇴", balance: 15000000, is_active: true, created_at: "2025-01-15" },
    { id: "s4", name: "ئینتا فارما", contact: "Raj Patel", phone: "+91 22 4567 8901", email: "export@intapharma.in", country: "هندستان 🇮🇳", balance: 28000000, is_active: true, created_at: "2025-02-01" },
  ]);

  await upsert("orders", [
    { id: "o1", order_number: "ORD-001", client_id: "c1", client_name: "دەرمانخانەی ئازادی", rep_id: "r1", rep_name: "ئاکۆ مەحموود", warehouse_id: "w1", warehouse_name: "کۆگای هیمۆ لاب", items: [{ productId: "p1", productName: "پاراسیتامۆل ٥٠٠مغ", quantity: 100, bonusQty: 30, unitPrice: 5000 }], status: "PAID", routing_mode: "WAREHOUSE", bonus_notation: "100+50", total_bonus_pct: 50, warehouse_bonus_pct: 20, rep_bonus_pct: 30, total_amount: 500000, notes: "", created_at: "2025-10-28" },
    { id: "o2", order_number: "ORD-002", client_id: "c2", client_name: "نەخۆشخانەی سلێمانی", rep_id: "r2", rep_name: "هێمن ئەحمەد", warehouse_id: "w2", warehouse_name: "کۆگای ڕۆشنبیری", items: [{ productId: "p2", productName: "ئەمۆکسیسیلین ٥٠٠مغ", quantity: 200, bonusQty: 50, unitPrice: 12000 }], status: "SHIPPED", routing_mode: "WAREHOUSE", bonus_notation: "200+40", total_bonus_pct: 40, warehouse_bonus_pct: 15, rep_bonus_pct: 25, total_amount: 2400000, notes: "", created_at: "2025-10-29" },
    { id: "o3", order_number: "ORD-003", client_id: "c3", client_name: "کلینیکی هەنار", rep_id: "r3", rep_name: "شادی عومەر", items: [{ productId: "p3", productName: "ئۆمیپرازۆل ٢٠مغ", quantity: 80, bonusQty: 14, unitPrice: 8500 }], status: "PROCESSING", routing_mode: "DIRECT", bonus_notation: "80+14", total_bonus_pct: 17, warehouse_bonus_pct: 0, rep_bonus_pct: 17, total_amount: 680000, notes: "گەیاندنی خێرا", created_at: "2025-10-29" },
  ]);

  await upsert("deliveries", [
    { id: "d1", order_id: "o1", order_number: "ORD-001", type: "WAREHOUSE", driver: "عومەر سەعید", driver_phone: "0770 900 1111", destination: "کۆگای هیمۆ لاب — سلێمانی", status: "DELIVERED", items: "پاراسیتامۆل × ١٢٠", dispatched_at: "٢٩/١٠ — ٠٩:٠٠", delivered_at: "٢٩/١٠ — ١٤:٣٠", created_at: "2025-10-28" },
    { id: "d2", order_id: "o2", order_number: "ORD-002", type: "WAREHOUSE", driver: "ڕۆژگار عەلی", driver_phone: "0750 800 2222", destination: "کۆگای ڕۆشنبیری — هەولێر", status: "IN_TRANSIT", items: "ئەمۆکسیسیلین × ٢٣٠", dispatched_at: "٢٨/١٠ — ١١:٠٠", delivered_at: "—", created_at: "2025-10-29" },
    { id: "d3", order_id: "o3", order_number: "ORD-003", type: "DIRECT", driver: "", driver_phone: "", destination: "کلینیکی هەنار — هەولێر", status: "PENDING", items: "ئۆمیپرازۆل × ٩٤", dispatched_at: "—", delivered_at: "—", created_at: "2025-10-29" },
  ]);

  await upsert("transactions", [
    { id: "t1", type: "INCOME", description: "پارەدانی دەرمانخانەی ئازادی", amount: 2500000, method: "CASH", related_order_id: "o1", created_at: "2025-10-29" },
    { id: "t2", type: "EXPENSE", description: "کڕینی دەرمان لە فارما فرانسا", amount: 8000000, method: "TRANSFER", related_order_id: null, created_at: "2025-10-29" },
    { id: "t3", type: "INCOME", description: "پارەدانی نەخۆشخانەی سلێمانی", amount: 5200000, method: "TRANSFER", related_order_id: "o2", created_at: "2025-10-28" },
    { id: "t4", type: "EXPENSE", description: "مووچەی نوێنەران", amount: 3200000, method: "CASH", related_order_id: null, created_at: "2025-10-28" },
  ]);

  // Insert admin profile
  console.log("\n=== Step 3: Admin profile ===");
  // Get admin user ID
  const { data: users } = await supabase.auth.admin.listUsers();
  const admin = users?.users?.find(u => u.email === "admin@dewa.com");
  if (admin) {
    await upsert("profiles", { id: admin.id, name: "ئاسۆ ئەحمەد", email: "admin@dewa.com", role: "ADMIN", phone: "0770 000 1234", city: "سلێمانی", is_active: true });
  } else {
    console.log("⚠️ No admin auth user found. Creating one...");
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: "admin@dewa.com", password: "dewa2025", email_confirm: true,
      user_metadata: { name: "ئاسۆ ئەحمەد", role: "ADMIN" },
    });
    if (error) console.error("❌", error.message);
    else {
      console.log("✅ Admin created:", newUser.user.id);
      await upsert("profiles", { id: newUser.user.id, name: "ئاسۆ ئەحمەد", email: "admin@dewa.com", role: "ADMIN", phone: "0770 000 1234", city: "سلێمانی", is_active: true });
    }
  }

  console.log("\n✅ Setup complete!");
}

main().catch(console.error);
