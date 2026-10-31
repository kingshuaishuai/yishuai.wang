CREATE TABLE analytics_settings (
  id INTEGER PRIMARY KEY CHECK(id=1),
  public_counts INTEGER NOT NULL DEFAULT 1 CHECK(public_counts IN (0,1)),
  salt TEXT NOT NULL,
  started_at TEXT NOT NULL
);
CREATE TABLE analytics_daily (
  day TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  visitors INTEGER NOT NULL DEFAULT 0,
  article_views INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE analytics_page_daily (
  day TEXT NOT NULL,
  page_key TEXT NOT NULL,
  path TEXT NOT NULL,
  post_id TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,page_key)
);
CREATE INDEX analytics_page_post ON analytics_page_daily(post_id,day);
CREATE TABLE analytics_referrers_daily (
  day TEXT NOT NULL,
  source TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,source)
);
CREATE TABLE analytics_visitors (
  day TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  first_event_id TEXT NOT NULL,
  PRIMARY KEY(day,visitor_hash)
);
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  page_key TEXT NOT NULL,
  path TEXT NOT NULL,
  post_id TEXT,
  article INTEGER NOT NULL,
  visitor_hash TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  source TEXT NOT NULL,
  UNIQUE(day,page_key,visitor_hash,bucket)
);
