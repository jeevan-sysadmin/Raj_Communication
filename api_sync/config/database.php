<?php

if (!class_exists('Database')) {
    class Database {
        private string $host;
        private string $db_name;
        private string $username;
        private string $password;
        public ?PDO $conn = null;

        public function __construct() {
            $env = $this->loadEnv();

            $this->host = $env['DB_HOST'] ?? 'localhost';
            $this->db_name = $env['DB_NAME'] ?? 'raj communication';
            $this->username = $env['DB_USER'] ?? 'root';
            $this->password = $env['DB_PASSWORD'] ?? ($env['DB_PASS'] ?? '');
        }

        private function loadEnv(): array {
            static $cached = null;

            if (is_array($cached)) {
                return $cached;
            }

            $cached = [];
            $envPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env';

            if (!is_file($envPath) || !is_readable($envPath)) {
                return $cached;
            }

            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                return $cached;
            }

            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                    continue;
                }

                $separatorPos = strpos($trimmed, '=');
                if ($separatorPos === false) {
                    continue;
                }

                $key = trim(substr($trimmed, 0, $separatorPos));
                $value = trim(substr($trimmed, $separatorPos + 1));

                if ($key === '') {
                    continue;
                }

                if (
                    strlen($value) >= 2 &&
                    (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))
                ) {
                    $value = substr($value, 1, -1);
                }

                $cached[$key] = $value;
            }

            return $cached;
        }

        private function candidateDatabaseNames(): array {
            $candidates = [
                $this->db_name,
                'raj communication',
                'raj_communication',
                'sun_computers',
            ];

            $unique = [];
            foreach ($candidates as $candidate) {
                $candidate = trim((string)$candidate);
                if ($candidate === '' || in_array($candidate, $unique, true)) {
                    continue;
                }

                $unique[] = $candidate;
            }

            return $unique;
        }

        public function getConnection(): PDO {
            if ($this->conn instanceof PDO) {
                return $this->conn;
            }

            foreach ($this->candidateDatabaseNames() as $dbName) {
                try {
                    $conn = new PDO(
                        "mysql:host={$this->host};dbname={$dbName};charset=utf8mb4",
                        $this->username,
                        $this->password
                    );
                    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

                    $this->conn = $conn;
                    return $this->conn;
                } catch (PDOException $e) {
                    continue;
                }
            }

            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json; charset=UTF-8');
            }

            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed',
            ]);
            exit();
        }
    }
}
