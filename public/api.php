<?php

declare(strict_types=1);
header("Access-Control-Allow-Origin: http://localhost:4173");
// Autoriser les méthodes et les headers dont on a besoin
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Gérer la requête "Preflight" (le navigateur envoie une vérification avant le POST)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../backend/config.php';
require_once __DIR__ . '/../backend/db.php';
require_once __DIR__ . '/../backend/helpers.php';
require_once __DIR__ . '/../backend/mailer.php';

$config = appConfig();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

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

if ($action === 'auth.email.start' && $method === 'POST') {
    $body = jsonBody();
    $fullName = trim((string) ($body['fullName'] ?? ''));
    $email = trim((string) ($body['email'] ?? ''));

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['ok' => false, 'error' => 'Nom ou email invalide.'], 422);
    }

    $user = upsertEmailUser($email, $fullName);

    $code = randomCode(6);
    $codeHash = hashValue($code);
    $expiresAt = nowUtc()->modify('+10 minutes')->format('Y-m-d H:i:s');

    $pdo = db();
    $stmt = $pdo->prepare('INSERT INTO email_verification_codes (user_id, code_hash, expires_at) VALUES (:user_id, :code_hash, :expires_at)');
    $stmt->execute([
        'user_id' => $user['id'],
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt,
    ]);

    $sent = sendVerificationEmail($email, $code);
    if (!$sent && $config['app_env'] !== 'local') {
        jsonResponse(['ok' => false, 'error' => 'Échec de l\'envoi de l\'email.'], 500);
    }

    $payload = ['ok' => true, 'message' => 'Code de vérification envoyé.'];
    if ($config['app_env'] === 'local') {
        $payload['debugCode'] = $code;
    }

    jsonResponse($payload);
}


if ($action === 'auth.email.login.start' && $method === 'POST') {
    $body = jsonBody();
    $email = trim((string) ($body['email'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['ok' => false, 'error' => 'Email invalide.'], 422);
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => mb_strtolower($email)]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['ok' => false, 'error' => 'Aucun compte trouvé pour cet email.'], 404);
    }

    $code = randomCode(6);
    $codeHash = hashValue($code);
    $expiresAt = nowUtc()->modify('+10 minutes')->format('Y-m-d H:i:s');

    $codeStmt = $pdo->prepare('INSERT INTO email_verification_codes (user_id, code_hash, expires_at) VALUES (:user_id, :code_hash, :expires_at)');
    $codeStmt->execute([
        'user_id' => $user['id'],
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt,
    ]);

    $sent = sendVerificationEmail($email, $code);
    if (!$sent && $config['app_env'] !== 'local') {
        jsonResponse(['ok' => false, 'error' => 'Échec de l\'envoi de l\'email.'], 500);
    }

    $payload = ['ok' => true, 'message' => 'Code de vérification envoyé.'];
    if ($config['app_env'] === 'local') {
        $payload['debugCode'] = $code;
    }

    jsonResponse($payload);
}

if ($action === 'auth.email.verify' && $method === 'POST') {
    $body = jsonBody();
    $email = trim((string) ($body['email'] ?? ''));
    $code = trim((string) ($body['code'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($code) < 4) {
        jsonResponse(['ok' => false, 'error' => 'Email ou code invalide.'], 422);
    }

    $pdo = db();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => mb_strtolower($email)]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['ok' => false, 'error' => 'Utilisateur introuvable.'], 404);
    }

    $codeStmt = $pdo->prepare(
        'SELECT * FROM email_verification_codes
         WHERE user_id = :user_id
           AND consumed_at IS NULL
           AND datetime(expires_at) > datetime("now")
         ORDER BY id DESC
         LIMIT 1'
    );
    $codeStmt->execute(['user_id' => $user['id']]);
    $codeRow = $codeStmt->fetch();

    if (!$codeRow || !hash_equals($codeRow['code_hash'], hashValue($code))) {
        jsonResponse(['ok' => false, 'error' => 'Code de vérification invalide.'], 401);
    }

    $pdo->prepare('UPDATE email_verification_codes SET consumed_at = datetime("now") WHERE id = :id')
        ->execute(['id' => $codeRow['id']]);

    $pdo->prepare('UPDATE users SET email_verified_at = datetime("now"), updated_at = datetime("now") WHERE id = :id')
        ->execute(['id' => $user['id']]);

    $token = createAuthToken((int) $user['id']);

    jsonResponse([
        'ok' => true,
        'token' => $token,
        'user' => [
            'id' => (int) $user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'provider' => $user['auth_provider'],
            'hasCompletedProfile' => hasCompletedProfile($user),
        ],
    ]);
}


