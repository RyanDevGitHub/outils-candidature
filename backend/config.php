<?php

declare(strict_types=1);
function loadEnv(string $path): void
{
    if (!file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // On ignore les commentaires
        if (str_starts_with(trim($line), '#')) {
            continue;
        }

        // On sépare le nom de la valeur
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            // On retire les guillemets si présents
            $value = trim($value, '"\'');

            // On enregistre dans l'environnement PHP
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
        }
    }
}

// On appelle la fonction immédiatement
loadEnv(dirname(__DIR__) . '/.env');
function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
}

function appConfig(): array
{
    // __DIR__ est le dossier /backend
    // dirname(__DIR__) remonte d'un cran vers la RACINE du projet
    $root = dirname(__DIR__); 

    // On s'assure que le .env est bien chargé depuis la racine
    loadEnv($root . '/.env');

    // On récupère le chemin relatif du .env (ex: "db/app.sqlite")
    $relPath = env('SQLITE_DB_PATH', 'db/app.sqlite');

    // ÉTAPE CRUCIALE : On crée le chemin ABSOLU
    // DIRECTORY_SEPARATOR permet de mettre des "\" sur Windows et "/" sur Linux
    $absoluteDbPath = $root . DIRECTORY_SEPARATOR . $relPath;

    return [
        'app_env' => env('APP_ENV', 'local'),
        'db_path' => $absoluteDbPath, // C'est cette valeur qui ira dans le "new PDO"
        'frontend_url' => env('FRONTEND_URL', 'http://localhost:4173'),
        'mail_from' => env('MAIL_FROM', 'no-reply@exemple.com'),
        'google_client_id' => env('GOOGLE_CLIENT_ID', ''),
        'google_client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'google_redirect_uri' => env('GOOGLE_REDIRECT_URI', 'http://localhost:4173/api.php?action=oauth.google.callback'),
    ];
}