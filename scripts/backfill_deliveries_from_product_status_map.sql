-- Backfill missing deliveries rows from delivered product_status_map entries.
-- Safe to run multiple times because it only inserts rows missing by (order_id, product_id).

START TRANSACTION;

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS product_id INT(11) NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS product_ids LONGTEXT NULL AFTER product_id,
  ADD COLUMN IF NOT EXISTS serial_numbers LONGTEXT NULL AFTER product_ids,
  ADD COLUMN IF NOT EXISTS serial_number VARCHAR(255) NULL AFTER order_id;

ALTER TABLE deliveries
  ADD UNIQUE KEY IF NOT EXISTS uq_deliveries_order_product (order_id, product_id),
  ADD KEY IF NOT EXISTS idx_deliveries_order_id (order_id),
  ADD KEY IF NOT EXISTS idx_deliveries_status_date (status, scheduled_date);

WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 1
  FROM seq
  WHERE n < 255
)
INSERT INTO deliveries (
  order_id,
  serial_number,
  delivery_code,
  delivery_type,
  address,
  contact_person,
  contact_phone,
  scheduled_date,
  scheduled_time,
  delivered_date,
  delivery_person,
  status,
  notes,
  created_at,
  updated_at,
  product_id,
  product_ids,
  serial_numbers
)
SELECT
  so.id AS order_id,
  NULLIF(
    COALESCE(
      JSON_UNQUOTE(
        JSON_EXTRACT(
          CASE
            WHEN JSON_VALID(so.product_serial_numbers) AND COALESCE(JSON_LENGTH(so.product_serial_numbers), 0) > 0 THEN so.product_serial_numbers
            WHEN COALESCE(NULLIF(TRIM(so.serial_number), ''), '') <> '' THEN JSON_ARRAY(so.serial_number)
            ELSE JSON_ARRAY()
          END,
          CONCAT('$[', seq.n, ']')
        )
      ),
      p.serial_number,
      ''
    ),
    ''
  ) AS serial_number,
  CONCAT(
    'DEL',
    DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
    LPAD(MOD(so.id, 1000), 3, '0'),
    LPAD(MOD(p.id, 100), 2, '0')
  ) AS delivery_code,
  CASE
    WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(so.handover_type_map, CONCAT('$."', CAST(p.id AS CHAR), '"'))), '')) IN ('inhand', 'courier', 'parcelservice')
      THEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(so.handover_type_map, CONCAT('$."', CAST(p.id AS CHAR), '"'))))
    WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(so.handover_type_map, CONCAT('$."', CAST(p.id AS CHAR), '"'))), '')) IN ('in_hand', 'pickup')
      THEN 'inhand'
    WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(so.handover_type_map, CONCAT('$."', CAST(p.id AS CHAR), '"'))), '')) IN ('parcel_service', 'delivery')
      THEN 'parcelservice'
    WHEN LOWER(COALESCE(so.handover_type, '')) IN ('courier', 'parcelservice', 'inhand')
      THEN LOWER(so.handover_type)
    WHEN LOWER(COALESCE(so.handover_type, '')) IN ('in_hand', 'pickup')
      THEN 'inhand'
    WHEN LOWER(COALESCE(so.handover_type, '')) IN ('parcel_service', 'delivery')
      THEN 'parcelservice'
    ELSE 'inhand'
  END AS delivery_type,
  c.address,
  c.full_name AS contact_person,
  c.phone AS contact_phone,
  DATE(
    COALESCE(
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(so.product_status_dates_map, CONCAT('$."', CAST(p.id AS CHAR), '".deliveryed'))), ''),
      so.updated_at,
      so.created_at,
      NOW()
    )
  ) AS scheduled_date,
  TIME(
    COALESCE(
      NULLIF(JSON_UNQUOTE(JSON_EXTRACT(so.product_status_dates_map, CONCAT('$."', CAST(p.id AS CHAR), '".deliveryed'))), ''),
      so.updated_at,
      so.created_at,
      NOW()
    )
  ) AS scheduled_time,
  COALESCE(
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(so.product_status_dates_map, CONCAT('$."', CAST(p.id AS CHAR), '".deliveryed'))), ''),
    so.updated_at,
    so.created_at,
    NOW()
  ) AS delivered_date,
  'System Auto-assigned' AS delivery_person,
  'delivered' AS status,
  CONCAT('Auto-created from product_status_map for order ', so.order_code, ' product ', COALESCE(p.product_name, CONCAT('Product #', p.id))) AS notes,
  COALESCE(
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(so.product_status_dates_map, CONCAT('$."', CAST(p.id AS CHAR), '".deliveryed'))), ''),
    so.updated_at,
    so.created_at,
    NOW()
  ) AS created_at,
  COALESCE(
    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(so.product_status_dates_map, CONCAT('$."', CAST(p.id AS CHAR), '".deliveryed'))), ''),
    so.updated_at,
    so.created_at,
    NOW()
  ) AS updated_at,
  p.id AS product_id,
  JSON_ARRAY(p.id) AS product_ids,
  CASE
    WHEN NULLIF(
      COALESCE(
        JSON_UNQUOTE(
          JSON_EXTRACT(
            CASE
              WHEN JSON_VALID(so.product_serial_numbers) AND COALESCE(JSON_LENGTH(so.product_serial_numbers), 0) > 0 THEN so.product_serial_numbers
              WHEN COALESCE(NULLIF(TRIM(so.serial_number), ''), '') <> '' THEN JSON_ARRAY(so.serial_number)
              ELSE JSON_ARRAY()
            END,
            CONCAT('$[', seq.n, ']')
          )
        ),
        p.serial_number,
        ''
      ),
      ''
    ) IS NOT NULL
      THEN JSON_ARRAY(
        NULLIF(
          COALESCE(
            JSON_UNQUOTE(
              JSON_EXTRACT(
                CASE
                  WHEN JSON_VALID(so.product_serial_numbers) AND COALESCE(JSON_LENGTH(so.product_serial_numbers), 0) > 0 THEN so.product_serial_numbers
                  WHEN COALESCE(NULLIF(TRIM(so.serial_number), ''), '') <> '' THEN JSON_ARRAY(so.serial_number)
                  ELSE JSON_ARRAY()
                END,
                CONCAT('$[', seq.n, ']')
              )
            ),
            p.serial_number,
            ''
          ),
          ''
        )
      )
    ELSE NULL
  END AS serial_numbers
