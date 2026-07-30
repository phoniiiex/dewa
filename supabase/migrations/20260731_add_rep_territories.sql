-- Rep Territories: assign regions to representatives
CREATE TABLE IF NOT EXISTS rep_territories (
  id TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  rep_id TEXT NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rep_id, region)
);

-- Enable RLS
ALTER TABLE rep_territories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write
CREATE POLICY "rep_territories_all" ON rep_territories FOR ALL USING (true) WITH CHECK (true);
