<?php
// Reuse admin API delivery handler so /api/deliveries.php can fetch delivery rows directly.
if (!isset($_GET['action']) || $_GET['action'] === '') {
    $_GET['action'] = 'get_deliveries';
}
require_once __DIR__ . '/admin_api.php';

