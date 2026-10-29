import type { D1Database } from '@cloudflare/workers-types';
import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import type { Content, DraftPost, PublicPost, PublicPostSummary, PostPage } from '../../shared/types';
import type { PostRow, PublicSummaryRow } from './types';
import { normalizeContent, canPublish, renderContent } from './content';

/** @param row - Private database row. @returns An owner-only draft projection. */
export function draftView(row: PostRow): DraftPost {
  return { ...JSON.parse(row.draft_json), id: row.id, slug: row.slug, status: row.status, version: row.version, updatedAt: row.updated_at, publishedAt: row.published_at };
}
/** @param row - Published database row. @returns Public fields from the published snapshot only. */
export function publicView(row: PostRow): PublicPost {
  const content = JSON.parse(row.published_json!) as Content;
  return { ...content, properties: {}, id: row.id, slug: row.slug,
    url: content.kind === 'article' ? `/articles/${row.slug}` : `/life/${row.id}`,
    publishedAt: row.published_at!, updatedAt: row.published_updated_at!, date: row.published_at!.slice(0,10).replaceAll('-', '.'),
    html: renderContent(content), headings: [] };
}
/** @param row - Published list fields only. @returns A small entry for lists and timelines. */
function summaryView(row: PublicSummaryRow): PublicPostSummary {
  return { id: row.id, slug: row.slug, kind: row.kind, title: row.title, summary: row.summary, category: row.category, tags: JSON.parse(row.tags),
    url: row.kind === 'article' ? `/articles/${row.slug}` : `/life/${row.id}`, publishedAt: row.published_at!, updatedAt: row.published_updated_at!, date: row.published_at!.slice(0, 10).replaceAll('-', '.') };
}
/** @param db - D1 binding. @param id - Stable entry identity. @returns Private entry or a real 404. */
export async function getPost(db: D1Database, id: string): Promise<PostRow> {
  const row = await db.prepare('SELECT * FROM posts WHERE id=?').bind(id).first<PostRow>();
  if (!row) throw createError({ statusCode: 404, message: '没有找到这篇内容。' });
  return row;
}
/** @param db - D1 binding. @param identity - Slug or note ID. @param kind - Public content type. @returns Current public snapshot. */
export async function getPublicPost(db: D1Database, identity: string, kind: 'article' | 'note' = 'article'): Promise<PublicPost> {
  const row = await db.prepare(`SELECT * FROM posts WHERE ${kind === 'article' ? 'slug' : 'id'}=? AND kind=?`).bind(identity, kind).first<PostRow>();
  if (!row || row.status !== 'published' || !row.published_json) throw createError({ statusCode: row?.status === 'deleted' && row.published_at ? 410 : 404, message: '这篇内容暂未公开。' });
  return publicView(row);
}
/** @param db - D1 binding. @param options - Bounded public list filters. @returns Public pagination without draft fields. */
export async function listPublic(db: D1Database, options: { kind?: 'article' | 'note'; page?: number; size?: number; query?: string; category?: string } = {}): Promise<PostPage> {
  const page = Math.max(1, options.page ?? 1), size = Math.min(100, Math.max(1, options.size ?? 12));
  const clauses = ["status='published'", 'published_json IS NOT NULL']; const values: (string | number)[] = [];
  if (options.kind) { clauses.push('kind=?'); values.push(options.kind); }
  if (options.category) { clauses.push("json_extract(published_json,'$.category')=?"); values.push(options.category); }
  if (options.query) { clauses.push("(instr(lower(json_extract(published_json,'$.title')),lower(?))>0 OR instr(lower(json_extract(published_json,'$.summary')),lower(?))>0)"); values.push(options.query.slice(0,100), options.query.slice(0,100)); }
  const where = clauses.join(' AND ');
  const count = await db.prepare(`SELECT count(*) AS total FROM posts WHERE ${where}`).bind(...values).first<{ total: number }>();
  const rows = await db.prepare(`SELECT id,slug,kind,published_at,published_updated_at,
    json_extract(published_json,'$.title') AS title,json_extract(published_json,'$.summary') AS summary,
    json_extract(published_json,'$.category') AS category,json_extract(published_json,'$.tags') AS tags
    FROM posts WHERE ${where} ORDER BY published_at DESC,id LIMIT ? OFFSET ?`).bind(...values, size, (page - 1) * size).all<PublicSummaryRow>();
  return { items: rows.results.map(summaryView), page, pages: Math.max(1, Math.ceil((count?.total ?? 0) / size)), total: count?.total ?? 0 };
}
/** @param db - D1 binding. @returns All published snapshots for indexes and backups, ordered deterministically. */
export async function allPublic(db: D1Database): Promise<PublicPost[]> {
  const rows = await db.prepare("SELECT * FROM posts WHERE status='published' AND published_json IS NOT NULL ORDER BY published_at DESC,id").all<PostRow>();
  return rows.results.map(publicView);
}
/** @param db - D1 binding. @param authorId - Verified author. @param input - Normalized content. @param slug - Optional stable route. @returns Persisted draft. */
export async function createPost(db: D1Database, authorId: string, input: Content, slug?: string): Promise<DraftPost> {
  const content = normalizeContent(input), id = uuid(), now = new Date().toISOString();
  const path = slug || id;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) || path.length > 120) throw createError({ statusCode: 400, message: '地址仅支持小写字母、数字和连字符。' });
  try { await db.prepare("INSERT INTO posts(id,slug,kind,status,draft_json,author_id,created_at,updated_at) VALUES(?,?,?,'draft',?,?,?,?)").bind(id, path, content.kind, JSON.stringify(content), authorId, now, now).run(); }
  catch (error) { if (String(error).includes('UNIQUE')) throw createError({ statusCode: 409, message: '这个文章地址已被使用。' }); throw error; }
  return draftView(await getPost(db, id));
}
/** @param db - D1 binding. @param id - Entry ID. @param version - Version the editor last read. @param input - New draft. @returns Updated draft; public snapshot remains untouched. */
export async function savePost(db: D1Database, id: string, version: number, input: Content): Promise<DraftPost> {
  const content = normalizeContent(input), before = await getPost(db, id);
  if (before.published_at && before.kind !== content.kind) throw createError({ statusCode: 409, message: '已发布内容不能改变类型和永久地址。' });
  const result = await db.prepare("UPDATE posts SET draft_json=?,kind=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status!='deleted'")
    .bind(JSON.stringify(content), content.kind, new Date().toISOString(), id, version).run();
  if (!result.meta.changes) throw createError({ statusCode: 409, message: '内容已在别处更新。你的输入已保留，请重新载入后比较。' });
  return draftView(await getPost(db, id));
}
/** @param db - D1 binding. @param id - Entry ID. @param version - Expected revision. @param action - Visibility transition. @returns Owner projection after one atomic update. */
export async function transitionPost(db: D1Database, id: string, version: number, action: 'publish' | 'unpublish' | 'delete' | 'restore'): Promise<DraftPost> {
  const before = await getPost(db, id), content = JSON.parse(before.draft_json) as Content;
  if (before.version !== version) throw createError({ statusCode: 409, message: '内容已更新，请重新载入。' });
  if (action === 'publish' && (!canPublish(content) || before.status === 'deleted')) throw createError({ statusCode: 400, message: '发布前请填写正文和文章标题。' });
  if ((action === 'restore') !== (before.status === 'deleted')) throw createError({ statusCode: 409, message: '当前状态不支持这个操作。' });
  const now = new Date().toISOString();
  const assignments: Record<typeof action, string> = {
    publish: "status='published',published_json=draft_json,published_at=COALESCE(published_at,?),published_updated_at=?",
    unpublish: "status='draft'", delete: "deleted_from=status,status='deleted'", restore: "status=COALESCE(deleted_from,'draft'),deleted_from=NULL",
  };
  const values = action === 'publish' ? [now, before.published_json === before.draft_json ? before.published_updated_at ?? now : now] : [];
  const result = await db.prepare(`UPDATE posts SET ${assignments[action]},version=version+1,updated_at=? WHERE id=? AND version=?`).bind(...values, now, id, version).run();
  if (!result.meta.changes) throw createError({ statusCode: 409, message: '内容已更新，请重新载入。' });
  return draftView(await getPost(db, id));
}
