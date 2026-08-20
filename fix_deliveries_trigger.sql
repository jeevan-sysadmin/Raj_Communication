DROP TRIGGER IF EXISTS `trg_service_orders_delivery_update`;

DELIMITER $$

CREATE TRIGGER `trg_service_orders_delivery_update`
AFTER UPDATE ON `service_orders`
FOR EACH ROW
BEGIN
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_product_id VARCHAR(30);
    DECLARE v_new_status VARCHAR(30);
    DECLARE v_old_status VARCHAR(30);
    DECLARE v_serial_number VARCHAR(255);
    DECLARE v_delivery_code VARCHAR(20);

    IF NEW.product_status_map IS NOT NULL AND JSON_VALID(NEW.product_status_map) THEN
        SET v_total = JSON_LENGTH(JSON_KEYS(NEW.product_status_map));

        WHILE v_idx < v_total DO
            SET v_product_id = JSON_UNQUOTE(
                JSON_EXTRACT(
                    JSON_KEYS(NEW.product_status_map),
                    CONCAT('$[', v_idx, ']')
                )
            );

            SET v_new_status = LOWER(
                IFNULL(
                    JSON_UNQUOTE(
                        JSON_EXTRACT(
                            NEW.product_status_map,
                            CONCAT('$."', v_product_id, '"')
                        )
                    ),
                    ''
                )
            );

            SET v_old_status = LOWER(
                IFNULL(
                    JSON_UNQUOTE(
                        JSON_EXTRACT(
                            OLD.product_status_map,
                            CONCAT('$."', v_product_id, '"')
                        )
                    ),
                    ''
                )
            );

            IF v_new_status IN ('deliveryed', 'delivered')
               AND v_old_status NOT IN ('deliveryed', 'delivered') THEN

                SELECT p.serial_number
                INTO v_serial_number
                FROM products p
                WHERE p.id = CAST(v_product_id AS UNSIGNED)
                LIMIT 1;

                SET v_delivery_code = CONCAT(
                    'DEL',
                    DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
                    LPAD(CAST(v_product_id AS UNSIGNED), 5, '0')
                );

                INSERT INTO deliveries
                (
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
                    product_id,
                    product_ids,
                    serial_numbers
                )
                SELECT
                    NEW.id,
                    v_serial_number,
                    v_delivery_code,
                    'inhand',
                    c.address,
                    c.full_name,
                    c.phone,
                    CURDATE(),
                    CURTIME(),
                    NOW(),
                    'System Auto-assigned',
                    'delivered',
                    CONCAT(
                        'Auto-created from product_status_map for order ',
                        NEW.order_code,
                        ' product ',
                        p.product_name
                    ),
                    CAST(v_product_id AS UNSIGNED),
                    JSON_ARRAY(CAST(v_product_id AS UNSIGNED)),
                    CASE
                        WHEN v_serial_number IS NULL OR v_serial_number = '' THEN NULL
                        ELSE JSON_ARRAY(v_serial_number)
                    END
                FROM clients c
                JOIN products p
                    ON p.id = CAST(v_product_id AS UNSIGNED)
                WHERE c.id = NEW.client_id
                  AND NOT EXISTS (
                      SELECT 1
                      FROM deliveries d
                      WHERE d.order_id = NEW.id
                        AND d.product_id = CAST(v_product_id AS UNSIGNED)
                  );
            END IF;

            SET v_idx = v_idx + 1;
        END WHILE;
    END IF;
END$$

DELIMITER ;


INSERT INTO deliveries
(
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
    product_id,
    product_ids,
    serial_numbers
)
SELECT
    so.id,
    p.serial_number,
    CONCAT(
        'DEL',
        DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
        LPAD(jt.product_id, 5, '0')
    ) AS delivery_code,
    'inhand',
    c.address,
    c.full_name,
    c.phone,
    CURDATE(),
    CURTIME(),
    NOW(),
    'System Auto-assigned',
    'delivered',
    CONCAT(
        'Backfill from product_status_map for order ',
        so.order_code,
        ' product ',
        p.product_name
    ),
    jt.product_id,
    JSON_ARRAY(jt.product_id),
    CASE
        WHEN p.serial_number IS NULL OR p.serial_number = '' THEN NULL
        ELSE JSON_ARRAY(p.serial_number)
    END
FROM service_orders so
JOIN clients c
    ON c.id = so.client_id
JOIN (
    SELECT
        so1.id AS order_id,
        CAST(
            JSON_UNQUOTE(
                JSON_EXTRACT(
                    JSON_KEYS(so1.product_status_map),
                    CONCAT('$[', n.n, ']')
                )
            ) AS UNSIGNED
        ) AS product_id,
        LOWER(
            JSON_UNQUOTE(
                JSON_EXTRACT(
                    so1.product_status_map,
                    CONCAT(
                        '$."',
                        JSON_UNQUOTE(
                            JSON_EXTRACT(
                                JSON_KEYS(so1.product_status_map),
                                CONCAT('$[', n.n, ']')
                            )
                        ),
                        '"'
                    )
                )
            )
        ) AS product_status
    FROM service_orders so1
    JOIN (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
        SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
        SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL
        SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL
        SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL
        SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL
        SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL
        SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30 UNION ALL SELECT 31 UNION ALL
        SELECT 32 UNION ALL SELECT 33 UNION ALL SELECT 34 UNION ALL SELECT 35 UNION ALL
        SELECT 36 UNION ALL SELECT 37 UNION ALL SELECT 38 UNION ALL SELECT 39 UNION ALL
        SELECT 40 UNION ALL SELECT 41 UNION ALL SELECT 42 UNION ALL SELECT 43 UNION ALL
        SELECT 44 UNION ALL SELECT 45 UNION ALL SELECT 46 UNION ALL SELECT 47 UNION ALL
        SELECT 48 UNION ALL SELECT 49
    ) n
        ON n.n < JSON_LENGTH(JSON_KEYS(so1.product_status_map))
    WHERE so1.product_status_map IS NOT NULL
      AND JSON_VALID(so1.product_status_map)
) jt
    ON jt.order_id = so.id
JOIN products p
    ON p.id = jt.product_id
LEFT JOIN deliveries d
    ON d.order_id = so.id
   AND d.product_id = jt.product_id
WHERE jt.product_status IN ('deliveryed', 'delivered')
  AND d.id IS NULL;
