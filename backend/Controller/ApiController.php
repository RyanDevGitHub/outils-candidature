<?php

declare(strict_types=1);

function handleApiRequest(string $action, string $method, array $config): void
{
    $authCookieOptions = [
        'expires' => time() + (30 * 24 * 60 * 60),
        'path' => '/',
        'httponly' => false,
        'samesite' => 'Lax',
    ];

    if ($action === 'auth.email.start' && $method === 'POST') {
        $body = jsonBody();
        $fullName = trim((string) ($body['fullName'] ?? ''));
        $email = trim((string) ($body['email'] ?? ''));

        if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            apiError('Nom ou email invalide.', 422);
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
            apiError('Échec de l\'envoi de l\'email.', 500);
        }

        $payload = ['ok' => true, 'message' => 'Code de vérification envoyé.'];
        if ($config['app_env'] === 'local') {
            $payload['debugCode'] = $code;
        }

        apiOk($payload);
    }

    if ($action === 'auth.email.login.start' && $method === 'POST') {
        $body = jsonBody();
        $email = trim((string) ($body['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            apiError('Email invalide.', 422);
        }

        $pdo = db();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => mb_strtolower($email)]);
        $user = $stmt->fetch();

        if (!$user) {
            apiError('Aucun compte trouvé pour cet email.', 404);
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
            apiError('Échec de l\'envoi de l\'email.', 500);
        }

        $payload = ['ok' => true, 'message' => 'Code de vérification envoyé.'];
        if ($config['app_env'] === 'local') {
            $payload['debugCode'] = $code;
        }

        apiOk($payload);
    }

    if ($action === 'auth.email.verify' && $method === 'POST') {
        $body = jsonBody();
        $email = trim((string) ($body['email'] ?? ''));
        $code = trim((string) ($body['code'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '') {
            apiError('Email ou code invalide.', 422);
        }

        $pdo = db();
        $userStmt = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $userStmt->execute(['email' => mb_strtolower($email)]);
        $user = $userStmt->fetch();

        if (!$user) {
            apiError('Utilisateur introuvable.', 404);
        }

        $codeStmt = $pdo->prepare(
            'SELECT *
             FROM email_verification_codes
             WHERE user_id = :user_id
               AND consumed_at IS NULL
               AND datetime(expires_at) > datetime("now")
             ORDER BY id DESC
             LIMIT 1'
        );
        $codeStmt->execute(['user_id' => $user['id']]);
        $codeRow = $codeStmt->fetch();

        if (!$codeRow || !hash_equals($codeRow['code_hash'], hashValue($code))) {
            apiError('Code invalide ou expiré.', 401);
        }

        $pdo->prepare('UPDATE email_verification_codes SET consumed_at = datetime("now") WHERE id = :id')
            ->execute(['id' => $codeRow['id']]);

        if (empty($user['email_verified_at'])) {
            $pdo->prepare('UPDATE users SET email_verified_at = datetime("now"), updated_at = datetime("now") WHERE id = :id')
                ->execute(['id' => $user['id']]);
        }

        $token = createAuthToken((int) $user['id']);

        setcookie('authToken', $token, $authCookieOptions);

        apiOk([
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'fullName' => $user['full_name'],
                'email' => $user['email'],
                'provider' => $user['auth_provider'],
            ],
        ]);
    }

    if ($action === 'profile.save' && $method === 'POST') {
        $body = jsonBody();
        $token = trim((string) ($body['token'] ?? ''));
        $profile = $body['profile'] ?? null;

        if ($token === '' || !is_array($profile)) {
            apiError('Données manquantes.', 422);
        }

        $required = ['contractType', 'regions', 'educationLevel', 'duration', 'experience', 'startDate', 'companyCategory'];
        foreach ($required as $field) {
            if (!array_key_exists($field, $profile)) {
                apiError('Profil incomplet.', 422);
            }
        }

        $user = currentUserByToken($token);
        if (!$user) {
            apiError('Session invalide.', 401);
        }

        saveUserProfile((int) $user['id'], $profile);
        apiOk([]);
    }

    if ($action === 'auth.session' && $method === 'POST') {
        $body = jsonBody();
        $token = trim((string) ($body['token'] ?? ''));

        if ($token === '') {
            apiError('Token manquant.', 422);
        }

        $user = currentUserByToken($token);
        if (!$user) {
            apiError('Session invalide.', 401);
        }

        apiOk([
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
            apiError('OAuth Google non configuré (client_id/client_secret manquants).', 500);
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

        apiRedirect('https://accounts.google.com/o/oauth2/v2/auth?' . $query);
    }

    if ($action === 'oauth.google.callback' && $method === 'GET') {
        $state = trim((string) ($_GET['state'] ?? ''));
        $code = trim((string) ($_GET['code'] ?? ''));

        if ($state === '' || $code === '') {
            apiError('Paramètres OAuth manquants.', 422);
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
            apiError('State OAuth invalide ou expiré.', 401);
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
            apiError('Échec échange code OAuth Google.', 401);
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
            apiError('Impossible de récupérer les informations Google.', 401);
        }

        $pdo = db();

        $stmt = $pdo->prepare('SELECT * FROM users WHERE auth_provider = :provider AND provider_user_id = :provider_user_id LIMIT 1');
        $stmt->execute(['provider' => 'google', 'provider_user_id' => $googleId]);
        $user = $stmt->fetch();

        if (!$user) {
            $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email');
            $checkEmail->execute(['email' => $email]);
            $existingUser = $checkEmail->fetch();

            if ($existingUser) {
                $update = $pdo->prepare('UPDATE users SET auth_provider = :auth_provider, provider_user_id = :provider_user_id, email_verified_at = datetime("now") WHERE id = :id');
                $update->execute([
                    'auth_provider' => 'google',
                    'provider_user_id' => $provider_user_id,
                    'id' => $existingUser['id'],
                ]);

                $stmt->execute(['auth_provider' => 'google', 'provider_user_id' => $provider_user_id]);
                $user = $stmt->fetch();
            } else {
                $checkEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
                $checkEmail->execute(['email' => mb_strtolower($email)]);
                $existingUser = $checkEmail->fetch();

                if ($existingUser) {
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
                        'id' => $existingUser['id'],
                    ]);

                    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
                    $stmt->execute(['id' => $existingUser['id']]);
                    $user = $stmt->fetch();
                } else {
                    $insert = $pdo->prepare('
                        INSERT INTO users (full_name, email, password_hash, auth_provider, provider_user_id, email_verified_at)
                        VALUES (:full_name, :email, :password_hash, :auth_provider, :provider_user_id, datetime("now"))
                    ');
                    $insert->execute([
                        'full_name' => $name,
                        'email' => mb_strtolower($email),
                        'password_hash' => null,
                        'auth_provider' => 'google',
                        'provider_user_id' => $googleId,
                    ]);

                    $id = (int) $pdo->lastInsertId();
                    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
                    $stmt->execute(['id' => $id]);
                    $user = $stmt->fetch();
                }
            }
        }

        $token = createAuthToken((int) $user['id']);

        setcookie('authToken', $token, $authCookieOptions);
        apiRedirect('/home');
    }

    apiError('Route introuvable.', 404);
}
