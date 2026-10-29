import { getCookie, setCookie, deleteCookie, createError, getHeader, type H3Event } from 'h3';
import type { Session } from '../../shared/types';
import { bindings } from './bindings';
import { digest, randomToken, requireOrigin } from './security';
import { siteOrigin } from './config';
const cookieName = 'yishuai_session';
/** @param event - Request with an optional opaque session cookie. @returns Verified current user or null. */
export async function session(event: H3Event): Promise<Session | null> {
  const token = getCookie(event, cookieName);
  if (!token) return null;
  const row = await bindings(event).BLOG_DB.prepare('SELECT u.id,u.login,u.name,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token), Date.now()).first<{ id: string; login: string; name: string; csrf: string }>();
  if (!row) return null;
  return { user: { id: row.id, login: row.login, name: row.name, owner: row.id === String(useRuntimeConfig(event).ownerGithubId) }, csrf: row.csrf };
}
/** @param event - Request. @param write - Require origin and CSRF checks for browser writes. @returns Author session. */
export async function requireOwner(event: H3Event, write = false): Promise<Session> {
  const current = await session(event);
  if (!current) throw createError({ statusCode: 401, message: '请先登录。' });
  if (!current.user.owner) throw createError({ statusCode: 403, message: '只有作者可以修改内容。' });
  if (write) { requireOrigin(event, siteOrigin(event)); if (getHeader(event, 'x-csrf-token') !== current.csrf) throw createError({ statusCode: 403, message: '会话校验失败，请刷新页面。' }); }
  return current;
}
/** @param event - Login callback. @param userId - Authenticated provider subject. */
export async function issueSession(event: H3Event, userId: string): Promise<void> {
  const db = bindings(event).BLOG_DB, token = randomToken();
  const previous = getCookie(event, cookieName);
  if (previous) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(previous)).run();
  await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(Date.now()),
    db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').bind(await digest(token), userId, randomToken(), Date.now() + 7 * 86400000)]);
  setCookie(event, cookieName, token, { httpOnly: true, secure: siteOrigin(event).startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 7 * 86400 });
}
/** @param event - Authenticated same-origin logout request. */
export async function revokeSession(event: H3Event): Promise<void> {
  requireOrigin(event, siteOrigin(event));
  const current = await session(event);
  if (current && getHeader(event, 'x-csrf-token') !== current.csrf) throw createError({ statusCode: 403, message: '会话校验失败。' });
  const token = getCookie(event, cookieName);
  if (token) await bindings(event).BLOG_DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();
  deleteCookie(event, cookieName, { path: '/' });
}
