/**
 * restore-demo-data.js
 * ─────────────────────────────────────────────────────────────────
 * Restores demo data from dewa_backup_2026-06-26.json into Supabase.
 * Uses SERVICE_ROLE key to bypass RLS.
 *
 * Usage:
 *   node scripts/restore-demo-data.js
 *   node scripts/restore-demo-data.js --dry-run   (preview only, no writes)
 *   node scripts/restore-demo-data.js --table products (single table)
 *
 * ⚠  This DELETES existing rows in each table before inserting backup rows.
 *    Run only on a fresh / empty database, or when you intentionally want
 *    to reset to the demo state.
 * ─────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

// ── Load env ────────────────────────────────────────────────────
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SRV_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SRV_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────
const headers = {
  "Content-Type":  "application/json",
  "apikey":        SUPABASE_SRV_KEY,
  "Authorization": `Bearer ${SUPABASE_SRV_KEY}`,
  "Prefer":        "return=minimal",
};

async function supaDelete(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.___never___`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${table} failed: ${res.status} ${text}`);
  }
}

async function supaInsert(table, rows) {
  if (!rows.length) return;
  // Insert in chunks of 100 to avoid payload limits
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:  "POST",
      headers: { ...headers, "Prefer": "return=minimal" },
      body:    JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`INSERT ${table} (rows ${i}–${i + chunk.length}) failed: ${res.status} ${text}`);
    }
  }
}

// ── Table restore order (respects FK dependencies) ───────────────
// Insert parent tables first, child tables last.
const TABLE_ORDER = [
  "price_types",
  "products",
  "warehouses",
  "suppliers",
  "reps",
  "clients",
  "drivers",
  "orders",
  "transactions",
  "invoice_templates",
  "sample_requests",
];

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const onlyTbl = args.find(a => a.startsWith("--table="))?.split("=")[1]
               || (args.includes("--table") && args[args.indexOf("--table") + 1]);

  // Load backup
  const backupPath = path.join(__dirname, "../..", "dewa_backup_2026-06-26.json");
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    console.error("   Place dewa_backup_2026-06-26.json in the Pepule folder.");
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
  const backupDate = backup._backup_date?.[0] || "unknown";
  console.log(`📦 Backup date: ${backupDate}`);
  if (dryRun) console.log("🔍 DRY RUN — no data will be written\n");

  const tables = onlyTbl ? [onlyTbl] : TABLE_ORDER;

  for (const table of tables) {
    const rows = backup[table];
    if (!rows) {
      console.log(`⏭  Skipping ${table} (not in backup)`);
      continue;
    }

    console.log(`\n📋 ${table}: ${rows.length} rows`);

    if (dryRun) {
      console.log(`   [dry-run] Would DELETE all, then INSERT ${rows.length} rows`);
      continue;
    }

    // Delete existing rows
    process.stdout.write(`   Deleting existing rows... `);
    await supaDelete(table);
    console.log("✓");

    // Insert backup rows
    process.stdout.write(`   Inserting ${rows.length} rows... `);
    await supaInsert(table, rows);
    console.log("✓");
  }

  console.log("\n✅ Restore complete!");
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
