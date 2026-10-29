import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, defineEventHandler, toNodeListener, getQuery } from 'h3';
import { issueSession, session, requireOwner, revokeSession } from '../server/utils/session';
import { readBytes } from '../server/utils/bytes';
import micropubCors from '../server/middleware/micropub-cors';
import ownerPosts from '../server/api/owner/posts/index.get';
import ownerComments from '../server/api/owner/comments/index.get';
import { bindings } from '../server/utils/bindings';
import { pageNumber } from '../server/utils/pagination';
import { createPost, transitionPost } from '../server/domain/posts';
import { normalizeContent } from '../server/domain/content';
import { createComment } from '../server/domain/comments';
import { v4 as uuid } from 'uuid';
import type { Bindings } from '../server/domain/types';
let platform: PlatformProxy<Bindings>, server: Server, origin: string;
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    const schema = await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8');
    for (const sql of schema.split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  for (const id of ['owner', 'reader']) await platform.env.BLOG_DB.prepare('INSERT INTO users VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
  const app = createApp({ debug: false });
  app.use(micropubCors);
  app.use(defineEventHandler(async event => {
    event.context.cloudflare = { env: platform.env };
    if (event.path.startsWith('/test-login')) { await issueSession(event, String(getQuery(event).user)); return { ok: true }; }
    if (event.path === '/owner') { await requireOwner(event, event.method === 'POST'); return { allowed: true }; }
    if (event.path === '/logout') { await revokeSession(event); return { ok: true }; }
    if (event.path === '/body') return { length: (await readBytes(event, 32)).length };
    if (event.path.startsWith('/posts')) return ownerPosts(event);
    if (event.path.startsWith('/comments')) return ownerComments(event);
    return session(event);
  }));
  server = createServer(toNodeListener(app)); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'owner', public: { siteUrl: origin } }));
  vi.stubGlobal('requireOwner', requireOwner); vi.stubGlobal('bindings', bindings); vi.stubGlobal('pageNumber', pageNumber);
}, 60000);
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

it('checks author role, CSRF and origin, then invalidates logout server-side', async () => {
  expect((await fetch(origin + '/owner')).status).toBe(401);
  const readerResponse = await fetch(origin + '/test-login?user=reader');
  const reader = readerResponse.headers.get('set-cookie')!.split(';')[0]!;
  expect((await fetch(origin + '/owner', { headers: { cookie: reader } })).status).toBe(403);
  const ownerResponse = await fetch(origin + '/test-login?user=owner');
  expect(ownerResponse.headers.get('set-cookie')).toContain('HttpOnly'); expect(ownerResponse.headers.get('set-cookie')).toContain('SameSite=Lax');
  const cookie = ownerResponse.headers.get('set-cookie')!.split(';')[0]!;
  const identity = await (await fetch(origin + '/session', { headers: { cookie } })).json() as { csrf: string; user: { owner: boolean } };
  expect(identity.user.owner).toBe(true);
  expect((await fetch(origin + '/owner', { method: 'POST', headers: { cookie, Origin: origin } })).status).toBe(403);
  expect((await fetch(origin + '/owner', { method: 'POST', headers: { cookie, Origin: 'https://evil.test', 'x-csrf-token': identity.csrf } })).status).toBe(403);
  expect((await fetch(origin + '/owner', { method: 'POST', headers: { cookie, Origin: origin, 'x-csrf-token': identity.csrf } })).status).toBe(200);
  expect((await fetch(origin + '/logout', { method: 'POST', headers: { cookie, Origin: origin, 'x-csrf-token': identity.csrf } })).status).toBe(200);
  expect((await fetch(origin + '/owner', { headers: { cookie } })).status).toBe(401);
});
it('rejects oversized streamed bodies independently of Content-Length', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(33))); controller.close(); } });
  const response = await fetch(origin + '/body', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  expect(response.status).toBe(413);
});
it('allows token-based Micropub preflights without exposing session endpoints', async () => {
  const response = await fetch(origin + '/api/micropub?q=config', { method: 'OPTIONS', headers: { Origin: 'https://writer.test', 'Access-Control-Request-Headers': 'Authorization, Content-Type' } });
  expect(response.status).toBe(204);
  expect(response.headers.get('access-control-allow-origin')).toBe('*');
  expect(response.headers.get('access-control-allow-headers')).toContain('Authorization');
  expect(response.headers.get('access-control-expose-headers')).toContain('Location');
  expect(response.headers.has('access-control-allow-credentials')).toBe(false);
  expect((await fetch(origin + '/session')).headers.has('access-control-allow-origin')).toBe(false);
});
it('paginates older author content and comments without exposing complete drafts in lists', async () => {
  const db = platform.env.BLOG_DB;
  const posts = await Promise.all(Array.from({ length: 21 }, (_, index) => createPost(db, 'owner', normalizeContent({ kind: 'note', markdown: `正文 ${index}` }), `page-${index}`)));
  await transitionPost(db, posts[0]!.id, posts[0]!.version, 'publish');
  await Promise.all(Array.from({ length: 21 }, (_, index) => createComment(db, { postId: posts[0]!.id, author: '读者', markdown: `留言 ${index}`, requestKey: uuid() })));
  const login = await fetch(origin + '/test-login?user=owner');
  const headers = { Cookie: login.headers.get('set-cookie')!.split(';')[0]! };
  for (const path of ['/posts', '/comments']) {
    expect((await fetch(origin + path)).status).toBe(401);
    const first = await (await fetch(origin + path, { headers })).json() as { items: { id: string }[]; total: number; pages: number };
    const second = await (await fetch(origin + path + '?page=2', { headers })).json() as typeof first;
    expect(first.items).toHaveLength(20); expect(second.items).toHaveLength(1);
    expect(first.total).toBe(21); expect(first.pages).toBe(2);
    expect(new Set([...first.items, ...second.items].map(item => item.id)).size).toBe(21);
    expect(first.items[0]).not.toHaveProperty('markdown');
    expect((await fetch(origin + path + '?page=0', { headers })).status).toBe(400);
  }
});
