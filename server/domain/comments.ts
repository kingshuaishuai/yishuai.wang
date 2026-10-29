import type { D1Database } from '@cloudflare/workers-types';
import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import type { PublicComment } from '../../shared/types';
import { renderComment } from './content';
import { getPost } from './posts';
/** @param db - Database. @param postId - Public entry. @param ownerId - Configured author subject. @returns Approved discussion without private fields. */
export async function listComments(db: D1Database, postId: string, ownerId: string): Promise<PublicComment[]> {
  const post = await getPost(db, postId);
  if (post.status !== 'published') throw createError({ statusCode: 404, message: '内容未公开。' });
  const rows = await db.prepare("SELECT c.id,c.parent_id,c.user_id,c.author,c.html,c.created_at FROM comments c LEFT JOIN comments p ON p.id=c.parent_id WHERE c.post_id=? AND c.status='approved' AND (c.parent_id IS NULL OR p.status='approved') ORDER BY c.created_at,c.id LIMIT 200").bind(postId).all<{ id: string; parent_id: string | null; user_id: string | null; author: string; html: string; created_at: string }>();
  return rows.results.map(row => ({ id: row.id, parentId: row.parent_id, author: row.author, owner: row.user_id === ownerId, html: row.html, createdAt: row.created_at }));
}
/** @param db - Database. @param input - Validated comment with verified optional identity. @returns Receipt only; pending text stays private. */
export async function createComment(db: D1Database, input: { postId: string; parentId?: string; userId?: string; author: string; email?: string; markdown: string; requestKey: string }): Promise<{ id: string; status: 'pending' }> {
  const post = await getPost(db, input.postId);
  if (post.status !== 'published') throw createError({ statusCode: 404, message: '内容未公开。' });
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await db.prepare("SELECT id,parent_id FROM comments WHERE id=? AND post_id=? AND status='approved'").bind(input.parentId, input.postId).first<{ id: string; parent_id: string | null }>();
    if (!parent) throw createError({ statusCode: 400, message: '回复对象不存在或尚未公开。' });
    parentId = parent.parent_id || parent.id;
    const root = await db.prepare("SELECT id FROM comments WHERE id=? AND post_id=? AND status='approved'").bind(parentId, input.postId).first();
    if (!root) throw createError({ statusCode: 400, message: '这条讨论已隐藏。' });
  }
  const id = uuid();
  const prior = await db.prepare('SELECT id FROM comments WHERE request_key=? AND post_id=?').bind(input.requestKey, input.postId).first<{ id: string }>();
  if (prior) return { id: prior.id, status: 'pending' };
  await db.prepare("INSERT INTO comments(id,post_id,parent_id,user_id,author,email,markdown,html,request_key,created_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING")
    .bind(id, input.postId, parentId, input.userId ?? null, input.author, input.email || null, input.markdown, renderComment(input.markdown), input.requestKey, new Date().toISOString()).run();
  const stored = await db.prepare('SELECT id FROM comments WHERE request_key=? AND post_id=?').bind(input.requestKey, input.postId).first<{ id: string }>();
  if (!stored) throw createError({ statusCode: 409, message: '提交标识已用于其他评论。' });
  return { id: stored.id, status: 'pending' };
}
