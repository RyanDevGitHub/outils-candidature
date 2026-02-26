<?php

declare(strict_types=1);

function upsertEmailUser(string $email, string $fullName): array
{
    $pdo = db();

    $select = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $select->execute(['email' => mb_strtolower(trim($email))]);
    $user = $select->fetch();

    if ($user) {
        $provider = ($user['auth_provider'] === 'google') ? 'google' : 'email';
        $stmt = $pdo->prepare('UPDATE users SET full_name = :full_name, auth_provider = :auth_provider, updated_at = datetime("now") WHERE id = :id');
        $stmt->execute([
            'full_name' => $fullName,
            'auth_provider' => $provider,
            'id' => $user['id'],
        ]);

        $select->execute(['email' => mb_strtolower(trim($email))]);
        return $select->fetch();
    }

    $insert = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, auth_provider) VALUES (:full_name, :email, :password_hash, :auth_provider)');
    $insert->execute([
        'full_name' => $fullName,
        'email' => mb_strtolower(trim($email)),
        'password_hash' => '__passwordless__',
        'auth_provider' => 'email',
    ]);

    $id = (int) $pdo->lastInsertId();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
    $stmt->execute(['id' => $id]);

    return $stmt->fetch();
}

function createAuthToken(int $userId): string
{
    $pdo = db();
    $token = randomToken(32);
    $tokenHash = hashValue($token);
    $expiresAt = nowUtc()->modify('+30 days')->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare('INSERT INTO auth_tokens (user_id, token_hash, expires_at) VALUES (:user_id, :token_hash, :expires_at)');
    $stmt->execute([
        'user_id' => $userId,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
    ]);

    return $token;
}

function currentUserByToken(string $plainToken): ?array
{
    $tokenHash = hashValue($plainToken);
    $pdo = db();

    $stmt = $pdo->prepare(
        'SELECT u.*
         FROM auth_tokens t
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = :token_hash
           AND t.revoked_at IS NULL
           AND datetime(t.expires_at) > datetime("now")
         LIMIT 1'
    );

    $stmt->execute(['token_hash' => $tokenHash]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function saveUserProfile(int $userId, array $profile): void
{
    $regions = json_encode($profile['regions'] ?? [], JSON_UNESCAPED_UNICODE);

    db()->prepare(
        'UPDATE users
         SET profile_contract_type = :contract_type,
             profile_regions = :regions,
             profile_education_level = :education_level,
             profile_duration = :duration,
             profile_experience = :experience,
             profile_start_date = :start_date,
             profile_company_category = :company_category,
             updated_at = datetime("now")
         WHERE id = :id'
    )->execute([
        'contract_type' => trim((string) ($profile['contractType'] ?? '')),
        'regions' => $regions === false ? '[]' : $regions,
        'education_level' => trim((string) ($profile['educationLevel'] ?? '')),
        'duration' => trim((string) ($profile['duration'] ?? '')),
        'experience' => trim((string) ($profile['experience'] ?? '')),
        'start_date' => trim((string) ($profile['startDate'] ?? '')),
        'company_category' => trim((string) ($profile['companyCategory'] ?? '')),
        'id' => $userId,
    ]);
}

function hasCompletedProfile(array $user): bool
{
    $requiredFields = [
        'profile_contract_type',
        'profile_regions',
        'profile_education_level',
        'profile_duration',
        'profile_experience',
        'profile_start_date',
        'profile_company_category',
    ];

    foreach ($requiredFields as $field) {
        $value = trim((string) ($user[$field] ?? ''));
        if ($value === '' || $value === '[]') {
            return false;
        }
    }

    return true;
}
