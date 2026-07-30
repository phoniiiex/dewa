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
DO $$
DECLARE
  rep_id_val TEXT;
  prod_id_val TEXT;
  order_ids TEXT[];
  i INT;
  statuses TEXT[] := ARRAY['PAID','PAID','PAID','PENDING','PENDING','PENDING'];
  loc_types TEXT[] := ARRAY['INSIDE','INSIDE','OUTSIDE','INSIDE','OUTSIDE','INSIDE'];
  regions TEXT[] := ARRAY['سلێمانی','سلێمانی','هەڵەبجە','سلێمانی','هەڵەبجە','سلێمانی'];
  amounts INT[] := ARRAY[25000,25000,15000,25000,15000,25000];
  pcts INT[] := ARRAY[5,5,3,5,3,5];
BEGIN
  SELECT id INTO rep_id_val FROM reps LIMIT 1;
  IF rep_id_val IS NULL THEN RETURN; END IF;

  SELECT id INTO prod_id_val FROM products WHERE is_active = true LIMIT 1;
  IF prod_id_val IS NULL THEN prod_id_val := 'unknown'; END IF;

  -- Grab up to 6 real order IDs
  SELECT array_agg(id) INTO order_ids FROM (SELECT id FROM orders LIMIT 6) sub;
  IF order_ids IS NULL OR array_length(order_ids, 1) = 0 THEN
    RAISE NOTICE 'No orders found — skipping test data';
    RETURN;
  END IF;

  FOR i IN 1..LEAST(6, array_length(order_ids, 1)) LOOP
    INSERT INTO rep_commissions (id, rep_id, order_id, product_id, region, sale_amount, commission_pct, commission_amount, status, location_type)
    VALUES (gen_random_uuid()::text, rep_id_val, order_ids[i], prod_id_val, regions[i], 500000, pcts[i], amounts[i], statuses[i], loc_types[i]);
  END LOOP;

  RAISE NOTICE 'Inserted % test commission entries', LEAST(6, array_length(order_ids, 1));
END;
$$;
