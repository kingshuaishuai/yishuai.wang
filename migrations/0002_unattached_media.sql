CREATE TABLE media_uploads (
  id TEXT PRIMARY KEY, post_id TEXT REFERENCES posts(id),
  object_key TEXT UNIQUE NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  original_name TEXT NOT NULL, created_at TEXT NOT NULL
);
INSERT INTO media_uploads SELECT * FROM media;
DROP TABLE media;
ALTER TABLE media_uploads RENAME TO media;
CREATE INDEX rate_expiry ON rate_limits(expires_at);
