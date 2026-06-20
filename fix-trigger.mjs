import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: 'postgresql://postgres.ecrpfzykveqmkwazcyrx:QAkzrEQP4fHjfSm8@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' });

c.connect().then(async () => {
  // Drop the trigger entirely
  await c.query("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;");
  console.log("Trigger dropped");

  // Also drop any other triggers on auth.users
  const triggers = await c.query("SELECT trigger_name FROM information_schema.triggers WHERE event_object_schema = 'auth' AND event_object_table = 'users'");
  console.log("Remaining triggers:", triggers.rows);

  await c.end();
  console.log("Done - trigger removed. User creation should now work without auto-profile.");
}).catch(e => console.error("Error:", e.message));
