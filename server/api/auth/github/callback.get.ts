import { defineEventHandler, getQuery, getCookie, deleteCookie, sendRedirect, createError } from 'h3';
import { z } from 'zod';
export default defineEventHandler(async event => {
  const q = getQuery(event), state = getCookie(event, 'yishuai_oauth');
  deleteCookie(event, 'yishuai_oauth', { path: '/api/auth/github' });
  if (q.error) return sendRedirect(event, '/login?error=cancelled');
  if (!state || q.state !== state || typeof q.code !== 'string') throw createError({ statusCode: 400, message: '登录请求已过期，请重新登录。' });
  const db = bindings(event).BLOG_DB;
  const attempt = await db.prepare("DELETE FROM auth_codes WHERE token_hash=? AND kind='github' AND expires_at>? RETURNING verifier,return_to").bind(await digest(state), Date.now()).first<{ verifier: string; return_to: string }>();
  if (!attempt) throw createError({ statusCode: 400, message: '登录请求已使用或过期。' });
  const config = useRuntimeConfig(event);
  let profile: { id: number; login: string; name: string | null };
  try {
  const token = await $fetch<{ access_token?: string }>('https://github.com/login/oauth/access_token', { method: 'POST', timeout: 15000, headers: { Accept: 'application/json' }, body: { client_id: config.githubClientId, client_secret: config.githubClientSecret, code: q.code, code_verifier: attempt.verifier, redirect_uri: `${siteOrigin(event)}/api/auth/github/callback` } });
  if (!token.access_token) throw createError({ statusCode: 401, message: 'GitHub 未能完成登录，请重试。' });
  profile = z.object({ id: z.number().int().positive(), login: z.string().max(100), name: z.string().max(200).nullable() }).parse(await $fetch('https://api.github.com/user', { timeout: 15000, headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'yishuai.wang' } }));
  } catch { throw createError({ statusCode: 502, message: 'GitHub 登录暂时未能完成，请重新登录。' }); }
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET login=excluded.login,name=excluded.name,updated_at=excluded.updated_at').bind(String(profile.id), profile.login, profile.name || profile.login, now, now).run();
  await issueSession(event, String(profile.id));
  return sendRedirect(event, returnPath(attempt.return_to));
});
