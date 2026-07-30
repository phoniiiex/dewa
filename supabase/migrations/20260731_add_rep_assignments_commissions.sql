-- Rep Product Assignments: which rep handles which product in which territory
CREATE TABLE IF NOT EXISTS rep_product_assignments (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  rep_id TEXT NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  commission_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rep_id, product_id, region)
);

ALTER TABLE rep_product_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rep_product_assignments_all" ON rep_product_assignments FOR ALL USING (true) WITH CHECK (true);

-- Rep Commissions: auto-calculated when orders are placed
CREATE TABLE IF NOT EXISTS rep_commissions (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  rep_id TEXT NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  commission_pct NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rep_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rep_commissions_all" ON rep_commissions FOR ALL USING (true) WITH CHECK (true);
