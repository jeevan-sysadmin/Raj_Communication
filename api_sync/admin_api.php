<?php
// C:\xampp\htdocs\sun_computers\api\admin_api.php

date_default_timezone_set('Asia/Kolkata');

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('html_errors', 0);
ini_set('log_errors', 1);
@ini_set('memory_limit', '512M');
@set_time_limit(0);
@ignore_user_abort(true);

// Include required files
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/jwt_helper.php';

class AdminAPI {
    private $conn;
    private $user;
    private $tableColumnCache = [];

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        
        if (!$this->conn) {
            $this->sendError("Database connection failed", 500);
            exit();
        }

        $this->initializeConnectionTimeContext();
        $this->ensureLegacyDeliveryProcedure();

        $this->ensureProductsStockQuantityDefaults();
        $this->ensureServiceOrdersProductQuantityMapColumn();
        
        // Verify authentication
        $this->verifyAuth();
    }

    private function initializeConnectionTimeContext(): void {
        try {
            $this->conn->exec("SET time_zone = '+05:30'");
        } catch (Throwable $e) {
            // Keep request working even if the DB user cannot set session time zone.
        }
    }

    private function ensureLegacyDeliveryProcedure(): void {
        try {
            $schema = (string)$this->conn->query('SELECT DATABASE()')->fetchColumn();
            if ($schema === '') {
                return;
            }

            $stmt = $this->conn->prepare(
                "SELECT ROUTINE_NAME
                 FROM information_schema.ROUTINES
                 WHERE ROUTINE_SCHEMA = :schema
                   AND ROUTINE_TYPE = 'PROCEDURE'
                   AND ROUTINE_NAME = 'sp_add_delivery_item'"
            );
            $stmt->bindValue(':schema', $schema, PDO::PARAM_STR);
            $stmt->execute();
            if ($stmt->fetch(PDO::FETCH_ASSOC)) {
                return;
            }

            $procedureSql = <<<'SQL'
CREATE PROCEDURE sp_add_delivery_item(
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
END
SQL;

            $this->conn->exec($procedureSql);
        } catch (Throwable $e) {
            error_log('Failed to ensure sp_add_delivery_item procedure: ' . $e->getMessage());
        }
    }

    private function isMissingDeliveryProcedureError(Throwable $e): bool {
        $message = strtolower($e->getMessage());

        return str_contains($message, 'sp_add_delivery_item')
            && (str_contains($message, 'does not exist') || str_contains($message, 'procedure'));
    }

    private function getDeliveryProcedureRepairMessage(): string {
        return "Database schema is missing stored procedure sp_add_delivery_item. Import scripts/create_sp_add_delivery_item.sql or re-import the updated raj_communication SQL dump, then try the order update again.";
    }

    private function currentTimestamp(): string {
        return date('Y-m-d H:i:s');
    }

    private function normalizeProductFlowStatusValue($value): string {
        $normalized = strtolower(trim((string)$value));
        if ($normalized === 'rajtocom' || $normalized === 'rajtocompany') {
            return 'rajtocom';
        }
        if ($normalized === 'comtoraj' || $normalized === 'companytoraj') {
            return 'comtoraj';
        }
        if ($normalized === 'deliveryed' || $normalized === 'delivered') {
            return 'deliveryed';
        }
        return 'pending';
    }

    private function buildProductStatusDatesMapForCreate(array $productIds, array $statusMap, string $timestamp): array {
        $datesMap = [];

        foreach ($productIds as $productId) {
            $key = (string)((int)$productId);
            if ($key === '0') {
                continue;
            }

            $status = isset($statusMap[$key])
                ? $this->normalizeProductFlowStatusValue($statusMap[$key])
                : 'pending';

            $datesMap[$key] = [
                'pending' => $timestamp,
                'rajtocom' => null,
                'comtoraj' => null,
                'deliveryed' => null,
            ];

            if ($status === 'rajtocom') {
                $datesMap[$key]['rajtocom'] = $timestamp;
            } elseif ($status === 'comtoraj') {
                $datesMap[$key]['rajtocom'] = $timestamp;
                $datesMap[$key]['comtoraj'] = $timestamp;
            } elseif ($status === 'deliveryed') {
                $datesMap[$key]['rajtocom'] = $timestamp;
                $datesMap[$key]['comtoraj'] = $timestamp;
                $datesMap[$key]['deliveryed'] = $timestamp;
            }
        }

        return $datesMap;
    }

    private function normalizeProductStatusDatesMapValue($value): array {
        if (is_array($value)) {
            $parsed = $value;
        } elseif (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                return [];
            }
            $parsed = $decoded;
        } else {
            return [];
        }

        $normalized = [];
        foreach ($parsed as $productId => $dates) {
            $key = (string)((int)$productId);
            if ($key === '0' || !is_array($dates)) {
                continue;
            }
            $normalized[$key] = [
                'pending' => isset($dates['pending']) && trim((string)$dates['pending']) !== '' ? trim((string)$dates['pending']) : null,
                'rajtocom' => isset($dates['rajtocom']) && trim((string)$dates['rajtocom']) !== '' ? trim((string)$dates['rajtocom']) : null,
                'comtoraj' => isset($dates['comtoraj']) && trim((string)$dates['comtoraj']) !== '' ? trim((string)$dates['comtoraj']) : null,
                'deliveryed' => isset($dates['deliveryed']) && trim((string)$dates['deliveryed']) !== '' ? trim((string)$dates['deliveryed']) : null,
            ];
        }

        return $normalized;
    }

    private function mergeProductStatusDatesMap(array $productIds, array $newStatusMap, array $existingDatesMap, string $timestamp): array {
        $merged = [];

        foreach ($productIds as $productId) {
            $key = (string)((int)$productId);
            if ($key === '0') {
                continue;
            }

            $status = isset($newStatusMap[$key]) ? $this->normalizeProductFlowStatusValue($newStatusMap[$key]) : 'pending';
            $existing = isset($existingDatesMap[$key]) && is_array($existingDatesMap[$key]) ? $existingDatesMap[$key] : [];
            $row = [
                'pending' => isset($existing['pending']) && $existing['pending'] !== '' ? $existing['pending'] : null,
                'rajtocom' => isset($existing['rajtocom']) && $existing['rajtocom'] !== '' ? $existing['rajtocom'] : null,
                'comtoraj' => isset($existing['comtoraj']) && $existing['comtoraj'] !== '' ? $existing['comtoraj'] : null,
                'deliveryed' => isset($existing['deliveryed']) && $existing['deliveryed'] !== '' ? $existing['deliveryed'] : null,
            ];

            if ($row['pending'] === null) {
                $row['pending'] = $timestamp;
            }
            if ($status === 'rajtocom') {
                $row['rajtocom'] = $timestamp;
            } elseif ($status === 'comtoraj') {
                if ($row['rajtocom'] === null) {
                    $row['rajtocom'] = $timestamp;
                }
                $row['comtoraj'] = $timestamp;
            } elseif ($status === 'deliveryed') {
                if ($row['rajtocom'] === null) {
                    $row['rajtocom'] = $timestamp;
                }
                if ($row['comtoraj'] === null) {
                    $row['comtoraj'] = $timestamp;
                }
                $row['deliveryed'] = $timestamp;
            }

            $merged[$key] = $row;
        }

        return $merged;
    }

    private function ensureProductsStockQuantityDefaults(): void {
        try {
            if (!$this->tableHasColumn('products', 'stock_quantity')) {
                return;
            }
            $this->conn->exec("ALTER TABLE products MODIFY stock_quantity INT(10) UNSIGNED NOT NULL DEFAULT 1");
            $this->conn->exec("UPDATE products SET stock_quantity = 1 WHERE stock_quantity IS NULL OR stock_quantity <= 0");
        } catch (Throwable $e) {
            // Non-fatal hardening: creation/update flow should continue even if schema patch is not allowed.
        }
    }

    private function ensureServiceOrdersProductQuantityMapColumn(): void {
        try {
            if (!$this->tableExists('service_orders')) {
                return;
            }

            if (!$this->tableHasColumn('service_orders', 'product_quantity_map')) {
                $afterClause = $this->tableHasColumn('service_orders', 'product_ids')
                    ? ' AFTER product_ids'
                    : '';
                $this->conn->exec("ALTER TABLE service_orders ADD COLUMN product_quantity_map LONGTEXT NULL{$afterClause}");
            }

            $this->conn->exec("UPDATE service_orders SET product_quantity_map = '{}' WHERE product_quantity_map IS NULL OR TRIM(product_quantity_map) = ''");
            $this->conn->exec("ALTER TABLE service_orders MODIFY COLUMN product_quantity_map LONGTEXT NOT NULL");
        } catch (Throwable $e) {
            // Non-fatal hardening: order flow should continue even if schema patch is not allowed.
        }
    }
    
    private function verifyAuth() {
        $token = $this->getBearerToken();
        
        if (!$token) {
            $this->sendError("Authentication token required", 401);
            exit();
        }
        
        $payload = JWT::decode($token);
        
        if (!$payload) {
            $this->sendError("Invalid or expired token", 401);
            exit();
        }
        
        $this->user = $payload;
        
        // Check if user is admin
        if ($this->user['role'] !== 'admin') {
            $this->sendError("Admin access required", 403);
            exit();
        }
    }

    private function normalizeIdList($value): array {
        if ($value === null) {
            return [];
        }

        $list = [];

        if (is_array($value)) {
            $list = $value;
        } elseif (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $list = $decoded;
            } else {
                $list = explode(',', $trimmed);
            }
        } else {
            $list = [$value];
        }

        $ids = [];
        foreach ($list as $entry) {
            $id = (int)$entry;
            if ($id > 0) {
                $ids[] = $id;
            }
        }

        return array_values(array_unique($ids));
    }

    private function normalizePositiveQuantity($value): int {
        $quantity = (int)$value;
        return $quantity > 0 ? $quantity : 1;
    }

    private function normalizeProductQuantityMap($value): array {
        if (is_array($value)) {
            $parsed = $value;
        } elseif (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                if (preg_match('/^\{\s*"(\d+)"\s*\.\s*(\d+)\s*\}$/', $trimmed, $matches)) {
                    $decoded = [$matches[1] => (int)$matches[2]];
                } else {
                    return [];
                }
            }
            $parsed = $decoded;
        } else {
            return [];
        }

        $normalized = [];
        foreach ($parsed as $productId => $quantity) {
            $key = (string)((int)$productId);
            if ($key === '0') {
                continue;
            }
            $normalized[$key] = $this->normalizePositiveQuantity($quantity);
        }

        return $normalized;
    }

    private function buildProductQuantityMapForIds(array $productIds, $sourceMap = null): array {
        $incoming = $this->normalizeProductQuantityMap($sourceMap);
        $normalized = [];

        foreach ($productIds as $productId) {
            $key = (string)((int)$productId);
            if ($key === '0') {
                continue;
            }
            $normalized[$key] = array_key_exists($key, $incoming)
                ? $this->normalizePositiveQuantity($incoming[$key])
                : 1;
        }

        return $normalized;
    }

    private function persistOrderProductQuantityMap(int $orderId, array $quantityMap): void {
        if ($orderId <= 0 || !$this->tableHasColumn('service_orders', 'product_quantity_map')) {
            return;
        }

        $productQuantityMapJson = json_encode($quantityMap);
        $updateStmt = $this->conn->prepare(
            "UPDATE service_orders
             SET product_quantity_map = :product_quantity_map,
                 updated_at = NOW()
             WHERE id = :id"
        );
        $updateStmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        $updateStmt->bindValue(':product_quantity_map', $productQuantityMapJson, PDO::PARAM_STR);
        $updateStmt->execute();

        $verifyStmt = $this->conn->prepare("SELECT product_quantity_map FROM service_orders WHERE id = :id LIMIT 1");
        $verifyStmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        $verifyStmt->execute();
        $storedValue = (string)($verifyStmt->fetch(PDO::FETCH_ASSOC)['product_quantity_map'] ?? '');
        if ($storedValue !== $productQuantityMapJson) {
            throw new Exception("Failed to persist product quantity map");
        }
    }

    private function normalizeProductPayload(array $row): array {
        if ((!isset($row['product_name']) || trim((string)$row['product_name']) === '')) {
            $aliasKeys = ['productName', 'name'];
            foreach ($aliasKeys as $aliasKey) {
                if (isset($row[$aliasKey]) && trim((string)$row[$aliasKey]) !== '') {
                    $row['product_name'] = trim((string)$row[$aliasKey]);
                    break;
                }
            }
        }

        if ((!isset($row['stock_quantity']) || $row['stock_quantity'] === '' || $row['stock_quantity'] === null)) {
            $stockAliasKeys = ['stockQuantity', 'quantity', 'qty'];
            foreach ($stockAliasKeys as $aliasKey) {
                if (array_key_exists($aliasKey, $row) && $row[$aliasKey] !== '' && $row[$aliasKey] !== null) {
                    $row['stock_quantity'] = $row[$aliasKey];
                    break;
                }
            }
        }

        return $row;
    }

    private function getProductCategoryEnumValues(): array {
        try {
            $query = "SELECT COLUMN_TYPE
                      FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = 'products'
                        AND COLUMN_NAME = 'category'
                      LIMIT 1";
            $stmt = $this->conn->query($query);
            $columnType = (string)($stmt->fetch(PDO::FETCH_ASSOC)['COLUMN_TYPE'] ?? '');
            if (!preg_match("/^enum\\((.*)\\)$/i", $columnType, $matches)) {
                return [];
            }

            preg_match_all("/'((?:[^'\\\\]|\\\\.)*)'/", $matches[1], $valueMatches);
            return array_map(static function ($raw) {
                return str_replace("\\'", "'", $raw);
            }, $valueMatches[1] ?? []);
        } catch (Throwable $e) {
            return [];
        }
    }

    private function normalizeDbCategoryValue(string $rawCategory, ?string $existingCategory = null): string {
        $allowed = $this->getProductCategoryEnumValues();
        if (count($allowed) === 0) {
            $allowed = [
                'CAMERA', 'DVR', 'NVR', 'HARDDISK', 'SOLAR CAMERA', 'PTCAMERA', 'SD CARD', 'SSD',
                'POWER SUPPLY', 'MONITOR', 'EXTENDER', 'MEDIA CONVERTER', 'PTZCAMERA', 'POE SWITCH',
                'DESKTOP SWITCH', 'TV', 'UPS', 'OTHERS'
            ];
        }
        $fallback = in_array('OTHERS', $allowed, true) ? 'OTHERS' : ($allowed[0] ?? 'OTHERS');

        $normalized = trim($rawCategory);
        if ($normalized === '') {
            return ($existingCategory && trim($existingCategory) !== '') ? $existingCategory : $fallback;
        }

        foreach ($allowed as $allowedCategory) {
            if (strcasecmp($normalized, $allowedCategory) === 0) return $allowedCategory;
        }

        if (strcasecmp($normalized, 'MEDIA CONVERTER') === 0) {
            foreach ($allowed as $allowedCategory) {
                if (strcasecmp($allowedCategory, 'EDIA CONVERTER') === 0) return $allowedCategory;
            }
        }
        if (strcasecmp($normalized, 'OTHER') === 0) {
            foreach ($allowed as $allowedCategory) {
                if (strcasecmp($allowedCategory, 'OTHERS') === 0) return $allowedCategory;
            }
        }

        return $fallback;
    }

    private function syncOrderProducts(int $orderId, array $productIds, bool $isReplacement): void {
        $deleteStmt = $this->conn->prepare("DELETE FROM service_order_products WHERE order_id = :order_id AND is_replacement = :is_replacement");
        $deleteStmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
        $deleteStmt->bindValue(':is_replacement', $isReplacement ? 1 : 0, PDO::PARAM_INT);
        $deleteStmt->execute();

        if (empty($productIds)) {
            return;
        }

        $insertStmt = $this->conn->prepare("INSERT INTO service_order_products (order_id, product_id, is_replacement, sort_order, created_at)
                                            VALUES (:order_id, :product_id, :is_replacement, :sort_order, NOW())");

        foreach ($productIds as $index => $productId) {
            $insertStmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
            $insertStmt->bindValue(':product_id', (int)$productId, PDO::PARAM_INT);
            $insertStmt->bindValue(':is_replacement', $isReplacement ? 1 : 0, PDO::PARAM_INT);
            $insertStmt->bindValue(':sort_order', (int)$index, PDO::PARAM_INT);
            $insertStmt->execute();
        }
    }

    private function fetchOrderProductsMap(array $orderIds): array {
        if (empty($orderIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $query = "SELECT sop.order_id,
                         sop.is_replacement,
                         GROUP_CONCAT(sop.product_id ORDER BY sop.sort_order SEPARATOR ',') AS product_ids,
                         GROUP_CONCAT(p.product_name ORDER BY sop.sort_order SEPARATOR '||') AS product_names,
                         GROUP_CONCAT(COALESCE(NULLIF(TRIM(p.serial_number), ''), '') ORDER BY sop.sort_order SEPARATOR '||') AS product_serial_numbers
                  FROM service_order_products sop
                  JOIN products p ON sop.product_id = p.id
                  WHERE sop.order_id IN ($placeholders)
                  GROUP BY sop.order_id, sop.is_replacement";

        $stmt = $this->conn->prepare($query);
        $stmt->execute($orderIds);

        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $orderId = (int)$row['order_id'];
            $bucket = ((int)$row['is_replacement'] === 1) ? 'replacement' : 'primary';
            $ids = $row['product_ids'] !== null && $row['product_ids'] !== ''
                ? array_map('intval', explode(',', $row['product_ids']))
                : [];
            $names = $row['product_names'] !== null && $row['product_names'] !== ''
                ? explode('||', $row['product_names'])
                : [];
            $serials = $row['product_serial_numbers'] !== null && $row['product_serial_numbers'] !== ''
                ? array_map(static fn($value) => trim((string)$value), explode('||', $row['product_serial_numbers']))
                : [];
            $map[$orderId][$bucket] = [
                'ids' => $ids,
                'names' => $names,
                'serials' => $serials
            ];
        }

        return $map;
    }

    private function fetchProductNamesByIds(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($id) {
            return $id > 0;
        })));

        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->conn->prepare("SELECT id, product_name FROM products WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $map[(int)$row['id']] = $row['product_name'];
        }

        return $map;
    }

    private function fetchProductDetailsByIds(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($id) {
            return $id > 0;
        })));

        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->conn->prepare("SELECT id, product_name, model, serial_number FROM products WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $map[(int)$row['id']] = [
                'product_name' => (string)($row['product_name'] ?? ''),
                'model' => (string)($row['model'] ?? ''),
                'serial_number' => (string)($row['serial_number'] ?? ''),
            ];
        }

        return $map;
    }

    private function buildNamesFromIds(array $ids, array $nameMap): array {
        $names = [];
        foreach ($ids as $id) {
            if (isset($nameMap[$id])) {
                $names[] = $nameMap[$id];
            }
        }
        return $names;
    }

    private function buildProductFieldListFromIds(array $ids, array $detailsMap, string $field): array {
        $values = [];
        foreach ($ids as $id) {
            $intId = (int)$id;
            if (isset($detailsMap[$intId]) && array_key_exists($field, $detailsMap[$intId])) {
                $values[] = (string)($detailsMap[$intId][$field] ?? '');
            }
        }
        return $values;
    }

    private function getTableColumns(string $table): array {
        if (isset($this->tableColumnCache[$table])) {
            return $this->tableColumnCache[$table];
        }

        $columns = [];

        try {
            $query = "SELECT COLUMN_NAME
                      FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = :table";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':table', $table, PDO::PARAM_STR);
            $stmt->execute();

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                if (!empty($row['COLUMN_NAME'])) {
                    $columns[$row['COLUMN_NAME']] = true;
                }
            }
        } catch (Exception $e) {
            $columns = [];
        }

        $this->tableColumnCache[$table] = $columns;
        return $columns;
    }

    private function tableHasColumn(string $table, string $column): bool {
        $columns = $this->getTableColumns($table);
        return isset($columns[$column]);
    }

    private function tableExists(string $table): bool {
        if (!empty($this->getTableColumns($table))) {
            return true;
        }

        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE :table");
            $stmt->bindValue(':table', $table, PDO::PARAM_STR);
            $stmt->execute();
            return (bool)$stmt->fetch(PDO::FETCH_NUM);
        } catch (Exception $e) {
            return false;
        }
    }

    private function getColumnType(string $table, string $column): ?string {
        try {
            $query = "SELECT COLUMN_TYPE
                      FROM INFORMATION_SCHEMA.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME = :table
                        AND COLUMN_NAME = :column
                      LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':table', $table, PDO::PARAM_STR);
            $stmt->bindValue(':column', $column, PDO::PARAM_STR);
            $stmt->execute();
            $value = $stmt->fetchColumn();
            return $value !== false ? strtolower(trim((string)$value)) : null;
        } catch (Throwable $e) {
            return null;
        }
    }

    private function getEnumColumnValues(string $table, string $column): array {
        $columnType = $this->getColumnType($table, $column);
        if (!$columnType || !preg_match("/^enum\\((.*)\\)$/i", $columnType, $matches)) {
            return [];
        }

        preg_match_all("/'((?:[^'\\\\]|\\\\.)*)'/", $matches[1], $valueMatches);
        return array_map(static function ($raw) {
            return str_replace("\\'", "'", $raw);
        }, $valueMatches[1] ?? []);
    }

    private function isIntegerLikeColumn(?string $columnType): bool {
        if (!$columnType) {
            return false;
        }

        return preg_match('/^(tinyint|smallint|mediumint|int|bigint)\\b/i', $columnType) === 1;
    }

    private function serviceOrderStatusMap(): array {
        return [
            'pending' => 0,
            'scheduled' => 1,
            'process' => 2,
            'ready' => 3,
            'completed' => 4,
            'delivered' => 5,
            'cancelled' => 6,
        ];
    }

    private function normalizeServiceOrderStatusForWrite($value, $fallback = 'pending') {
        $map = $this->serviceOrderStatusMap();
        $columnType = $this->getColumnType('service_orders', 'status');

        if ($this->isIntegerLikeColumn($columnType)) {
            $flipped = array_flip($map);
            if (is_numeric($value) && isset($flipped[(int)$value])) {
                return (int)$value;
            }

            $normalized = strtolower(trim((string)$value));
            if ($normalized === '' || !isset($map[$normalized])) {
                $normalized = strtolower(trim((string)$fallback));
            }

            return $map[$normalized] ?? 0;
        }

        $allowed = $this->getEnumColumnValues('service_orders', 'status');
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            $normalized = strtolower(trim((string)$fallback));
        }

        if (!empty($allowed)) {
            foreach ($allowed as $allowedValue) {
                if (strcasecmp($allowedValue, $normalized) === 0) {
                    return $allowedValue;
                }
            }

            foreach ($allowed as $allowedValue) {
                if (strcasecmp($allowedValue, (string)$fallback) === 0) {
                    return $allowedValue;
                }
            }

            return $allowed[0];
        }

        return $normalized !== '' ? $normalized : (string)$fallback;
    }

    private function normalizeServiceOrderStatusForRead($value): string {
        $map = array_flip($this->serviceOrderStatusMap());
        if (is_numeric($value) && isset($map[(int)$value])) {
            return $map[(int)$value];
        }

        $normalized = strtolower(trim((string)$value));
        return $normalized !== '' ? $normalized : 'pending';
    }

    private function normalizeProductStatusForWrite($value, $fallback = 'active'): string {
        $allowed = $this->getEnumColumnValues('products', 'status');
        $normalized = strtolower(trim((string)$value));
        $fallback = strtolower(trim((string)$fallback));

        if ($normalized === '') {
            $normalized = $fallback !== '' ? $fallback : 'active';
        }

        if (empty($allowed)) {
            $allowed = ['active', 'inactive', 'discontinued', 'out_of_stock', 'handover'];
        }

        foreach ($allowed as $allowedValue) {
            if (strcasecmp($allowedValue, $normalized) === 0) {
                return $allowedValue;
            }
        }

        if (in_array($normalized, ['inactive', 'discontinued', 'out_of_stock'], true)) {
            foreach (['inactive', 'discontinued', 'handover', 'out_of_stock'] as $candidate) {
                foreach ($allowed as $allowedValue) {
                    if (strcasecmp($allowedValue, $candidate) === 0) {
                        return $allowedValue;
                    }
                }
            }
        }

        foreach ($allowed as $allowedValue) {
            if (strcasecmp($allowedValue, $fallback) === 0) {
                return $allowedValue;
            }
        }

        foreach ($allowed as $allowedValue) {
            if (strcasecmp($allowedValue, 'active') === 0) {
                return $allowedValue;
            }
        }

        return $allowed[0];
    }

    private function ensureDeliveriesSchemaColumns(): void {
        try {
            $altered = false;

            if (!$this->tableHasColumn('deliveries', 'product_id')) {
                $this->conn->exec("ALTER TABLE deliveries ADD COLUMN product_id INT(11) NULL AFTER notes");
                $altered = true;
            }

            if (!$this->tableHasColumn('deliveries', 'product_ids')) {
                $this->conn->exec("ALTER TABLE deliveries ADD COLUMN product_ids JSON NULL AFTER product_id");
                $altered = true;
            }

            if (!$this->tableHasColumn('deliveries', 'serial_numbers')) {
                $this->conn->exec("ALTER TABLE deliveries ADD COLUMN serial_numbers JSON NULL AFTER product_ids");
                $altered = true;
            }

            if (!$this->tableHasColumn('deliveries', 'serial_number')) {
                $this->conn->exec("ALTER TABLE deliveries ADD COLUMN serial_number VARCHAR(255) NULL AFTER serial_numbers");
                $altered = true;
            }

            if (!$this->tableHasColumn('deliveries', 'delivery_type_map')) {
                $this->conn->exec("ALTER TABLE deliveries ADD COLUMN delivery_type_map JSON NULL AFTER serial_number");
                $altered = true;
            }

            if ($altered) {
                unset($this->tableColumnCache['deliveries']);
            }
        } catch (Exception $e) {
            // Do not hard-fail; update_order can still proceed in DBs without this trigger dependency.
        }
    }

    private function parseJsonArraySafe($value): array {
        if (is_array($value)) return $value;
        if (!is_string($value)) return [];
        $trimmed = trim($value);
        if ($trimmed === '') return [];
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;
        return array_map('trim', explode(',', $trimmed));
    }

    private function normalizeStatusMapSafe($value): array {
        if (is_array($value)) return $value;
        if (!is_string($value)) return [];
        $trimmed = trim($value);
        if ($trimmed === '') return [];
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;
        return [];
    }

    private function syncDeliveryItemsForOrder(int $orderId): void {
        if (!$this->tableExists('delivery_items')) {
            return;
        }

        // Build item-level delivery data from service order arrays/maps for Delivery Tracking UI.
        $stmt = $this->conn->prepare("SELECT id, product_ids, product_serial_numbers, product_status_map FROM service_orders WHERE id = :id LIMIT 1");
        $stmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();
        $order = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) return;

        $productIds = array_values(array_filter(array_map('intval', $this->parseJsonArraySafe($order['product_ids'] ?? '')), fn($id) => $id > 0));
        $serials = array_map(fn($v) => trim((string)$v), $this->parseJsonArraySafe($order['product_serial_numbers'] ?? ''));
        $statusMapRaw = $this->normalizeStatusMapSafe($order['product_status_map'] ?? '');

        $statusByProduct = [];
        foreach ($statusMapRaw as $pid => $status) {
            $statusByProduct[(int)$pid] = strtolower(trim((string)$status));
        }

        // Choose a delivery row for this order to attach items (latest delivered preferred).
        $deliveryStmt = $this->conn->prepare("
            SELECT id FROM deliveries
            WHERE order_id = :order_id
            ORDER BY CASE WHEN status = 'delivered' THEN 0 ELSE 1 END, id DESC
            LIMIT 1
        ");
        $deliveryStmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
        $deliveryStmt->execute();
        $deliveryRow = $deliveryStmt->fetch(PDO::FETCH_ASSOC);
        if (!$deliveryRow) return;
        $deliveryId = (int)$deliveryRow['id'];

        $deleteStmt = $this->conn->prepare("DELETE FROM delivery_items WHERE delivery_id = :delivery_id");
        $deleteStmt->bindValue(':delivery_id', $deliveryId, PDO::PARAM_INT);
        $deleteStmt->execute();

        $insertStmt = $this->conn->prepare("
            INSERT INTO delivery_items (delivery_id, product_id, serial_number, created_at)
            VALUES (:delivery_id, :product_id, :serial_number, NOW())
        ");

        foreach ($productIds as $index => $productId) {
            $status = $statusByProduct[$productId] ?? 'pending';
            if ($status !== 'deliveryed' && $status !== 'delivered') continue;
            $serial = $serials[$index] ?? null;
            $serial = is_string($serial) && trim($serial) !== '' ? trim($serial) : null;
            $insertStmt->bindValue(':delivery_id', $deliveryId, PDO::PARAM_INT);
            $insertStmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
            $insertStmt->bindValue(':serial_number', $serial, $serial === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
            $insertStmt->execute();
        }
    }

    private function normalizeDeliveryTypeForInsert($value): string {
        $normalized = strtolower(trim((string)$value));
        if ($normalized === 'in_hand' || $normalized === 'pickup') return 'inhand';
        if ($normalized === 'parcel_service') return 'parcelservice';
        if (in_array($normalized, ['inhand', 'courier', 'parcelservice'], true)) return $normalized;
        return 'inhand';
    }

    private function generateUniqueDeliveryCode(): string {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $candidate = 'DEL' . date('ymdHis') . str_pad((string)random_int(0, 99), 2, '0', STR_PAD_LEFT);
            $checkStmt = $this->conn->prepare("SELECT id FROM deliveries WHERE delivery_code = :delivery_code LIMIT 1");
            $checkStmt->bindValue(':delivery_code', $candidate, PDO::PARAM_STR);
            $checkStmt->execute();
            if (!$checkStmt->fetch(PDO::FETCH_ASSOC)) {
                return $candidate;
            }
            usleep(20000);
        }

        return 'DEL' . date('ymdHis') . str_pad((string)random_int(100, 999), 3, '0', STR_PAD_LEFT);
    }

    private function ensureDeliveriesExistForOrder(int $orderId, array $statusMap): void {
        if ($orderId <= 0 || empty($statusMap)) {
            return;
        }

        $this->ensureDeliveriesSchemaColumns();

        $deliveredProductIds = [];
        foreach ($statusMap as $productId => $status) {
            $normalizedStatus = $this->normalizeProductFlowStatusValue($status);
            $pid = (int)$productId;
            if ($pid > 0 && $normalizedStatus === 'deliveryed') {
                $deliveredProductIds[] = $pid;
            }
        }
        $deliveredProductIds = array_values(array_unique($deliveredProductIds));
        if (empty($deliveredProductIds)) {
            return;
        }

        $orderColumns = ['id', 'order_code', 'client_id', 'product_id', 'product_ids', 'handover_type', 'handover_type_map'];
        if ($this->tableHasColumn('service_orders', 'product_serial_numbers')) {
            $orderColumns[] = 'product_serial_numbers';
        }
        $orderQuery = "SELECT " . implode(', ', $orderColumns) . " FROM service_orders WHERE id = :id LIMIT 1";
        $orderStmt = $this->conn->prepare($orderQuery);
        $orderStmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        $orderStmt->execute();
        $order = $orderStmt->fetch(PDO::FETCH_ASSOC);
        if (!$order) {
            return;
        }

        $clientStmt = $this->conn->prepare("SELECT full_name, phone, address FROM clients WHERE id = :id LIMIT 1");
        $clientStmt->bindValue(':id', (int)($order['client_id'] ?? 0), PDO::PARAM_INT);
        $clientStmt->execute();
        $client = $clientStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $productIds = $this->normalizeIdList($order['product_ids'] ?? ($order['product_id'] ?? null));
        $serials = $this->parseJsonArraySafe($order['product_serial_numbers'] ?? '');
        $serialByProductId = [];
        foreach ($productIds as $index => $productId) {
            $serial = isset($serials[$index]) ? trim((string)$serials[$index]) : '';
            if ($serial !== '') {
                $serialByProductId[(int)$productId] = $serial;
            }
        }

        $productInfo = [];
        if (!empty($deliveredProductIds)) {
            $placeholders = implode(',', array_fill(0, count($deliveredProductIds), '?'));
            $productStmt = $this->conn->prepare("SELECT id, product_name, serial_number FROM products WHERE id IN ($placeholders)");
            $productStmt->execute($deliveredProductIds);
            while ($row = $productStmt->fetch(PDO::FETCH_ASSOC)) {
                $productInfo[(int)$row['id']] = [
                    'product_name' => (string)($row['product_name'] ?? ''),
                    'serial_number' => trim((string)($row['serial_number'] ?? '')),
                ];
            }
        }

        $handoverMap = [];
        $rawHandoverMap = $order['handover_type_map'] ?? null;
        if (is_string($rawHandoverMap) && trim($rawHandoverMap) !== '') {
            $decoded = json_decode($rawHandoverMap, true);
            if (is_array($decoded)) {
                $handoverMap = $decoded;
            }
        } elseif (is_array($rawHandoverMap)) {
            $handoverMap = $rawHandoverMap;
        }
        $fallbackDeliveryType = $this->normalizeDeliveryTypeForInsert($order['handover_type'] ?? 'inhand');
        foreach ($deliveredProductIds as $productId) {
            $existsStmt = $this->conn->prepare("SELECT id, delivered_date FROM deliveries WHERE order_id = :order_id AND product_id = :product_id LIMIT 1");
            $existsStmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
            $existsStmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
            $existsStmt->execute();
            $deliveryType = isset($handoverMap[(string)$productId])
                ? $this->normalizeDeliveryTypeForInsert($handoverMap[(string)$productId])
                : $fallbackDeliveryType;
            $deliveryTypeMapJson = json_encode([(string)$productId => $deliveryType]);
            $serialNumber = $serialByProductId[$productId] ?? ($productInfo[$productId]['serial_number'] ?? '');
            $productName = $productInfo[$productId]['product_name'] ?? ("Product #{$productId}");
            $notes = "Auto-created from product_status_map for order " . ($order['order_code'] ?? ('#' . $orderId)) . " product {$productName}";
            $existingDelivery = $existsStmt->fetch(PDO::FETCH_ASSOC);
            if ($existingDelivery) {
                $updateStmt = $this->conn->prepare("
                    UPDATE deliveries
                    SET serial_number = :serial_number,
                        delivery_type = :delivery_type,
                        address = :address,
                        contact_person = :contact_person,
                        contact_phone = :contact_phone,
                        scheduled_date = COALESCE(scheduled_date, :scheduled_date),
                        scheduled_time = COALESCE(scheduled_time, :scheduled_time),
                        delivered_date = CASE
                            WHEN delivered_date IS NULL OR delivered_date = '' OR delivered_date = '0000-00-00 00:00:00'
                            THEN :delivered_date
                            ELSE delivered_date
                        END,
                        delivery_person = CASE
                            WHEN TRIM(COALESCE(delivery_person, '')) = '' THEN 'System Auto-assigned'
                            ELSE delivery_person
                        END,
                        status = 'delivered',
                        notes = :notes,
                        product_ids = :product_ids,
                        serial_numbers = :serial_numbers,
                        delivery_type_map = :delivery_type_map,
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $updateStmt->bindValue(':id', (int)$existingDelivery['id'], PDO::PARAM_INT);
                $updateStmt->bindValue(':serial_number', $serialNumber !== '' ? $serialNumber : null, $serialNumber !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $updateStmt->bindValue(':delivery_type', $deliveryType, PDO::PARAM_STR);
                $updateStmt->bindValue(':address', !empty($client['address']) ? $client['address'] : null, !empty($client['address']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $updateStmt->bindValue(':contact_person', !empty($client['full_name']) ? $client['full_name'] : null, !empty($client['full_name']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $updateStmt->bindValue(':contact_phone', !empty($client['phone']) ? $client['phone'] : null, !empty($client['phone']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $updateStmt->bindValue(':scheduled_date', date('Y-m-d'), PDO::PARAM_STR);
                $updateStmt->bindValue(':scheduled_time', date('H:i:s'), PDO::PARAM_STR);
                $updateStmt->bindValue(':delivered_date', $this->currentTimestamp(), PDO::PARAM_STR);
                $updateStmt->bindValue(':notes', $notes, PDO::PARAM_STR);
                $updateStmt->bindValue(':product_ids', json_encode([$productId]), PDO::PARAM_STR);
                $updateStmt->bindValue(':serial_numbers', $serialNumber !== '' ? json_encode([$serialNumber]) : null, $serialNumber !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $updateStmt->bindValue(':delivery_type_map', $deliveryTypeMapJson, PDO::PARAM_STR);
                $updateStmt->execute();
                continue;
            }

            $insertStmt = $this->conn->prepare("
                INSERT INTO deliveries (
                    order_id, serial_number, delivery_code, delivery_type, address, contact_person, contact_phone,
                    scheduled_date, scheduled_time, delivered_date, delivery_person, status, notes, product_id, product_ids, serial_numbers, delivery_type_map
                ) VALUES (
                    :order_id, :serial_number, :delivery_code, :delivery_type, :address, :contact_person, :contact_phone,
                    :scheduled_date, :scheduled_time, :delivered_date, :delivery_person, :status, :notes, :product_id, :product_ids, :serial_numbers, :delivery_type_map
                )
            ");
            $insertStmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
            $insertStmt->bindValue(':serial_number', $serialNumber !== '' ? $serialNumber : null, $serialNumber !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':delivery_code', $this->generateUniqueDeliveryCode(), PDO::PARAM_STR);
            $insertStmt->bindValue(':delivery_type', $deliveryType, PDO::PARAM_STR);
            $insertStmt->bindValue(':address', !empty($client['address']) ? $client['address'] : null, !empty($client['address']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':contact_person', !empty($client['full_name']) ? $client['full_name'] : null, !empty($client['full_name']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':contact_phone', !empty($client['phone']) ? $client['phone'] : null, !empty($client['phone']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':scheduled_date', date('Y-m-d'), PDO::PARAM_STR);
            $insertStmt->bindValue(':scheduled_time', date('H:i:s'), PDO::PARAM_STR);
            $insertStmt->bindValue(':delivered_date', $this->currentTimestamp(), PDO::PARAM_STR);
            $insertStmt->bindValue(':delivery_person', 'System Auto-assigned', PDO::PARAM_STR);
            $insertStmt->bindValue(':status', 'delivered', PDO::PARAM_STR);
            $insertStmt->bindValue(':notes', $notes, PDO::PARAM_STR);
            $insertStmt->bindValue(':product_id', $productId, PDO::PARAM_INT);
            $insertStmt->bindValue(':product_ids', json_encode([$productId]), PDO::PARAM_STR);
            $insertStmt->bindValue(':serial_numbers', $serialNumber !== '' ? json_encode([$serialNumber]) : null, $serialNumber !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $insertStmt->bindValue(':delivery_type_map', $deliveryTypeMapJson, PDO::PARAM_STR);
            $insertStmt->execute();
        }
    }

    private function backfillDeliveriesFromServiceOrders(): void {
        try {
            if (!$this->tableExists('service_orders') || !$this->tableHasColumn('service_orders', 'product_status_map')) {
                return;
            }

            $stmt = $this->conn->prepare("
                SELECT id, product_status_map
                FROM service_orders
                WHERE product_status_map IS NOT NULL
                  AND TRIM(CAST(product_status_map AS CHAR)) <> ''
                ORDER BY id ASC
            ");
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orders as $order) {
                $orderId = (int)($order['id'] ?? 0);
                if ($orderId <= 0) {
                    continue;
                }

                $statusMap = $this->normalizeStatusMapSafe($order['product_status_map'] ?? null);
                if (empty($statusMap)) {
                    continue;
                }

                $hasDeliveredProduct = false;
                foreach ($statusMap as $status) {
                    if ($this->normalizeProductFlowStatusValue($status) === 'deliveryed') {
                        $hasDeliveredProduct = true;
                        break;
                    }
                }

                if (!$hasDeliveredProduct) {
                    continue;
                }

                $this->ensureDeliveriesExistForOrder($orderId, $statusMap);
                $this->syncDeliveryItemsForOrder($orderId);
            }
        } catch (Exception $e) {
            // Do not block the deliveries page if backfill cannot run.
        }
    }

    private function normalizeExistingCompanyId($value): ?int {
        $companyId = (int)$value;
        if ($companyId <= 0) {
            return null;
        }

        $stmt = $this->conn->prepare("SELECT id FROM companies WHERE id = :id LIMIT 1");
        $stmt->bindValue(':id', $companyId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC) ? $companyId : null;
    }

    private function normalizeExistingCompanyIds($value): array {
        $companyIds = $this->normalizeIdList($value);
        if (empty($companyIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($companyIds), '?'));
        $stmt = $this->conn->prepare("SELECT id FROM companies WHERE id IN ($placeholders)");
        $stmt->execute($companyIds);

        $validIds = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $id = (int)($row['id'] ?? 0);
            if ($id > 0) {
                $validIds[] = $id;
            }
        }

        return array_values(array_filter($companyIds, static function ($companyId) use ($validIds) {
            return in_array((int)$companyId, $validIds, true);
        }));
    }

    private function normalizeCompanyProductMapValue($value): array {
        if ($value === null || $value === '') {
            return [];
        }

        $raw = $value;
        if (is_string($value)) {
            $trimmed = trim($value);
            if ($trimmed === '') {
                return [];
            }
            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $raw = $decoded;
            } else {
                return [];
            }
        }

        if (!is_array($raw)) {
            return [];
        }

        $map = [];
        foreach ($raw as $companyId => $productIds) {
            $normalizedCompanyId = (int)$companyId;
            if ($normalizedCompanyId <= 0) {
                continue;
            }
            $map[(string)$normalizedCompanyId] = $this->normalizeIdList($productIds);
        }

        return $map;
    }

    private function flattenCompanyProductMap(array $companyIds, array $companyProductMap): array {
        $flat = [];
        foreach ($companyIds as $companyId) {
            $key = (string)((int)$companyId);
            if (!isset($companyProductMap[$key]) || !is_array($companyProductMap[$key])) {
                continue;
            }
            foreach ($companyProductMap[$key] as $productId) {
                $id = (int)$productId;
                if ($id > 0) {
                    $flat[] = $id;
                }
            }
        }
        return array_values(array_unique($flat));
    }

    private function fetchCompanyNamesByIds(array $ids): array {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids), function ($id) {
            return $id > 0;
        })));

        if (empty($ids)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->conn->prepare("SELECT id, company_name FROM companies WHERE id IN ($placeholders)");
        $stmt->execute($ids);

        $map = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $map[(int)$row['id']] = $row['company_name'];
        }

        return $map;
    }

    private function resolveDeliveredCompanyNames(
        array $deliveredProductIds,
        ?int $companyId,
        array $companyIds,
        array $companyProductMap,
        array $companyNamesById
    ): array {
        $deliveredProductIds = array_values(array_unique(array_filter(array_map('intval', $deliveredProductIds), function ($id) {
            return $id > 0;
        })));

        $matchedCompanyIds = [];

        if (!empty($deliveredProductIds) && !empty($companyProductMap)) {
            foreach ($companyProductMap as $rawCompanyId => $mappedProductIds) {
                $mappedIds = $this->normalizeIdList($mappedProductIds);
                if (empty($mappedIds)) {
                    continue;
                }

                foreach ($deliveredProductIds as $productId) {
                    if (in_array($productId, $mappedIds, true)) {
                        $matchedCompanyIds[] = (int)$rawCompanyId;
                        break;
                    }
                }
            }
        }

        if (empty($matchedCompanyIds) && !empty($companyIds)) {
            $matchedCompanyIds = $companyIds;
        }

        if (empty($matchedCompanyIds) && $companyId > 0) {
            $matchedCompanyIds = [$companyId];
        }

        $matchedCompanyIds = array_values(array_unique(array_filter(array_map('intval', $matchedCompanyIds), function ($id) {
            return $id > 0;
        })));

        $names = [];
        foreach ($matchedCompanyIds as $matchedCompanyId) {
            if (isset($companyNamesById[$matchedCompanyId]) && trim((string)$companyNamesById[$matchedCompanyId]) !== '') {
                $names[] = trim((string)$companyNamesById[$matchedCompanyId]);
            }
        }

        return array_values(array_unique($names));
    }
    
    private function getBearerToken() {
        $headers = getallheaders();
        
        if (isset($headers['Authorization'])) {
            if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
                return $matches[1];
            }
        }
        
        // Alternative method to get token
        $authHeader = null;
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if (isset($headers['Authorization'])) {
                $authHeader = $headers['Authorization'];
            }
        }
        
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if ($authHeader && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        
        switch ($action) {
            case 'dashboard_stats':
                $this->getDashboardStats();
                break;
                
            case 'get_users':
                $this->getUsers();
                break;
            case 'create_user':
                $this->createUser();
                break;
            case 'update_user':
                $this->updateUser();
                break;
            case 'delete_user':
                $this->deleteUser();
                break;
                
            case 'get_orders':
                $this->getOrders();
                break;
            case 'create_order':
                $this->createOrder();
                break;
            case 'update_order':
                $this->updateOrder();
                break;
            case 'delete_order':
                $this->deleteOrder();
                break;
                
            case 'get_clients':
                $this->getClients();
                break;
            case 'create_client':
                $this->createClient();
                break;
            case 'update_client':
                $this->updateClient();
                break;
            case 'delete_client':
                $this->deleteClient();
                break;
                
            case 'get_products':
                $this->getProducts();
                break;
            case 'create_product':
                $this->createProduct();
                break;
            case 'update_product':
                $this->updateProduct();
                break;
            case 'delete_product':
                $this->deleteProduct();
                break;
                
            case 'get_deliveries':
                $this->getDeliveries();
                break;
            case 'update_delivery':
                $this->updateDelivery();
                break;
            case 'delete_delivery':
                $this->deleteDelivery();
                break;
                
            case 'staff_performance':
                $this->getStaffPerformance();
                break;
                
            case 'analytics':
                $this->getAnalytics();
                break;
                
            case 'notifications':
                $this->getRealtimeNotifications();
                break;
                
            case 'reset_password':
                $this->resetPassword();
                break;

            case 'backup_database':
                $this->backupDatabase();
                break;
            case 'get_backup_history':
                $this->getBackupHistory();
                break;
                
            default:
                $this->sendError("Invalid action", 400);
                break;
        }
    }
    
    private function getDashboardStats() {
        try {
            $stats = [];
            $pendingStatusValue = $this->normalizeServiceOrderStatusForWrite('pending', 'pending');
            $scheduledStatusValue = $this->normalizeServiceOrderStatusForWrite('scheduled', 'scheduled');
            $processStatusValue = $this->normalizeServiceOrderStatusForWrite('process', 'process');
            $readyStatusValue = $this->normalizeServiceOrderStatusForWrite('ready', 'ready');
            $completedStatusValue = $this->normalizeServiceOrderStatusForWrite('completed', 'completed');
            $deliveredStatusValue = $this->normalizeServiceOrderStatusForWrite('delivered', 'delivered');
            
            // Total users
            $query = "SELECT COUNT(*) as total_users FROM users";
            $stmt = $this->conn->query($query);
            $stats['total_users'] = (int)$stmt->fetchColumn();
            
            // Total clients
            $query = "SELECT COUNT(*) as total_clients FROM clients";
            $stmt = $this->conn->query($query);
            $stats['total_clients'] = (int)$stmt->fetchColumn();
            
            // Total orders
            $query = "SELECT COUNT(*) as total_orders FROM service_orders";
            $stmt = $this->conn->query($query);
            $stats['total_orders'] = (int)$stmt->fetchColumn();
            
            // Total products
            $query = "SELECT COUNT(*) as total_products FROM products";
            $stmt = $this->conn->query($query);
            $stats['total_products'] = (int)$stmt->fetchColumn();
            
            // Active staff (users with role 'user' who are active)
            $query = "SELECT COUNT(*) as active_staff FROM users WHERE role <> 'admin' AND is_active = 1";
            $stmt = $this->conn->query($query);
            $stats['active_staff'] = (int)$stmt->fetchColumn();
            
            // Pending orders (ONLY orders with status 'pending')
            $query = "SELECT COUNT(*) as pending_orders FROM service_orders WHERE status = :pending_status";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':pending_status', $pendingStatusValue, is_int($pendingStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->execute();
            $stats['pending_orders'] = (int)$stmt->fetchColumn();
            
            // Active orders (orders that are in progress but not pending, completed, delivered or cancelled)
            $query = "SELECT COUNT(*) as active_orders FROM service_orders WHERE status IN (:scheduled_status, :process_status, :ready_status)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':scheduled_status', $scheduledStatusValue, is_int($scheduledStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->bindValue(':process_status', $processStatusValue, is_int($processStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->bindValue(':ready_status', $readyStatusValue, is_int($readyStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->execute();
            $stats['active_orders'] = (int)$stmt->fetchColumn();
            
            // Completed orders
            $query = "SELECT COUNT(*) as completed_orders FROM service_orders WHERE status = :completed_status";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':completed_status', $completedStatusValue, is_int($completedStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->execute();
            $stats['completed_orders'] = (int)$stmt->fetchColumn();
            
            // Delivered orders
            $query = "SELECT COUNT(*) as delivered_orders FROM service_orders WHERE status = :delivered_status";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':delivered_status', $deliveredStatusValue, is_int($deliveredStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR);
            $stmt->execute();
            $stats['delivered_orders'] = (int)$stmt->fetchColumn();
            
            // Total revenue from payments table (completed payments only)
            $query = "SELECT COALESCE(SUM(amount), 0) as total_revenue 
                     FROM payments 
                     WHERE payment_status IN ('completed', 'paid')";
            $stmt = $this->conn->query($query);
            $stats['total_revenue'] = (float)$stmt->fetchColumn();
            
            // Today's orders
            $query = "SELECT COUNT(*) as today_orders FROM service_orders WHERE DATE(created_at) = CURDATE()";
            $stmt = $this->conn->query($query);
            $stats['today_orders'] = (int)$stmt->fetchColumn();
            
            // Today's revenue from payments table (completed payments only)
            $query = "SELECT COALESCE(SUM(amount), 0) as today_revenue 
                     FROM payments 
                     WHERE DATE(created_at) = CURDATE() 
                     AND payment_status IN ('completed', 'paid')";
            $stmt = $this->conn->query($query);
            $stats['today_revenue'] = (float)$stmt->fetchColumn();
            
            // Active products
            $query = "SELECT COUNT(*) as active_products FROM products WHERE status = 'active'";
            $stmt = $this->conn->query($query);
            $stats['active_products'] = (int)$stmt->fetchColumn();
            
            // Low stock products
            // Some deployments use a products table without stock columns, so only query
            // low-stock counts when both columns exist.
            $stockColumnQuery = "SELECT COUNT(*) 
                               FROM information_schema.COLUMNS
                               WHERE TABLE_SCHEMA = DATABASE()
                               AND TABLE_NAME = 'products'
                               AND COLUMN_NAME IN ('stock_quantity', 'min_stock_level')";
            $stmt = $this->conn->query($stockColumnQuery);
            $stockColumnCount = (int)$stmt->fetchColumn();

            if ($stockColumnCount === 2) {
                $query = "SELECT COUNT(*) as low_stock_products FROM products 
                         WHERE stock_quantity <= min_stock_level AND status = 'active'";
                $stmt = $this->conn->query($query);
                $stats['low_stock_products'] = (int)$stmt->fetchColumn();
            } else {
                $stats['low_stock_products'] = 0;
            }
            
            // Average order value
            $query = "SELECT COALESCE(AVG(final_cost), 0) as avg_order_value 
                     FROM service_orders 
                     WHERE final_cost > 0";
            $stmt = $this->conn->query($query);
            $stats['avg_order_value'] = (float)$stmt->fetchColumn();
            
            $this->sendSuccess([
                'stats' => $stats
            ]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get dashboard stats: " . $e->getMessage(), 500);
        }
    }
    
    private function getUsers() {
        try {
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $role = isset($_GET['role']) ? $_GET['role'] : '';
            
            $query = "SELECT id, name, email, phone, role, is_active, last_login, created_at, 
                     profile_image, department
                     FROM users WHERE 1=1";
            
            $params = [];
            $types = [];
            
            if (!empty($search)) {
                $query .= " AND (name LIKE :search OR email LIKE :search OR phone LIKE :search)";
                $params[':search'] = "%$search%";
                $types[':search'] = PDO::PARAM_STR;
            }
            
            if (!empty($role) && $role !== 'all') {
                $query .= " AND role = :role";
                $params[':role'] = $role;
                $types[':role'] = PDO::PARAM_STR;
            }
            
            $query .= " ORDER BY id DESC";
            
            $stmt = $this->conn->prepare($query);
            
            if (!empty($params)) {
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, $types[$key] ?? PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess(['users' => $users]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get users: " . $e->getMessage(), 500);
        }
    }
    
    private function createUser() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate input
            if (empty($data['name']) || empty($data['email']) || empty($data['password'])) {
                $this->sendError("Name, email, and password are required", 400);
                return;
            }
            
            // Validate email format
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                $this->sendError("Invalid email format", 400);
                return;
            }
            
            // Check if email exists
            $checkQuery = "SELECT id FROM users WHERE email = :email";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':email', $data['email'], PDO::PARAM_STR);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() > 0) {
                $this->sendError("Email already exists", 400);
                return;
            }
            
            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);
            
            // Set role to 'user' by default
            $role = isset($data['role']) ? $data['role'] : 'user';
            $phone = isset($data['phone']) ? $data['phone'] : '';
            $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
            $department = isset($data['department']) ? $data['department'] : 'general';
            $profile_image = isset($data['profile_image']) ? $data['profile_image'] : null;
            
            $query = "INSERT INTO users (name, email, password, phone, role, is_active, department, profile_image, created_at) 
                     VALUES (:name, :email, :password, :phone, :role, :is_active, :department, :profile_image, NOW())";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':name', $data['name'], PDO::PARAM_STR);
            $stmt->bindValue(':email', $data['email'], PDO::PARAM_STR);
            $stmt->bindValue(':password', $hashedPassword, PDO::PARAM_STR);
            $stmt->bindValue(':phone', $phone, PDO::PARAM_STR);
            $stmt->bindValue(':role', $role, PDO::PARAM_STR);
            $stmt->bindValue(':is_active', $is_active, PDO::PARAM_INT);
            $stmt->bindValue(':department', $department, PDO::PARAM_STR);
            $stmt->bindValue(':profile_image', $profile_image, $profile_image ? PDO::PARAM_STR : PDO::PARAM_NULL);
            
            if ($stmt->execute()) {
                $user_id = $this->conn->lastInsertId();
                
                $this->sendSuccess([
                    'message' => 'User created successfully',
                    'user_id' => $user_id
                ]);
            } else {
                $this->sendError("Failed to create user", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to create user: " . $e->getMessage(), 500);
        }
    }
    
    private function updateUser() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (empty($data['id'])) {
                $this->sendError("User ID is required", 400);
                return;
            }
            
            // Check if user exists
            $checkQuery = "SELECT id FROM users WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("User not found", 404);
                return;
            }
            
            $query = "UPDATE users SET name = :name, email = :email, phone = :phone, 
                     role = :role, is_active = :is_active, department = :department,
                     profile_image = :profile_image, updated_at = NOW() 
                     WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $stmt->bindValue(':name', $data['name'], PDO::PARAM_STR);
            $stmt->bindValue(':email', $data['email'], PDO::PARAM_STR);
            $stmt->bindValue(':phone', isset($data['phone']) ? $data['phone'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':role', $data['role'], PDO::PARAM_STR);
            $stmt->bindValue(':is_active', isset($data['is_active']) ? (int)$data['is_active'] : 1, PDO::PARAM_INT);
            $stmt->bindValue(':department', isset($data['department']) ? $data['department'] : 'general', PDO::PARAM_STR);
            $stmt->bindValue(':profile_image', isset($data['profile_image']) ? $data['profile_image'] : null, 
                           isset($data['profile_image']) ? PDO::PARAM_STR : PDO::PARAM_NULL);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'User updated successfully']);
            } else {
                $this->sendError("Failed to update user", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to update user: " . $e->getMessage(), 500);
        }
    }
    
    private function deleteUser() {
        try {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            
            if (!$id) {
                $this->sendError("User ID is required", 400);
                return;
            }
            
            // Don't allow deleting admin users
            $checkQuery = "SELECT role FROM users WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("User not found", 404);
                return;
            }
            
            $user = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user['role'] === 'admin') {
                $this->sendError("Cannot delete admin users", 400);
                return;
            }
            
            $query = "DELETE FROM users WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'User deleted successfully']);
            } else {
                $this->sendError("Failed to delete user", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to delete user: " . $e->getMessage(), 500);
        }
    }
    
    private function getOrders() {
        try {
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
            $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
            $exclude_delivered = isset($_GET['exclude_delivered']) ? $_GET['exclude_delivered'] : false;
            $serviceOrdersHasCompanyId = $this->tableHasColumn('service_orders', 'company_id');
            $serviceOrdersHasCompanyIds = $this->tableHasColumn('service_orders', 'company_ids');
            $serviceOrdersHasCompanyProductMap = $this->tableHasColumn('service_orders', 'company_product_map');
            $companySelect = $serviceOrdersHasCompanyId ? ", co.company_name as company_name" : ", '' as company_name";
            $companyJoin = $serviceOrdersHasCompanyId ? " LEFT JOIN companies co ON o.company_id = co.id " : "";
            
            $query = "SELECT o.*, c.full_name as client_name, c.phone as client_phone, c.email as client_email,
                     c.address as client_address, p.product_name, p.brand, p.model, rp.product_name as replacement_product_name, u.name as staff_name
                     {$companySelect}
                     FROM service_orders o 
                     LEFT JOIN clients c ON o.client_id = c.id 
                     LEFT JOIN products p ON o.product_id = p.id 
                     LEFT JOIN products rp ON o.replacement_product_id = rp.id
                     LEFT JOIN users u ON o.staff_id = u.id
                     {$companyJoin}
                     WHERE 1=1";
            
            $params = [];
            $types = [];
            
            if (!empty($search)) {
                $query .= " AND (o.order_code LIKE :search OR c.full_name LIKE :search 
                           OR p.product_name LIKE :search OR rp.product_name LIKE :search
                           OR p.serial_number LIKE :search OR rp.serial_number LIKE :search
                           OR o.serial_number LIKE :search OR o.product_serial_numbers LIKE :search
                           OR u.name LIKE :search";
                if ($serviceOrdersHasCompanyId) {
                    $query .= " OR co.company_name LIKE :search";
                }
                $query .= ")";
                $params[':search'] = "%$search%";
                $types[':search'] = PDO::PARAM_STR;
            }
            
            if (!empty($status) && $status !== 'all') {
                $query .= " AND o.status = :status";
                $normalizedStatusFilter = $this->normalizeServiceOrderStatusForWrite($status, $status);
                $params[':status'] = $normalizedStatusFilter;
                $types[':status'] = is_int($normalizedStatusFilter) ? PDO::PARAM_INT : PDO::PARAM_STR;
            }
            
            if ($exclude_delivered) {
                $deliveredStatusValue = $this->normalizeServiceOrderStatusForWrite('delivered', 'delivered');
                $query .= " AND o.status != :exclude_delivered_status";
                $params[':exclude_delivered_status'] = $deliveredStatusValue;
                $types[':exclude_delivered_status'] = is_int($deliveredStatusValue) ? PDO::PARAM_INT : PDO::PARAM_STR;
            }
            
            if (!empty($date_from)) {
                $query .= " AND DATE(o.created_at) >= :date_from";
                $params[':date_from'] = $date_from;
                $types[':date_from'] = PDO::PARAM_STR;
            }
            
            if (!empty($date_to)) {
                $query .= " AND DATE(o.created_at) <= :date_to";
                $params[':date_to'] = $date_to;
                $types[':date_to'] = PDO::PARAM_STR;
            }
            
            $query .= " ORDER BY o.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            
            if (!empty($params)) {
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, $types[$key] ?? PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orders as &$order) {
                if (array_key_exists('status', $order)) {
                    $order['status'] = $this->normalizeServiceOrderStatusForRead($order['status']);
                }
            }
            unset($order);

            if (!empty($orders)) {
                $orderIds = array_map('intval', array_column($orders, 'id'));
                $productMap = $this->fetchOrderProductsMap($orderIds);

                $stored_primary_by_order = [];
                $stored_replacement_by_order = [];
                $stored_company_ids_by_order = [];
                $stored_company_product_map_by_order = [];
                $stored_ids = [];
                $stored_company_ids = [];

                foreach ($orders as $order) {
                    $orderId = (int)$order['id'];

                    if (array_key_exists('product_ids', $order)) {
                        $ids = $this->normalizeIdList($order['product_ids']);
                        if (!empty($ids)) {
                            $stored_primary_by_order[$orderId] = $ids;
                            $stored_ids = array_merge($stored_ids, $ids);
                        }
                    }

                    if (array_key_exists('replacement_product_ids', $order)) {
                        $ids = $this->normalizeIdList($order['replacement_product_ids']);
                        if (!empty($ids)) {
                            $stored_replacement_by_order[$orderId] = $ids;
                            $stored_ids = array_merge($stored_ids, $ids);
                        }
                    }

                    if ($serviceOrdersHasCompanyIds && array_key_exists('company_ids', $order)) {
                        $ids = $this->normalizeExistingCompanyIds($order['company_ids']);
                        if (!empty($ids)) {
                            $stored_company_ids_by_order[$orderId] = $ids;
                            $stored_company_ids = array_merge($stored_company_ids, $ids);
                        }
                    }

                    if ($serviceOrdersHasCompanyProductMap && array_key_exists('company_product_map', $order)) {
                        $normalizedCompanyProductMap = $this->normalizeCompanyProductMapValue($order['company_product_map']);
                        $stored_company_product_map_by_order[$orderId] = $normalizedCompanyProductMap;
                        foreach ($normalizedCompanyProductMap as $companyProductIds) {
                            $stored_ids = array_merge($stored_ids, $this->normalizeIdList($companyProductIds));
                        }
                    }
                }

                $stored_names_map = !empty($stored_ids) ? $this->fetchProductNamesByIds($stored_ids) : [];
                $stored_details_map = !empty($stored_ids) ? $this->fetchProductDetailsByIds($stored_ids) : [];
                $stored_company_names_map = !empty($stored_company_ids) ? $this->fetchCompanyNamesByIds($stored_company_ids) : [];

                foreach ($orders as &$order) {
                    $orderId = (int)$order['id'];
                    $primary = $productMap[$orderId]['primary'] ?? null;
                    $replacement = $productMap[$orderId]['replacement'] ?? null;
                    $primary_json = $stored_primary_by_order[$orderId] ?? [];
                    $replacement_json = $stored_replacement_by_order[$orderId] ?? [];

                    if (!empty($primary_json)) {
                        $order['product_ids'] = $primary_json;
                        $order['product_names'] = $this->buildNamesFromIds($primary_json, $stored_names_map);
                        $order['product_serial_numbers'] = $primary['serials'] ?? (isset($order['product_serial_numbers']) && is_array($order['product_serial_numbers']) ? $order['product_serial_numbers'] : []);
                        $order['product_models'] = $this->buildProductFieldListFromIds($primary_json, $stored_details_map, 'model');
                    } elseif ($primary) {
                        $order['product_ids'] = $primary['ids'];
                        $order['product_names'] = $primary['names'];
                        $order['product_serial_numbers'] = $primary['serials'] ?? [];
                        $order['product_models'] = $this->buildProductFieldListFromIds($primary['ids'], $stored_details_map, 'model');
                    } else {
                        $primaryId = isset($order['product_id']) ? (int)$order['product_id'] : 0;
                        $order['product_ids'] = $primaryId > 0 ? [$primaryId] : [];
                        $order['product_names'] = !empty($order['product_name']) ? [$order['product_name']] : [];
                        $order['product_models'] = $primaryId > 0 ? $this->buildProductFieldListFromIds([$primaryId], $stored_details_map, 'model') : [];
                    }

                    if (!empty($replacement_json)) {
                        $order['replacement_product_ids'] = $replacement_json;
                        $order['replacement_product_names'] = $this->buildNamesFromIds($replacement_json, $stored_names_map);
                        $order['replacement_product_serial_numbers'] = $replacement['serials'] ?? (isset($order['replacement_product_serial_numbers']) && is_array($order['replacement_product_serial_numbers']) ? $order['replacement_product_serial_numbers'] : []);
                        $order['replacement_product_models'] = $this->buildProductFieldListFromIds($replacement_json, $stored_details_map, 'model');
                    } elseif ($replacement) {
                        $order['replacement_product_ids'] = $replacement['ids'];
                        $order['replacement_product_names'] = $replacement['names'];
                        $order['replacement_product_serial_numbers'] = $replacement['serials'] ?? [];
                        $order['replacement_product_models'] = $this->buildProductFieldListFromIds($replacement['ids'], $stored_details_map, 'model');
                    } else {
                        $replacementId = isset($order['replacement_product_id']) ? (int)$order['replacement_product_id'] : 0;
                        $order['replacement_product_ids'] = $replacementId > 0 ? [$replacementId] : [];
                        $order['replacement_product_names'] = !empty($order['replacement_product_name']) ? [$order['replacement_product_name']] : [];
                        $order['replacement_product_models'] = $replacementId > 0 ? $this->buildProductFieldListFromIds([$replacementId], $stored_details_map, 'model') : [];
                    }

                    $companyIds = $stored_company_ids_by_order[$orderId] ?? [];
                    if (empty($companyIds)) {
                        $primaryCompanyId = isset($order['company_id']) ? (int)$order['company_id'] : 0;
                        if ($primaryCompanyId > 0) {
                            $companyIds = [$primaryCompanyId];
                        }
                    }

                    $companyNames = !empty($companyIds)
                        ? $this->buildNamesFromIds($companyIds, $stored_company_names_map)
                        : [];
                    $companyProductMap = $stored_company_product_map_by_order[$orderId] ?? [];
                    $normalizedCompanyProductMap = [];
                    foreach ($companyIds as $companyId) {
                        $key = (string)$companyId;
                        $normalizedCompanyProductMap[$key] = array_values(array_map('intval', $companyProductMap[$key] ?? []));
                    }
                    $flattenedCompanyProductIds = !empty($companyIds)
                        ? $this->flattenCompanyProductMap($companyIds, $normalizedCompanyProductMap)
                        : [];
                    if (!empty($companyIds) && empty($flattenedCompanyProductIds) && !empty($order['product_ids'])) {
                        $normalizedCompanyProductMap[(string)$companyIds[0]] = array_values(array_map('intval', $order['product_ids']));
                        $flattenedCompanyProductIds = $this->flattenCompanyProductMap($companyIds, $normalizedCompanyProductMap);
                    }
                    if (!empty($flattenedCompanyProductIds)) {
                        $order['product_ids'] = $flattenedCompanyProductIds;
                    }

                    $finalDetailIds = array_values(array_unique(array_merge(
                        $this->normalizeIdList($order['product_ids'] ?? []),
                        $this->normalizeIdList($order['replacement_product_ids'] ?? [])
                    )));

                    if (!empty($finalDetailIds)) {
                        $stored_details_map = $this->fetchProductDetailsByIds($finalDetailIds);
                        $stored_names_map = $this->fetchProductNamesByIds($finalDetailIds);
                    }

                    if (!empty($order['product_ids'])) {
                        $order['product_names'] = $this->buildNamesFromIds($order['product_ids'], $stored_names_map);
                        $order['product_serial_numbers'] = $this->buildProductFieldListFromIds($order['product_ids'], $stored_details_map, 'serial_number');
                        $order['product_models'] = $this->buildProductFieldListFromIds($order['product_ids'], $stored_details_map, 'model');
                    }

                    if (!empty($order['replacement_product_ids'])) {
                        $order['replacement_product_names'] = $this->buildNamesFromIds($order['replacement_product_ids'], $stored_names_map);
                        $order['replacement_product_serial_numbers'] = $this->buildProductFieldListFromIds($order['replacement_product_ids'], $stored_details_map, 'serial_number');
                        $order['replacement_product_models'] = $this->buildProductFieldListFromIds($order['replacement_product_ids'], $stored_details_map, 'model');
                    }

                    $order['company_id'] = !empty($companyIds) ? (int)$companyIds[0] : null;
                    $order['company_ids'] = $companyIds;
                    $order['company_names'] = $companyNames;
                    $order['company_name'] = !empty($companyNames)
                        ? implode(' || ', $companyNames)
                        : (isset($order['company_name']) ? (string)$order['company_name'] : '');
                    $order['company_product_map'] = $normalizedCompanyProductMap;
                    $order['companies_products'] = $normalizedCompanyProductMap;
                }
                unset($order);
            }
            
            $this->sendSuccess(['orders' => $orders]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get orders: " . $e->getMessage(), 500);
        }
    }
    
    private function createOrder() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            $required = ['client_name', 'client_phone', 'issue_description'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    $this->sendError("$field is required", 400);
                    return;
                }
            }
            
            // Start transaction
            $this->conn->beginTransaction();
            
            try {
                // First, check if client exists or create new
                $clientQuery = "SELECT id FROM clients WHERE phone = :phone LIMIT 1";
                $clientStmt = $this->conn->prepare($clientQuery);
                $clientStmt->bindValue(':phone', $data['client_phone'], PDO::PARAM_STR);
                $clientStmt->execute();
                
                $client_id = isset($data['client_id']) && !empty($data['client_id']) ? (int)$data['client_id'] : null;
                if ($client_id) {
                    $existingClientQuery = "SELECT id FROM clients WHERE id = :id LIMIT 1";
                    $existingClientStmt = $this->conn->prepare($existingClientQuery);
                    $existingClientStmt->bindValue(':id', $client_id, PDO::PARAM_INT);
                    $existingClientStmt->execute();

                    if ($existingClientStmt->rowCount() === 0) {
                        $client_id = null;
                    } else {
                        $updateClientQuery = "UPDATE clients SET full_name = :full_name, phone = :phone, updated_at = NOW() WHERE id = :id";
                        $updateClientStmt = $this->conn->prepare($updateClientQuery);
                        $updateClientStmt->bindValue(':full_name', $data['client_name'], PDO::PARAM_STR);
                        $updateClientStmt->bindValue(':phone', $data['client_phone'], PDO::PARAM_STR);
                        $updateClientStmt->bindValue(':id', $client_id, PDO::PARAM_INT);
                        $updateClientStmt->execute();
                    }
                }

                if (!$client_id) {
                    if ($clientStmt->rowCount() > 0) {
                        $client = $clientStmt->fetch(PDO::FETCH_ASSOC);
                        $client_id = $client['id'];
                        
                        // Update client name if different
                        $updateClientQuery = "UPDATE clients SET full_name = :full_name, updated_at = NOW() WHERE id = :id";
                        $updateClientStmt = $this->conn->prepare($updateClientQuery);
                        $updateClientStmt->bindValue(':full_name', $data['client_name'], PDO::PARAM_STR);
                        $updateClientStmt->bindValue(':id', $client_id, PDO::PARAM_INT);
                        $updateClientStmt->execute();
                    } else {
                        // Create new client only when no valid client_id and no existing phone match.
                        $client_code = 'CLT' . date('Ymd') . strtoupper(substr(uniqid(), -6));
                        $clientInsert = "INSERT INTO clients (client_code, full_name, phone, email, address, created_at) 
                                       VALUES (:client_code, :full_name, :phone, :email, :address, NOW())";
                        $clientInsertStmt = $this->conn->prepare($clientInsert);
                        $clientInsertStmt->bindValue(':client_code', $client_code, PDO::PARAM_STR);
                        $clientInsertStmt->bindValue(':full_name', $data['client_name'], PDO::PARAM_STR);
                        $clientInsertStmt->bindValue(':phone', $data['client_phone'], PDO::PARAM_STR);
                        $clientInsertStmt->bindValue(':email', isset($data['client_email']) ? $data['client_email'] : '', PDO::PARAM_STR);
                        $clientInsertStmt->bindValue(':address', isset($data['client_address']) ? $data['client_address'] : '', PDO::PARAM_STR);
                        
                        if ($clientInsertStmt->execute()) {
                            $client_id = $this->conn->lastInsertId();
                        } else {
                            throw new Exception("Failed to create client");
                        }
                    }
                }
                
                $product_ids = $this->normalizeIdList($data['product_ids'] ?? ($data['product_id'] ?? null));
                $replacement_product_ids = $this->normalizeIdList($data['replacement_product_ids'] ?? ($data['replacement_product_id'] ?? null));
                $product_name = isset($data['product_name']) ? trim((string)$data['product_name']) : '';

                if (empty($product_ids) && $product_name === '') {
                    $this->sendError("Product is required", 400);
                    return;
                }

                $product_id = null;
                if (!empty($product_ids)) {
                    $product_id = (int)$product_ids[0];
                } else {
                    // Check if product exists or create placeholder
                    $productQuery = "SELECT id FROM products WHERE product_name LIKE :product_name LIMIT 1";
                    $productStmt = $this->conn->prepare($productQuery);
                    $productStmt->bindValue(':product_name', "%$product_name%", PDO::PARAM_STR);
                    $productStmt->execute();
                    
                    if ($productStmt->rowCount() > 0) {
                        $product = $productStmt->fetch(PDO::FETCH_ASSOC);
                        $product_id = $product['id'];
                    } else {
                        // Create placeholder product
                        $product_code = 'PRD' . date('Ymd') . strtoupper(substr(uniqid(), -6));
                        $defaultCategory = $this->normalizeDbCategoryValue('OTHERS');
                        $productInsert = "INSERT INTO products (product_code, product_name, category, price, stock_quantity, status, created_at) 
                                        VALUES (:product_code, :product_name, :category, 0, :stock_quantity, 'active', NOW())";
                        $productInsertStmt = $this->conn->prepare($productInsert);
                        $productInsertStmt->bindValue(':product_code', $product_code, PDO::PARAM_STR);
                        $productInsertStmt->bindValue(':product_name', $product_name, PDO::PARAM_STR);
                        $productInsertStmt->bindValue(':category', $defaultCategory, PDO::PARAM_STR);
                        $productInsertStmt->bindValue(':stock_quantity', 1, PDO::PARAM_INT);
                        
                        if ($productInsertStmt->execute()) {
                            $product_id = $this->conn->lastInsertId();
                        } else {
                            $product_id = 0;
                        }
                    }

                    if ($product_id) {
                        $product_ids = [$product_id];
                    }
                }

                $product_ids_json = !empty($product_ids) ? json_encode($product_ids) : null;
                $replacement_product_ids_json = !empty($replacement_product_ids) ? json_encode($replacement_product_ids) : null;
                $currentTimestamp = $this->currentTimestamp();
                
                // Generate order code
                $order_code = 'ORD' . date('Ymd') . strtoupper(substr(uniqid(), -6));
                
                // Get amounts
                $estimated_cost = isset($data['estimated_cost']) ? floatval($data['estimated_cost']) : 0;
                $final_cost = isset($data['final_cost']) ? floatval($data['final_cost']) : $estimated_cost;
                $deposit_amount = isset($data['deposit_amount']) ? floatval($data['deposit_amount']) : 0;
                $payment_status = isset($data['payment_status']) ? $data['payment_status'] : 'pending';
                $service_type = isset($data['service_type']) && trim((string)$data['service_type']) !== ''
                    ? trim((string)$data['service_type'])
                    : 'general';
                $serviceOrdersHasCompanyId = $this->tableHasColumn('service_orders', 'company_id');
                $serviceOrdersHasCompanyIds = $this->tableHasColumn('service_orders', 'company_ids');
                $serviceOrdersHasCompanyProductMap = $this->tableHasColumn('service_orders', 'company_product_map');
                $company_ids = $this->normalizeExistingCompanyIds($data['company_ids'] ?? ($data['company_id'] ?? null));
                $company_id = !empty($company_ids) ? (int)$company_ids[0] : null;
                $company_product_map = $this->normalizeCompanyProductMapValue($data['company_product_map'] ?? ($data['companies_products'] ?? null));
                $normalized_company_product_map = [];
                if (!empty($company_ids)) {
                    foreach ($company_ids as $companyId) {
                        $key = (string)$companyId;
                        $normalized_company_product_map[$key] = isset($company_product_map[$key])
                            ? $this->normalizeIdList($company_product_map[$key])
                            : [];
                    }
                    $flat_company_products = $this->flattenCompanyProductMap($company_ids, $normalized_company_product_map);
                    if (empty($flat_company_products) && !empty($product_ids)) {
                        $normalized_company_product_map[(string)$company_ids[0]] = $product_ids;
                    }
                }
                $company_ids_json = !empty($company_ids) ? json_encode($company_ids) : null;
                $company_product_map_json = !empty($normalized_company_product_map) ? json_encode($normalized_company_product_map) : null;

                $normalizedProductStatusMap = [];
                $incomingProductStatusMap = is_array($data['product_status_map'] ?? null) ? $data['product_status_map'] : [];
                foreach ($product_ids as $rawProductId) {
                    $productKey = (string)((int)$rawProductId);
                    if ($productKey === '0') {
                        continue;
                    }
                    $normalizedProductStatusMap[$productKey] = $this->normalizeProductFlowStatusValue($incomingProductStatusMap[$productKey] ?? 'pending');
                }

                $productStatusDatesMap = $this->buildProductStatusDatesMapForCreate(
                    $product_ids,
                    $normalizedProductStatusMap,
                    $currentTimestamp
                );

                $serviceOrdersHasProductStatusMap = $this->tableHasColumn('service_orders', 'product_status_map');
                $serviceOrdersHasProductStatusDatesMap = $this->tableHasColumn('service_orders', 'product_status_dates_map');
                $serviceOrdersHasRepairingStatusMap = $this->tableHasColumn('service_orders', 'repairing_status_map');
                $serviceOrdersHasIssueDescriptionMap = $this->tableHasColumn('service_orders', 'issue_description_map');
                $serviceOrdersHasAccessoryTypeMap = $this->tableHasColumn('service_orders', 'accessory_type_map');
                $serviceOrdersHasResultTextMap = $this->tableHasColumn('service_orders', 'result_text_map');
                $serviceOrdersHasHandoverType = $this->tableHasColumn('service_orders', 'handover_type');
                $serviceOrdersHasHandoverTypeMap = $this->tableHasColumn('service_orders', 'handover_type_map');
                $serviceOrdersHasProductQuantityMap = $this->tableHasColumn('service_orders', 'product_quantity_map');
                $normalizedProductQuantityMap = $this->buildProductQuantityMapForIds(
                    $product_ids,
                    $data['product_quantity_map'] ?? null
                );
                $productQuantityMapJson = json_encode($normalizedProductQuantityMap);

                $incomingAccessoryTypeMap = is_array($data['accessory_type_map'] ?? null) ? $data['accessory_type_map'] : [];
                $normalizedAccessoryTypeMap = [];
                foreach ($product_ids as $rawProductId) {
                    $productKey = (string)((int)$rawProductId);
                    if ($productKey === '0') {
                        continue;
                    }
                    $candidateAccessoryType = strtolower(trim((string)($incomingAccessoryTypeMap[$productKey] ?? '')));
                    if (in_array($candidateAccessoryType, ['with_box', 'without_box'], true)) {
                        $normalizedAccessoryTypeMap[$productKey] = $candidateAccessoryType;
                    }
                }

                $incomingResultTextMap = is_array($data['result_text_map'] ?? null) ? $data['result_text_map'] : [];
                $normalizedResultTextMap = [];
                foreach ($product_ids as $rawProductId) {
                    $productKey = (string)((int)$rawProductId);
                    if ($productKey === '0') {
                        continue;
                    }
                    $normalizedResultTextMap[$productKey] = trim((string)($incomingResultTextMap[$productKey] ?? ''));
                }

                $incomingHandoverTypeMap = is_array($data['handover_type_map'] ?? null) ? $data['handover_type_map'] : [];
                $normalizedHandoverTypeMap = [];
                foreach ($product_ids as $rawProductId) {
                    $productKey = (string)((int)$rawProductId);
                    if ($productKey === '0') {
                        continue;
                    }
                    $normalizedHandoverTypeMap[$productKey] = $this->normalizeDeliveryTypeForInsert($incomingHandoverTypeMap[$productKey] ?? ($data['handover_type'] ?? 'inhand'));
                }
                $primaryHandoverType = !empty($normalizedHandoverTypeMap)
                    ? reset($normalizedHandoverTypeMap)
                    : $this->normalizeDeliveryTypeForInsert($data['handover_type'] ?? 'inhand');
                
                // Create order
                $orderExtraColumns = "";
                $orderExtraValues = "";
                if ($serviceOrdersHasCompanyId) {
                    $orderExtraColumns .= ", company_id";
                    $orderExtraValues .= ", :company_id";
                }
                if ($serviceOrdersHasCompanyIds) {
                    $orderExtraColumns .= ", company_ids";
                    $orderExtraValues .= ", :company_ids";
                }
                if ($serviceOrdersHasCompanyProductMap) {
                    $orderExtraColumns .= ", company_product_map";
                    $orderExtraValues .= ", :company_product_map";
                }
                if ($serviceOrdersHasProductStatusMap) {
                    $orderExtraColumns .= ", product_status_map";
                    $orderExtraValues .= ", :product_status_map";
                }
                if ($serviceOrdersHasProductStatusDatesMap) {
                    $orderExtraColumns .= ", product_status_dates_map";
                    $orderExtraValues .= ", :product_status_dates_map";
                }
                if ($serviceOrdersHasRepairingStatusMap) {
                    $orderExtraColumns .= ", repairing_status_map";
                    $orderExtraValues .= ", :repairing_status_map";
                }
                if ($serviceOrdersHasIssueDescriptionMap) {
                    $orderExtraColumns .= ", issue_description_map";
                    $orderExtraValues .= ", :issue_description_map";
                }
                if ($serviceOrdersHasAccessoryTypeMap) {
                    $orderExtraColumns .= ", accessory_type_map";
                    $orderExtraValues .= ", :accessory_type_map";
                }
                if ($serviceOrdersHasResultTextMap) {
                    $orderExtraColumns .= ", result_text_map";
                    $orderExtraValues .= ", :result_text_map";
                }
                if ($serviceOrdersHasHandoverType) {
                    $orderExtraColumns .= ", handover_type";
                    $orderExtraValues .= ", :handover_type";
                }
                if ($serviceOrdersHasHandoverTypeMap) {
                    $orderExtraColumns .= ", handover_type_map";
                    $orderExtraValues .= ", :handover_type_map";
                }
                if ($serviceOrdersHasProductQuantityMap) {
                    $orderExtraColumns .= ", product_quantity_map";
                    $orderExtraValues .= ", :product_quantity_map";
                }
                $orderQuery = "INSERT INTO service_orders (order_code, client_id, product_id, product_ids, replacement_product_id, replacement_product_ids, staff_id, service_type,
                             issue_description, warranty_status, estimated_cost, final_cost, deposit_amount, 
                             payment_status, estimated_delivery_date, status, priority, notes{$orderExtraColumns}, created_at)
                             VALUES (:order_code, :client_id, :product_id, :product_ids, :replacement_product_id, :replacement_product_ids, :staff_id, :service_type,
                             :issue_description, :warranty_status, :estimated_cost, :final_cost, :deposit_amount,
                             :payment_status, :estimated_delivery_date, :status, :priority, :notes{$orderExtraValues}, :created_at)";
                
                $orderStmt = $this->conn->prepare($orderQuery);
                $orderStmt->bindValue(':order_code', $order_code, PDO::PARAM_STR);
                $orderStmt->bindValue(':client_id', $client_id, PDO::PARAM_INT);
                $orderStmt->bindValue(':product_id', $product_id, PDO::PARAM_INT);
                $orderStmt->bindValue(':product_ids', $product_ids_json, $product_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $orderStmt->bindValue(':replacement_product_id', !empty($replacement_product_ids) ? (int)$replacement_product_ids[0] : null, !empty($replacement_product_ids) ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $orderStmt->bindValue(':replacement_product_ids', $replacement_product_ids_json, $replacement_product_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $orderStmt->bindValue(':staff_id', isset($data['staff_id']) && !empty($data['staff_id']) ? $data['staff_id'] : null, PDO::PARAM_INT);
                $orderStmt->bindValue(':service_type', $service_type, PDO::PARAM_STR);
                $orderStmt->bindValue(':issue_description', $data['issue_description'], PDO::PARAM_STR);
                $orderStmt->bindValue(':warranty_status', isset($data['warranty_status']) ? $data['warranty_status'] : 'out_of_warranty', PDO::PARAM_STR);
                $orderStmt->bindValue(':estimated_cost', $estimated_cost, PDO::PARAM_STR);
                $orderStmt->bindValue(':final_cost', $final_cost, PDO::PARAM_STR);
                $orderStmt->bindValue(':deposit_amount', $deposit_amount, PDO::PARAM_STR);
                $orderStmt->bindValue(':payment_status', $payment_status, PDO::PARAM_STR);
                $orderStmt->bindValue(':estimated_delivery_date', isset($data['estimated_delivery_date']) ? $data['estimated_delivery_date'] : date('Y-m-d', strtotime('+7 days')), PDO::PARAM_STR);
                $normalizedOrderStatus = $this->normalizeServiceOrderStatusForWrite($data['status'] ?? 'pending');
                $orderStmt->bindValue(':status', $normalizedOrderStatus, is_int($normalizedOrderStatus) ? PDO::PARAM_INT : PDO::PARAM_STR);
                $orderStmt->bindValue(':priority', isset($data['priority']) ? $data['priority'] : 'medium', PDO::PARAM_STR);
                $orderStmt->bindValue(':notes', isset($data['notes']) ? $data['notes'] : '', PDO::PARAM_STR);
                $orderStmt->bindValue(':created_at', $currentTimestamp, PDO::PARAM_STR);
                if ($serviceOrdersHasCompanyId) {
                    $orderStmt->bindValue(':company_id', $company_id, $company_id ? PDO::PARAM_INT : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasCompanyIds) {
                    $orderStmt->bindValue(':company_ids', $company_ids_json, $company_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasCompanyProductMap) {
                    $orderStmt->bindValue(':company_product_map', $company_product_map_json, $company_product_map_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasProductStatusMap) {
                    $productStatusMapJson = !empty($normalizedProductStatusMap) ? json_encode($normalizedProductStatusMap) : null;
                    $orderStmt->bindValue(':product_status_map', $productStatusMapJson, $productStatusMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasProductStatusDatesMap) {
                    $productStatusDatesMapJson = !empty($productStatusDatesMap) ? json_encode($productStatusDatesMap) : null;
                    $orderStmt->bindValue(':product_status_dates_map', $productStatusDatesMapJson, $productStatusDatesMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasRepairingStatusMap) {
                    $repairingStatusMap = is_array($data['repairing_status_map'] ?? null) ? $data['repairing_status_map'] : [];
                    $repairingStatusMapJson = !empty($repairingStatusMap) ? json_encode($repairingStatusMap) : null;
                    $orderStmt->bindValue(':repairing_status_map', $repairingStatusMapJson, $repairingStatusMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasIssueDescriptionMap) {
                    $issueDescriptionMap = is_array($data['issue_description_map'] ?? null) ? $data['issue_description_map'] : [];
                    $issueDescriptionMapJson = !empty($issueDescriptionMap) ? json_encode($issueDescriptionMap) : null;
                    $orderStmt->bindValue(':issue_description_map', $issueDescriptionMapJson, $issueDescriptionMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasAccessoryTypeMap) {
                    $accessoryTypeMapJson = !empty($normalizedAccessoryTypeMap) ? json_encode($normalizedAccessoryTypeMap) : null;
                    $orderStmt->bindValue(':accessory_type_map', $accessoryTypeMapJson, $accessoryTypeMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasResultTextMap) {
                    $resultTextMapJson = !empty($normalizedResultTextMap) ? json_encode($normalizedResultTextMap) : null;
                    $orderStmt->bindValue(':result_text_map', $resultTextMapJson, $resultTextMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasHandoverType) {
                    $orderStmt->bindValue(':handover_type', $primaryHandoverType, PDO::PARAM_STR);
                }
                if ($serviceOrdersHasHandoverTypeMap) {
                    $handoverTypeMapJson = !empty($normalizedHandoverTypeMap) ? json_encode($normalizedHandoverTypeMap) : null;
                    $orderStmt->bindValue(':handover_type_map', $handoverTypeMapJson, $handoverTypeMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasProductQuantityMap) {
                    $orderStmt->bindValue(':product_quantity_map', $productQuantityMapJson, PDO::PARAM_STR);
                }
                
                if ($orderStmt->execute()) {
                    $order_id = $this->conn->lastInsertId();

                    $this->syncOrderProducts((int)$order_id, $product_ids, false);
                    $this->syncOrderProducts((int)$order_id, $replacement_product_ids, true);
                    $this->ensureDeliveriesExistForOrder((int)$order_id, $normalizedProductStatusMap);
                    $this->syncDeliveryItemsForOrder((int)$order_id);
                    
                    // Create payment record if there's an amount
                    if ($final_cost > 0) {
                        $this->createPaymentForOrder($order_id, $order_code, $final_cost, $deposit_amount, $payment_status, $data);
                    }
                    
                    // Commit transaction
                    $this->conn->commit();
                    
                    $this->sendSuccess([
                        'message' => 'Order created successfully',
                        'order_id' => $order_id,
                        'order_code' => $order_code
                    ]);
                } else {
                    throw new Exception("Failed to create order");
                }
                
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to create order: " . $e->getMessage(), 500);
        }
    }
    
    private function createPaymentForOrder($order_id, $order_code, $final_cost, $deposit_amount, $payment_status, $order_data) {
        try {
            // Generate payment code
            $payment_code = 'PAY-' . $order_code . '-' . time();
            
            // Determine payment amount based on payment status
            $payment_amount = 0;
            $payment_method = isset($order_data['payment_method']) ? $order_data['payment_method'] : 'cash';
            $transaction_id = isset($order_data['transaction_id']) ? $order_data['transaction_id'] : null;
            $created_by = isset($order_data['created_by']) ? $order_data['created_by'] : $this->user['user_id'];
            
            if ($payment_status === 'paid') {
                $payment_amount = $final_cost;
            } elseif ($payment_status === 'partially_paid' && $deposit_amount > 0) {
                $payment_amount = $deposit_amount;
            } else {
                // For pending or other statuses, don't create a payment record
                return;
            }
            
            // Create payment record
            $paymentQuery = "INSERT INTO payments (payment_code, order_id, estimated_cost, final_cost, 
                           deposit_amount, amount, payment_method, transaction_id, payment_status, 
                           notes, created_by, created_at)
                           VALUES (:payment_code, :order_id, :estimated_cost, :final_cost, 
                           :deposit_amount, :amount, :payment_method, :transaction_id, :payment_status,
                           :notes, :created_by, NOW())";
            
            $paymentStmt = $this->conn->prepare($paymentQuery);
            $paymentStmt->bindValue(':payment_code', $payment_code, PDO::PARAM_STR);
            $paymentStmt->bindValue(':order_id', $order_id, PDO::PARAM_INT);
            $paymentStmt->bindValue(':estimated_cost', isset($order_data['estimated_cost']) ? $order_data['estimated_cost'] : $final_cost, PDO::PARAM_STR);
            $paymentStmt->bindValue(':final_cost', $final_cost, PDO::PARAM_STR);
            $paymentStmt->bindValue(':deposit_amount', $deposit_amount, PDO::PARAM_STR);
            $paymentStmt->bindValue(':amount', $payment_amount, PDO::PARAM_STR);
            $paymentStmt->bindValue(':payment_method', $payment_method, PDO::PARAM_STR);
            $paymentStmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_STR);
            $paymentStmt->bindValue(':payment_status', $payment_status === 'partially_paid' ? 'paid' : $payment_status, PDO::PARAM_STR);
            $paymentStmt->bindValue(':notes', isset($order_data['payment_notes']) ? $order_data['payment_notes'] : 'Initial payment for order ' . $order_code, PDO::PARAM_STR);
            $paymentStmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
            
            return $paymentStmt->execute();
            
        } catch (Exception $e) {
            error_log("Failed to create payment for order {$order_id}: " . $e->getMessage());
            return false;
        }
    }
    
    private function updateOrder() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            $this->ensureDeliveriesSchemaColumns();
            $serviceOrdersHasCompanyId = $this->tableHasColumn('service_orders', 'company_id');
            $serviceOrdersHasCompanyIds = $this->tableHasColumn('service_orders', 'company_ids');
            $serviceOrdersHasCompanyProductMap = $this->tableHasColumn('service_orders', 'company_product_map');
            
            if (empty($data['id'])) {
                $this->sendError("Order ID is required", 400);
                return;
            }
            
            // Start transaction
            $this->conn->beginTransaction();
            
            try {
                // Check if order exists
                $checkColumns = "id, order_code, payment_status, final_cost, deposit_amount, product_id, product_ids, replacement_product_id, replacement_product_ids";
                if ($serviceOrdersHasCompanyId) {
                    $checkColumns .= ", company_id";
                }
                if ($serviceOrdersHasCompanyIds) {
                    $checkColumns .= ", company_ids";
                }
                if ($serviceOrdersHasCompanyProductMap) {
                    $checkColumns .= ", company_product_map";
                }
                if ($this->tableHasColumn('service_orders', 'product_status_map')) {
                    $checkColumns .= ", product_status_map";
                }
                if ($this->tableHasColumn('service_orders', 'product_status_dates_map')) {
                    $checkColumns .= ", product_status_dates_map";
                }
                if ($this->tableHasColumn('service_orders', 'accessory_type_map')) {
                    $checkColumns .= ", accessory_type_map";
                }
                if ($this->tableHasColumn('service_orders', 'result_text_map')) {
                    $checkColumns .= ", result_text_map";
                }
                if ($this->tableHasColumn('service_orders', 'handover_type')) {
                    $checkColumns .= ", handover_type";
                }
                if ($this->tableHasColumn('service_orders', 'handover_type_map')) {
                    $checkColumns .= ", handover_type_map";
                }
                if ($this->tableHasColumn('service_orders', 'product_quantity_map')) {
                    $checkColumns .= ", product_quantity_map";
                }
                $checkQuery = "SELECT {$checkColumns} FROM service_orders WHERE id = :id";
                $checkStmt = $this->conn->prepare($checkQuery);
                $checkStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
                $checkStmt->execute();
                
                if ($checkStmt->rowCount() === 0) {
                    throw new Exception("Order not found");
                }
                
                $existingOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                // Update client information if provided
                if (!empty($data['client_name']) && !empty($data['client_phone'])) {
                    $clientQuery = "UPDATE clients SET full_name = :full_name, phone = :phone, updated_at = NOW() 
                                  WHERE id = (SELECT client_id FROM service_orders WHERE id = :order_id)";
                    $clientStmt = $this->conn->prepare($clientQuery);
                    $clientStmt->bindValue(':full_name', $data['client_name'], PDO::PARAM_STR);
                    $clientStmt->bindValue(':phone', $data['client_phone'], PDO::PARAM_STR);
                    $clientStmt->bindValue(':order_id', $data['id'], PDO::PARAM_INT);
                    $clientStmt->execute();
                }
                
                // Update product information if provided
                if (!empty($data['product_name'])) {
                    $productQuery = "UPDATE products SET product_name = :product_name, updated_at = NOW() 
                                   WHERE id = (SELECT product_id FROM service_orders WHERE id = :order_id)";
                    $productStmt = $this->conn->prepare($productQuery);
                    $productStmt->bindValue(':product_name', $data['product_name'], PDO::PARAM_STR);
                    $productStmt->bindValue(':order_id', $data['id'], PDO::PARAM_INT);
                    $productStmt->execute();
                }

                $productIdsProvided = array_key_exists('product_ids', $data) || array_key_exists('product_id', $data);
                $replacementIdsProvided = array_key_exists('replacement_product_ids', $data) || array_key_exists('replacement_product_id', $data);
                $new_product_ids = null;
                $new_replacement_product_ids = null;
                $new_product_id = (int)($existingOrder['product_id'] ?? 0);
                $new_replacement_product_id = $existingOrder['replacement_product_id'] ?? null;
                $new_product_ids_json = $existingOrder['product_ids'] ?? null;
                $new_replacement_product_ids_json = $existingOrder['replacement_product_ids'] ?? null;
                $new_company_ids = $serviceOrdersHasCompanyIds
                    ? $this->normalizeExistingCompanyIds($existingOrder['company_ids'] ?? ($existingOrder['company_id'] ?? null))
                    : ($serviceOrdersHasCompanyId ? $this->normalizeExistingCompanyIds($existingOrder['company_id'] ?? null) : []);
                $new_company_id = !empty($new_company_ids) ? (int)$new_company_ids[0] : null;
                $new_company_product_map = $serviceOrdersHasCompanyProductMap
                    ? $this->normalizeCompanyProductMapValue($existingOrder['company_product_map'] ?? null)
                    : [];

                if ($productIdsProvided) {
                    $new_product_ids = $this->normalizeIdList($data['product_ids'] ?? ($data['product_id'] ?? null));
                    if (empty($new_product_ids)) {
                        throw new Exception("At least one product is required");
                    }
                    $new_product_id = (int)$new_product_ids[0];
                    $new_product_ids_json = json_encode($new_product_ids);
                }

                if ($replacementIdsProvided) {
                    $new_replacement_product_ids = $this->normalizeIdList($data['replacement_product_ids'] ?? ($data['replacement_product_id'] ?? null));
                    $new_replacement_product_id = !empty($new_replacement_product_ids) ? (int)$new_replacement_product_ids[0] : null;
                    $new_replacement_product_ids_json = !empty($new_replacement_product_ids) ? json_encode($new_replacement_product_ids) : null;
                }

                $companyIdsProvided = array_key_exists('company_ids', $data) || array_key_exists('company_id', $data);
                $companyProductMapProvided = array_key_exists('company_product_map', $data) || array_key_exists('companies_products', $data);
                if ($companyIdsProvided || $companyProductMapProvided) {
                    $candidateCompanyIds = $companyIdsProvided
                        ? $this->normalizeExistingCompanyIds($data['company_ids'] ?? ($data['company_id'] ?? null))
                        : $new_company_ids;
                    $candidateCompanyProductMap = $companyProductMapProvided
                        ? $this->normalizeCompanyProductMapValue($data['company_product_map'] ?? ($data['companies_products'] ?? null))
                        : $new_company_product_map;
                    if (!$companyIdsProvided && !empty($candidateCompanyProductMap)) {
                        $candidateCompanyIds = $this->normalizeExistingCompanyIds(array_keys($candidateCompanyProductMap));
                    }

                    $normalizedCandidateMap = [];
                    foreach ($candidateCompanyIds as $companyId) {
                        $key = (string)$companyId;
                        $normalizedCandidateMap[$key] = isset($candidateCompanyProductMap[$key])
                            ? $this->normalizeIdList($candidateCompanyProductMap[$key])
                            : [];
                    }
                    $sourceProductIds = is_array($new_product_ids) && !empty($new_product_ids)
                        ? $new_product_ids
                        : $this->normalizeIdList($existingOrder['product_ids'] ?? ($existingOrder['product_id'] ?? null));
                    if (!empty($candidateCompanyIds) && empty($this->flattenCompanyProductMap($candidateCompanyIds, $normalizedCandidateMap)) && !empty($sourceProductIds)) {
                        $normalizedCandidateMap[(string)$candidateCompanyIds[0]] = $sourceProductIds;
                    }

                    $new_company_ids = $candidateCompanyIds;
                    $new_company_id = !empty($new_company_ids) ? (int)$new_company_ids[0] : null;
                    $new_company_product_map = $normalizedCandidateMap;
                }
                $new_company_ids_json = !empty($new_company_ids) ? json_encode($new_company_ids) : null;
                $new_company_product_map_json = !empty($new_company_product_map) ? json_encode($new_company_product_map) : null;
                
                // Get new values
                $new_final_cost = isset($data['final_cost']) ? floatval($data['final_cost']) : floatval($existingOrder['final_cost']);
                $new_deposit_amount = isset($data['deposit_amount']) ? floatval($data['deposit_amount']) : floatval($existingOrder['deposit_amount']);
                $new_payment_status = isset($data['payment_status']) ? $data['payment_status'] : $existingOrder['payment_status'];
                $new_service_type = isset($data['service_type']) && trim((string)$data['service_type']) !== ''
                    ? trim((string)$data['service_type'])
                    : 'general';
                
                $serviceOrdersHasProductStatusMap = $this->tableHasColumn('service_orders', 'product_status_map');
                $serviceOrdersHasProductStatusDatesMap = $this->tableHasColumn('service_orders', 'product_status_dates_map');
                $serviceOrdersHasAccessoryTypeMap = $this->tableHasColumn('service_orders', 'accessory_type_map');
                $serviceOrdersHasResultTextMap = $this->tableHasColumn('service_orders', 'result_text_map');
                $serviceOrdersHasHandoverType = $this->tableHasColumn('service_orders', 'handover_type');
                $serviceOrdersHasHandoverTypeMap = $this->tableHasColumn('service_orders', 'handover_type_map');
                $serviceOrdersHasProductQuantityMap = $this->tableHasColumn('service_orders', 'product_quantity_map');
                $currentTimestamp = $this->currentTimestamp();
                $normalizedProductStatusMap = [];
                $productStatusDatesMapJson = null;
                $accessoryTypeMapJson = null;
                $resultTextMapJson = null;
                $handoverTypeMapJson = null;
                $productQuantityMapJson = null;
                $primaryHandoverType = $serviceOrdersHasHandoverType
                    ? $this->normalizeDeliveryTypeForInsert($existingOrder['handover_type'] ?? 'inhand')
                    : 'inhand';

                if ($serviceOrdersHasProductStatusMap) {
                    $existingProductStatusMap = $this->normalizeStatusMapSafe($existingOrder['product_status_map'] ?? null);
                    $incomingProductStatusMap = is_array($data['product_status_map'] ?? null) ? $data['product_status_map'] : [];
                    $productIdsForStatus = is_array($new_product_ids) && !empty($new_product_ids)
                        ? $new_product_ids
                        : $this->normalizeIdList($existingOrder['product_ids'] ?? ($existingOrder['product_id'] ?? null));
                    foreach ($productIdsForStatus as $rawProductId) {
                        $productKey = (string)((int)$rawProductId);
                        if ($productKey === '0') {
                            continue;
                        }
                        $candidateStatus = array_key_exists($productKey, $incomingProductStatusMap)
                            ? $incomingProductStatusMap[$productKey]
                            : ($existingProductStatusMap[$productKey] ?? 'pending');
                        $normalizedProductStatusMap[$productKey] = $this->normalizeProductFlowStatusValue($candidateStatus);
                    }

                    if ($serviceOrdersHasProductStatusDatesMap) {
                        $existingDatesMap = $this->normalizeProductStatusDatesMapValue($existingOrder['product_status_dates_map'] ?? null);
                        $mergedDatesMap = $this->mergeProductStatusDatesMap(
                            $productIdsForStatus,
                            $normalizedProductStatusMap,
                            $existingDatesMap,
                            $currentTimestamp
                        );
                        $productStatusDatesMapJson = !empty($mergedDatesMap) ? json_encode($mergedDatesMap) : null;
                    }
                }

                $productIdsForMetadata = is_array($new_product_ids) && !empty($new_product_ids)
                    ? $new_product_ids
                    : $this->normalizeIdList($existingOrder['product_ids'] ?? ($existingOrder['product_id'] ?? null));

                if ($serviceOrdersHasProductQuantityMap) {
                    $sourceProductQuantityMap = array_key_exists('product_quantity_map', $data)
                        ? $data['product_quantity_map']
                        : ($existingOrder['product_quantity_map'] ?? null);
                    $normalizedProductQuantityMap = $this->buildProductQuantityMapForIds(
                        $productIdsForMetadata,
                        $sourceProductQuantityMap
                    );
                    $productQuantityMapJson = json_encode($normalizedProductQuantityMap);
                }

                if ($serviceOrdersHasAccessoryTypeMap) {
                    $existingAccessoryTypeMap = [];
                    if (!empty($existingOrder['accessory_type_map'])) {
                        $decodedAccessoryTypeMap = json_decode((string)$existingOrder['accessory_type_map'], true);
                        if (is_array($decodedAccessoryTypeMap)) {
                            $existingAccessoryTypeMap = $decodedAccessoryTypeMap;
                        }
                    }
                    $incomingAccessoryTypeMap = is_array($data['accessory_type_map'] ?? null) ? $data['accessory_type_map'] : $existingAccessoryTypeMap;
                    $normalizedAccessoryTypeMap = [];
                    foreach ($productIdsForMetadata as $rawProductId) {
                        $productKey = (string)((int)$rawProductId);
                        if ($productKey === '0') {
                            continue;
                        }
                        $candidateAccessoryType = strtolower(trim((string)($incomingAccessoryTypeMap[$productKey] ?? '')));
                        if (in_array($candidateAccessoryType, ['with_box', 'without_box'], true)) {
                            $normalizedAccessoryTypeMap[$productKey] = $candidateAccessoryType;
                        }
                    }
                    $accessoryTypeMapJson = !empty($normalizedAccessoryTypeMap) ? json_encode($normalizedAccessoryTypeMap) : null;
                }

                if ($serviceOrdersHasResultTextMap) {
                    $existingResultTextMap = [];
                    if (!empty($existingOrder['result_text_map'])) {
                        $decodedResultTextMap = json_decode((string)$existingOrder['result_text_map'], true);
                        if (is_array($decodedResultTextMap)) {
                            $existingResultTextMap = $decodedResultTextMap;
                        }
                    }
                    $incomingResultTextMap = is_array($data['result_text_map'] ?? null) ? $data['result_text_map'] : $existingResultTextMap;
                    $normalizedResultTextMap = [];
                    foreach ($productIdsForMetadata as $rawProductId) {
                        $productKey = (string)((int)$rawProductId);
                        if ($productKey === '0') {
                            continue;
                        }
                        $normalizedResultTextMap[$productKey] = trim((string)($incomingResultTextMap[$productKey] ?? ''));
                    }
                    $resultTextMapJson = !empty($normalizedResultTextMap) ? json_encode($normalizedResultTextMap) : null;
                }

                if ($serviceOrdersHasHandoverTypeMap) {
                    $existingHandoverTypeMap = [];
                    if (!empty($existingOrder['handover_type_map'])) {
                        $decodedHandoverTypeMap = json_decode((string)$existingOrder['handover_type_map'], true);
                        if (is_array($decodedHandoverTypeMap)) {
                            $existingHandoverTypeMap = $decodedHandoverTypeMap;
                        }
                    }
                    $incomingHandoverTypeMap = is_array($data['handover_type_map'] ?? null) ? $data['handover_type_map'] : $existingHandoverTypeMap;
                    $normalizedHandoverTypeMap = [];
                    foreach ($productIdsForMetadata as $rawProductId) {
                        $productKey = (string)((int)$rawProductId);
                        if ($productKey === '0') {
                            continue;
                        }
                        $normalizedHandoverTypeMap[$productKey] = $this->normalizeDeliveryTypeForInsert(
                            $incomingHandoverTypeMap[$productKey] ?? ($data['handover_type'] ?? ($existingOrder['handover_type'] ?? 'inhand'))
                        );
                    }
                    $handoverTypeMapJson = !empty($normalizedHandoverTypeMap) ? json_encode($normalizedHandoverTypeMap) : null;
                    if (!empty($normalizedHandoverTypeMap)) {
                        $primaryHandoverType = reset($normalizedHandoverTypeMap);
                    }
                } elseif ($serviceOrdersHasHandoverType && isset($data['handover_type'])) {
                    $primaryHandoverType = $this->normalizeDeliveryTypeForInsert($data['handover_type']);
                }

                // Update order
                $query = "UPDATE service_orders SET 
                         product_id = :product_id,
                         product_ids = :product_ids,
                         replacement_product_id = :replacement_product_id,
                         replacement_product_ids = :replacement_product_ids,
                         service_type = :service_type,
                         issue_description = :issue_description,
                         warranty_status = :warranty_status,
                         estimated_cost = :estimated_cost,
                         final_cost = :final_cost,
                         deposit_amount = :deposit_amount,
                         payment_status = :payment_status,
                         estimated_delivery_date = :estimated_delivery_date,
                         status = :status,
                         priority = :priority,
                         staff_id = :staff_id,
                         " . ($serviceOrdersHasProductStatusMap ? "product_status_map = :product_status_map," : "") . "
                         " . ($serviceOrdersHasProductStatusDatesMap ? "product_status_dates_map = :product_status_dates_map," : "") . "
                         " . ($serviceOrdersHasAccessoryTypeMap ? "accessory_type_map = :accessory_type_map," : "") . "
                         " . ($serviceOrdersHasResultTextMap ? "result_text_map = :result_text_map," : "") . "
                         " . ($serviceOrdersHasHandoverType ? "handover_type = :handover_type," : "") . "
                         " . ($serviceOrdersHasHandoverTypeMap ? "handover_type_map = :handover_type_map," : "") . "
                         " . ($serviceOrdersHasProductQuantityMap ? "product_quantity_map = :product_quantity_map," : "") . "
                         " . ($serviceOrdersHasCompanyId ? "company_id = :company_id," : "") . "
                         " . ($serviceOrdersHasCompanyIds ? "company_ids = :company_ids," : "") . "
                         " . ($serviceOrdersHasCompanyProductMap ? "company_product_map = :company_product_map," : "") . "
                         notes = :notes,
                         updated_at = NOW() 
                         WHERE id = :id";
                
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
                $stmt->bindValue(':product_id', $new_product_id, PDO::PARAM_INT);
                $stmt->bindValue(':product_ids', $new_product_ids_json, $new_product_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $stmt->bindValue(':replacement_product_id', $new_replacement_product_id, $new_replacement_product_id ? PDO::PARAM_INT : PDO::PARAM_NULL);
                $stmt->bindValue(':replacement_product_ids', $new_replacement_product_ids_json, $new_replacement_product_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                $stmt->bindValue(':service_type', $new_service_type, PDO::PARAM_STR);
                $stmt->bindValue(':issue_description', $data['issue_description'], PDO::PARAM_STR);
                $stmt->bindValue(':warranty_status', $data['warranty_status'], PDO::PARAM_STR);
                $stmt->bindValue(':estimated_cost', $data['estimated_cost'], PDO::PARAM_STR);
                $stmt->bindValue(':final_cost', $new_final_cost, PDO::PARAM_STR);
                $stmt->bindValue(':deposit_amount', $new_deposit_amount, PDO::PARAM_STR);
                $stmt->bindValue(':payment_status', $new_payment_status, PDO::PARAM_STR);
                $stmt->bindValue(':estimated_delivery_date', $data['estimated_delivery_date'], PDO::PARAM_STR);
                $normalizedOrderStatus = $this->normalizeServiceOrderStatusForWrite(
                    $data['status'] ?? ($existingOrder['status'] ?? 'pending'),
                    $existingOrder['status'] ?? 'pending'
                );
                $stmt->bindValue(':status', $normalizedOrderStatus, is_int($normalizedOrderStatus) ? PDO::PARAM_INT : PDO::PARAM_STR);
                $stmt->bindValue(':priority', $data['priority'], PDO::PARAM_STR);
                $stmt->bindValue(':staff_id', isset($data['staff_id']) && !empty($data['staff_id']) ? $data['staff_id'] : null, PDO::PARAM_INT);
                if ($serviceOrdersHasProductStatusMap) {
                    $productStatusMapJson = !empty($normalizedProductStatusMap) ? json_encode($normalizedProductStatusMap) : null;
                    $stmt->bindValue(':product_status_map', $productStatusMapJson, $productStatusMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasProductStatusDatesMap) {
                    $stmt->bindValue(':product_status_dates_map', $productStatusDatesMapJson, $productStatusDatesMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasAccessoryTypeMap) {
                    $stmt->bindValue(':accessory_type_map', $accessoryTypeMapJson, $accessoryTypeMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasResultTextMap) {
                    $stmt->bindValue(':result_text_map', $resultTextMapJson, $resultTextMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasHandoverType) {
                    $stmt->bindValue(':handover_type', $primaryHandoverType, PDO::PARAM_STR);
                }
                if ($serviceOrdersHasHandoverTypeMap) {
                    $stmt->bindValue(':handover_type_map', $handoverTypeMapJson, $handoverTypeMapJson !== null ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasProductQuantityMap) {
                    $stmt->bindValue(':product_quantity_map', $productQuantityMapJson, PDO::PARAM_STR);
                }
                if ($serviceOrdersHasCompanyId) {
                    $stmt->bindValue(':company_id', $new_company_id, $new_company_id ? PDO::PARAM_INT : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasCompanyIds) {
                    $stmt->bindValue(':company_ids', $new_company_ids_json, $new_company_ids_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                if ($serviceOrdersHasCompanyProductMap) {
                    $stmt->bindValue(':company_product_map', $new_company_product_map_json, $new_company_product_map_json ? PDO::PARAM_STR : PDO::PARAM_NULL);
                }
                $stmt->bindValue(':notes', isset($data['notes']) ? $data['notes'] : '', PDO::PARAM_STR);
                
                if ($stmt->execute()) {
                    if ($productIdsProvided && !is_null($new_product_ids)) {
                        $this->syncOrderProducts((int)$data['id'], $new_product_ids, false);
                    }

                    if ($replacementIdsProvided) {
                        $this->syncOrderProducts((int)$data['id'], $new_replacement_product_ids ?? [], true);
                    }

                    if ($serviceOrdersHasProductQuantityMap) {
                        $this->persistOrderProductQuantityMap(
                            (int)$data['id'],
                            isset($normalizedProductQuantityMap) && is_array($normalizedProductQuantityMap)
                                ? $normalizedProductQuantityMap
                                : $this->buildProductQuantityMapForIds(
                                    $productIdsForMetadata,
                                    $data['product_quantity_map'] ?? ($existingOrder['product_quantity_map'] ?? null)
                                )
                        );
                    }

                    $this->ensureDeliveriesExistForOrder((int)$data['id'], $normalizedProductStatusMap);

                    // Keep delivery_items in sync for multi-product + serial rendering in Delivery page.
                    $this->syncDeliveryItemsForOrder((int)$data['id']);

                    // Check if payment status changed and create payment record if needed
                    if ($new_payment_status !== $existingOrder['payment_status'] || 
                        $new_final_cost !== floatval($existingOrder['final_cost']) ||
                        $new_deposit_amount !== floatval($existingOrder['deposit_amount'])) {
                        
                        // Create payment record for the change
                        $this->createPaymentForOrderUpdate($data['id'], $existingOrder['order_code'], 
                                                          $new_final_cost, $new_deposit_amount, 
                                                          $new_payment_status, $data, $existingOrder);
                    }
                    
                    // Commit transaction
                    $this->conn->commit();
                    
                    $this->sendSuccess(['message' => 'Order updated successfully']);
                } else {
                    throw new Exception("Failed to update order");
                }
                
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
            
        } catch (Exception $e) {
            if ($this->isMissingDeliveryProcedureError($e)) {
                $this->sendError($this->getDeliveryProcedureRepairMessage(), 500);
                return;
            }

            $this->sendError("Failed to update order: " . $e->getMessage(), 500);
        }
    }
    
    private function createPaymentForOrderUpdate($order_id, $order_code, $final_cost, $deposit_amount, $payment_status, $update_data, $existing_order) {
        try {
            // Check if there are existing payments for this order
            $checkPaymentQuery = "SELECT COUNT(*) as payment_count FROM payments WHERE order_id = :order_id";
            $checkPaymentStmt = $this->conn->prepare($checkPaymentQuery);
            $checkPaymentStmt->bindValue(':order_id', $order_id, PDO::PARAM_INT);
            $checkPaymentStmt->execute();
            $payment_count = $checkPaymentStmt->fetch(PDO::FETCH_ASSOC)['payment_count'];
            
            // Generate payment code
            $payment_code = 'PAY-' . $order_code . '-' . time();
            
            // Determine payment amount based on payment status
            $payment_amount = 0;
            $payment_method = isset($update_data['payment_method']) ? $update_data['payment_method'] : 'cash';
            $transaction_id = isset($update_data['transaction_id']) ? $update_data['transaction_id'] : null;
            $created_by = $this->user['user_id'];
            
            if ($payment_status === 'paid' && $payment_count == 0) {
                // First payment for full amount
                $payment_amount = $final_cost;
            } elseif ($payment_status === 'partially_paid' && $deposit_amount > 0) {
                // Deposit payment
                $payment_amount = $deposit_amount;
            } elseif ($payment_status === 'paid' && $existing_order['payment_status'] === 'partially_paid') {
                // Balance payment
                $paid_amount = $deposit_amount;
                $balance_amount = $final_cost - $paid_amount;
                if ($balance_amount > 0) {
                    $payment_amount = $balance_amount;
                }
            } else {
                // No payment needed
                return;
            }
            
            if ($payment_amount > 0) {
                // Create payment record
                $paymentQuery = "INSERT INTO payments (payment_code, order_id, estimated_cost, final_cost, 
                               deposit_amount, amount, payment_method, transaction_id, payment_status, 
                               notes, created_by, created_at)
                               VALUES (:payment_code, :order_id, :estimated_cost, :final_cost, 
                               :deposit_amount, :amount, :payment_method, :transaction_id, :payment_status,
                               :notes, :created_by, NOW())";
                
                $paymentStmt = $this->conn->prepare($paymentQuery);
                $paymentStmt->bindValue(':payment_code', $payment_code, PDO::PARAM_STR);
                $paymentStmt->bindValue(':order_id', $order_id, PDO::PARAM_INT);
                $paymentStmt->bindValue(':estimated_cost', isset($update_data['estimated_cost']) ? $update_data['estimated_cost'] : $final_cost, PDO::PARAM_STR);
                $paymentStmt->bindValue(':final_cost', $final_cost, PDO::PARAM_STR);
                $paymentStmt->bindValue(':deposit_amount', $deposit_amount, PDO::PARAM_STR);
                $paymentStmt->bindValue(':amount', $payment_amount, PDO::PARAM_STR);
                $paymentStmt->bindValue(':payment_method', $payment_method, PDO::PARAM_STR);
                $paymentStmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_STR);
                $paymentStmt->bindValue(':payment_status', $payment_status === 'partially_paid' ? 'paid' : $payment_status, PDO::PARAM_STR);
                
                $notes = '';
                if ($payment_status === 'partially_paid') {
                    $notes = 'Deposit payment for order ' . $order_code;
                } elseif ($payment_status === 'paid' && $existing_order['payment_status'] === 'partially_paid') {
                    $notes = 'Balance payment for order ' . $order_code;
                } elseif ($payment_status === 'paid') {
                    $notes = 'Full payment for order ' . $order_code;
                }
                
                $paymentStmt->bindValue(':notes', isset($update_data['payment_notes']) ? $update_data['payment_notes'] : $notes, PDO::PARAM_STR);
                $paymentStmt->bindValue(':created_by', $created_by, PDO::PARAM_INT);
                
                return $paymentStmt->execute();
            }
            
            return true;
            
        } catch (Exception $e) {
            error_log("Failed to create payment for order update {$order_id}: " . $e->getMessage());
            return false;
        }
    }
    
    private function deleteOrder() {
        try {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            
            if (!$id) {
                $this->sendError("Order ID is required", 400);
                return;
            }
            
            // Start transaction
            $this->conn->beginTransaction();
            
            try {
                // Check if order exists
                $checkQuery = "SELECT id FROM service_orders WHERE id = :id";
                $checkStmt = $this->conn->prepare($checkQuery);
                $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
                $checkStmt->execute();
                
                if ($checkStmt->rowCount() === 0) {
                    throw new Exception("Order not found");
                }
                
                // Delete related payments first (cascade delete should handle this, but being explicit)
                $deletePaymentsQuery = "DELETE FROM payments WHERE order_id = :order_id";
                $deletePaymentsStmt = $this->conn->prepare($deletePaymentsQuery);
                $deletePaymentsStmt->bindValue(':order_id', $id, PDO::PARAM_INT);
                $deletePaymentsStmt->execute();

                $deleteProductsQuery = "DELETE FROM service_order_products WHERE order_id = :order_id";
                $deleteProductsStmt = $this->conn->prepare($deleteProductsQuery);
                $deleteProductsStmt->bindValue(':order_id', $id, PDO::PARAM_INT);
                $deleteProductsStmt->execute();
                
                // Delete the order
                $deleteOrderQuery = "DELETE FROM service_orders WHERE id = :id";
                $deleteOrderStmt = $this->conn->prepare($deleteOrderQuery);
                $deleteOrderStmt->bindValue(':id', $id, PDO::PARAM_INT);
                
                if ($deleteOrderStmt->execute()) {
                    $this->conn->commit();
                    $this->sendSuccess(['message' => 'Order deleted successfully']);
                } else {
                    throw new Exception("Failed to delete order");
                }
                
            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to delete order: " . $e->getMessage(), 500);
        }
    }
    
    private function getClients() {
        try {
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            
            $query = "SELECT c.*, 
                     (SELECT COUNT(*) FROM service_orders WHERE client_id = c.id) as total_orders,
                     (SELECT COALESCE(SUM(final_cost), 0) FROM service_orders WHERE client_id = c.id AND payment_status = 'paid') as total_spent
                     FROM clients c WHERE 1=1";
            
            $params = [];
            $types = [];
            
            if (!empty($search)) {
                $query .= " AND (c.full_name LIKE :search OR c.email LIKE :search OR c.phone LIKE :search)";
                $params[':search'] = "%$search%";
                $types[':search'] = PDO::PARAM_STR;
            }
            
            $query .= " ORDER BY c.id DESC";
            
            $stmt = $this->conn->prepare($query);
            
            if (!empty($params)) {
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, $types[$key] ?? PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
            $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess(['clients' => $clients]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get clients: " . $e->getMessage(), 500);
        }
    }
    
    private function createClient() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            if (!is_array($data)) {
                $data = [];
            }

            $insertClient = function(array $row, ?string $createdAtOverride = null): array {
                if (isset($row['_raw_import_row']) && is_array($row['_raw_import_row'])) {
                    $row = array_merge($row['_raw_import_row'], $row);
                }

                $normalizedRow = [];
                foreach ($row as $key => $value) {
                    if ($key === '_raw_import_row') {
                        continue;
                    }

                    $normalizedKey = strtolower(trim((string)$key));
                    $normalizedKey = preg_replace('/[\s\-\.\/]+/', '_', $normalizedKey);
                    $normalizedKey = preg_replace('/[^\w]/', '', $normalizedKey);
                    $normalizedKey = trim((string)$normalizedKey, '_');

                    if ($normalizedKey !== '') {
                        $normalizedRow[$normalizedKey] = $value;
                    }
                }

                $getFirstValue = function(array $keys) use ($row, $normalizedRow): string {
                    foreach ($keys as $key) {
                        $rawValue = $row[$key] ?? $normalizedRow[$key] ?? null;
                        $value = trim((string)($rawValue ?? ''));
                        if ($value !== '') {
                            return $value;
                        }
                    }

                    return '';
                };

                $getFuzzyValue = function(array $preferredKeys, array $containsPatterns, callable $validator = null) use ($normalizedRow, $getFirstValue): string {
                    $direct = $getFirstValue($preferredKeys);
                    if ($direct !== '') {
                        return $direct;
                    }

                    foreach ($normalizedRow as $key => $rawValue) {
                        $value = trim((string)($rawValue ?? ''));
                        if ($value === '') {
                            continue;
                        }

                        $matched = false;
                        foreach ($containsPatterns as $pattern) {
                            if ($pattern !== '' && strpos($key, $pattern) !== false) {
                                $matched = true;
                                break;
                            }
                        }

                        if (!$matched) {
                            continue;
                        }

                        if ($validator && !$validator($value, $key)) {
                            continue;
                        }

                        return $value;
                    }

                    return '';
                };

                $looksLikePhone = function(string $value): bool {
                    $digits = preg_replace('/\D+/', '', $value);
                    return strlen($digits) >= 6;
                };

                $extractCombinedClientCell = function(string $value): array {
                    $value = trim($value);
                    if ($value === '') {
                        return ['full_name' => '', 'phone' => ''];
                    }

                    preg_match('/(?:\+?\d[\d\s\-\(\)]{5,}\d)/', $value, $matches);
                    $phone = isset($matches[0]) ? trim((string)$matches[0]) : '';
                    $full_name = trim(preg_replace('/\s+/', ' ', str_replace([';', ',', '|'], ' ', str_replace($phone, ' ', $value))));

                    return ['full_name' => $full_name, 'phone' => $phone];
                };

                $orderedValues = array_values(array_filter(array_map(function($value) {
                    return trim((string)($value ?? ''));
                }, array_values($normalizedRow)), function($value) {
                    return $value !== '';
                }));

                $full_name = $getFuzzyValue(
                    ['full_name', 'full_name_', 'name', 'client_name', 'customer_name', 'client', 'customer'],
                    ['full_name', 'client_name', 'customer_name', 'name', 'client', 'customer']
                );
                $phone = $getFuzzyValue(
                    ['phone', 'phone_number', 'mobile', 'mobile_no', 'mobile_number', 'contact', 'contact_number', 'whatsapp', 'whatsapp_number'],
                    ['phone', 'mobile', 'contact', 'whatsapp', 'tel'],
                    function(string $value) use ($looksLikePhone): bool {
                        return $looksLikePhone($value);
                    }
                );
                $email = $getFirstValue(['email', 'mail']);
                $address = $getFirstValue(['address']);
                $city = $getFirstValue(['city']);
                $state = $getFirstValue(['state']);
                $zip_code = $getFirstValue(['zip_code', 'zipcode', 'pin_code', 'pincode']);
                $notes = $getFirstValue(['notes', 'remark', 'remarks']);

                if ($full_name === '') {
                    foreach ($normalizedRow as $key => $rawValue) {
                        $value = trim((string)($rawValue ?? ''));
                        if ($value === '') {
                            continue;
                        }

                        if (strpos($key, 'email') !== false || strpos($key, 'phone') !== false || strpos($key, 'mobile') !== false || strpos($key, 'contact') !== false || strpos($key, 'address') !== false) {
                            continue;
                        }

                        if ($looksLikePhone($value) || filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            continue;
                        }

                        $full_name = $value;
                        break;
                    }
                }

                if ($full_name === '' || $phone === '') {
                    foreach ($normalizedRow as $rawValue) {
                        $value = trim((string)($rawValue ?? ''));
                        if ($value === '') {
                            continue;
                        }

                        $combined = $extractCombinedClientCell($value);

                        if ($full_name === '' && $combined['full_name'] !== '') {
                            $full_name = $combined['full_name'];
                        }

                        if ($phone === '' && $combined['phone'] !== '') {
                            $phone = $combined['phone'];
                        }

                        if ($full_name !== '' && $phone !== '') {
                            break;
                        }
                    }
                }

                if ($full_name === '' && count($orderedValues) > 0) {
                    foreach ($orderedValues as $value) {
                        if (!$looksLikePhone($value) && filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                            $full_name = $value;
                            break;
                        }
                    }
                }

                if ($full_name === '' && count($orderedValues) > 0) {
                    $firstCell = $extractCombinedClientCell((string)$orderedValues[0]);
                    if ($firstCell['full_name'] !== '') {
                        $full_name = $firstCell['full_name'];
                    } else {
                        $full_name = trim((string)$orderedValues[0]);
                    }
                }

                if ($phone === '' && count($orderedValues) > 1) {
                    $secondCell = $extractCombinedClientCell((string)$orderedValues[1]);
                    if ($secondCell['phone'] !== '') {
                        $phone = $secondCell['phone'];
                    } elseif ($looksLikePhone((string)$orderedValues[1])) {
                        $phone = trim((string)$orderedValues[1]);
                    }
                }

                if ($full_name === '') {
                    $full_name = 'Imported Client ' . date('YmdHis');
                }

                if ($phone === '') {
                    $phone = 'IMP' . date('YmdHis') . strtoupper(substr(uniqid(), -4));
                }

                if ($notes === '') {
                    $notes = 'Imported from CSV';
                }

                $client_code = 'CLT' . date('Ymd') . strtoupper(substr(uniqid(), -6));

                $createdAt = $createdAtOverride ?: $this->currentTimestamp();

                $query = "INSERT INTO clients (
                            client_code, full_name, email, phone, address, city, state, zip_code, notes, created_at
                          ) VALUES (
                            :client_code, :full_name, :email, :phone, :address, :city, :state, :zip_code, :notes, :created_at
                          )";

                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':client_code', $client_code, PDO::PARAM_STR);
                $stmt->bindValue(':full_name', $full_name, PDO::PARAM_STR);
                $stmt->bindValue(':email', $email, PDO::PARAM_STR);
                $stmt->bindValue(':phone', $phone, PDO::PARAM_STR);
                $stmt->bindValue(':address', $address, PDO::PARAM_STR);
                $stmt->bindValue(':city', $city, PDO::PARAM_STR);
                $stmt->bindValue(':state', $state, PDO::PARAM_STR);
                $stmt->bindValue(':zip_code', $zip_code, PDO::PARAM_STR);
                $stmt->bindValue(':notes', $notes, PDO::PARAM_STR);
                $stmt->bindValue(':created_at', $createdAt, PDO::PARAM_STR);

                if (!$stmt->execute()) {
                    return ['success' => false, 'message' => 'Failed to create client'];
                }

                return [
                    'success' => true,
                    'client_id' => (int)$this->conn->lastInsertId(),
                    'client_code' => $client_code,
                    'full_name' => $full_name
                ];
            };

            $isBatch = isset($data['clients']) && is_array($data['clients']);
            if ($isBatch) {
                $rows = $data['clients'];
                if (count($rows) === 0) {
                    $this->sendError("Clients array is empty", 400);
                    return;
                }

                $createdClients = [];
                $errors = [];
                $importStartedAt = isset($data['import_started_at']) ? (int)$data['import_started_at'] : time();

                $this->conn->beginTransaction();
                try {
                    foreach ($rows as $index => $row) {
                        if (!is_array($row)) {
                            $errors[] = ['index' => $index, 'message' => 'Invalid row format'];
                            continue;
                        }

                        $importSequence = isset($row['_import_sequence']) ? max(0, (int)$row['_import_sequence']) : $index;
                        $createdAt = date('Y-m-d H:i:s', max(0, $importStartedAt - $importSequence));
                        $result = $insertClient($row, $createdAt);

                        if (!empty($result['success'])) {
                            $createdClients[] = [
                                'index' => $index,
                                'client_id' => $result['client_id'],
                                'client_code' => $result['client_code'],
                                'full_name' => $result['full_name'],
                            ];
                        } else {
                            $errors[] = [
                                'index' => $index,
                                'full_name' => trim((string)($row['full_name'] ?? $row['name'] ?? $row['client_name'] ?? '')),
                                'message' => $result['message'] ?? 'Failed to create client',
                            ];
                        }
                    }

                    $this->conn->commit();
                } catch (Throwable $e) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollBack();
                    }
                    throw $e;
                }

                $createdCount = count($createdClients);
                $failedCount = count($errors);
                $allSuccess = $createdCount > 0 && $failedCount === 0;

                if ($createdCount === 0) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'No clients were created',
                        'created_count' => 0,
                        'failed_count' => $failedCount,
                        'errors' => $errors,
                    ]);
                    return;
                }

                http_response_code($allSuccess ? 201 : 207);
                echo json_encode([
                    'success' => $allSuccess,
                    'partial' => !$allSuccess,
                    'message' => $allSuccess
                        ? 'All clients created successfully'
                        : 'Some clients were created, but some rows failed',
                    'created_count' => $createdCount,
                    'failed_count' => $failedCount,
                    'created_clients' => $createdClients,
                    'errors' => $errors,
                ]);
                return;
            }

            $result = $insertClient($data);
            if (!empty($result['success'])) {
                $this->sendSuccess([
                    'message' => 'Client created successfully',
                    'client_id' => $result['client_id'],
                    'client_code' => $result['client_code']
                ]);
            } else {
                $this->sendError($result['message'] ?? "Failed to create client", 400);
            }

        } catch (Exception $e) {
            $this->sendError("Failed to create client: " . $e->getMessage(), 500);
        }
    }
    
    private function updateClient() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (empty($data['id'])) {
                $this->sendError("Client ID is required", 400);
                return;
            }
            
            // Check if client exists
            $checkQuery = "SELECT id FROM clients WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("Client not found", 404);
                return;
            }
            
            $query = "UPDATE clients SET full_name = :full_name, email = :email, phone = :phone,
                     address = :address, city = :city, state = :state, zip_code = :zip_code,
                     notes = :notes, updated_at = NOW() WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $stmt->bindValue(':full_name', $data['full_name'], PDO::PARAM_STR);
            $stmt->bindValue(':email', isset($data['email']) ? $data['email'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':phone', $data['phone'], PDO::PARAM_STR);
            $stmt->bindValue(':address', isset($data['address']) ? $data['address'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':city', isset($data['city']) ? $data['city'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':state', isset($data['state']) ? $data['state'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':zip_code', isset($data['zip_code']) ? $data['zip_code'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':notes', isset($data['notes']) ? $data['notes'] : '', PDO::PARAM_STR);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'Client updated successfully']);
            } else {
                $this->sendError("Failed to update client", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to update client: " . $e->getMessage(), 500);
        }
    }
    
    private function deleteClient() {
        try {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            
            if (!$id) {
                $this->sendError("Client ID is required", 400);
                return;
            }
            
            // Check if client exists
            $checkQuery = "SELECT id FROM clients WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("Client not found", 404);
                return;
            }
            
            // Check if client has orders
            $orderQuery = "SELECT COUNT(*) as order_count FROM service_orders WHERE client_id = :id";
            $orderStmt = $this->conn->prepare($orderQuery);
            $orderStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $orderStmt->execute();
            $orderCount = $orderStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($orderCount['order_count'] > 0) {
                $this->sendError("Cannot delete client with existing orders", 400);
                return;
            }
            
            $query = "DELETE FROM clients WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'Client deleted successfully']);
            } else {
                $this->sendError("Failed to delete client", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to delete client: " . $e->getMessage(), 500);
        }
    }
    
    private function getProducts() {
        try {
            $search = isset($_GET['search']) ? $_GET['search'] : '';
            $category = isset($_GET['category']) ? $_GET['category'] : '';
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            
            $query = "SELECT * FROM products WHERE 1=1";
            
            $params = [];
            $types = [];
            
            if (!empty($search)) {
                $query .= " AND (product_name LIKE :search OR brand LIKE :search OR model LIKE :search)";
                $params[':search'] = "%$search%";
                $types[':search'] = PDO::PARAM_STR;
            }
            
            if (!empty($category) && $category !== 'all') {
                $query .= " AND category = :category";
                $params[':category'] = $category;
                $types[':category'] = PDO::PARAM_STR;
            }
            
            if (!empty($status) && $status !== 'all') {
                $query .= " AND status = :status";
                $params[':status'] = $status;
                $types[':status'] = PDO::PARAM_STR;
            }
            
            $query .= " ORDER BY created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            
            if (!empty($params)) {
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, $types[$key] ?? PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess(['products' => $products]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get products: " . $e->getMessage(), 500);
        }
    }
    
    private function createProduct() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            if (!is_array($data)) {
                $data = [];
            }
            $data = $this->normalizeProductPayload($data);

            $validClaimTypes = ['none', 'shop_claim', 'company_claim', 'sun_to_company', 'company_to_sun'];

            $requestDefaultStockQuantity = isset($data['stock_quantity']) ? max(0, intval($data['stock_quantity'])) : null;
            $insertProduct = function(array $row) use ($validClaimTypes, $requestDefaultStockQuantity): array {
                $row = $this->normalizeProductPayload($row);

                if (empty($row['product_name']) || trim((string)$row['product_name']) === '') {
                    return ['success' => false, 'message' => 'Product name is required'];
                }

                $productName = trim((string)$row['product_name']);
                $resolvedStockQuantity = isset($row['stock_quantity']) ? max(0, intval($row['stock_quantity'])) : $requestDefaultStockQuantity;
                if ($resolvedStockQuantity === null || $resolvedStockQuantity <= 0) {
                    return ['success' => false, 'message' => 'Quantity is required and must be greater than 0'];
                }
                $serialNumber = isset($row['serial_number']) ? preg_replace('/\s+/', '', trim((string)$row['serial_number'])) : '';

                if ($serialNumber !== '') {
                    $serialCheck = $this->conn->prepare("SELECT id FROM products WHERE serial_number = :serial_number LIMIT 1");
                    $serialCheck->bindValue(':serial_number', $serialNumber, PDO::PARAM_STR);
                    $serialCheck->execute();
                    if ($serialCheck->fetch(PDO::FETCH_ASSOC)) {
                        return ['success' => false, 'message' => 'Serial number already exists'];
                    }
                }

                $rawCategory = isset($row['category']) ? (string)$row['category'] : '';
                $category = $this->normalizeDbCategoryValue($rawCategory);

                $claimType = isset($row['claim_type']) ? strtolower(trim((string)$row['claim_type'])) : 'none';
                if (!in_array($claimType, $validClaimTypes, true)) {
                    $claimType = 'none';
                }

                $status = $this->normalizeProductStatusForWrite($row['status'] ?? 'active');

                $productCode = 'PRD' . date('Ymd') . strtoupper(substr(uniqid(), -6));

                $query = "INSERT INTO products (
                            product_code, serial_number, is_spare_product, product_name, brand, model, category,
                            claim_type, specifications, purchase_date, warranty_period, price, stock_quantity, status, created_at
                          )
                          VALUES (
                            :product_code, :serial_number, :is_spare_product, :product_name, :brand, :model, :category,
                            :claim_type, :specifications, :purchase_date, :warranty_period, :price, :stock_quantity, :status, NOW()
                          )";

                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':product_code', $productCode, PDO::PARAM_STR);
                $stmt->bindValue(':serial_number', $serialNumber !== '' ? $serialNumber : null, PDO::PARAM_STR);
                $stmt->bindValue(':is_spare_product', !empty($row['is_spare_product']) ? 1 : 0, PDO::PARAM_INT);
                $stmt->bindValue(':product_name', $productName, PDO::PARAM_STR);
                $stmt->bindValue(':brand', isset($row['brand']) ? trim((string)$row['brand']) : '', PDO::PARAM_STR);
                $stmt->bindValue(':model', isset($row['model']) ? trim((string)$row['model']) : '', PDO::PARAM_STR);
                $stmt->bindValue(':category', $category, PDO::PARAM_STR);
                $stmt->bindValue(':claim_type', $claimType, PDO::PARAM_STR);
                $stmt->bindValue(':specifications', isset($row['specifications']) ? trim((string)$row['specifications']) : '', PDO::PARAM_STR);
                $stmt->bindValue(':purchase_date', isset($row['purchase_date']) && trim((string)$row['purchase_date']) !== '' ? $row['purchase_date'] : date('Y-m-d'), PDO::PARAM_STR);
                $stmt->bindValue(':warranty_period', isset($row['warranty_period']) && trim((string)$row['warranty_period']) !== '' ? trim((string)$row['warranty_period']) : '1 year', PDO::PARAM_STR);
                $stmt->bindValue(':price', isset($row['price']) ? (float)$row['price'] : 0);
                $stmt->bindValue(
                    ':stock_quantity',
                    $resolvedStockQuantity,
                    PDO::PARAM_INT,
                );
                $stmt->bindValue(':status', $status, PDO::PARAM_STR);

                if (!$stmt->execute()) {
                    return ['success' => false, 'message' => 'Failed to create product'];
                }

                $createdId = (int)$this->conn->lastInsertId();
                // Safety write: ensures stock_quantity persists exactly as resolved value.
                $qtyStmt = $this->conn->prepare("UPDATE products SET stock_quantity = :stock_quantity WHERE id = :id");
                $qtyStmt->bindValue(':stock_quantity', $resolvedStockQuantity, PDO::PARAM_INT);
                $qtyStmt->bindValue(':id', $createdId, PDO::PARAM_INT);
                $qtyStmt->execute();

                return [
                    'success' => true,
                    'product_id' => $createdId,
                    'product_code' => $productCode,
                    'product_name' => $productName
                ];
            };

            $isBatch = isset($data['products']) && is_array($data['products']);
            if ($isBatch) {
                $rows = $data['products'];
                if (count($rows) === 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Products array is empty']);
                    return;
                }

                $createdProducts = [];
                $errors = [];
                $this->conn->beginTransaction();
                try {
                    foreach ($rows as $index => $row) {
                        if (!is_array($row)) {
                            $errors[] = ['index' => $index, 'message' => 'Invalid row format'];
                            continue;
                        }

                        $normalizedRow = $this->normalizeProductPayload($row);
                        $result = $insertProduct($normalizedRow);
                        if (!empty($result['success'])) {
                            $createdProducts[] = [
                                'index' => $index,
                                'product_name' => $result['product_name'],
                                'product_id' => $result['product_id'],
                                'product_code' => $result['product_code']
                            ];
                        } else {
                            $errors[] = [
                                'index' => $index,
                                'product_name' => isset($normalizedRow['product_name']) ? trim((string)$normalizedRow['product_name']) : '',
                                'message' => $result['message'] ?? 'Failed to create product'
                            ];
                        }
                    }

                    $this->conn->commit();
                } catch (Throwable $e) {
                    if ($this->conn->inTransaction()) {
                        $this->conn->rollBack();
                    }
                    throw $e;
                }

                $createdCount = count($createdProducts);
                $failedCount = count($errors);
                $allSuccess = $createdCount > 0 && $failedCount === 0;

                if ($createdCount === 0) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'No products were created',
                        'created_count' => 0,
                        'failed_count' => $failedCount,
                        'errors' => $errors
                    ]);
                    return;
                }

                http_response_code($allSuccess ? 201 : 207);
                echo json_encode([
                    'success' => $allSuccess,
                    'partial' => !$allSuccess,
                    'message' => $allSuccess
                        ? 'All products created successfully'
                        : 'Some products were created, but some rows failed',
                    'created_count' => $createdCount,
                    'failed_count' => $failedCount,
                    'created_products' => $createdProducts,
                    'errors' => $errors
                ]);
                return;
            }

            $result = $insertProduct($data);
            if (!empty($result['success'])) {
                http_response_code(201);
                $this->sendSuccess([
                    'message' => 'Product created successfully',
                    'product_id' => $result['product_id'],
                    'product_code' => $result['product_code']
                ]);
                return;
            }

            $this->sendError($result['message'] ?? 'Failed to create product', 400);
        } catch (Exception $e) {
            $this->sendError("Failed to create product: " . $e->getMessage(), 500);
        }
    }
    
    private function updateProduct() {
        try {
            $rawInput = file_get_contents("php://input");
            $data = json_decode($rawInput, true);
            if (!is_array($data)) {
                $data = [];
            }
            $data = $this->normalizeProductPayload($data);

            $resolvedId = null;
            if (!empty($_GET['id'])) {
                $resolvedId = $_GET['id'];
            } elseif (!empty($_REQUEST['id'])) {
                $resolvedId = $_REQUEST['id'];
            } elseif (!empty($data['id'])) {
                $resolvedId = $data['id'];
            } elseif (!empty($data['product_id'])) {
                $resolvedId = $data['product_id'];
            }

            if (empty($resolvedId) || intval($resolvedId) <= 0) {
                $this->sendError("Product ID is required", 400);
                return;
            }
            $data['id'] = intval($resolvedId);
            
            // Check if product exists
            $checkQuery = "SELECT * FROM products WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $checkStmt->execute();
            $existingProduct = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$existingProduct) {
                $this->sendError("Product not found", 404);
                return;
            }

            $serialNumber = isset($data['serial_number'])
                ? preg_replace('/\s+/', '', trim((string)$data['serial_number']))
                : (string)($existingProduct['serial_number'] ?? '');

            if ($serialNumber !== '') {
                $serialCheckQuery = "SELECT id FROM products WHERE serial_number = :serial_number AND id != :id LIMIT 1";
                $serialCheckStmt = $this->conn->prepare($serialCheckQuery);
                $serialCheckStmt->bindValue(':serial_number', $serialNumber, PDO::PARAM_STR);
                $serialCheckStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
                $serialCheckStmt->execute();
                if ($serialCheckStmt->fetch(PDO::FETCH_ASSOC)) {
                    $this->sendError("Serial number already exists", 400);
                    return;
                }
            }

            $validClaimTypes = ['none', 'shop_claim', 'company_claim', 'sun_to_company', 'company_to_sun'];

            $rawCategory = isset($data['category']) ? (string)$data['category'] : '';
            $category = $this->normalizeDbCategoryValue($rawCategory, (string)($existingProduct['category'] ?? ''));

            $claimType = isset($data['claim_type']) ? strtolower(trim((string)$data['claim_type'])) : strtolower((string)($existingProduct['claim_type'] ?? 'none'));
            if (!in_array($claimType, $validClaimTypes, true)) {
                $claimType = 'none';
            }

            $status = $this->normalizeProductStatusForWrite($data['status'] ?? ($existingProduct['status'] ?? 'active'));
            
            $hasStockQuantityColumn = $this->tableHasColumn('products', 'stock_quantity');
            $query = "UPDATE products
                     SET product_name = :product_name,
                         serial_number = :serial_number,
                         is_spare_product = :is_spare_product,
                         brand = :brand,
                         model = :model,
                         category = :category,
                         claim_type = :claim_type,
                         specifications = :specifications,
                         purchase_date = :purchase_date,
                         warranty_period = :warranty_period,
                         price = :price," .
                         ($hasStockQuantityColumn ? "
                         stock_quantity = :stock_quantity," : "") . "
                         status = :status,
                         updated_at = NOW()
                     WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $stmt->bindValue(':product_name', isset($data['product_name']) && trim((string)$data['product_name']) !== '' ? trim((string)$data['product_name']) : (string)$existingProduct['product_name'], PDO::PARAM_STR);
            $stmt->bindValue(':serial_number', $serialNumber !== '' ? $serialNumber : null, PDO::PARAM_STR);
            $stmt->bindValue(':is_spare_product', isset($data['is_spare_product']) ? (!empty($data['is_spare_product']) ? 1 : 0) : (int)($existingProduct['is_spare_product'] ?? 0), PDO::PARAM_INT);
            $stmt->bindValue(':brand', isset($data['brand']) ? trim((string)$data['brand']) : (string)($existingProduct['brand'] ?? ''), PDO::PARAM_STR);
            $stmt->bindValue(':model', isset($data['model']) ? trim((string)$data['model']) : (string)($existingProduct['model'] ?? ''), PDO::PARAM_STR);
            $stmt->bindValue(':category', $category, PDO::PARAM_STR);
            $stmt->bindValue(':claim_type', $claimType, PDO::PARAM_STR);
            $stmt->bindValue(':specifications', isset($data['specifications']) ? trim((string)$data['specifications']) : (string)($existingProduct['specifications'] ?? ''), PDO::PARAM_STR);
            $stmt->bindValue(':purchase_date', isset($data['purchase_date']) && trim((string)$data['purchase_date']) !== '' ? $data['purchase_date'] : ($existingProduct['purchase_date'] ?? date('Y-m-d')), PDO::PARAM_STR);
            $stmt->bindValue(':warranty_period', isset($data['warranty_period']) && trim((string)$data['warranty_period']) !== '' ? trim((string)$data['warranty_period']) : (string)($existingProduct['warranty_period'] ?? '1 year'), PDO::PARAM_STR);
            $stmt->bindValue(':price', isset($data['price']) ? (float)$data['price'] : (float)($existingProduct['price'] ?? 0));
            if ($hasStockQuantityColumn) {
                $stockQuantity = isset($data['stock_quantity']) ? max(0, intval($data['stock_quantity'])) : intval($existingProduct['stock_quantity'] ?? 0);
                $stmt->bindValue(':stock_quantity', $stockQuantity, PDO::PARAM_INT);
            }
            $stmt->bindValue(':status', $status, PDO::PARAM_STR);
            
            try {
                if ($stmt->execute()) {
                    $this->sendSuccess(['message' => 'Product updated successfully']);
                } else {
                    $this->sendError("Failed to update product", 500);
                }
            } catch (PDOException $e) {
                $errorText = strtolower($e->getMessage());
                if ($hasStockQuantityColumn && strpos($errorText, "unknown column 'stock_quantity'") !== false) {
                    $fallbackQuery = "UPDATE products
                                     SET product_name = :product_name,
                                         serial_number = :serial_number,
                                         is_spare_product = :is_spare_product,
                                         brand = :brand,
                                         model = :model,
                                         category = :category,
                                         claim_type = :claim_type,
                                         specifications = :specifications,
                                         purchase_date = :purchase_date,
                                         warranty_period = :warranty_period,
                                         price = :price,
                                         status = :status,
                                         updated_at = NOW()
                                     WHERE id = :id";
                    $fallbackStmt = $this->conn->prepare($fallbackQuery);
                    $fallbackStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
                    $fallbackStmt->bindValue(':product_name', isset($data['product_name']) && trim((string)$data['product_name']) !== '' ? trim((string)$data['product_name']) : (string)$existingProduct['product_name'], PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':serial_number', $serialNumber !== '' ? $serialNumber : null, PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':is_spare_product', isset($data['is_spare_product']) ? (!empty($data['is_spare_product']) ? 1 : 0) : (int)($existingProduct['is_spare_product'] ?? 0), PDO::PARAM_INT);
                    $fallbackStmt->bindValue(':brand', isset($data['brand']) ? trim((string)$data['brand']) : (string)($existingProduct['brand'] ?? ''), PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':model', isset($data['model']) ? trim((string)$data['model']) : (string)($existingProduct['model'] ?? ''), PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':category', $category, PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':claim_type', $claimType, PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':specifications', isset($data['specifications']) ? trim((string)$data['specifications']) : (string)($existingProduct['specifications'] ?? ''), PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':purchase_date', isset($data['purchase_date']) && trim((string)$data['purchase_date']) !== '' ? $data['purchase_date'] : ($existingProduct['purchase_date'] ?? date('Y-m-d')), PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':warranty_period', isset($data['warranty_period']) && trim((string)$data['warranty_period']) !== '' ? trim((string)$data['warranty_period']) : (string)($existingProduct['warranty_period'] ?? '1 year'), PDO::PARAM_STR);
                    $fallbackStmt->bindValue(':price', isset($data['price']) ? (float)$data['price'] : (float)($existingProduct['price'] ?? 0));
                    $fallbackStmt->bindValue(':status', $status, PDO::PARAM_STR);
                    if ($fallbackStmt->execute()) {
                        $this->sendSuccess(['message' => 'Product updated successfully']);
                    } else {
                        $this->sendError("Failed to update product", 500);
                    }
                    return;
                }
                throw $e;
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to update product: " . $e->getMessage(), 500);
        }
    }
    
    private function deleteProduct() {
        try {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            
            if (!$id) {
                $this->sendError("Product ID is required", 400);
                return;
            }
            
            // Check if product exists
            $checkQuery = "SELECT id FROM products WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("Product not found", 404);
                return;
            }
            
            // Check if product is used in orders
            $orderQuery = "SELECT COUNT(*) as order_count FROM service_orders WHERE product_id = :id";
            $orderStmt = $this->conn->prepare($orderQuery);
            $orderStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $orderStmt->execute();
            $orderCount = $orderStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($orderCount['order_count'] > 0) {
                // Instead of deleting, mark as discontinued
                $updateQuery = "UPDATE products SET status = 'discontinued', updated_at = NOW() WHERE id = :id";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->bindValue(':id', $id, PDO::PARAM_INT);
                
                if ($updateStmt->execute()) {
                    $this->sendSuccess(['message' => 'Product marked as discontinued']);
                } else {
                    $this->sendError("Failed to update product", 500);
                }
                return;
            }
            
            $query = "DELETE FROM products WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'Product deleted successfully']);
            } else {
                $this->sendError("Failed to delete product", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to delete product: " . $e->getMessage(), 500);
        }
    }
    
    private function getDeliveries() {
        try {
            $this->backfillDeliveriesFromServiceOrders();

            $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
            $status = isset($_GET['status']) ? $_GET['status'] : '';
            $date_from = isset($_GET['date_from']) ? $_GET['date_from'] : '';
            $date_to = isset($_GET['date_to']) ? $_GET['date_to'] : '';
            
            $query = "SELECT d.*,
                             d.serial_number AS delivery_serial_number,
                             COALESCE(NULLIF(TRIM(d.serial_number), ''), p.serial_number) AS serial_number,
                             o.order_code,
                             c.full_name as client_name,
                             p.product_name,
                             p.serial_number AS product_serial_number,
                             p.model AS product_model,
                             p.brand AS product_brand,
                             GROUP_CONCAT(di.product_id ORDER BY di.id SEPARATOR ',') AS delivery_item_product_ids,
                             GROUP_CONCAT(COALESCE(NULLIF(TRIM(pdi.product_name), ''), CONCAT('Product #', di.product_id)) ORDER BY di.id SEPARATOR '||') AS delivery_item_product_names,
                             GROUP_CONCAT(COALESCE(NULLIF(TRIM(pdi.model), ''), '') ORDER BY di.id SEPARATOR '||') AS delivery_item_models,
                             GROUP_CONCAT(COALESCE(NULLIF(TRIM(di.serial_number), ''), '') ORDER BY di.id SEPARATOR '||') AS delivery_item_serial_numbers
                     FROM deliveries d
                     LEFT JOIN service_orders o ON d.order_id = o.id
                     LEFT JOIN clients c ON o.client_id = c.id
                     LEFT JOIN products p ON COALESCE(d.product_id, o.product_id) = p.id
                     LEFT JOIN delivery_items di ON di.delivery_id = d.id
                     LEFT JOIN products pdi ON pdi.id = di.product_id
                     WHERE 1=1";
            
            $params = [];
            $types = [];
            
            if (!empty($status) && $status !== 'all') {
                $query .= " AND d.status = :status";
                $params[':status'] = $status;
                $types[':status'] = PDO::PARAM_STR;
            }

            if ($id > 0) {
                $query .= " AND d.id = :id";
                $params[':id'] = $id;
                $types[':id'] = PDO::PARAM_INT;
            }
            
            if (!empty($date_from)) {
                $query .= " AND DATE(d.scheduled_date) >= :date_from";
                $params[':date_from'] = $date_from;
                $types[':date_from'] = PDO::PARAM_STR;
            }
            
            if (!empty($date_to)) {
                $query .= " AND DATE(d.scheduled_date) <= :date_to";
                $params[':date_to'] = $date_to;
                $types[':date_to'] = PDO::PARAM_STR;
            }
            
            $query .= " GROUP BY d.id ORDER BY COALESCE(d.delivered_date, TIMESTAMP(d.scheduled_date, d.scheduled_time), d.created_at) DESC, d.id DESC";
            
            $stmt = $this->conn->prepare($query);
            
            if (!empty($params)) {
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value, $types[$key] ?? PDO::PARAM_STR);
                }
            }
            
            $stmt->execute();
            $deliveries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $allDeliveredProductIds = [];
            $allOrderIds = [];
            foreach ($deliveries as $deliveryRow) {
                $allDeliveredProductIds = array_merge(
                    $allDeliveredProductIds,
                    $this->normalizeIdList($deliveryRow['product_ids'] ?? ($deliveryRow['product_id'] ?? null))
                );
                $orderId = (int)($deliveryRow['order_id'] ?? 0);
                if ($orderId > 0) {
                    $allOrderIds[] = $orderId;
                }
            }

            $productDetailsById = $this->fetchProductDetailsByIds($allDeliveredProductIds);
            $orderMetaById = [];
            $companyNamesById = [];

            $allOrderIds = array_values(array_unique(array_filter(array_map('intval', $allOrderIds), function ($id) {
                return $id > 0;
            })));

            if (!empty($allOrderIds)) {
                $placeholders = implode(',', array_fill(0, count($allOrderIds), '?'));
                $ordersStmt = $this->conn->prepare("SELECT id, company_id, company_ids, company_product_map, companies_products FROM service_orders WHERE id IN ($placeholders)");
                $ordersStmt->execute($allOrderIds);

                $allCompanyIds = [];
                while ($orderRow = $ordersStmt->fetch(PDO::FETCH_ASSOC)) {
                    $orderId = (int)($orderRow['id'] ?? 0);
                    $normalizedCompanyIds = $this->normalizeExistingCompanyIds($orderRow['company_ids'] ?? null);
                    $primaryCompanyId = (int)($orderRow['company_id'] ?? 0);
                    $normalizedCompanyMap = $this->normalizeCompanyProductMapValue($orderRow['company_product_map'] ?? ($orderRow['companies_products'] ?? null));

                    if ($primaryCompanyId > 0 && !in_array($primaryCompanyId, $normalizedCompanyIds, true)) {
                        array_unshift($normalizedCompanyIds, $primaryCompanyId);
                    }

                    $orderMetaById[$orderId] = [
                        'company_id' => $primaryCompanyId,
                        'company_ids' => $normalizedCompanyIds,
                        'company_product_map' => $normalizedCompanyMap,
                    ];

                    $allCompanyIds = array_merge($allCompanyIds, $normalizedCompanyIds);
                    $allCompanyIds = array_merge($allCompanyIds, array_map('intval', array_keys($normalizedCompanyMap)));
                }

                $companyNamesById = !empty($allCompanyIds) ? $this->fetchCompanyNamesByIds($allCompanyIds) : [];
            }

            foreach ($deliveries as &$deliveryRow) {
                $itemDeliveredIds = $this->normalizeIdList($deliveryRow['delivery_item_product_ids'] ?? null);
                $deliveredIds = !empty($itemDeliveredIds)
                    ? $itemDeliveredIds
                    : $this->normalizeIdList($deliveryRow['product_ids'] ?? ($deliveryRow['product_id'] ?? null));
                $storedSerials = $this->parseJsonArraySafe($deliveryRow['serial_numbers'] ?? '');
                $itemDeliveredNames = isset($deliveryRow['delivery_item_product_names']) && $deliveryRow['delivery_item_product_names'] !== null
                    ? array_map('trim', explode('||', (string)$deliveryRow['delivery_item_product_names']))
                    : [];
                $itemDeliveredModels = isset($deliveryRow['delivery_item_models']) && $deliveryRow['delivery_item_models'] !== null
                    ? array_map('trim', explode('||', (string)$deliveryRow['delivery_item_models']))
                    : [];
                $itemDeliveredSerials = isset($deliveryRow['delivery_item_serial_numbers']) && $deliveryRow['delivery_item_serial_numbers'] !== null
                    ? array_map('trim', explode('||', (string)$deliveryRow['delivery_item_serial_numbers']))
                    : [];
                $deliveredNames = [];
                $deliveredModels = [];
                $deliveredSerials = [];
                $orderMeta = $orderMetaById[(int)($deliveryRow['order_id'] ?? 0)] ?? [
                    'company_id' => 0,
                    'company_ids' => [],
                    'company_product_map' => [],
                ];

                foreach ($deliveredIds as $index => $productId) {
                    $productDetails = $productDetailsById[(int)$productId] ?? null;
                    $resolvedName = isset($itemDeliveredNames[$index]) && $itemDeliveredNames[$index] !== ''
                        ? $itemDeliveredNames[$index]
                        : (string)($productDetails['product_name'] ?? '');
                    $resolvedModel = isset($itemDeliveredModels[$index]) && $itemDeliveredModels[$index] !== ''
                        ? $itemDeliveredModels[$index]
                        : (string)($productDetails['model'] ?? '');
                    $resolvedSerial = isset($itemDeliveredSerials[$index]) && $itemDeliveredSerials[$index] !== ''
                        ? $itemDeliveredSerials[$index]
                        : (
                            isset($storedSerials[$index]) && trim((string)$storedSerials[$index]) !== ''
                                ? trim((string)$storedSerials[$index])
                                : (string)($productDetails['serial_number'] ?? '')
                        );

                    $deliveredNames[] = $resolvedName;
                    $deliveredModels[] = $resolvedModel;
                    $deliveredSerials[] = $resolvedSerial;
                }

                $deliveredCompanyNames = $this->resolveDeliveredCompanyNames(
                    $deliveredIds,
                    (int)($orderMeta['company_id'] ?? 0),
                    is_array($orderMeta['company_ids'] ?? null) ? $orderMeta['company_ids'] : [],
                    is_array($orderMeta['company_product_map'] ?? null) ? $orderMeta['company_product_map'] : [],
                    $companyNamesById
                );

                $deliveryRow['delivered_product_names'] = $deliveredNames;
                $deliveryRow['delivered_product_models'] = $deliveredModels;
                $deliveryRow['delivered_product_serial_numbers'] = $deliveredSerials;
                $deliveryRow['delivered_company_names'] = $deliveredCompanyNames;
                $deliveryRow['delivered_company_name'] = !empty($deliveredCompanyNames)
                    ? implode(' || ', $deliveredCompanyNames)
                    : '';
            }
            unset($deliveryRow);

            if ($id > 0) {
                $delivery = !empty($deliveries) ? $deliveries[0] : null;
                if (!$delivery) {
                    $this->sendError("Delivery not found", 404);
                    return;
                }
                $this->sendSuccess(['delivery' => $delivery, 'deliveries' => [$delivery]]);
                return;
            }

            $this->sendSuccess(['deliveries' => $deliveries]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get deliveries: " . $e->getMessage(), 500);
        }
    }
    
    private function updateDelivery() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (empty($data['id'])) {
                $this->sendError("Delivery ID is required", 400);
                return;
            }
            
            $normalizeDeliveryType = function ($value) {
                $normalized = strtolower(trim((string)$value));
                if ($normalized === 'in_hand' || $normalized === 'pickup') return 'inhand';
                if ($normalized === 'parcel_service' || $normalized === 'delivery') return 'parcelservice';
                if (in_array($normalized, ['inhand', 'courier', 'parcelservice'], true)) return $normalized;
                return 'inhand';
            };

            $query = "UPDATE deliveries SET status = :status,
                     delivery_person = :delivery_person,
                     delivery_type = :delivery_type,
                     address = :address,
                     contact_person = :contact_person,
                     contact_phone = :contact_phone,
                     scheduled_date = :scheduled_date,
                     scheduled_time = :scheduled_time,
                     delivered_date = CASE
                        WHEN :status = 'delivered' AND (delivered_date IS NULL OR delivered_date = '' OR delivered_date = '0000-00-00 00:00:00')
                        THEN NOW()
                        ELSE delivered_date
                     END,
                     notes = :notes,
                     updated_at = NOW()
                     WHERE id = :id";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
            $stmt->bindValue(':status', $data['status'], PDO::PARAM_STR);
            $stmt->bindValue(':delivery_person', isset($data['delivery_person']) ? $data['delivery_person'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':delivery_type', $normalizeDeliveryType($data['delivery_type'] ?? ''), PDO::PARAM_STR);
            $stmt->bindValue(':address', isset($data['address']) ? $data['address'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':contact_person', isset($data['contact_person']) ? $data['contact_person'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':contact_phone', isset($data['contact_phone']) ? $data['contact_phone'] : '', PDO::PARAM_STR);
            $stmt->bindValue(':scheduled_date', isset($data['scheduled_date']) ? $data['scheduled_date'] : null, isset($data['scheduled_date']) && $data['scheduled_date'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':scheduled_time', isset($data['scheduled_time']) ? $data['scheduled_time'] : null, isset($data['scheduled_time']) && $data['scheduled_time'] !== '' ? PDO::PARAM_STR : PDO::PARAM_NULL);
            $stmt->bindValue(':notes', isset($data['notes']) ? $data['notes'] : '', PDO::PARAM_STR);
            
            if ($stmt->execute()) {
                $refreshStmt = $this->conn->prepare("SELECT * FROM deliveries WHERE id = :id LIMIT 1");
                $refreshStmt->bindValue(':id', $data['id'], PDO::PARAM_INT);
                $refreshStmt->execute();
                $delivery = $refreshStmt->fetch(PDO::FETCH_ASSOC);
                $this->sendSuccess(['message' => 'Delivery updated successfully', 'delivery' => $delivery]);
            } else {
                $this->sendError("Failed to update delivery", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to update delivery: " . $e->getMessage(), 500);
        }
    }
    
    private function deleteDelivery() {
        try {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            
            if (!$id) {
                $this->sendError("Delivery ID is required", 400);
                return;
            }
            
            // Check if delivery exists
            $checkQuery = "SELECT id FROM deliveries WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("Delivery not found", 404);
                return;
            }
            
            $query = "DELETE FROM deliveries WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':id', $id, PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'Delivery deleted successfully']);
            } else {
                $this->sendError("Failed to delete delivery", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to delete delivery: " . $e->getMessage(), 500);
        }
    }
    
    private function getStaffPerformance() {
        try {
            $date_from = isset($_GET['date_from']) ? trim($_GET['date_from']) : date('Y-m-01');
            $date_to = isset($_GET['date_to']) ? trim($_GET['date_to']) : date('Y-m-d');

            $fromDate = DateTime::createFromFormat('Y-m-d', $date_from);
            $toDate = DateTime::createFromFormat('Y-m-d', $date_to);

            if (!$fromDate || $fromDate->format('Y-m-d') !== $date_from) {
                $date_from = date('Y-m-01');
            }

            if (!$toDate || $toDate->format('Y-m-d') !== $date_to) {
                $date_to = date('Y-m-d');
            }

            if ($date_from > $date_to) {
                [$date_from, $date_to] = [$date_to, $date_from];
            }
            
            $query = "SELECT u.id,
                     u.name,
                     u.email,
                     u.phone,
                     u.role,
                     u.avatar,
                     COALESCE(NULLIF(u.profile_image, ''), NULLIF(u.avatar, '')) as profile_image,
                     COALESCE(NULLIF(u.department, ''), 'Service') as department,
                     u.is_active,
                     u.last_login,
                     COUNT(o.id) as total_orders,
                     SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN 1 ELSE 0 END) as completed_orders,
                     SUM(CASE WHEN o.status IN ('pending', 'scheduled', 'process', 'ready') THEN 1 ELSE 0 END) as active_orders,
                     COALESCE(SUM(CASE
                        WHEN o.status IN ('completed', 'delivered') AND o.payment_status <> 'refunded'
                        THEN COALESCE(o.final_cost, 0)
                        ELSE 0
                     END), 0) as total_revenue,
                     COALESCE(AVG(CASE
                        WHEN o.status IN ('completed', 'delivered') AND o.payment_status <> 'refunded' AND o.final_cost IS NOT NULL
                        THEN o.final_cost
                        ELSE NULL
                     END), 0) as avg_order_value,
                     COALESCE(AVG(CASE WHEN o.rating IS NOT NULL THEN o.rating ELSE NULL END), 0) as avg_rating
                     FROM users u
                     LEFT JOIN service_orders o ON u.id = o.staff_id 
                     AND DATE(o.created_at) BETWEEN :date_from AND :date_to
                     WHERE u.role <> 'admin' AND u.is_active = 1
                     GROUP BY u.id
                     ORDER BY completed_orders DESC, total_revenue DESC, total_orders DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':date_from', $date_from, PDO::PARAM_STR);
            $stmt->bindValue(':date_to', $date_to, PDO::PARAM_STR);
            $stmt->execute();
            
            $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate completion rate
            foreach ($staff as &$member) {
                $member['completion_rate'] = $member['total_orders'] > 0 
                    ? round(($member['completed_orders'] / $member['total_orders']) * 100, 2)
                    : 0;
                
                // Calculate performance score (weighted average of completion rate and revenue)
                $completion_score = $member['completion_rate'];
                $revenue_score = $member['total_revenue'] > 0 ? min(100, ($member['total_revenue'] / 10000) * 100) : 0;
                $member['performance_score'] = round(($completion_score * 0.7) + ($revenue_score * 0.3), 2);
                
                if ($member['last_login']) {
                    $member['last_login_formatted'] = date('M d, Y H:i', strtotime($member['last_login']));
                } else {
                    $member['last_login_formatted'] = 'Never';
                }
                
                if (empty($member['department'])) {
                    $member['department'] = 'Service';
                }
            }
            
            $this->sendSuccess([
                'staff' => $staff,
                'filters' => [
                    'date_from' => $date_from,
                    'date_to' => $date_to
                ]
            ]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get staff performance: " . $e->getMessage(), 500);
        }
    }
    
    private function getAnalytics() {
        try {
            $analytics = [];
            
            // Monthly revenue from payments table (last 6 months)
            $query = "SELECT DATE_FORMAT(p.created_at, '%Y-%m') as month, 
                     COALESCE(SUM(p.amount), 0) as revenue
                     FROM payments p
                     WHERE p.payment_status IN ('completed', 'paid') 
                     AND p.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                     GROUP BY DATE_FORMAT(p.created_at, '%Y-%m')
                     ORDER BY month";
            
            $stmt = $this->conn->query($query);
            $analytics['monthly_revenue'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Order trends (last 30 days)
            $query = "SELECT DATE(created_at) as date, COUNT(*) as orders
                     FROM service_orders 
                     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                     GROUP BY DATE(created_at)
                     ORDER BY date";
            
            $stmt = $this->conn->query($query);
            $analytics['order_trends'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Category distribution from orders
            $query = "SELECT p.category, COUNT(*) as count, COALESCE(SUM(o.final_cost), 0) as value
                     FROM service_orders o
                     JOIN products p ON o.product_id = p.id
                     WHERE o.status NOT IN ('cancelled')
                     GROUP BY p.category
                     ORDER BY count DESC";
            
            $stmt = $this->conn->query($query);
            $analytics['category_distribution'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Order status distribution
            $query = "SELECT status, COUNT(*) as count
                     FROM service_orders
                     WHERE status NOT IN ('cancelled')
                     GROUP BY status
                     ORDER BY count DESC";
            
            $stmt = $this->conn->query($query);
            $statusData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Add colors for each status
            $statusColors = [
                'pending' => '#FFA500',
                'scheduled' => '#9b59b6',
                'process' => '#3498db',
                'ready' => '#2ecc71',
                'completed' => '#27ae60',
                'delivered' => '#16a085'
            ];
            
            foreach ($statusData as &$status) {
                $status['color'] = $statusColors[$status['status']] ?? '#95a5a6';
            }
            
            $analytics['status_distribution'] = $statusData;
            
            // Order priority distribution
            $query = "SELECT priority, COUNT(*) as count
                     FROM service_orders
                     WHERE status NOT IN ('cancelled')
                     GROUP BY priority
                     ORDER BY count DESC";
            
            $stmt = $this->conn->query($query);
            $priorityData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Add colors for each priority
            $priorityColors = [
                'low' => '#2ecc71',
                'medium' => '#f39c12',
                'high' => '#e74c3c',
                'urgent' => '#c0392b'
            ];
            
            foreach ($priorityData as &$priority) {
                $priority['color'] = $priorityColors[$priority['priority']] ?? '#95a5a6';
            }
            
            $analytics['priority_distribution'] = $priorityData;
            
            // Daily revenue trend (last 7 days) from payments
            $query = "SELECT DATE(p.created_at) as date, COALESCE(SUM(p.amount), 0) as revenue
                     FROM payments p
                     WHERE p.payment_status IN ('completed', 'paid')
                     AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                     GROUP BY DATE(p.created_at)
                     ORDER BY date";
            
            $stmt = $this->conn->query($query);
            $analytics['daily_revenue_trend'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->sendSuccess(['analytics' => $analytics]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get analytics: " . $e->getMessage(), 500);
        }
    }
    
    private function getNotifications() {
        try {
            // Create some sample notifications since we don't have a notifications table
            $notifications = [
                [
                    'id' => 1,
                    'title' => 'New Order Received',
                    'message' => 'A new service order has been created',
                    'type' => 'info',
                    'is_read' => false,
                    'created_at' => date('Y-m-d H:i:s'),
                    'icon' => 'info'
                ],
                [
                    'id' => 2,
                    'title' => 'Low Stock Alert',
                    'message' => '3 products are running low on stock',
                    'type' => 'warning',
                    'is_read' => false,
                    'created_at' => date('Y-m-d H:i:s'),
                    'icon' => 'warning'
                ],
                [
                    'id' => 3,
                    'title' => 'Payment Received',
                    'message' => '₹5000 payment received for order ORD2026011151E14B',
                    'type' => 'success',
                    'is_read' => true,
                    'created_at' => date('Y-m-d H:i:s', strtotime('-1 hour')),
                    'icon' => 'success'
                ]
            ];
            
            $this->sendSuccess(['notifications' => $notifications]);
            
        } catch (Exception $e) {
            $this->sendError("Failed to get notifications: " . $e->getMessage(), 500);
        }
    }

    private function getRealtimeNotifications() {
        try {
            $storedQuery = "SELECT id, title, message, type, is_read, created_at
                           FROM notifications
                           WHERE user_id = :user_id
                           ORDER BY created_at DESC
                           LIMIT 10";
            $storedStmt = $this->conn->prepare($storedQuery);
            $storedStmt->bindValue(':user_id', (int)$this->user['user_id'], PDO::PARAM_INT);
            $storedStmt->execute();

            $notifications = $storedStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $pendingQuery = "SELECT
                                so.id,
                                so.order_code,
                                so.status,
                                so.created_at,
                                COALESCE(c.full_name, 'Unknown Customer') AS client_name,
                                COALESCE(u.name, 'Not Assigned') AS staff_name,
                                TIMESTAMPDIFF(DAY, DATE(so.created_at), CURDATE()) AS pending_days
                             FROM service_orders so
                             LEFT JOIN clients c ON so.client_id = c.id
                             LEFT JOIN users u ON so.staff_id = u.id
                             WHERE so.status IN ('pending', 'scheduled', 'process', 'ready')
                               AND DATE(so.created_at) <= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
                             ORDER BY so.created_at ASC
                             LIMIT 20";
            $pendingStmt = $this->conn->query($pendingQuery);
            $pendingOrders = $pendingStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $createdAt = date('Y-m-d H:i:s');
            foreach ($pendingOrders as $order) {
                $days = max(2, (int)($order['pending_days'] ?? 2));
                $statusLabel = ucfirst(str_replace('_', ' ', (string)($order['status'] ?? 'pending')));
                $notifications[] = [
                    'id' => 800000 + (int)$order['id'],
                    'title' => 'Open Order Reminder',
                    'message' => "Order {$order['order_code']} for {$order['client_name']} has been open for {$days} days and is still {$statusLabel}. Assigned staff: {$order['staff_name']}.",
                    'type' => 'alert',
                    'is_read' => false,
                    'created_at' => $createdAt,
                    'icon' => 'alert'
                ];
            }

            usort($notifications, function ($a, $b) {
                return strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? ''));
            });

            $this->sendSuccess(['notifications' => $notifications]);

        } catch (Exception $e) {
            $this->sendError("Failed to get notifications: " . $e->getMessage(), 500);
        }
    }
    
    private function resetPassword() {
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (empty($data['user_id']) || empty($data['new_password'])) {
                $this->sendError("User ID and new password are required", 400);
                return;
            }
            
            // Check if user exists
            $checkQuery = "SELECT id FROM users WHERE id = :id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindValue(':id', $data['user_id'], PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->rowCount() === 0) {
                $this->sendError("User not found", 404);
                return;
            }
            
            // Hash new password
            $hashedPassword = password_hash($data['new_password'], PASSWORD_BCRYPT);
            
            $query = "UPDATE users SET password = :password, updated_at = NOW() WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindValue(':password', $hashedPassword, PDO::PARAM_STR);
            $stmt->bindValue(':id', $data['user_id'], PDO::PARAM_INT);
            
            if ($stmt->execute()) {
                $this->sendSuccess(['message' => 'Password reset successfully']);
            } else {
                $this->sendError("Failed to reset password", 500);
            }
            
        } catch (Exception $e) {
            $this->sendError("Failed to reset password: " . $e->getMessage(), 500);
        }
    }

    private function backupDatabase() {
        try {
            $dbName = (string)$this->conn->query('SELECT DATABASE()')->fetchColumn();
            if ($dbName === '') {
                $this->sendError('Unable to determine active database', 500);
                return;
            }

            $tablesStmt = $this->conn->query('SHOW TABLES');
            $tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

            $dump = "-- Raj Communication Database Backup\n";
            $dump .= "-- Generated At: " . date('Y-m-d H:i:s') . "\n";
            $dump .= "-- Database: " . $dbName . "\n\n";
            $dump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

            foreach ($tables as $table) {
                $tableName = (string)$table;
                if ($tableName === '') {
                    continue;
                }

                $escapedTable = '`' . str_replace('`', '``', $tableName) . '`';

                $createStmt = $this->conn->query("SHOW CREATE TABLE {$escapedTable}");
                $createRow = $createStmt ? $createStmt->fetch(PDO::FETCH_ASSOC) : null;
                $createSql = $createRow['Create Table'] ?? null;

                if (!$createSql) {
                    continue;
                }

                $dump .= "--\n-- Table structure for table {$escapedTable}\n--\n";
                $dump .= "DROP TABLE IF EXISTS {$escapedTable};\n";
                $dump .= $createSql . ";\n\n";

                $rowsStmt = $this->conn->query("SELECT * FROM {$escapedTable}");
                $rows = $rowsStmt ? $rowsStmt->fetchAll(PDO::FETCH_ASSOC) : [];

                if (!empty($rows)) {
                    $columns = array_keys($rows[0]);
                    $columnSql = implode(', ', array_map(function ($column) {
                        return '`' . str_replace('`', '``', (string)$column) . '`';
                    }, $columns));

                    $dump .= "--\n-- Dumping data for table {$escapedTable}\n--\n";
                    foreach ($rows as $row) {
                        $values = [];
                        foreach ($columns as $column) {
                            $value = $row[$column] ?? null;
                            if ($value === null) {
                                $values[] = 'NULL';
                            } else {
                                $values[] = $this->conn->quote((string)$value);
                            }
                        }
                        $dump .= "INSERT INTO {$escapedTable} ({$columnSql}) VALUES (" . implode(', ', $values) . ");\n";
                    }
                    $dump .= "\n";
                }
            }

            $dump .= "SET FOREIGN_KEY_CHECKS=1;\n";

            $backupDir = $this->getBackupDirectory(true);
            if ($backupDir === null) {
                $this->sendError('Failed to create backup directory', 500);
                return;
            }

            $timestamp = date('Ymd_His');
            $fileName = 'sun_computers-' . $timestamp . '.sql';
            $filePath = $backupDir . DIRECTORY_SEPARATOR . $fileName;
            $writeResult = @file_put_contents($filePath, $dump);
            if ($writeResult === false) {
                $this->sendError('Failed to save backup file on server', 500);
                return;
            }

            header_remove('Content-Type');
            header('Content-Type: application/sql');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Cache-Control: no-store, no-cache, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo $dump;
            exit();
        } catch (Exception $e) {
            $this->sendError('Failed to generate backup: ' . $e->getMessage(), 500);
        }
    }

    private function getBackupHistory() {
        try {
            $backupDir = $this->getBackupDirectory(false);
            if ($backupDir === null || !is_dir($backupDir)) {
                $this->sendSuccess(['history' => []]);
                return;
            }

            $entries = scandir($backupDir);
            if ($entries === false) {
                $this->sendSuccess(['history' => []]);
                return;
            }

            $history = [];
            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }

                $fullPath = $backupDir . DIRECTORY_SEPARATOR . $entry;
                if (!is_file($fullPath) || strtolower(pathinfo($entry, PATHINFO_EXTENSION)) !== 'sql') {
                    continue;
                }

                $history[] = [
                    'file_name' => $entry,
                    'file_size' => filesize($fullPath) ?: 0,
                    'created_at' => date('Y-m-d H:i:s', filemtime($fullPath) ?: time()),
                    'created_at_ts' => filemtime($fullPath) ?: 0,
                ];
            }

            usort($history, function ($a, $b) {
                return ((int)$b['created_at_ts']) <=> ((int)$a['created_at_ts']);
            });
            $history = array_map(function ($item) {
                unset($item['created_at_ts']);
                return $item;
            }, $history);

            $this->sendSuccess(['history' => $history]);
        } catch (Exception $e) {
            $this->sendError('Failed to load backup history: ' . $e->getMessage(), 500);
        }
    }

    private function getBackupDirectory($create = false) {
        $candidates = [
            __DIR__ . '/../backups',
            __DIR__ . '/backups'
        ];

        foreach ($candidates as $candidate) {
            if (is_dir($candidate)) {
                $resolved = realpath($candidate);
                if ($resolved !== false) {
                    return $resolved;
                }
                return $candidate;
            }
        }

        if (!$create) {
            return null;
        }

        $target = $candidates[0];
        if (!is_dir($target) && !@mkdir($target, 0775, true) && !is_dir($target)) {
            return null;
        }

        $resolved = realpath($target);
        return $resolved !== false ? $resolved : $target;
    }
    
    private function sendSuccess($data = []) {
        $response = array_merge(['success' => true], $data);
        echo json_encode($response);
    }
    
    private function sendError($message, $code = 400) {
        http_response_code($code);
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
        exit();
    }
}

// Handle the request
try {
    $api = new AdminAPI();
    $api->handleRequest();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
