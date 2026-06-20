import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres.ecrpfzykveqmkwazcyrx:QAkzrEQP4fHjfSm8@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' });

c.connect().then(async () => {
  // Check if there's a trigger on auth.users
  const r = await c.query("SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users'");
  console.log('Auth triggers:', JSON.stringify(r.rows, null, 2));
  
  // Check profiles table constraints
  const r2 = await c.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position");
  console.log('Profiles columns:', JSON.stringify(r2.rows, null, 2));

  // Check for any handle_new_user trigger
  const r3 = await c.query("SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%new_user%'");
  console.log('New user functions:', JSON.stringify(r3.rows, null, 2));
  
  await c.end();
}).catch(e => console.error(e.message));
