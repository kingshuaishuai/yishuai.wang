import type { D1Database } from '@cloudflare/workers-types';
import { defaultCategories, defaultTags } from '../../shared/content-options';
import type { ContentOptions } from '../../shared/types';

/** @param db - Author content database. @returns Bounded reusable choices from live drafts and published snapshots. */
export async function contentOptions(db: D1Database): Promise<ContentOptions> {
  const [categories, tags] = await Promise.all([
    db.prepare("SELECT DISTINCT json_extract(draft_json,'$.category') AS value FROM posts WHERE status!='deleted' UNION SELECT json_extract(published_json,'$.category') AS value FROM posts WHERE status='published' ORDER BY value LIMIT 200").all<{ value: string | null }>(),
    db.prepare("SELECT DISTINCT j.value FROM posts,json_each(posts.draft_json,'$.tags') j WHERE posts.status!='deleted' AND j.type='text' UNION SELECT j.value FROM posts,json_each(posts.published_json,'$.tags') j WHERE posts.status='published' AND j.type='text' ORDER BY value LIMIT 200").all<{ value: string | null }>(),
  ]);
  return {
    categories: [...new Set([...defaultCategories, ...categories.results.map(row => row.value).filter((value): value is string => !!value)])],
    tags: [...new Set([...defaultTags, ...tags.results.map(row => row.value).filter((value): value is string => !!value)])],
  };
}
