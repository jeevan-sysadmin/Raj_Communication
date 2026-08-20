DROP TRIGGER IF EXISTS `trg_service_orders_delivery_update`;
DROP TRIGGER IF EXISTS `trg_service_order_product_delivery`;

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

CREATE TRIGGER `trg_service_order_product_delivery`
AFTER UPDATE ON `service_order_products`
FOR EACH ROW
BEGIN
    DECLARE v_client_id INT;
    DECLARE v_order_code VARCHAR(50);
    DECLARE v_client_name VARCHAR(255);
    DECLARE v_client_phone VARCHAR(20);
    DECLARE v_client_address TEXT;
    DECLARE v_product_name VARCHAR(255);
    DECLARE v_serial_number VARCHAR(255);
    DECLARE v_delivery_code VARCHAR(20);

    IF LOWER(NEW.product_status) IN ('deliveryed', 'delivered')
       AND LOWER(IFNULL(OLD.product_status, '')) NOT IN ('deliveryed', 'delivered') THEN

        SELECT so.client_id, so.order_code, c.full_name, c.phone, c.address
        INTO v_client_id, v_order_code, v_client_name, v_client_phone, v_client_address
        FROM service_orders so
        LEFT JOIN clients c ON c.id = so.client_id
        WHERE so.id = NEW.order_id
        LIMIT 1;

        SELECT p.product_name, p.serial_number
        INTO v_product_name, v_serial_number
        FROM products p
        WHERE p.id = NEW.product_id
        LIMIT 1;

        SET v_delivery_code = CONCAT(
            'DEL',
            DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
            LPAD(NEW.product_id, 5, '0')
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
            NEW.order_id,
            v_serial_number,
            v_delivery_code,
            'inhand',
            v_client_address,
            v_client_name,
            v_client_phone,
            CURDATE(),
            CURTIME(),
            NOW(),
            'System Auto-assigned',
            'delivered',
            CONCAT(
                'Auto-created from service_order_products for order ',
                v_order_code,
                ' product ',
                COALESCE(v_product_name, CONCAT('Product #', NEW.product_id))
            ),
            NEW.product_id,
            JSON_ARRAY(NEW.product_id),
            CASE
                WHEN v_serial_number IS NULL OR v_serial_number = '' THEN NULL
                ELSE JSON_ARRAY(v_serial_number)
            END
        FROM DUAL
        WHERE NOT EXISTS (
            SELECT 1
            FROM deliveries d
            WHERE d.order_id = NEW.order_id
              AND d.product_id = NEW.product_id
        );
    END IF;
END$$

DELIMITER ;
