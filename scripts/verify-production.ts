import assert from 'node:assert/strict';
import { request } from 'node:https';
import { isIP } from 'node:net';

const origin = new URL(process.env.BLOG_VERIFY_ORIGIN || 'https://yishuai.wang').origin;
const address = process.env.BLOG_VERIFY_ADDRESS;
if (address) assert.ok(isIP(address), 'BLOG_VERIFY_ADDRESS must be an IP from a trusted DNS lookup');

/**
 * Resolve only this verification request while keeping the original HTTPS host and certificate checks.
 * @param path - Relative production route.
 * @returns Response without following redirects or sending cookies.
 */
function resolvedResponse(path: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(origin + path, {
      autoSelectFamily: false,
      lookup: (_hostname, _options, callback) => callback(null, address!, isIP(address!)),
    }, incoming => {
      const chunks: Buffer[] = [];
      incoming.on('data', chunk => chunks.push(Buffer.from(chunk)));
      incoming.on('error', reject);
      incoming.on('end', () => {
        const headers = new Headers();
        for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
          headers.append(incoming.rawHeaders[index]!, incoming.rawHeaders[index + 1]!);
        }
        resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers }));
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error(`Verification timed out: ${path}`)));
    req.end();
  });
}

/**
 * Check a deployed route without following redirects or sending a session cookie.
 * @param path - Route relative to the deployed site.
 * @param status - Expected HTTP status.
 * @returns The response for further checks.
 */
async function response(path: string, status = 200): Promise<Response> {
  const result = address ? await resolvedResponse(path) : await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(result.status, status, path);
  return result;
}

// Fresh production databases are valid; this check never creates demonstration content.
for (const path of ['/', '/articles', '/life', '/projects', '/about', '/en', '/en/articles', '/en/life', '/en/projects', '/en/about']) {
  const result = await response(path);
  const html = await result.text();
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: SSR heading`);
  assert.ok(html.includes(`href="${origin}${path}"`), `${path}: canonical origin`);
  assert.doesNotMatch(html, /127\.0\.0\.1:3288/, `${path}: no development URL`);
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.match(html, path.startsWith('/en') ? /<html[^>]*lang="en"/ : /<html[^>]*lang="zh-CN"/);
  assert.match(html, /hreflang="en"/);
  assert.match(html, /hreflang="zh-CN"/);
  if (path === '/') assert.match(result.headers.get('link') || '', /rel="micropub"/);
}

const robots = await (await response('/robots.txt')).text();
assert.match(robots, /^Allow: \/$/m);
assert.doesNotMatch(robots, /^Disallow: \/$/m);
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok((await (await response('/sitemap.xml')).text()).includes(`<loc>${origin}/</loc>`));
for (const path of ['/feed.xml', '/life/feed.xml', '/en/feed.xml', '/en/life/feed.xml', '/feed.xml?lang=all']) {
  assert.match(await (await response(path)).text(), /<rss version="2.0"/);
}
assert.ok((await (await response('/llms.txt')).text()).includes(origin));
assert.equal((await (await response('/api/auth/status')).json()).github, true);
await response('/api/owner/posts', 401);
await response('/api/owner/taxonomy', 401);
await response('/api/owner/publishing', 401);
await response('/api/micropub?q=config', 401);
await response('/articles/no-such-deployment-check', 404);
for (const path of ['/manage', '/account', '/write', '/en/manage', '/en/account', '/en/write']) {
  const result = await response(path, 302);
  assert.match(result.headers.get('location') || '', /\/login/);
  assert.match(result.headers.get('x-robots-tag') || '', /noindex/);
}

console.log('生产只读验收通过：中英文 SSR、正式域名、hreflang、SEO、双语 RSS、llms.txt、登录配置与访客权限。');
