<?php

if (!class_exists('Database')) {
    class Database {
        private string $host;
        private string $port;
        private string $db_name;
        private string $username;
        private string $password;
        public ?PDO $conn = null;

        public function __construct() {
            $env = $this->loadEnv();

            $this->host = trim((string)($this->readSetting($env, ['DB_HOST', 'MYSQL_HOST'], 'localhost') ?? ''));
            $this->port = trim((string)($this->readSetting($env, ['DB_PORT', 'MYSQL_PORT'], '3306') ?? '3306'));
            $this->db_name = trim((string)($this->readSetting($env, ['DB_NAME', 'MYSQL_DATABASE']) ?? ''));
            $this->username = trim((string)($this->readSetting($env, ['DB_USER', 'DB_USERNAME', 'MYSQL_USER']) ?? ''));
            $this->password = (string)($this->readSetting($env, ['DB_PASSWORD', 'DB_PASS', 'MYSQL_PASSWORD'], '') ?? '');
        }

        private function loadEnv(): array {
            static $cached = null;

            if (is_array($cached)) {
                return $cached;
            }

            $cached = [];
            $baseDir = dirname(__DIR__, 2);
            $envPaths = [
                $baseDir . DIRECTORY_SEPARATOR . '.env',
                $baseDir . DIRECTORY_SEPARATOR . '.env.local',
            ];

            foreach ($envPaths as $envPath) {
                if (!is_file($envPath) || !is_readable($envPath)) {
                    continue;
                }

                $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                if ($lines === false) {
                    continue;
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
            }

            return $cached;
        }

        private function readSetting(array $env, array $keys, ?string $default = null): ?string {
            foreach ($keys as $key) {
                $value = $env[$key] ?? $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
                if ($value === false) {
                    continue;
                }

                $text = trim((string)$value);
                if ($text !== '') {
                    return $text;
                }
            }

            return $default;
        }

        private function candidateDatabaseNames(): array {
            $candidates = [
                $this->db_name,
                str_replace(' ', '_', $this->db_name),
                str_replace('_', ' ', $this->db_name),
                preg_replace('/\s+/', '', $this->db_name),
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

        private function candidateHosts(): array {
            $candidates = [
                $this->host,
                $this->host === 'localhost' ? '127.0.0.1' : '',
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

            if ($this->host === '' || $this->db_name === '' || $this->username === '') {
                $this->emitConfigurationError();
            }

            foreach ($this->candidateHosts() as $host) {
                foreach ($this->candidateDatabaseNames() as $dbName) {
                    try {
                        $conn = new PDO(
                            "mysql:host={$host};port={$this->port};dbname={$dbName};charset=utf8mb4",
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

        private function emitConfigurationError(): void {
            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json; charset=UTF-8');
            }

            echo json_encode([
                'success' => false,
                'message' => 'Database configuration is missing in .env',
            ]);
            exit();
        }
    }
}
