import { createError, defineEventHandler, getRouterParam, sendStream, setHeaders } from 'h3';

export default defineEventHandler(async event => {
  const env = bindings(event), id = getRouterParam(event, 'id') || '';
  const active = await env.BLOG_DB.prepare('SELECT id FROM users WHERE avatar_id=?').bind(id).first();
  if (!active) throw createError({ statusCode: 404 });
  const object = await env.BLOG_MEDIA.get(`avatars/${id}`);
  if (!object) throw createError({ statusCode: 404 });
  setHeaders(event, { 'Content-Type': object.httpMetadata?.contentType || 'image/png', 'Content-Length': object.size, 'Cache-Control': 'private, no-store' });
  return sendStream(event, object.body as unknown as ReadableStream);
});
