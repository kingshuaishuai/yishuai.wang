import { defineEventHandler, getQuery, createError } from 'h3';
import { listPublic } from '../../domain/posts';
export default defineEventHandler(async event => {
  const q = getQuery(event), page = Number(q.page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw createError({ statusCode: 400, message: '页码无效。' });
  return listPublic(bindings(event).BLOG_DB, { kind: q.kind === 'note' ? 'note' : 'article', page, size: Math.min(50, Math.max(1, Math.floor(Number(q.size) || 12))),
    query: typeof q.q === 'string' ? q.q : '', category: typeof q.category === 'string' ? q.category : '' });
});
