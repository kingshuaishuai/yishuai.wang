import assert from 'node:assert/strict';

const origin = process.env.BLOG_VERIFY_ORIGIN || 'http://127.0.0.1:3288';
/** @param path - Local application route. @param status - Expected HTTP status. @returns Unconsumed response. */
async function response(path: string, status = 200): Promise<Response> {
  const result = await fetch(origin + path, { redirect: 'manual' });
  assert.equal(result.status, status, path); return result;
}
const home = await (await response('/')).text();
assert.equal((home.match(/<h1\b/g) || []).length, 1);
assert.match(home, /rel="canonical"/);
assert.doesNotMatch(home.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), /href="\/manage"/);
const article = await (await response('/articles/reading-and-writing')).text();
const semantic = article.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
assert.match(semantic, /先让内容站稳/);
assert.equal((semantic.match(/<h1\b/g) || []).length, 1);
assert.match(article, /application\/ld\+json/);
assert.match(article, /property="og:title"/);
assert.match(await (await response('/articles/reading-and-writing.md')).text(), /先让内容站稳/);
assert.match(await (await response('/feed.xml')).text(), /<rss version="2.0"/);
assert.match(await (await response('/sitemap.xml')).text(), /\/articles\/reading-and-writing/);
assert.match(await (await response('/llms.txt')).text(), /reading-and-writing\.md/);
await response('/articles/no-such-article', 404);
await response('/api/owner/posts', 401);
await response('/api/micropub?q=config', 401);
assert.match((await response('/manage', 302)).headers.get('location') || '', /\/login/);
const preflight = await fetch(origin + '/api/micropub', { method: 'OPTIONS', headers: { Origin: 'https://writer.example', 'Access-Control-Request-Headers': 'Authorization' } });
assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
console.log('HTTP 验收通过：SSR 正文、SEO、订阅、文本输出、访客权限与 Micropub 跨域。');
