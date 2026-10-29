import { defineEventHandler, getQuery, setCookie, sendRedirect, createError } from 'h3';
export default defineEventHandler(async event => {
  const config = useRuntimeConfig(event);
  if (!config.githubClientId || !config.githubClientSecret) throw createError({ statusCode: 503, message: 'GitHub 登录尚未配置。' });
  await rateLimit(event, 'login', 30, 600);
  const state = randomToken(), verifier = randomToken(), hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const db = bindings(event).BLOG_DB;
  await db.batch([db.prepare('DELETE FROM auth_codes WHERE expires_at<=?').bind(Date.now()), db.prepare("INSERT INTO auth_codes VALUES(?,'github',?,?,?)").bind(await digest(state), verifier, returnPath(getQuery(event).returnTo), Date.now()+600000)]);
  setCookie(event, 'yishuai_oauth', state, { httpOnly: true, secure: siteOrigin(event).startsWith('https:'), sameSite: 'lax', maxAge: 600, path: '/api/auth/github' });
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({ client_id: config.githubClientId, redirect_uri: `${siteOrigin(event)}/api/auth/github/callback`, state, scope: '', code_challenge: challenge, code_challenge_method: 'S256' }).toString();
  return sendRedirect(event, url.href);
});
