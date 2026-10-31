import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, createRouter, defineEventHandler, getQuery, toNodeListener } from 'h3';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { issueSession, session, requireOwner } from '../server/utils/session';
import { bindings } from '../server/utils/bindings';
import { body } from '../server/utils/validate';
import { rateLimit } from '../server/utils/rate';
import { readBytes } from '../server/utils/bytes';
import { digest } from '../server/utils/security';
import { createToken } from '../server/domain/publishing/tokens';
import accessGet from '../server/api/owner/publishing/index.get';
import tokenPost from '../server/api/owner/publishing/index.post';
import tokenDelete from '../server/api/owner/publishing/[id].delete';
import micropubGet from '../server/api/micropub/index.get';
import micropubPost from '../server/api/micropub/index.post';
import mediaPost from '../server/api/micropub/media.post';
import type { CreatedPublishingToken, PublishingAccess } from '../shared/publishing';
import type { Bindings } from '../server/domain/types';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
let owner: Record<string, string>, reader: Record<string, string>;
let ownerId = 'owner';
let introspectionEndpoint = 'https://identity.example/token';
const nativeFetch = fetch;
const provider = vi.fn(async () => Response.json({ active: true, me: origin + '/', scope: 'create' }));
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of (await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  for (const id of ['owner', 'reader']) await platform.env.BLOG_DB.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: ownerId, public: { siteUrl: origin }, indieauthIntrospectionEndpoint: introspectionEndpoint }));
  vi.stubGlobal('requireOwner', requireOwner); vi.stubGlobal('bindings', bindings); vi.stubGlobal('body', body);
  vi.stubGlobal('rateLimit', rateLimit); vi.stubGlobal('readBytes', readBytes); vi.stubGlobal('siteOrigin', () => origin);
  vi.stubGlobal('fetch', (url: string, options?: RequestInit) => url === 'https://identity.example/token' ? provider() : nativeFetch(url, options));
  const router = createRouter().get('/access', accessGet).post('/access', tokenPost).delete('/access/:id', tokenDelete)
    .get('/api/micropub', micropubGet).post('/api/micropub', micropubPost).post('/api/micropub/media', mediaPost);
  const app = createApp({ debug: false });
  app.use(defineEventHandler(async event => {
    event.context.cloudflare = { env: platform.env };
    if (event.path.startsWith('/test-login')) { await issueSession(event, String(getQuery(event).user)); return ''; }
    if (event.path === '/session') return session(event);
  })); app.use(router);
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
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

/** @param token - Test-only credential. @returns Authorization header for the publishing API. */
function bearer(token: string): Record<string, string> { return { Authorization: `Bearer ${token}` }; }
/** @param token - Test-only credential. @param value - Micropub request. @returns Actual HTTP response. */
function publish(token: string, value: unknown): Promise<Response> {
  return fetch(origin + '/api/micropub', { method: 'POST', headers: { ...bearer(token), 'content-type': 'application/json' }, body: JSON.stringify(value) });
}

it('restricts management to the author and protects creation and revocation with Origin and CSRF', async () => {
  for (const headers of [{}, reader]) {
    const status = headers === reader ? 403 : 401;
    expect((await fetch(origin + '/access', { headers })).status).toBe(status);
    expect((await fetch(origin + '/access', { method: 'POST', headers, body: '{}' })).status).toBe(status);
    expect((await fetch(origin + '/access/unknown', { method: 'DELETE', headers })).status).toBe(status);
  }
  for (const headers of [{ ...owner, origin: 'https://elsewhere.test' }, { ...owner, 'x-csrf-token': '' }]) {
    expect((await fetch(origin + '/access', { method: 'POST', headers, body: '{"name":"QuirePub"}' })).status).toBe(403);
    expect((await fetch(origin + '/access/unknown', { method: 'DELETE', headers })).status).toBe(403);
  }
  for (const input of [{ name: '' }, { name: 'x'.repeat(61) }, { name: 'client', expiresInDays: 0 }, { name: 'client', scopes: ['admin'] }]) {
    expect((await fetch(origin + '/access', { method: 'POST', headers: owner, body: JSON.stringify(input) })).status).toBe(400);
  }
});

