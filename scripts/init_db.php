<?php

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$dbDir = $rootDir . '/db';
$dbFile = $dbDir . '/app.sqlite';
$schemaFile = $dbDir . '/schema.sql';

if (!is_dir($dbDir) && !mkdir($dbDir, 0775, true) && !is_dir($dbDir)) {
    fwrite(STDERR, "Impossible de créer le dossier db.\n");
    exit(1);
}

if (!file_exists($schemaFile)) {
    fwrite(STDERR, "Fichier schema.sql introuvable.\n");
    exit(1);
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $schema = file_get_contents($schemaFile);
    if ($schema === false) {
        throw new RuntimeException('Impossible de lire le schema SQL.');
    }

    $pdo->exec($schema);

    fwrite(STDOUT, "Base SQLite initialisée: {$dbFile}\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Erreur d'initialisation SQLite: {$e->getMessage()}\n");
    exit(1);
}
