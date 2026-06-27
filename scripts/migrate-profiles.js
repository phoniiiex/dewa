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
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''`,
  `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT ''`,
];

console.log('\n=== Profiles Migration ===\n');
console.log('If the script cannot auto-run, please paste these in Supabase SQL Editor:\n');
SQL_STATEMENTS.forEach(s => console.log(s + ';\n'));

async function main() {
  for (const stmt of SQL_STATEMENTS) {
    const { error } = await supabase.rpc('exec_sql', { query: stmt }).single().catch(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
      console.log('Manual execution required:', stmt.slice(0, 80));
    } else {
      console.log('OK:', stmt.slice(0, 80));
    }
  }
}

main().catch(console.error);
