<?php
// On récupère le chemin demandé (ex: /home ou /)
$request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// On définit nos routes propres
$routes = [
    '/'      => 'index.html',
    '/home'  => 'home/index.html',
    '/signup' => 'signup/index.html'
];

// 1. Si c'est une route connue, on charge le HTML depuis backend/view/
if (isset($routes[$request])) {
    $viewPath = __DIR__ . '/../backend/view/' . $routes[$request];
    if (file_exists($viewPath)) {
        include $viewPath;
        exit;
    }
}

// 2. Si c'est un fichier réel qui existe (image, js, css), on laisse le serveur le servir
if ($request !== '/' && file_exists(__DIR__ . $request)) {
    return false; 
}

$route = $_SERVER['REQUEST_URI'] ?? '/';

// On définit les pages qui demandent d'être connecté
$protectedRoutes = ['/home', '/profile'];

if (in_array($route, $protectedRoutes)) {
    // Ici, on charge la vue HOME
    // C'est le fichier home.js qui fera le reste proprement
    require __DIR__ . '/../backend/views/home.html'; 
} else {
    // Ici, on charge la vue LOGIN
    require __DIR__ . '/../backend/views/login.html';
}

// 3. Sinon, 404
http_response_code(404);
echo "Désolé, cette page n'existe pas.";