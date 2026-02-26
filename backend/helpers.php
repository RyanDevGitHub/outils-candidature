<?php

declare(strict_types=1);

function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function randomCode(int $length = 6): string
{
    $min = (int) str_pad('1', $length, '0');
    $max = (int) str_pad('', $length, '9');
    return (string) random_int($min, $max);
}

function randomToken(int $bytes = 32): string
{
    return bin2hex(random_bytes($bytes));
}

function hashValue(string $value): string
{
    return hash('sha256', $value);
}

function nowUtc(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('UTC'));
}
