import assert from 'node:assert/strict';

const origin = new URL(process.env.BLOG_VERIFY_ORIGIN || 'https://yishuai.wang').origin;

/**
 * Check a deployed route without following redirects or sending a session cookie.
 * @param path - Route relative to the deployed site.
 * @param status - Expected HTTP status.
 * @returns The response for further checks.
 */
async function response(path: string, status = 200): Promise<Response> {
  const result = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(result.status, status, path);
  return result;
}

// Fresh production databases are valid; this check never creates demonstration content.
for (const path of ['/', '/articles', '/life', '/projects', '/about']) {
  const result = await response(path);
  const html = await result.text();
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: SSR heading`);
  assert.ok(html.includes(`href="${origin}${path}"`), `${path}: canonical origin`);
  assert.doesNotMatch(html, /127\.0\.0\.1:3288/, `${path}: no development URL`);
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
}

const robots = await (await response('/robots.txt')).text();
assert.match(robots, /^Allow: \/$/m);
assert.doesNotMatch(robots, /^Disallow: \/$/m);
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok((await (await response('/sitemap.xml')).text()).includes(`<loc>${origin}/</loc>`));
for (const path of ['/feed.xml', '/life/feed.xml']) {
  assert.match(await (await response(path)).text(), /<rss version="2.0"/);
}
assert.ok((await (await response('/llms.txt')).text()).includes(origin));
assert.equal((await (await response('/api/auth/status')).json()).github, true);
await response('/api/owner/posts', 401);
await response('/api/owner/taxonomy', 401);
await response('/api/micropub?q=config', 401);
await response('/articles/no-such-deployment-check', 404);
for (const path of ['/manage', '/account', '/write']) {
  const result = await response(path, 302);
  assert.match(result.headers.get('location') || '', /\/login/);
  assert.match(result.headers.get('x-robots-tag') || '', /noindex/);
}

console.log('生产只读验收通过：SSR、正式域名、SEO、RSS、llms.txt、登录配置与访客权限。');
