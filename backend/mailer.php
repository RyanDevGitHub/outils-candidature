<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function sendVerificationEmail(string $email, string $code): bool
{
    $config = appConfig();

    $subject = 'Votre code de vérification';
    $message = "Bonjour,\n\nVotre code de vérification est : {$code}\n\nCe code expire dans 10 minutes.\n";
    $headers = [
        'From: ' . $config['mail_from'],
        'Content-Type: text/plain; charset=UTF-8',
    ];

    $sent = @mail($email, $subject, $message, implode("\r\n", $headers));

    $logDir = dirname(__DIR__) . '/storage/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0775, true);
    }

    $logLine = sprintf(
        "[%s] to=%s subject=%s code=%s sent=%s\n",
        (new DateTimeImmutable('now'))->format(DateTimeInterface::ATOM),
        $email,
        $subject,
        $code,
        $sent ? 'yes' : 'no'
    );

    file_put_contents($logDir . '/mail.log', $logLine, FILE_APPEND);

    return $sent;
}
