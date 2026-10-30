import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, createRouter, defineEventHandler, getQuery, toNodeListener } from 'h3';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { issueSession, session, requireOwner } from '../server/utils/session';
import { bindings } from '../server/utils/bindings';
import { body } from '../server/utils/validate';
import { rateLimit } from '../server/utils/rate';
import settingsGet from '../server/api/owner/ai/settings.get';
import settingsPut from '../server/api/owner/ai/settings.put';
import summaryGet from '../server/api/owner/posts/[id]/summary.get';
import summaryPost from '../server/api/owner/posts/[id]/summary.post';
import actionPost from '../server/api/owner/posts/[id]/action.post';
import { createPost, getPublicPost } from '../server/domain/posts';
import { normalizeContent } from '../server/domain/content';
import { readSse } from '../shared/sse';
import type { AiSettings, SummaryEvent } from '../shared/ai';
import type { DraftPost } from '../shared/types';
import type { Bindings } from '../server/domain/types';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
let owner: Record<string, string>, reader: Record<string, string>;
const nativeFetch = fetch, tasks = new Set<Promise<unknown>>();
const provider = vi.fn(async () => new Response([
  `data: ${JSON.stringify({ choices: [{ delta: { content: '由公开正文生成的总结。' } }] })}\n\n`,
  `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
  'data: [DONE]\n\n',
].join(''), { headers: { 'content-type': 'text/event-stream' } }));
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of (await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  for (const id of ['owner', 'reader']) await platform.env.BLOG_DB.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'owner', aiSettingsSecret: 'c'.repeat(64), public: { siteUrl: origin } }));
  vi.stubGlobal('requireOwner', requireOwner); vi.stubGlobal('bindings', bindings); vi.stubGlobal('body', body); vi.stubGlobal('rateLimit', rateLimit);
  vi.stubGlobal('fetch', (url: string, options?: RequestInit) => url === 'https://api.deepseek.com/chat/completions' ? provider() : nativeFetch(url, options));
  const router = createRouter().get('/settings', settingsGet).put('/settings', settingsPut).get('/posts/:id/summary', summaryGet).post('/posts/:id/summary', summaryPost).post('/posts/:id/action', actionPost);
  const app = createApp({ debug: false });
  app.use(defineEventHandler(async event => {
    event.context.cloudflare = { env: platform.env };
    event.context.waitUntil = (task: Promise<unknown>) => { tasks.add(task); void task.finally(() => tasks.delete(task)); };
    if (event.path.startsWith('/test-login')) { await issueSession(event, String(getQuery(event).user)); return ''; }
    if (event.path === '/session') return session(event);
  }));
  app.use(router);
  server = createServer(toNodeListener(app)); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const id of ['owner', 'reader']) {
    const login = await fetch(origin + '/test-login?user=' + id);
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const identity = await (await fetch(origin + '/session', { headers: { cookie } })).json() as { csrf: string };
    const headers = { cookie, origin, 'x-csrf-token': identity.csrf, 'content-type': 'application/json' };
    if (id === 'owner') owner = headers; else reader = headers;
  }
}, 60000);
afterAll(async () => { await Promise.allSettled(tasks); server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

it('protects settings and streaming behind owner, origin and CSRF checks', async () => {
  for (const path of ['/settings', '/posts/unknown/summary']) {
    expect((await fetch(origin + path)).status).toBe(401);
    expect((await fetch(origin + path, { headers: reader })).status).toBe(403);
  }
  const config = { enabled: true, model: 'deepseek-flash', apiKey: 'test-only-not-a-real-key', revision: '' };
  expect((await fetch(origin + '/settings', { method: 'PUT', headers: { ...owner, origin: 'https://elsewhere.test' }, body: JSON.stringify(config) })).status).toBe(403);
  expect((await fetch(origin + '/settings', { method: 'PUT', headers: { ...owner, 'x-csrf-token': '' }, body: JSON.stringify(config) })).status).toBe(403);
  expect((await fetch(origin + '/posts/unknown/summary', { method: 'POST', headers: reader })).status).toBe(403);
  const saved = await fetch(origin + '/settings', { method: 'PUT', headers: owner, body: JSON.stringify(config) });
  expect(saved.status).toBe(200);
  const safe = await saved.text();
  expect(safe).not.toContain(config.apiKey); expect(safe).not.toContain('encrypted_key');
  expect(JSON.parse(safe)).toMatchObject({ hasKey: true, enabled: true });
  expect(provider).not.toHaveBeenCalled();
});

it('auto-generates on actual publish and serves manual regeneration as SSE, not partial public text', async () => {
  const db = platform.env.BLOG_DB;
  const draft = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'HTTP 验收', markdown: '公开正文' }));
  const published = await fetch(`${origin}/posts/${draft.id}/action`, { method: 'POST', headers: owner, body: JSON.stringify({ action: 'publish', version: draft.version }) });
  expect(published.status).toBe(200);
  await published.json() as DraftPost;
  await Promise.all(tasks);
  expect(provider).toHaveBeenCalledTimes(1);
  expect((await getPublicPost(db, draft.slug)).aiSummary?.text).toBe('由公开正文生成的总结。');
  expect(provider).toHaveBeenCalledTimes(1);
  const response = await fetch(`${origin}/posts/${draft.id}/summary`, { method: 'POST', headers: owner, body: '{}' });
  expect(response.headers.get('content-type')).toContain('text/event-stream');
  expect(response.headers.get('cache-control')).toContain('no-store');
  const events: SummaryEvent[] = [];
  for await (const frame of readSse(response.body!)) events.push(JSON.parse(frame.data));
  expect(events).toContainEqual({ type: 'delta', text: '由公开正文生成的总结。' });
  expect(events.at(-1)?.type).toBe('complete');
  expect(provider).toHaveBeenCalledTimes(2);
  const safe = await (await fetch(origin + '/settings', { headers: owner })).json() as AiSettings;
  expect(safe.hasKey).toBe(true);
});
