-- ============================================================
-- DEWA Schema Migration — Run in Supabase SQL Editor
-- ============================================================

-- 1. Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name             text NOT NULL,
  phone            text NOT NULL DEFAULT '',
  city             text NOT NULL DEFAULT '',
  is_active        boolean NOT NULL DEFAULT true,
  telegram_chat_id text DEFAULT '',
  created_at       timestamptz DEFAULT now()
);

-- 2. Add new columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id          text DEFAULT '',
  ADD COLUMN IF NOT EXISTS driver_name        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS driver_phone       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS signed_invoice_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS signed_receipt_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivered_at       timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason   text DEFAULT '';

-- 3. Create storage bucket for order documents (invoice & receipt uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-docs', 'order-docs', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set public read policy on order-docs bucket
CREATE POLICY IF NOT EXISTS "Public read order-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-docs');

CREATE POLICY IF NOT EXISTS "Authenticated upload order-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-docs');

-- Done!
SELECT 'Migration complete' AS status;
