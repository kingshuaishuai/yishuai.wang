ALTER TABLE users ADD COLUMN avatar_id TEXT;
CREATE UNIQUE INDEX users_avatar ON users(avatar_id) WHERE avatar_id IS NOT NULL;
