// Direct Postgres setup — bypasses PostgREST entirely
import pg from "pg";
import fs from "fs";
const { Client } = pg;

// Supabase Postgres connection (pooler mode)
// Format: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// OR direct: postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
const DATABASE_URL = `postgresql://postgres.ecrpfzykveqmkwazcyrx:${process.argv[2]}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

async function main() {
  if (!process.argv[2]) {
    console.log("Usage: node supabase-pg-setup.mjs <database-password>");
    console.log("Your database password is the one you set when creating the Supabase project.");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log("Connecting to Supabase Postgres...");
    await client.connect();
    console.log("✅ Connected!\n");

    // Read and execute the schema SQL
    const sql = fs.readFileSync("supabase-schema.sql", "utf-8");
    console.log("Executing schema SQL...");
    await client.query(sql);
    console.log("✅ Schema created + seed data inserted + RLS enabled!\n");

    // Verify
    const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log("Tables in public schema:");
    rows.forEach(r => console.log(`  ✅ ${r.table_name}`));

    // Notify PostgREST to reload schema cache
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("\n✅ PostgREST schema cache reloaded");

  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.message.includes("password")) {
      console.log("\nMake sure you're using the database password you set when creating the project.");
      console.log("You can reset it in: Supabase Dashboard → Settings → Database → Database Password");
    }
  } finally {
    await client.end();
  }
}

main();
