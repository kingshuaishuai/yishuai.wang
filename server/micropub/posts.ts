import type { D1Database } from '@cloudflare/workers-types';
import type { PostRow } from '../domain/types';
import type { Content, DraftPost } from '../../shared/types';
import { mpError } from './errors';
import { draftView, getPost } from '../domain/posts';
import { canPublish } from '../domain/content';
/** @param db - Database. @param value - Client supplied entry URL. @param origin - Trusted site origin. @returns Private row addressed by a canonical local URL only. */
export async function postFromUrl(db: D1Database, value: unknown, origin: string): Promise<PostRow> {
  if (typeof value !== 'string') throw mpError(400, 'A post URL is required.');
  let url: URL; try { url = new URL(value); } catch { throw mpError(400, 'Invalid post URL.'); }
  if (url.origin !== origin || url.search || url.hash || url.username || url.password) throw mpError(400, 'URL must identify a post on this website.');
  const match = /^\/(articles|life)\/([a-z0-9-]+)$/.exec(url.pathname);
  if (!match) throw mpError(400, 'Invalid post URL.');
  const row = await db.prepare(`SELECT * FROM posts WHERE ${match[1] === 'articles' ? 'slug' : 'id'}=? AND kind=?`).bind(match[2], match[1] === 'articles' ? 'article' : 'note').first<PostRow>();
  if (!row) throw mpError(404, 'Post not found.');
  return row;
}
/** Atomically advances both snapshots for a Micropub update, or only the draft when requested.
 * @param db - Database. @param before - Optimistic base. @param content - Validated next content. @param publish - Requested visibility. @returns Owner projection.
 */
export async function updatePost(db: D1Database, before: PostRow, content: Content, publish: boolean): Promise<DraftPost> {
  if (before.status === 'deleted') throw mpError(409, 'Restore this post before updating it.');
  if (publish && before.status === 'published' && before.draft_json !== before.published_json) throw mpError(409, 'This post has unpublished web-editor changes. Save as draft or resolve them before publishing.');
  if (publish && !canPublish(content)) throw mpError(400, 'Content and an article title are required.');
  const json = JSON.stringify(content), now = new Date().toISOString();
  const sql = publish ? "draft_json=?,published_json=?,status='published',published_at=COALESCE(published_at,?),published_updated_at=?" : "draft_json=?,status='draft'";
  const values = publish ? [json, json, now, before.published_json === json ? before.published_updated_at || now : now] : [json];
  const result = await db.prepare(`UPDATE posts SET ${sql},version=version+1,updated_at=? WHERE id=? AND version=?`).bind(...values, now, before.id, before.version).run();
  if (!result.meta.changes) throw mpError(409, 'The post changed. Read the source and retry.');
  return draftView(await getPost(db, before.id));
}
