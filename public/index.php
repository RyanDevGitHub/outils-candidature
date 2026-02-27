<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/helpers.php';
require_once __DIR__ . '/../backend/Model/AuthModel.php';
require_once __DIR__ . '/../backend/AuthMiddleware.php';

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$authToken = getAuthTokenFromCookies();

$viewRoutes = [
    '/' => __DIR__ . '/../backend/View/index.html',
    '/login' => __DIR__ . '/../backend/View/index.html',
    '/home' => __DIR__ . '/../backend/View/home/index.html',
    '/signup' => __DIR__ . '/../backend/View/signup/index.html',
];

if ($requestPath === '/logout' && $method === 'POST') {
    invalidateCurrentAuthSessionIfAny();
    header('Location: /login');
    exit;
}

if ($requestPath === '/home') {
    requireAuthenticatedUserOrRedirectToLogin();
}

if (($requestPath === '/' || $requestPath === '/login') && $authToken !== '') {
    $user = resolveAuthenticatedUserFromCookies();
    if ($user) {
        header('Location: /home');
        exit;
    }

    clearAuthCookies();
}

if (isset($viewRoutes[$requestPath])) {
    include $viewRoutes[$requestPath];
    exit;
}

if ($requestPath !== '/' && file_exists(__DIR__ . $requestPath)) {
    return false;
}

http_response_code(404);
include __DIR__ . '/../backend/View/404/index.html';
