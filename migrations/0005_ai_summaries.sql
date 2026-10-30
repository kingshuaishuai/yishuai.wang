CREATE TABLE ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  encrypted_key TEXT,
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ai_summaries (
  post_id TEXT PRIMARY KEY REFERENCES posts(id),
  status TEXT NOT NULL CHECK (status IN ('generating', 'ready', 'failed')),
  request_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  summary_text TEXT NOT NULL DEFAULT '',
  source_hash TEXT,
  model TEXT,
  generated_at TEXT,
  error_code TEXT
);
