<?php

declare(strict_types=1);

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$authToken = $_COOKIE['authToken'] ?? '';

$viewRoutes = [
    '/' => __DIR__ . '/../backend/View/index.html',
    '/login' => __DIR__ . '/../backend/View/index.html',
    '/home' => __DIR__ . '/../backend/View/home/index.html',
    '/signup' => __DIR__ . '/../backend/View/signup/index.html',
];

if ($requestPath === '/home' && $authToken === '') {
    header('Location: /');
    exit;
}

if (($requestPath === '/' || $requestPath === '/login') && $authToken !== '') {
    header('Location: /home');
    exit;
}

if (isset($viewRoutes[$requestPath])) {
    include $viewRoutes[$requestPath];
    exit;
}

if ($requestPath !== '/' && file_exists(__DIR__ . $requestPath)) {
    return false;
}

http_response_code(404);
echo "Désolé, cette page n'existe pas.";
