<?php

declare(strict_types=1);

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
    $root = dirname(__DIR__);

    return [
        'app_env' => env('APP_ENV', 'local'),
        'db_path' => env('SQLITE_DB_PATH', $root . '/db/app.sqlite'),
        'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:8000/home.html'),
        'mail_from' => env('MAIL_FROM', 'no-reply@outils-candidature.local'),
        'google_client_id' => env('GOOGLE_CLIENT_ID', ''),
        'google_client_secret' => env('GOOGLE_CLIENT_SECRET', ''),
        'google_redirect_uri' => env('GOOGLE_REDIRECT_URI', 'http://127.0.0.1:8000/public/api.php?action=oauth.google.callback'),
    ];
}
