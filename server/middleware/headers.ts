import { defineEventHandler, getHeader, setHeader, createError } from 'h3';
/** Apply small-site defaults: current public data, private account responses and bounded writes. */
export default defineEventHandler(event => {
  if (event.path === '/') {
    const config = useRuntimeConfig(event);
    const links = [`<${siteOrigin(event)}/api/micropub>; rel="micropub"`];
    if (config.indieauthAuthorizationEndpoint) links.push(`<${config.indieauthAuthorizationEndpoint}>; rel="authorization_endpoint"`);
    if (config.indieauthTokenEndpoint) links.push(`<${config.indieauthTokenEndpoint}>; rel="token_endpoint"`);
    setHeader(event, 'Link', links.join(', '));
  }
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin');
  setHeader(event, 'X-Frame-Options', 'DENY');
  if (!event.path.startsWith('/_nuxt/') && !event.path.startsWith('/favicon')) setHeader(event, 'Cache-Control', 'private, no-store');
  if (Number(getHeader(event, 'content-length') ?? 0) > (event.path.includes('/media') ? 10 * 1024 * 1024 : 1024 * 1024)) throw createError({ statusCode: 413, message: '请求内容过大。' });
});
