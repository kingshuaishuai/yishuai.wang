import { defineEventHandler, getRouterParam, createError } from 'h3';
import { z } from 'zod';
export default defineEventHandler(async event => {
  await requireOwner(event, true); const input = await body(event, z.object({ status: z.enum(['approved','hidden']) }));
  const result = await bindings(event).BLOG_DB.prepare('UPDATE comments SET status=? WHERE id=?').bind(input.status, getRouterParam(event, 'id')!).run();
  if (!result.meta.changes) throw createError({ statusCode: 404, message: '评论不存在。' });
  return { ok: true };
});
