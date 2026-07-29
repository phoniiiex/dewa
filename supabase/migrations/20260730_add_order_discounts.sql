-- ============================================================
-- Add per-order discount fields
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'AMOUNT';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
