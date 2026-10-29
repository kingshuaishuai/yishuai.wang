import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import type { Bindings } from './types';
import type { Profile } from '../../shared/types';
import { imageMime } from './media';

/** @param id - Current avatar identity. @returns A same-origin public image address. */
export function avatarUrl(id: string | null | undefined): string | null { return id ? `/avatars/${id}` : null; }

/** @param env - Storage bindings. @param userId - Trusted user identity. @returns Public profile fields only. */
export async function profile(env: Bindings, userId: string): Promise<Profile> {
  const row = await env.BLOG_DB.prepare('SELECT avatar_id FROM users WHERE id=?').bind(userId).first<{ avatar_id: string | null }>();
  return { avatarUrl: avatarUrl(row?.avatar_id) };
}

/** @param env - Storage bindings. @param userId - Authenticated account, never a request field. @param bytes - Cropped raster, or null to restore initials. @returns Saved public avatar reference. */
export async function saveAvatar(env: Bindings, userId: string, bytes: Uint8Array | null): Promise<Profile> {
  const before = await env.BLOG_DB.prepare('SELECT avatar_id FROM users WHERE id=?').bind(userId).first<{ avatar_id: string | null }>();
  if (!before) throw createError({ statusCode: 401, message: '账户已失效，请重新登录。' });
  let id: string | null = null;
  if (bytes) {
    if (bytes.length > 1024 * 1024) throw createError({ statusCode: 413, message: '裁剪后的头像不能超过 1 MB。' });
    if (bytes.length < 32) throw createError({ statusCode: 415, message: '图片不完整，请重新选择。' });
    let mime: string;
    try { mime = imageMime(bytes); }
    catch { throw createError({ statusCode: 415, message: '头像支持 PNG、JPEG 和 WebP。' }); }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw createError({ statusCode: 415, message: '头像支持 PNG、JPEG 和 WebP。' });
    id = uuid();
    await env.BLOG_MEDIA.put(`avatars/${id}`, bytes, { httpMetadata: { contentType: mime } });
  }
  // Switch the reference only after storage succeeds. A concurrent change keeps
  // its newer image; unreferenced objects can never be served by the public route.
  try {
    const result = await env.BLOG_DB.prepare('UPDATE users SET avatar_id=?,updated_at=? WHERE id=? AND avatar_id IS ?')
      .bind(id, new Date().toISOString(), userId, before.avatar_id).run();
    if (!result.meta.changes) throw createError({ statusCode: 409, message: '头像已在其他页面更新，请刷新后重试。' });
  } catch (error) {
    if (id) await env.BLOG_MEDIA.delete(`avatars/${id}`);
    throw error;
  }
  if (before.avatar_id) await env.BLOG_MEDIA.delete(`avatars/${before.avatar_id}`).catch(() => {
    console.warn('旧头像对象未能清理，其公开地址已失效。');
  });
  return { avatarUrl: avatarUrl(id) };
}
