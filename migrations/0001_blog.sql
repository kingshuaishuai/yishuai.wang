PRAGMA foreign_keys = ON;
CREATE TABLE users (
  id TEXT PRIMARY KEY, login TEXT NOT NULL, name TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE auth_codes (
  token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('github','local')),
  verifier TEXT NOT NULL, return_to TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE posts (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('article','note')),
  status TEXT NOT NULL CHECK(status IN ('draft','published','deleted')),
  deleted_from TEXT, version INTEGER NOT NULL DEFAULT 1,
  draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
  published_json TEXT CHECK(published_json IS NULL OR json_valid(published_json)),
  author_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  published_at TEXT, published_updated_at TEXT
);
CREATE INDEX posts_public ON posts(status, kind, published_at DESC);
CREATE TABLE comments (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id),
  parent_id TEXT REFERENCES comments(id), user_id TEXT REFERENCES users(id),
  author TEXT NOT NULL, email TEXT, markdown TEXT NOT NULL, html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','hidden')),
  request_key TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX comments_public ON comments(post_id, status, created_at);
CREATE TABLE media (
  id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id),
  object_key TEXT UNIQUE NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  original_name TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
