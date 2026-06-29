/**
 * export-demo-data.js
 * ─────────────────────────────────────────────────────────────────
 * Exports all app tables from Supabase to a timestamped JSON file.
 * Uses SERVICE_ROLE key to bypass RLS.
 *
 * Usage:
 *   node scripts/export-demo-data.js
 *   node scripts/export-demo-data.js --out my-backup.json
 *   node scripts/export-demo-data.js --table products
 * ─────────────────────────────────────────────────────────────────
 */

const fs   = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SRV_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SRV_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const headers = {
  "apikey":        SUPABASE_SRV_KEY,
  "Authorization": `Bearer ${SUPABASE_SRV_KEY}`,
};

async function fetchTable(table) {
  // Paginate: Supabase default limit is 1000 rows
  let all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.asc&offset=${from}&limit=${PAGE}`,
      { headers }
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GET ${table} failed: ${res.status} ${txt}`);
    }
    const rows = await res.json();
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const ALL_TABLES = [
  "products",
  "price_types",
  "clients",
  "reps",
  "warehouses",
  "suppliers",
  "orders",
  "drivers",
  "transactions",
  "invoice_templates",
  "sample_requests",
];

async function main() {
  const args     = process.argv.slice(2);
  const onlyTbl  = args.find(a => a.startsWith("--table="))?.split("=")[1]
                || (args.includes("--table") && args[args.indexOf("--table") + 1]);
  const outArg   = args.find(a => a.startsWith("--out="))?.split("=")[1]
                || (args.includes("--out") && args[args.indexOf("--out") + 1]);

  const tables = onlyTbl ? [onlyTbl] : ALL_TABLES;
  const backup  = { _backup_date: [new Date().toISOString()] };

  for (const table of tables) {
    process.stdout.write(`📋 Exporting ${table}... `);
    const rows = await fetchTable(table);
    backup[table] = rows;
    console.log(`${rows.length} rows ✓`);
  }

  const stamp   = new Date().toISOString().slice(0, 10);
  const outFile = outArg || path.join(__dirname, "../../", `dewa_backup_${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), "utf-8");

  console.log(`\n✅ Backup saved → ${outFile}`);
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
