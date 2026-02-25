PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  provider_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (auth_provider IN ('email', 'google', 'github', 'apple')),
  CHECK (
    (auth_provider = 'email' AND password_hash IS NOT NULL)
    OR
    (auth_provider IN ('google', 'github', 'apple'))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_pair
  ON users(auth_provider, provider_user_id)
  WHERE provider_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at);
