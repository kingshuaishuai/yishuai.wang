ALTER TABLE posts ADD COLUMN translation_group TEXT;
UPDATE posts SET translation_group=id;
CREATE UNIQUE INDEX posts_translation_language ON posts(COALESCE(translation_group,id), COALESCE(json_extract(draft_json,'$.language'),'zh'));
CREATE INDEX posts_public_language ON posts(status, COALESCE(json_extract(published_json,'$.language'),'zh'), published_at);
