-- Run this in Supabase SQL Editor

-- 1. Add new columns to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company     TEXT    DEFAULT '',
  ADD COLUMN IF NOT EXISTS issue_date  DATE,
  ADD COLUMN IF NOT EXISTS prices      JSONB   DEFAULT '[]'::jsonb;

-- 2. Create price_types table
CREATE TABLE IF NOT EXISTS price_types (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT         NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- 3. Seed default price types
INSERT INTO price_types (name) VALUES
  ('نرخی گشتی'),
  ('نرخی ستیکەر')
ON CONFLICT (name) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE price_types ENABLE ROW LEVEL SECURITY;

-- 5. Allow read for all authenticated users; write for all (adjust as needed)
DROP POLICY IF EXISTS "price_types_all" ON price_types;
CREATE POLICY "price_types_all" ON price_types FOR ALL USING (true) WITH CHECK (true);
