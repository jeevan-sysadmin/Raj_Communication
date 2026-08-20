DROP PROCEDURE IF EXISTS `sp_add_delivery_item`;

DELIMITER $$

CREATE PROCEDURE `sp_add_delivery_item`(
    IN p_order_id INT,
    IN p_client_id INT,
    IN p_order_code VARCHAR(50),
    IN p_product_id INT,
    IN p_notes VARCHAR(255)
)
BEGIN
    DECLARE v_client_name VARCHAR(255) DEFAULT '';
    DECLARE v_client_phone VARCHAR(50) DEFAULT '';
    DECLARE v_client_address TEXT DEFAULT NULL;
    DECLARE v_product_name VARCHAR(255) DEFAULT '';
    DECLARE v_serial_number VARCHAR(255) DEFAULT NULL;
    DECLARE v_handover_type VARCHAR(50) DEFAULT 'inhand';
    DECLARE v_delivery_type VARCHAR(50) DEFAULT 'inhand';
    DECLARE v_delivery_code VARCHAR(32) DEFAULT NULL;
    DECLARE v_delivery_id INT DEFAULT NULL;

    IF p_order_id IS NULL OR p_order_id <= 0 OR p_product_id IS NULL OR p_product_id <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid order/product input for sp_add_delivery_item';
    END IF;

    SELECT
        COALESCE(NULLIF(TRIM(c.full_name), ''), ''),
        COALESCE(NULLIF(TRIM(c.phone), ''), ''),
        c.address,
        COALESCE(NULLIF(TRIM(so.handover_type), ''), 'inhand')
    INTO
        v_client_name,
        v_client_phone,
        v_client_address,
        v_handover_type
    FROM service_orders so
    LEFT JOIN clients c ON c.id = so.client_id
    WHERE so.id = p_order_id
    LIMIT 1;

    SELECT
        COALESCE(NULLIF(TRIM(product_name), ''), ''),
        NULLIF(TRIM(serial_number), '')
    INTO
        v_product_name,
        v_serial_number
    FROM products
    WHERE id = p_product_id
    LIMIT 1;

    SET v_delivery_type = CASE
        WHEN LOWER(TRIM(COALESCE(v_handover_type, 'inhand'))) IN ('pickup', 'in_hand') THEN 'inhand'
        WHEN LOWER(TRIM(COALESCE(v_handover_type, 'inhand'))) = 'parcel_service' THEN 'parcelservice'
        WHEN LOWER(TRIM(COALESCE(v_handover_type, 'inhand'))) IN ('inhand', 'courier', 'parcelservice') THEN LOWER(TRIM(v_handover_type))
        ELSE 'inhand'
    END;

    SELECT id
    INTO v_delivery_id
    FROM deliveries
    WHERE order_id = p_order_id
      AND product_id = p_product_id
    ORDER BY id DESC
    LIMIT 1;

    IF v_delivery_id IS NULL THEN
        SET v_delivery_code = CONCAT(
            'DEL',
            DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
            LPAD(CAST(FLOOR(RAND() * 100) AS CHAR), 2, '0')
        );

        WHILE EXISTS (
            SELECT 1
            FROM deliveries
            WHERE delivery_code = v_delivery_code
        ) DO
            SET v_delivery_code = CONCAT(
                'DEL',
                DATE_FORMAT(NOW(), '%y%m%d%H%i%s'),
                LPAD(CAST(FLOOR(RAND() * 100) AS CHAR), 2, '0')
            );
        END WHILE;

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
            product_id,
            product_ids,
            serial_numbers,
            delivery_type_map
        ) VALUES (
            p_order_id,
            v_serial_number,
            v_delivery_code,
            v_delivery_type,
            v_client_address,
            v_client_name,
            v_client_phone,
            CURDATE(),
            CURTIME(),
            NOW(),
            'System Auto-assigned',
            'delivered',
            COALESCE(NULLIF(TRIM(p_notes), ''), CONCAT('Auto-created from Service Order for order ', COALESCE(p_order_code, CONCAT('#', p_order_id)), ' product ', COALESCE(NULLIF(v_product_name, ''), CONCAT('Product #', p_product_id)))),
            p_product_id,
            JSON_ARRAY(p_product_id),
            CASE
                WHEN v_serial_number IS NULL OR v_serial_number = '' THEN NULL
                ELSE JSON_ARRAY(v_serial_number)
            END,
            JSON_OBJECT(CAST(p_product_id AS CHAR), v_delivery_type)
        );

        SET v_delivery_id = LAST_INSERT_ID();
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'delivery_items'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM delivery_items
            WHERE delivery_id = v_delivery_id
              AND product_id = p_product_id
        ) THEN
            INSERT INTO delivery_items (delivery_id, product_id, serial_number, created_at)
            VALUES (v_delivery_id, p_product_id, v_serial_number, NOW());
        END IF;
    END IF;
END$$

DELIMITER ;