if ($action === 'auth.profile.save' && $method === 'POST') {
    $body = jsonBody();
    $token = trim((string) ($body['token'] ?? ''));
    $profile = $body['profile'] ?? null;

    if ($token === '' || !is_array($profile)) {
        jsonResponse(['ok' => false, 'error' => 'Données manquantes.'], 422);
    }

    $required = ['contractType', 'regions', 'educationLevel', 'duration', 'experience', 'startDate', 'companyCategory'];
    foreach ($required as $field) {
        if (!array_key_exists($field, $profile)) {
            jsonResponse(['ok' => false, 'error' => 'Profil incomplet.'], 422);
        }
    }

    $user = currentUserByToken($token);
    if (!$user) {
        jsonResponse(['ok' => false, 'error' => 'Session invalide.'], 401);
    }

    saveUserProfile((int) $user['id'], $profile);
    jsonResponse(['ok' => true]);
}

if ($action === 'auth.session' && $method === 'POST') {
    $body = jsonBody();
    $token = trim((string) ($body['token'] ?? ''));

    if ($token === '') {
        jsonResponse(['ok' => false, 'error' => 'Token manquant.'], 422);
    }

    $user = currentUserByToken($token);
    if (!$user) {
        jsonResponse(['ok' => false, 'error' => 'Session invalide.'], 401);
    }

    jsonResponse([
        'ok' => true,
        'user' => [
            'id' => (int) $user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'provider' => $user['auth_provider'],
            'hasCompletedProfile' => hasCompletedProfile($user),
        ],
    ]);
}

if ($action === 'oauth.google.start' && $method === 'GET') {
    if ($config['google_client_id'] === '' || $config['google_client_secret'] === '') {
        jsonResponse(['ok' => false, 'error' => 'OAuth Google non configuré (client_id/client_secret manquants).'], 500);
    }

    $state = randomToken(16);
    $expiresAt = nowUtc()->modify('+10 minutes')->format('Y-m-d H:i:s');
    db()->prepare('INSERT INTO oauth_states (state, provider, expires_at) VALUES (:state, :provider, :expires_at)')
        ->execute([
            'state' => $state,
            'provider' => 'google',
            'expires_at' => $expiresAt,
        ]);

    $query = http_build_query([
        'client_id' => $config['google_client_id'],
        'redirect_uri' => $config['google_redirect_uri'],
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'access_type' => 'online',
        'state' => $state,
        'prompt' => 'select_account',
    ]);

    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $query);
    exit;
}

