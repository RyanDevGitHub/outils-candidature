PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  provider_user_id TEXT,
  email_verified_at TEXT,
  profile_contract_type TEXT,
  profile_regions TEXT,
  profile_education_level TEXT,
  profile_duration TEXT,
  profile_experience TEXT,
  profile_start_date TEXT,
  profile_company_category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (auth_provider IN ('email', 'google', 'github', 'apple')),
  CHECK (
    (auth_provider = 'email')
    OR
    (auth_provider IN ('google', 'github', 'apple') AND provider_user_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_pair
  ON users(auth_provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_codes_user_id
  ON email_verification_codes(user_id);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id
  ON auth_tokens(user_id);

CREATE TABLE IF NOT EXISTS oauth_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (provider IN ('google'))
);
