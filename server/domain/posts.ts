import type { D1Database } from '@cloudflare/workers-types';
import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import type { Content, ContentLanguage, DraftPost, PublicPost, PublicPostSummary, PostPage, Translation } from '../../shared/types';
import type { PostRow, PublicSummaryRow } from './types';
import { postPath } from '../../shared/language';
import { normalizeContent, canPublish, renderContent } from './content';
import { publicSummary } from './ai/read';
import { publicViewCount } from './analytics/settings';

/** @param row - Private database row. @returns An owner-only draft projection. */
export function draftView(row: PostRow): DraftPost {
  return { coverUrl: '', language: 'zh', ...JSON.parse(row.draft_json), id: row.id, slug: row.slug, status: row.status, version: row.version, updatedAt: row.updated_at, publishedAt: row.published_at };
}
/** @param row - Published database row. @param translations - Public language versions only. @returns Public fields from the published snapshot only. */
export function publicView(row: PostRow, translations: Translation[] = []): PublicPost {
  const content = { language: 'zh', ...JSON.parse(row.published_json!) } as Content;
  return { ...content, coverUrl: content.coverUrl || '', properties: {}, id: row.id, slug: row.slug,
    url: postPath({ ...row, language: content.language }),
    publishedAt: row.published_at!, updatedAt: row.published_updated_at!, date: row.published_at!.slice(0,10).replaceAll('-', '.'),
    html: renderContent(content), headings: [], translations };
}
/** @param row - Published list fields only. @returns A small entry for lists and timelines. */
function summaryView(row: PublicSummaryRow): PublicPostSummary {
  return { id: row.id, slug: row.slug, kind: row.kind, language: row.language, title: row.title, summary: row.summary, coverUrl: row.coverUrl || '', category: row.category, tags: JSON.parse(row.tags),
    url: postPath(row), publishedAt: row.published_at!, updatedAt: row.published_updated_at!, date: row.published_at!.slice(0, 10).replaceAll('-', '.') };
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
  const related = await db.prepare("SELECT id,slug,kind,COALESCE(json_extract(published_json,'$.language'),'zh') AS language FROM posts WHERE COALESCE(translation_group,id)=? AND status='published' AND published_json IS NOT NULL ORDER BY language").bind(row.translation_group || row.id).all<PublicSummaryRow>();
  return { ...publicView(row, related.results.map(item => ({ language: item.language, url: postPath(item) }))), aiSummary: await publicSummary(db, row),
    viewCount: kind === 'article' ? await publicViewCount(db, row.id) : undefined };
}
/** @param db - D1 binding. @param options - Bounded public list filters. @returns Public pagination without draft fields. */
export async function listPublic(db: D1Database, options: { kind?: 'article' | 'note'; page?: number; size?: number; query?: string; category?: string; language?: ContentLanguage | 'all' } = {}): Promise<PostPage> {
  const page = Math.max(1, options.page ?? 1), size = Math.min(100, Math.max(1, options.size ?? 12));
  const clauses = ["status='published'", 'published_json IS NOT NULL']; const values: (string | number)[] = [];
  if (options.language && options.language !== 'all') { clauses.push("COALESCE(json_extract(published_json,'$.language'),'zh')=?"); values.push(options.language); }
  if (options.kind) { clauses.push('kind=?'); values.push(options.kind); }
  if (options.category) { clauses.push("json_extract(published_json,'$.category')=?"); values.push(options.category); }
  if (options.query) { clauses.push("(instr(lower(json_extract(published_json,'$.title')),lower(?))>0 OR instr(lower(json_extract(published_json,'$.summary')),lower(?))>0)"); values.push(options.query.slice(0,100), options.query.slice(0,100)); }
  const where = clauses.join(' AND ');
  const count = await db.prepare(`SELECT count(*) AS total FROM posts WHERE ${where}`).bind(...values).first<{ total: number }>();
  const rows = await db.prepare(`SELECT id,slug,kind,published_at,published_updated_at,COALESCE(json_extract(published_json,'$.language'),'zh') AS language,
    json_extract(published_json,'$.title') AS title,json_extract(published_json,'$.summary') AS summary,
    json_extract(published_json,'$.coverUrl') AS coverUrl,json_extract(published_json,'$.category') AS category,json_extract(published_json,'$.tags') AS tags
    FROM posts WHERE ${where} ORDER BY published_at DESC,id LIMIT ? OFFSET ?`).bind(...values, size, (page - 1) * size).all<PublicSummaryRow>();
  return { items: rows.results.map(summaryView), page, pages: Math.max(1, Math.ceil((count?.total ?? 0) / size)), total: count?.total ?? 0 };
}
/** @param db - D1 binding. @returns All published snapshots for indexes and backups, ordered deterministically. */
export async function allPublic(db: D1Database): Promise<PublicPost[]> {
  const rows = await db.prepare("SELECT * FROM posts WHERE status='published' AND published_json IS NOT NULL ORDER BY published_at DESC,id").all<PostRow>();
  const groups = new Map<string, Translation[]>();
  const posts = rows.results.map(row => {
    const post = publicView(row), group = row.translation_group || row.id;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ language: post.language, url: post.url });
    return post;
  });
  return posts.map((post, index) => ({ ...post, translations: groups.get(rows.results[index]!.translation_group || post.id)!.sort((a, b) => a.language.localeCompare(b.language)) }));
}
/** @param db - D1 binding. @param authorId - Verified author. @param input - Normalized content. @param slug - Optional stable route. @param translationGroup - Internal identity of a linked version family. @returns Persisted draft. */
export async function createPost(db: D1Database, authorId: string, input: Content, slug?: string, translationGroup?: string): Promise<DraftPost> {
  const content = normalizeContent(input), id = uuid(), now = new Date().toISOString();
  const path = slug || id;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) || path.length > 120) throw createError({ statusCode: 400, message: '地址仅支持小写字母、数字和连字符。' });
  try { await db.prepare("INSERT INTO posts(id,slug,kind,status,draft_json,author_id,created_at,updated_at,translation_group) VALUES(?,?,?,'draft',?,?,?,?,?)").bind(id, path, content.kind, JSON.stringify(content), authorId, now, now, translationGroup || id).run(); }
  catch (error) { if (String(error).includes('UNIQUE')) throw createError({ statusCode: 409, message: '这个文章地址已被使用。' }); throw error; }
  return draftView(await getPost(db, id));
}
/** @param db - D1 binding. @param id - Entry ID. @param version - Version the editor last read. @param input - New draft. @returns Updated draft; public snapshot remains untouched. */
export async function savePost(db: D1Database, id: string, version: number, input: Content): Promise<DraftPost> {
  const content = normalizeContent(input), before = await getPost(db, id);
  assertPermanentIdentity(before, content);
  const sibling = await db.prepare('SELECT id FROM posts WHERE COALESCE(translation_group,id)=? AND id!=?').bind(before.translation_group || before.id, id).first();
  if (sibling && (before.kind !== content.kind || draftView(before).language !== content.language)) throw createError({ statusCode: 409, message: '已关联的版本不能更改类型或语言。' });
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

/** @param db - D1 binding. @param id - Explicitly confirmed entry. @param version - Revision reviewed by the author. */
export async function permanentlyDeletePost(db: D1Database, id: string, version: number): Promise<void> {
  // Every statement shares the revision guard inside one transaction, so stale requests leave all related data intact.
  const revision = 'EXISTS (SELECT 1 FROM posts WHERE id=? AND version=?)';
  const results = await db.batch([
    db.prepare(`DELETE FROM comments WHERE post_id=? AND ${revision}`).bind(id, id, version),
    db.prepare(`DELETE FROM ai_summaries WHERE post_id=? AND ${revision}`).bind(id, id, version),
    // Images can be referenced by other posts and translations. Detach ownership; public access still requires a published reference.
    db.prepare(`UPDATE media SET post_id=NULL WHERE post_id=? AND ${revision}`).bind(id, id, version),
    db.prepare('DELETE FROM posts WHERE id=? AND version=?').bind(id, version),
  ]);
  if (!results.at(-1)?.meta.changes) {
    await getPost(db, id);
    throw createError({ statusCode: 409, message: '内容已更新，请关闭弹窗并重新确认要删除的内容。' });
  }
}

/** @param before - Stored identity. @param content - Proposed draft. */
export function assertPermanentIdentity(before: PostRow, content: Content): void {
  const language = JSON.parse(before.published_json || before.draft_json).language || 'zh';
  if (before.published_at && (before.kind !== content.kind || language !== content.language)) throw createError({ statusCode: 409, message: '已发布内容不能改变类型、语言和永久地址。' });
}
