import { defineEventHandler } from 'h3';
import type { ManagedComment } from '../../../../shared/types';
export default defineEventHandler(async event => {
  await requireOwner(event);
  const db = bindings(event).BLOG_DB, page = pageNumber(event), size = 20;
  const count = await db.prepare('SELECT count(*) AS total FROM comments').first<{ total: number }>();
  const rows = await db.prepare("SELECT c.id,c.post_id AS postId,c.author,c.html,c.status,c.created_at AS createdAt,json_extract(p.draft_json,'$.title') AS postTitle FROM comments c JOIN posts p ON p.id=c.post_id ORDER BY c.created_at DESC,c.id LIMIT ? OFFSET ?").bind(size, (page - 1) * size).all<ManagedComment>();
  return { items: rows.results, page, pages: Math.max(1, Math.ceil((count?.total ?? 0) / size)), total: count?.total ?? 0 };
});