FROM service_orders so
LEFT JOIN clients c
  ON c.id = so.client_id
JOIN seq
  ON seq.n < JSON_LENGTH(
    CASE
      WHEN JSON_VALID(so.product_ids) AND COALESCE(JSON_LENGTH(so.product_ids), 0) > 0 THEN so.product_ids
      WHEN so.product_id IS NOT NULL AND so.product_id <> 0 THEN JSON_ARRAY(so.product_id)
      ELSE JSON_ARRAY()
    END
  )
JOIN products p
  ON p.id = CAST(
    JSON_UNQUOTE(
      JSON_EXTRACT(
        CASE
          WHEN JSON_VALID(so.product_ids) AND COALESCE(JSON_LENGTH(so.product_ids), 0) > 0 THEN so.product_ids
          WHEN so.product_id IS NOT NULL AND so.product_id <> 0 THEN JSON_ARRAY(so.product_id)
          ELSE JSON_ARRAY()
        END,
        CONCAT('$[', seq.n, ']')
      )
    ) AS UNSIGNED
  )
LEFT JOIN deliveries d
  ON d.order_id = so.id
 AND d.product_id = p.id
WHERE d.id IS NULL
  AND LOWER(
    COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(so.product_status_map, CONCAT('$."', CAST(p.id AS CHAR), '"'))),
      'pending'
    )
  ) IN ('deliveryed', 'delivered');

INSERT INTO delivery_items (delivery_id, product_id, serial_number, created_at)
SELECT
  d.id,
  d.product_id,
  d.serial_number,
  COALESCE(d.created_at, NOW())
FROM deliveries d
LEFT JOIN delivery_items di
  ON di.delivery_id = d.id
 AND di.product_id = d.product_id
WHERE d.status = 'delivered'
  AND d.product_id IS NOT NULL
  AND di.id IS NULL;

COMMIT;

-- Verification queries
SELECT COUNT(*) AS deliveries_count FROM deliveries;

SELECT
  COUNT(*) AS delivered_products_in_service_orders
FROM service_orders so
JOIN (
  WITH RECURSIVE seq AS (
    SELECT 0 AS n
    UNION ALL
    SELECT n + 1
    FROM seq
    WHERE n < 255
  )
  SELECT
    so_inner.id AS order_id,
    CAST(
      JSON_UNQUOTE(
        JSON_EXTRACT(
          CASE
            WHEN JSON_VALID(so_inner.product_ids) AND COALESCE(JSON_LENGTH(so_inner.product_ids), 0) > 0 THEN so_inner.product_ids
            WHEN so_inner.product_id IS NOT NULL AND so_inner.product_id <> 0 THEN JSON_ARRAY(so_inner.product_id)
            ELSE JSON_ARRAY()
          END,
          CONCAT('$[', seq.n, ']')
        )
      ) AS UNSIGNED
    ) AS product_id
  FROM service_orders so_inner
  JOIN seq
    ON seq.n < JSON_LENGTH(
      CASE
        WHEN JSON_VALID(so_inner.product_ids) AND COALESCE(JSON_LENGTH(so_inner.product_ids), 0) > 0 THEN so_inner.product_ids
        WHEN so_inner.product_id IS NOT NULL AND so_inner.product_id <> 0 THEN JSON_ARRAY(so_inner.product_id)
        ELSE JSON_ARRAY()
      END
    )
  WHERE LOWER(
    COALESCE(
      JSON_UNQUOTE(
        JSON_EXTRACT(
          so_inner.product_status_map,
          CONCAT(
            '$."',
            CAST(
              CAST(
                JSON_UNQUOTE(
                  JSON_EXTRACT(
                    CASE
                      WHEN JSON_VALID(so_inner.product_ids) AND COALESCE(JSON_LENGTH(so_inner.product_ids), 0) > 0 THEN so_inner.product_ids
                      WHEN so_inner.product_id IS NOT NULL AND so_inner.product_id <> 0 THEN JSON_ARRAY(so_inner.product_id)
                      ELSE JSON_ARRAY()
                    END,
                    CONCAT('$[', seq.n, ']')
                  )
                ) AS UNSIGNED
              ) AS CHAR
            ),
            '"'
          )
        )
      ),
      'pending'
    )
  ) IN ('deliveryed', 'delivered')
) delivered_map
  ON delivered_map.order_id = so.id;

SELECT
  d.id,
  d.delivery_code,
  d.order_id,
  d.product_id,
  d.status,
  d.delivered_date
FROM deliveries d
ORDER BY d.delivered_date DESC, d.id DESC
LIMIT 50;
