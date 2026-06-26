const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf8').trim().split('\n');
const env = {};
for (const line of envLines) {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key);

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS public.drivers (
    id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name             text NOT NULL,
    phone            text NOT NULL DEFAULT '',
    city             text NOT NULL DEFAULT '',
    is_active        boolean NOT NULL DEFAULT true,
    telegram_chat_id text DEFAULT '',
    created_at       timestamptz DEFAULT now()
  )`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id          text DEFAULT ''`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_name        text DEFAULT ''`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_phone       text DEFAULT ''`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signed_invoice_url text DEFAULT ''`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS signed_receipt_url text DEFAULT ''`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at       timestamptz`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at            timestamptz`,
  `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rejection_reason   text DEFAULT ''`,
];

async function main() {
  for (const stmt of SQL_STATEMENTS) {
    const { error } = await supabase.rpc('exec_sql', { query: stmt }).single().catch(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
      // Print for manual execution
      console.log('-- Cannot auto-run, please execute in Supabase SQL Editor:');
      console.log(stmt + ';');
      console.log();
    } else {
      console.log('OK:', stmt.slice(0, 60));
    }
  }
}

main().catch(console.error);
