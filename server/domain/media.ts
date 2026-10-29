import type { Bindings } from './types';
import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
/** Checks bytes as well as claimed MIME; SVG and executable documents are not image uploads.
 * @param bytes - Uploaded object. @returns The detected supported image MIME.
 */
export function imageMime(bytes: Uint8Array): string {
  const prefix = [...bytes.slice(0, 12)];
  if (prefix.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') return 'image/png';
  if (prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255) return 'image/jpeg';
  const text = new TextDecoder().decode(bytes.slice(0, 12));
  if (text.startsWith('GIF87a') || text.startsWith('GIF89a')) return 'image/gif';
  if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
  throw createError({ statusCode: 415, message: '支持 PNG、JPEG、GIF 和 WebP 图片。' });
}
/** @param env - Database and private object store. @param file - Bounded upload. @param postId - Optional owning draft. @returns Stable same-origin address. */
export async function storeImage(env: Bindings, file: File, postId?: string): Promise<string> {
  if (!file.size || file.size > 8 * 1024 * 1024) throw createError({ statusCode: 413, message: '图片不能超过 8 MB。' });
  if (postId && !await env.BLOG_DB.prepare("SELECT id FROM posts WHERE id=? AND status!='deleted'").bind(postId).first()) throw createError({ statusCode: 404, message: '草稿不存在。' });
  const bytes = new Uint8Array(await file.arrayBuffer()), mime = imageMime(bytes), id = uuid(), key = `images/${id}`;
  await env.BLOG_MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
  try { await env.BLOG_DB.prepare('INSERT INTO media(id,post_id,object_key,mime,size,original_name,created_at) VALUES(?,?,?,?,?,?,?)').bind(id, postId || null, key, mime, bytes.length, file.name.slice(0, 200), new Date().toISOString()).run(); }
  catch (error) { await env.BLOG_MEDIA.delete(key); throw error; }
  return `/media/${id}`;
}
