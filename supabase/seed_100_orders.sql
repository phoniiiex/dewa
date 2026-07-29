-- ============================================================
-- DEWA — Seed 100 Realistic Test Orders
-- Run this in the Supabase SQL Editor
-- ============================================================

-- First, ensure we have test clients
INSERT INTO clients (id, name, owner, phone, city, type, rep_id, payment_terms, balance, qr_token, is_active)
VALUES
  ('cli-001', 'مخزن ئاسیا', 'ئەحمەد محەمەد', '07501234567', 'سلێمانی', 'WAREHOUSE', '', 'NET_30', 0, 'qr-cli001', true),
  ('cli-002', 'مخزن هەولێر', 'کاروان عەلی', '07701234568', 'هەولێر', 'WAREHOUSE', '', 'NET_30', 0, 'qr-cli002', true),
  ('cli-003', 'دەرمانخانەی ئارام', 'ئارام ئیبراهیم', '07801234569', 'سلێمانی', 'PHARMACY', '', 'NET_15', 0, 'qr-cli003', true),
  ('cli-004', 'دەرمانخانەی شفاء', 'شفاء عوسمان', '07501234570', 'هەولێر', 'PHARMACY', '', 'CASH', 0, 'qr-cli004', true),
  ('cli-005', 'دەرمانخانەی نەشتیمان', 'هێمن عبدوڵڵا', '07701234571', 'دهۆک', 'PHARMACY', '', 'NET_30', 0, 'qr-cli005', true),
  ('cli-006', 'مخزن بابیلۆن', 'سامان کەریم', '07801234572', 'کەرکوک', 'WAREHOUSE', '', 'NET_30', 0, 'qr-cli006', true),
  ('cli-007', 'دەرمانخانەی گوڵان', 'گوڵان حەسەن', '07501234573', 'سلێمانی', 'PHARMACY', '', 'NET_15', 0, 'qr-cli007', true),
  ('cli-008', 'دەرمانخانەی سەلام', 'سەلام محمود', '07701234574', 'هەولێر', 'PHARMACY', '', 'CASH', 0, 'qr-cli008', true),
  ('cli-009', 'مخزن زاگرۆس', 'ڕەوەز ئەمین', '07801234575', 'سلێمانی', 'WAREHOUSE', '', 'NET_30', 0, 'qr-cli009', true),
  ('cli-010', 'دەرمانخانەی هیوا', 'هیوا جەلال', '07501234576', 'دهۆک', 'PHARMACY', '', 'NET_15', 0, 'qr-cli010', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure test reps
INSERT INTO reps (id, name, phone, email, city, is_active)
VALUES
  ('rep-001', 'ڕێباز عەلی', '07501110001', 'rebaz@dewa.com', 'سلێمانی', true),
  ('rep-002', 'دانا حەسەن', '07501110002', 'dana@dewa.com', 'هەولێر', true),
  ('rep-003', 'شوان محەمەد', '07501110003', 'shwan@dewa.com', 'دهۆک', true),
  ('rep-004', 'ئاکۆ کەریم', '07501110004', 'ako@dewa.com', 'کەرکوک', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Generate 100 orders with diverse scenarios
-- ============================================================

DO $$
DECLARE
  i INTEGER;
  ord_id TEXT;
  ord_num TEXT;
  c_id TEXT;
  c_name TEXT;
  r_id TEXT;
  r_name TEXT;
  flow TEXT;
  ph_id TEXT;
  ph_name TEXT;
  v_status TEXT;
  items JSONB;
  total NUMERIC;
  v_notes TEXT;
  created TIMESTAMPTZ;
  delivered TIMESTAMPTZ;
  paid TIMESTAMPTZ;
  reject_reason TEXT;
  v_driver_id TEXT;
  v_driver_name TEXT;
  v_driver_phone TEXT;
  
  products TEXT[][] := ARRAY[
    ARRAY['Paracetamol 500mg', '5000', 'GlaxoSmithKline', 'مەسکەن'],
    ARRAY['Amoxicillin 500mg', '8500', 'Pfizer', 'ئەنتی بایۆتیک'],
    ARRAY['Omeprazole 20mg', '12000', 'AstraZeneca', 'گەدەی ئەسید'],
    ARRAY['Metformin 850mg', '7500', 'Merck', 'شەکرە'],
    ARRAY['Atorvastatin 20mg', '15000', 'Pfizer', 'چەوری خوێن'],
    ARRAY['Azithromycin 500mg', '18000', 'Teva', 'ئەنتی بایۆتیک'],
    ARRAY['Cetirizine 10mg', '4500', 'Johnson', 'ئالێرجی'],
    ARRAY['Ibuprofen 400mg', '6000', 'Reckitt', 'مەسکەن'],
    ARRAY['Losartan 50mg', '9500', 'Merck', 'فشاری خوێن'],
    ARRAY['Ciprofloxacin 500mg', '11000', 'Bayer', 'ئەنتی بایۆتیک'],
    ARRAY['Salbutamol Inhaler', '22000', 'GlaxoSmithKline', 'هەناسەبڕکێ'],
    ARRAY['Diclofenac 50mg', '5500', 'Novartis', 'مەسکەن'],
    ARRAY['Pantoprazole 40mg', '14000', 'Takeda', 'گەدەی ئەسید'],
    ARRAY['Metoprolol 50mg', '8000', 'AstraZeneca', 'فشاری خوێن'],
    ARRAY['Vitamin D3 1000IU', '3500', 'Nature Made', 'ڤیتامین'],
    ARRAY['Calcium + Vit D', '6500', 'Sanofi', 'ڤیتامین'],
    ARRAY['Iron Supplement', '4000', 'Vitabiotics', 'ڤیتامین'],
    ARRAY['Multivitamin', '7000', 'Centrum', 'ڤیتامین'],
    ARRAY['Ceftriaxone 1g IV', '25000', 'Roche', 'ئەنتی بایۆتیک'],
    ARRAY['Insulin Glargine', '45000', 'Sanofi', 'شەکرە']
  ];
  
  clients_data TEXT[][] := ARRAY[
    ARRAY['cli-001', 'مخزن ئاسیا'],
    ARRAY['cli-002', 'مخزن هەولێر'],
    ARRAY['cli-003', 'دەرمانخانەی ئارام'],
    ARRAY['cli-004', 'دەرمانخانەی شفاء'],
    ARRAY['cli-005', 'دەرمانخانەی نەشتیمان'],
    ARRAY['cli-006', 'مخزن بابیلۆن'],
    ARRAY['cli-007', 'دەرمانخانەی گوڵان'],
    ARRAY['cli-008', 'دەرمانخانەی سەلام'],
    ARRAY['cli-009', 'مخزن زاگرۆس'],
    ARRAY['cli-010', 'دەرمانخانەی هیوا']
  ];
  
  reps_data TEXT[][] := ARRAY[
    ARRAY['rep-001', 'ڕێباز عەلی'],
    ARRAY['rep-002', 'دانا حەسەن'],
    ARRAY['rep-003', 'شوان محەمەد'],
    ARRAY['rep-004', 'ئاکۆ کەریم']
  ];
  
  pharmacy_data TEXT[][] := ARRAY[
    ARRAY['cli-003', 'دەرمانخانەی ئارام'],
    ARRAY['cli-004', 'دەرمانخانەی شفاء'],
    ARRAY['cli-005', 'دەرمانخانەی نەشتیمان'],
    ARRAY['cli-007', 'دەرمانخانەی گوڵان'],
    ARRAY['cli-008', 'دەرمانخانەی سەلام'],
    ARRAY['cli-010', 'دەرمانخانەی هیوا']
  ];
  
  ci INTEGER;
  ri INTEGER;
  pi INTEGER;
  num_items INTEGER;
  j INTEGER;
  item_idx INTEGER;
  qty INTEGER;
  bonus INTEGER;
  price NUMERIC;
  status_roll INTEGER;
  
BEGIN
  FOR i IN 1..100 LOOP
    ord_id := 'seed-ord-' || lpad(i::text, 3, '0');
    ord_num := 'ORD-' || (900000 + i)::text;
    
    ci := 1 + floor(random() * 10)::int;
    c_id := clients_data[ci][1];
    c_name := clients_data[ci][2];
    
    ri := 1 + floor(random() * 4)::int;
    r_id := reps_data[ri][1];
    r_name := reps_data[ri][2];
    
    -- Order flow based on client type
    IF c_id IN ('cli-001', 'cli-002', 'cli-006', 'cli-009') THEN
      flow := 'STANDARD';
      pi := 1 + floor(random() * 6)::int;
      ph_id := pharmacy_data[pi][1];
      ph_name := pharmacy_data[pi][2];
    ELSIF random() < 0.3 THEN
      flow := 'DIRECT_PHARMACY';
      ph_id := NULL;
      ph_name := NULL;
    ELSE
      flow := 'STANDARD';
      pi := 1 + floor(random() * 6)::int;
      ph_id := pharmacy_data[pi][1];
      ph_name := pharmacy_data[pi][2];
    END IF;
    
    -- Generate 1-6 items
    num_items := 1 + floor(random() * 6)::int;
    items := '[]'::jsonb;
    total := 0;
    
    FOR j IN 1..num_items LOOP
      item_idx := 1 + floor(random() * 20)::int;
      qty := CASE
        WHEN random() < 0.3 THEN 5 + floor(random() * 10)::int
        WHEN random() < 0.7 THEN 20 + floor(random() * 30)::int
        ELSE 50 + floor(random() * 100)::int
      END;
      bonus := CASE
        WHEN random() < 0.4 THEN 0
        WHEN random() < 0.7 THEN floor(qty * 0.1)::int
        ELSE floor(qty * 0.2)::int
      END;
      price := products[item_idx][2]::numeric;
      
      items := items || jsonb_build_object(
        'productId', 'prod-' || lpad(item_idx::text, 3, '0'),
        'productName', products[item_idx][1],
        'quantity', qty,
        'bonusQty', bonus,
        'unitPrice', price,
        'priceTypeId', 'pt-default',
        'priceTypeName', 'نرخی ستاندارد',
        'bonusPct', CASE WHEN bonus > 0 THEN round((bonus::numeric / qty) * 100) ELSE 0 END,
        'repBonusPct', 0,
        'warehouseBonusQty', bonus,
        'repBonusQty', 0,
        'overrideWarehouseFulfillment', false,
        'expiryDate', to_char(now() + (interval '1 month' * (6 + floor(random() * 18)::int)), 'YYYY-MM-DD'),
        'company', products[item_idx][3],
        'batchNumber', 'B' || (2024000 + floor(random() * 1000)::int)::text,
        'category', products[item_idx][4]
      );
      
      total := total + (qty * price);
    END LOOP;
    
    -- Random date in last 90 days
    created := now() - (interval '1 day' * floor(random() * 90)::int) - (interval '1 hour' * floor(random() * 12)::int);
    
    -- Status distribution
    status_roll := floor(random() * 100)::int;
    IF status_roll < 10 THEN
      v_status := 'WAITING';
      delivered := NULL; paid := NULL; reject_reason := '';
      v_driver_id := ''; v_driver_name := ''; v_driver_phone := '';
    ELSIF status_roll < 18 THEN
      v_status := 'IN_PROGRESS';
      delivered := NULL; paid := NULL; reject_reason := '';
      v_driver_id := ''; v_driver_name := ''; v_driver_phone := '';
    ELSIF status_roll < 25 THEN
      v_status := 'READY';
      delivered := NULL; paid := NULL; reject_reason := '';
      v_driver_id := ''; v_driver_name := ''; v_driver_phone := '';
    ELSIF status_roll < 35 THEN
      v_status := 'SENT';
      delivered := NULL; paid := NULL; reject_reason := '';
      v_driver_id := 'drv-001'; v_driver_name := 'کارزان شۆفێر'; v_driver_phone := '07509990001';
    ELSIF status_roll < 55 THEN
      v_status := 'DELIVERED';
      delivered := created + interval '2 days' + (interval '1 hour' * floor(random() * 24)::int);
      paid := NULL; reject_reason := '';
      v_driver_id := 'drv-001'; v_driver_name := 'کارزان شۆفێر'; v_driver_phone := '07509990001';
    ELSIF status_roll < 90 THEN
      v_status := 'PAID';
      delivered := created + interval '2 days';
      paid := delivered + (interval '1 day' * floor(random() * 30)::int);
      reject_reason := '';
      v_driver_id := 'drv-001'; v_driver_name := 'کارزان شۆفێر'; v_driver_phone := '07509990001';
    ELSE
      v_status := 'REJECTED';
      delivered := NULL; paid := NULL;
      reject_reason := CASE floor(random() * 4)::int
        WHEN 0 THEN 'بڕی ناکافی لە مەخزەندا'
        WHEN 1 THEN 'هەڵەی نرخ'
        WHEN 2 THEN 'کڕیار هەڵیوەشاندەوە'
        ELSE 'بەرهەم بەردەست نییە'
      END;
      v_driver_id := ''; v_driver_name := ''; v_driver_phone := '';
    END IF;
    
    -- Some orders have notes
    v_notes := '';
    IF random() < 0.2 THEN
      v_notes := CASE floor(random() * 5)::int
        WHEN 0 THEN 'تکایە خێرا بنێرن'
        WHEN 1 THEN 'پاکەتەکان جیاواز بکەنەوە'
        WHEN 2 THEN 'پەیوەندی بکەن پێش نێردن'
        WHEN 3 THEN 'داواکاری فریا'
        ELSE 'تکایە لەگەڵ وەسڵ بنێرن'
      END;
    END IF;
    
    INSERT INTO orders (
      id, order_number, client_id, client_name, rep_id, rep_name,
      order_flow, pharmacy_id, pharmacy_name,
      items, status, total_amount, notes,
      driver_id, driver_name, driver_phone,
      signed_invoice_url, signed_receipt_url,
      delivered_at, paid_at, rejection_reason,
      created_at
    ) VALUES (
      ord_id, ord_num, c_id, c_name, r_id, r_name,
      flow, ph_id, ph_name,
      items, v_status, total, v_notes,
      v_driver_id, v_driver_name, v_driver_phone,
      '', '',
      delivered, paid, reject_reason,
      created
    )
    ON CONFLICT (id) DO NOTHING;
    
  END LOOP;
  
  -- Update client balances: sum of DELIVERED (unpaid) orders
  UPDATE clients c SET balance = COALESCE((
    SELECT SUM(o.total_amount)
    FROM orders o
    WHERE o.client_id = c.id AND o.status = 'DELIVERED'
  ), 0);
  
END $$;

-- Verify results
SELECT status, count(*) as cnt FROM orders WHERE id LIKE 'seed-ord-%' GROUP BY status ORDER BY cnt DESC;
