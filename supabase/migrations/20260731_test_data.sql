-- =============================================
-- Test Data for Commission System
-- Run this AFTER 20260731_commission_redesign.sql
-- =============================================

-- 1. Update existing reps with commission rates (if any exist)
UPDATE reps SET inside_city_pct = 5, outside_city_pct = 3 WHERE inside_city_pct = 0 OR inside_city_pct IS NULL;

-- 2. Sample inside locations for existing reps
-- This inserts "City Center" for each rep's first territory
-- You can customize this after running
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM reps LOOP
    INSERT INTO rep_inside_locations (rep_id, location_path)
    VALUES (r.id, 'سلێمانی > ناوەندی شار')
    ON CONFLICT (rep_id, location_path) DO NOTHING;
  END LOOP;
END;
$$;

-- 3. Sample commission records (mix of INSIDE/OUTSIDE, PENDING/PAID)
-- These reference the first rep found in the system
DO $$
DECLARE
  rep_id_val TEXT;
  prod_name_val TEXT;
BEGIN
  SELECT id INTO rep_id_val FROM reps LIMIT 1;
  IF rep_id_val IS NULL THEN
    RAISE NOTICE 'No reps found — skipping commission test data';
    RETURN;
  END IF;

  SELECT name INTO prod_name_val FROM products WHERE is_active = true LIMIT 1;
  IF prod_name_val IS NULL THEN
    prod_name_val := 'Test Product';
  END IF;

  -- Insert 6 sample commission entries
  INSERT INTO rep_commissions (id, rep_id, order_id, product_name, region, commission_amount, status, location_type) VALUES
    (gen_random_uuid()::text, rep_id_val, 'test-order-1', prod_name_val, 'سلێمانی', 25000, 'PAID', 'INSIDE'),
    (gen_random_uuid()::text, rep_id_val, 'test-order-2', prod_name_val, 'سلێمانی', 25000, 'PAID', 'INSIDE'),
    (gen_random_uuid()::text, rep_id_val, 'test-order-3', prod_name_val, 'هەڵەبجە', 15000, 'PAID', 'OUTSIDE'),
    (gen_random_uuid()::text, rep_id_val, 'test-order-4', prod_name_val, 'سلێمانی', 25000, 'PENDING', 'INSIDE'),
    (gen_random_uuid()::text, rep_id_val, 'test-order-5', prod_name_val, 'هەڵەبجە', 15000, 'PENDING', 'OUTSIDE'),
    (gen_random_uuid()::text, rep_id_val, 'test-order-6', prod_name_val, 'سلێمانی', 25000, 'PENDING', 'INSIDE');
  
  RAISE NOTICE 'Inserted 6 test commission entries for rep %', rep_id_val;
END;
$$;
