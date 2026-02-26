<?php

declare(strict_types=1);
header('Access-Control-Allow-Origin: http://localhost:4173');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/helpers.php';
require_once __DIR__ . '/../backend/mailer.php';
require_once __DIR__ . '/../backend/Controller/ApiController.php';
require_once __DIR__ . '/../backend/Model/AuthModel.php';
require_once __DIR__ . '/../backend/View/ApiView.php';

$config = appConfig();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

handleApiRequest($action, $method, $config);
