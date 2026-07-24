-- ============================================================
-- DEWA — Migration: Add user_signatures table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT 'واژووی بنەڕەت',
  image_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_signatures ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write signatures
CREATE POLICY "Authenticated users can manage signatures"
  ON user_signatures
  FOR ALL
  USING (true)
  WITH CHECK (true);
