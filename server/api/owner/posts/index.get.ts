import { defineEventHandler } from 'h3';
import type { ManagedPost } from '../../../../shared/types';
export default defineEventHandler(async event => {
  await requireOwner(event); const db = bindings(event).BLOG_DB, page = pageNumber(event), size = 20;
  const count = await db.prepare('SELECT count(*) AS total FROM posts').first<{ total: number }>();
  const rows = await db.prepare("SELECT id,slug,kind,status,version,updated_at AS updatedAt,json_extract(draft_json,'$.title') AS title,json_extract(draft_json,'$.summary') AS summary FROM posts ORDER BY updated_at DESC,id LIMIT ? OFFSET ?").bind(size, (page - 1) * size).all<ManagedPost>();
  return { items: rows.results, page, pages: Math.max(1, Math.ceil((count?.total ?? 0) / size)), total: count?.total ?? 0 };
});