if ($action === 'oauth.google.callback' && $method === 'GET') {
    $state = trim((string) ($_GET['state'] ?? ''));
    $code = trim((string) ($_GET['code'] ?? ''));

    if ($state === '' || $code === '') {
        jsonResponse(['ok' => false, 'error' => 'Paramètres OAuth manquants.'], 422);
    }

    $stateStmt = db()->prepare(
        'SELECT * FROM oauth_states
         WHERE state = :state
           AND provider = :provider
           AND datetime(expires_at) > datetime("now")
         LIMIT 1'
    );
    $stateStmt->execute(['state' => $state, 'provider' => 'google']);
    $stateRow = $stateStmt->fetch();

    if (!$stateRow) {
        jsonResponse(['ok' => false, 'error' => 'State OAuth invalide ou expiré.'], 401);
    }

    db()->prepare('DELETE FROM oauth_states WHERE id = :id')->execute(['id' => $stateRow['id']]);

    $tokenResponse = file_get_contents('https://oauth2.googleapis.com/token', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query([
                'code' => $code,
                'client_id' => $config['google_client_id'],
                'client_secret' => $config['google_client_secret'],
                'redirect_uri' => $config['google_redirect_uri'],
                'grant_type' => 'authorization_code',
            ]),
            'ignore_errors' => true,
        ],
    ]));

    $tokenData = json_decode((string) $tokenResponse, true);
    $accessToken = $tokenData['access_token'] ?? '';

    if ($accessToken === '') {
        jsonResponse(['ok' => false, 'error' => 'Échec échange code OAuth Google.'], 401);
    }

    $userInfoResponse = file_get_contents('https://www.googleapis.com/oauth2/v2/userinfo', false, stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer {$accessToken}\r\n",
            'ignore_errors' => true,
        ],
    ]));

    $googleUser = json_decode((string) $userInfoResponse, true);
    $googleId = (string) ($googleUser['id'] ?? '');
    $email = (string) ($googleUser['email'] ?? '');
    $name = (string) ($googleUser['name'] ?? '');

    if ($googleId === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['ok' => false, 'error' => 'Impossible de récupérer les informations Google.'], 401);
    }

    $pdo = db();
    
    $stmt = $pdo->prepare('SELECT * FROM users WHERE auth_provider = :provider AND provider_user_id = :provider_user_id LIMIT 1');
    $stmt->execute(['provider' => 'google', 'provider_user_id' => $googleId]);
    $user = $stmt->fetch();

    if (!$user) {
        $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email');
        $checkEmail->execute(['email' => $email]); // Assure-toi que $email contient bien l'adresse reçue de Google
        $existingUser = $checkEmail->fetch();

        if ($existingUser) {
            $update = $pdo->prepare('UPDATE users SET auth_provider = :auth_provider, provider_user_id = :provider_user_id, email_verified_at = datetime("now") WHERE id = :id');
            $update->execute([
                'auth_provider'    => 'google',
                'provider_user_id' => $provider_user_id, // Variable reçue de Google
                'id'               => $existingUser['id']
            ]);
        
            $stmt->execute(['auth_provider' => 'google', 'provider_user_id' => $provider_user_id]);
            $user = $stmt->fetch();
            
       } else {
        // 1. Théorie : On vérifie d'abord si l'email existe déjà, même sans Google ID
        $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $checkEmail->execute(['email' => mb_strtolower($email)]);
        $existingUser = $checkEmail->fetch();

        if ($existingUser) {
            // 2. Pratique : Si l'email existe, on "lie" le compte Google à cet utilisateur
            $update = $pdo->prepare('
                UPDATE users 
                SET auth_provider = "google", 
                    provider_user_id = :provider_user_id, 
                    email_verified_at = datetime("now"),
                    updated_at = datetime("now")
                WHERE id = :id
            ');
            $update->execute([
                'provider_user_id' => $googleId,
                'id' => $existingUser['id']
            ]);
            
            // On récupère les infos complètes de l'utilisateur mis à jour
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
            $stmt->execute(['id' => $existingUser['id']]);
            $user = $stmt->fetch();
        } else {
            // 3. Succès : Si vraiment rien n'existe, on crée le nouveau profil
            $insert = $pdo->prepare('
                INSERT INTO users (full_name, email, password_hash, auth_provider, provider_user_id, email_verified_at) 
                VALUES (:full_name, :email, :password_hash, :auth_provider, :provider_user_id, datetime("now"))
            ');
            $insert->execute([
                'full_name'        => $name,
                'email'            => mb_strtolower($email),
                'password_hash'    => null,
                'auth_provider'    => 'google',
                'provider_user_id' => $googleId
            ]);
            
            $id = (int) $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $user = $stmt->fetch();
        }
        }
    }

    $token = createAuthToken((int) $user['id']);

    header('Location: ' . $config['frontend_url'] . '#authToken=' . urlencode($token));
    exit;
}

jsonResponse(['ok' => false, 'error' => 'Route introuvable.'], 404);
