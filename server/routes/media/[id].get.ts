import { defineEventHandler, getRouterParam, createError, setHeader, sendStream } from 'h3';
export default defineEventHandler(async event => {
  const env = bindings(event), id = getRouterParam(event, 'id') || '';
  const media = await env.BLOG_DB.prepare('SELECT object_key,mime FROM media WHERE id=?').bind(id).first<{ object_key: string; mime: string }>();
  if (!media) throw createError({ statusCode: 404 });
  // Only visible content may disclose an image; retained client properties can
  // still contain an older cover after the author removes it from the post.
  const path = `/media/${id}`;
  const visible = await env.BLOG_DB.prepare("SELECT id FROM posts WHERE status='published' AND (instr(json_extract(published_json,'$.markdown'),?)>0 OR instr(json_extract(published_json,'$.source'),?)>0 OR instr(json_extract(published_json,'$.coverUrl'),?)>0) LIMIT 1").bind(path, path, path).first();
  if (!visible && !(await session(event))?.user.owner) throw createError({ statusCode: 404 });
  const object = await env.BLOG_MEDIA.get(media.object_key);
  if (!object) throw createError({ statusCode: 404 });
  setHeader(event, 'Content-Type', media.mime);
  setHeader(event, 'Content-Length', object.size);
  setHeader(event, 'Cache-Control', 'private, no-store');
  return sendStream(event, object.body as unknown as ReadableStream);
});
