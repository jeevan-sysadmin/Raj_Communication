<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config/database.php';

function companys_create_safe_text($value) {
    return trim((string)($value ?? ''));
}

function companys_create_has_column(PDO $conn, $table, $column) {
    static $cache = array();
    $cacheKey = $table . ':' . $column;
    if (array_key_exists($cacheKey, $cache)) {
        return $cache[$cacheKey];
    }

    $stmt = $conn->query("SHOW COLUMNS FROM " . $table);
    $columns = array();
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if (!empty($row['Field'])) {
            $columns[] = trim((string)$row['Field']);
        }
    }

    $has = in_array($column, $columns, true);
    $cache[$cacheKey] = $has;
    return $has;
}

function companys_create_generate_code() {
    return 'CMP' . date('Ymd') . strtoupper(substr(str_replace('.', '', uniqid('', true)), -6));
}

try {
    $database = new Database();
    $conn = $database->getConnection();
    $table = 'companies';

    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $companyName = companys_create_safe_text($input['company_name'] ?? '');
    $product = companys_create_safe_text($input['product'] ?? '');
    $contactPerson = companys_create_safe_text($input['contact_person'] ?? '');
    $phone = companys_create_safe_text($input['phone'] ?? '');
    $email = companys_create_safe_text($input['email'] ?? '');
    $address = companys_create_safe_text($input['address'] ?? '');
    $notes = companys_create_safe_text($input['notes'] ?? '');
    $sourcePdf = companys_create_safe_text($input['source_pdf'] ?? '');

    if ($companyName === '' || $product === '') {
        http_response_code(400);
        echo json_encode(array(
            'success' => false,
            'message' => 'company_name and product are required',
        ));
        exit();
    }

    $companyCode = companys_create_generate_code();
    $insertData = array(
        'company_code' => $companyCode,
        'company_name' => $companyName,
        'product' => $product,
        'contact_person' => $contactPerson,
        'phone' => $phone,
        'email' => $email,
        'address' => $address,
        'notes' => $notes,
    );

    if (companys_create_has_column($conn, $table, 'source_pdf')) {
        $insertData['source_pdf'] = $sourcePdf;
    }
    if (companys_create_has_column($conn, $table, 'created_at')) {
        $insertData['created_at'] = '__NOW__';
    }
    if (companys_create_has_column($conn, $table, 'updated_at')) {
        $insertData['updated_at'] = '__NOW__';
    }

    $columns = array_keys($insertData);
    $placeholders = array();
    foreach ($columns as $column) {
        $placeholders[] = $insertData[$column] === '__NOW__' ? 'NOW()' : ':' . $column;
    }

    $query = "INSERT INTO " . $table . " (" . implode(', ', $columns) . ")
              VALUES (" . implode(', ', $placeholders) . ")";
    $stmt = $conn->prepare($query);

    foreach ($insertData as $column => $value) {
        if ($value === '__NOW__') {
            continue;
        }
        $stmt->bindValue(':' . $column, $value, PDO::PARAM_STR);
    }

    $stmt->execute();

    http_response_code(201);
    echo json_encode(array(
        'success' => true,
        'message' => 'Company created successfully',
        'company_id' => (int)$conn->lastInsertId(),
        'company_code' => $companyCode,
    ));
} catch (Throwable $e) {
    error_log('companys_create.php fatal: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array(
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage(),
    ));
}