it('returns a credential only once and supports real Micropub config, upload, draft, update, delete and restore', async () => {
  introspectionEndpoint = '';
  const issued = await fetch(origin + '/access', { method: 'POST', headers: owner, body: '{"name":"QuirePub","expiresInDays":90}' });
  expect(issued.status).toBe(201); expect(issued.headers.get('cache-control')).toContain('no-store');
  const created = await issued.json() as CreatedPublishingToken;
  expect(created.token).toMatch(/^yw_mp_[a-f0-9]{64}$/);
  const row = await platform.env.BLOG_DB.prepare('SELECT * FROM publishing_tokens WHERE id=?').bind(created.item.id).first();
  expect(row?.token_hash).toBe(await digest(created.token)); expect(JSON.stringify(row)).not.toContain(created.token);
  expect(created.item.expiresAt - created.item.createdAt).toBe(90 * 86400000);
  const listed = await fetch(origin + '/access', { headers: owner });
  expect(listed.headers.get('cache-control')).toContain('no-store');
  const safe = await listed.text(); expect(safe).not.toContain(created.token); expect(safe).not.toContain('token_hash');
  expect(JSON.parse(safe) as PublishingAccess).toMatchObject({ siteUrl: origin + '/', endpoint: origin + '/api/micropub' });
  const config = await fetch(origin + '/api/micropub?q=config', { headers: bearer(created.token) });
  expect(await config.json()).toMatchObject({ 'media-endpoint': origin + '/api/micropub/media' });
  const form = new FormData(); form.set('file', new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], 'image.png', { type: 'image/png' }));
  expect((await fetch(origin + '/api/micropub/media', { method: 'POST', headers: bearer(created.token), body: form })).status).toBe(201);
  const post = await publish(created.token, { type: ['h-entry'], properties: { name: ['Token acceptance'], content: ['Local fixture'], 'post-status': ['draft'] } });
  expect(post.status).toBe(201); const url = post.headers.get('location')!;
  expect((await fetch(origin + '/api/micropub?q=source&url=' + encodeURIComponent(url), { headers: bearer(created.token) })).status).toBe(200);
  expect((await publish(created.token, { action: 'update', url, replace: { name: ['Updated'] } })).status).toBe(204);
  expect((await publish(created.token, { action: 'delete', url })).status).toBe(204);
  expect((await publish(created.token, { action: 'undelete', url })).status).toBe(204);
  const used = await (await fetch(origin + '/access', { headers: owner })).json() as PublishingAccess;
  expect(used.tokens.find(item => item.id === created.item.id)?.lastUsedAt).toBeGreaterThan(0);
  expect((await fetch(origin + '/access/' + created.item.id, { method: 'DELETE', headers: owner })).status).toBe(204);
  const rejected = await fetch(origin + '/api/micropub?q=config', { headers: bearer(created.token) });
  expect(rejected.status).toBe(401); expect(rejected.headers.get('www-authenticate')).toBe('Bearer');
  expect(provider).not.toHaveBeenCalled();
  introspectionEndpoint = 'https://identity.example/token';
});

it('honors expiry, author changes, scopes and invalid native tokens without leaking them to introspection', async () => {
  const created = await createToken(platform.env.BLOG_DB, 'owner', { name: 'limited', expiresInDays: 30 });
  await platform.env.BLOG_DB.prepare("UPDATE publishing_tokens SET scopes='create' WHERE id=?").bind(created.item.id).run();
  expect((await publish(created.token, { action: 'delete', url: origin + '/articles/unknown' })).status).toBe(403);
  expect((await fetch(origin + '/api/micropub?q=source', { headers: bearer(created.token) })).status).toBe(403);
  ownerId = 'reader';
  expect((await fetch(origin + '/api/micropub?q=config', { headers: bearer(created.token) })).status).toBe(401);
  ownerId = 'owner';
  await platform.env.BLOG_DB.prepare('UPDATE publishing_tokens SET expires_at=1 WHERE id=?').bind(created.item.id).run();
  for (const token of [created.token, 'yw_mp_invalid', 'yw_mp_' + 'f'.repeat(64)]) {
    expect((await fetch(origin + '/api/micropub?q=config', { headers: bearer(token) })).status).toBe(401);
  }
  expect(provider).not.toHaveBeenCalled();
  expect((await fetch(origin + '/api/micropub?q=config', { headers: bearer('foreign-token') })).status).toBe(200);
  expect(provider).toHaveBeenCalledTimes(1);
});

it('enforces the active-token limit atomically during concurrent creation', async () => {
  const outcomes = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => createToken(platform.env.BLOG_DB, 'reader', { name: 'concurrent-' + i, expiresInDays: 30 })));
  expect(outcomes.filter(item => item.status === 'fulfilled')).toHaveLength(10);
  expect(outcomes.filter(item => item.status === 'rejected')).toHaveLength(2);
  expect((await fetch(origin + '/access/unknown', { method: 'DELETE', headers: owner })).status).toBe(404);
});
