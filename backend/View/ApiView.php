<?php

declare(strict_types=1);

function apiOk(array $payload, int $status = 200): void
{
    jsonResponse(array_merge(['ok' => true], $payload), $status);
}

function apiError(string $message, int $status): void
{
    jsonResponse(['ok' => false, 'error' => $message], $status);
}

function apiRedirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}
