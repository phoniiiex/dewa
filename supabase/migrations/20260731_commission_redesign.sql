-- =============================================
-- Commission Redesign: Inside/Outside City
-- =============================================

-- 1. Add commission rates to reps table
ALTER TABLE reps ADD COLUMN IF NOT EXISTS inside_city_pct NUMERIC DEFAULT 0;
ALTER TABLE reps ADD COLUMN IF NOT EXISTS outside_city_pct NUMERIC DEFAULT 0;

-- 2. Rep Inside Locations: which locations are "inside the city" for each rep
CREATE TABLE IF NOT EXISTS rep_inside_locations (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  rep_id TEXT NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  location_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rep_id, location_path)
);

ALTER TABLE rep_inside_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rep_inside_locations_all" ON rep_inside_locations;
CREATE POLICY "rep_inside_locations_all" ON rep_inside_locations FOR ALL USING (true) WITH CHECK (true);

-- 3. Add location_type to rep_commissions
ALTER TABLE rep_commissions ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'OUTSIDE';

-- 4. Remove commission_pct from rep_product_assignments (column stays but unused)
-- We keep the column to avoid breaking existing data, but it's ignored going forward.
