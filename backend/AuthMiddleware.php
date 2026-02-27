<?php

declare(strict_types=1);

function getAuthTokenFromCookies(): string
{
    $token = trim((string) ($_COOKIE['auth_token'] ?? ''));
    if ($token !== '') {
        return $token;
    }

    return trim((string) ($_COOKIE['authToken'] ?? ''));
}

function clearAuthCookies(): void
{
    setcookie('auth_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);

    setcookie('authToken', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
}

function resolveAuthenticatedUserFromCookies(): ?array
{
    $token = getAuthTokenFromCookies();
    if ($token === '') {
        return null;
    }

    return currentUserByToken($token);
}

function requireAuthenticatedUserOrRedirectToLogin(): array
{
    $user = resolveAuthenticatedUserFromCookies();
    if ($user) {
        return $user;
    }

    clearAuthCookies();
    header('Location: /login');
    exit;
}

function invalidateCurrentAuthSessionIfAny(): void
{
    $token = getAuthTokenFromCookies();
    if ($token !== '') {
        db()->prepare('UPDATE auth_tokens SET revoked_at = datetime("now") WHERE token_hash = :token_hash AND revoked_at IS NULL')
            ->execute(['token_hash' => hashValue($token)]);
    }

    clearAuthCookies();
}
