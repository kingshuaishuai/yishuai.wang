import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createApp, createRouter, defineEventHandler, getQuery, toNodeListener } from 'h3';
import type { PlatformProxy } from 'wrangler';
import type { Bindings } from '../server/domain/types';
import type { FriendInput, FriendLink, ManagedFriend } from '../shared/friends';
import { friendDomain } from '../shared/friends';
import { isAnalyticsPath } from '../shared/analytics-path';
import { testDatabase } from './support/database';
import { issueSession, session } from '../server/utils/session';
import { friendInput } from '../server/domain/friends/validation';
import publicGet from '../server/api/friends.get';
import ownerGet from '../server/api/owner/friends/index.get';
import ownerPost from '../server/api/owner/friends/index.post';
import ownerPut from '../server/api/owner/friends/[id].put';
import ownerDelete from '../server/api/owner/friends/[id].delete';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
let owner: Record<string, string>, reader: Record<string, string>;
const input: FriendInput = { name: 'Ashes Space', url: 'https://blog.ashesborn.cloud', description: '检索、索引与图结构。', descriptionEn: 'Retrieval, indexing and graphs.', iconUrl: 'https://blog.ashesborn.cloud/icon.ico', position: 10, visible: true };
beforeAll(async () => {
  platform = await testDatabase();
  for (const id of ['owner', 'reader']) await platform.env.BLOG_DB.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'owner', public: { siteUrl: origin } }));
  const app = createApp({ debug: false });
  app.use(defineEventHandler(async event => {
    event.context.cloudflare = { env: platform.env };
    if (event.path.startsWith('/login')) { await issueSession(event, String(getQuery(event).user)); return ''; }
    if (event.path === '/session') return session(event);
  }));
  app.use(createRouter().get('/friends', publicGet).get('/owner', ownerGet).post('/owner', ownerPost).put('/owner/:id', ownerPut).delete('/owner/:id', ownerDelete));
  server = createServer(toNodeListener(app));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const id of ['owner', 'reader']) {
    const login = await fetch(origin + '/login?user=' + id), cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const identity = await (await fetch(origin + '/session', { headers: { cookie } })).json() as { csrf: string };
    const headers = { cookie, origin, 'x-csrf-token': identity.csrf, 'content-type': 'application/json' };
    if (id === 'owner') owner = headers; else reader = headers;
  }
}, 60000);
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

/** @param path - Management resource. @param method - Mutation. @param data - Submitted body. @param headers - Optional alternate credentials. @returns Actual response. */
function write(path: string, method: string, data: unknown, headers = owner): Promise<Response> {
  return fetch(origin + path, { method, headers, body: JSON.stringify(data) });
}

it('persists bilingual details, canonicalizes duplicate URLs and publishes only public fields', async () => {
  const created = await write('/owner', 'POST', input);
  expect(created.status).toBe(201);
  const friend = await created.json() as ManagedFriend;
  expect(friend).toMatchObject({ ...input, url: input.url + '/', version: 1 });
  expect((await write('/owner', 'POST', { ...input, url: input.url + '/#section' })).status).toBe(409);
  const listed = await fetch(origin + '/friends');
  expect(listed.headers.get('cache-control')).toBe('no-store');
  const published = await listed.json() as FriendLink[];
  expect(published).toHaveLength(1);
  expect(published[0]).toMatchObject({ name: input.name, descriptionEn: input.descriptionEn });
  expect(JSON.stringify(published)).not.toMatch(/version|position|visible|created_at/);
});

it('applies ordering and hide/show immediately and prevents stale edits and deletes', async () => {
  const first = (await (await fetch(origin + '/owner', { headers: owner })).json() as ManagedFriend[])[0]!;
  const second = await (await write('/owner', 'POST', { ...input, name: 'Another site', url: 'https://example.org', iconUrl: '', position: 0, descriptionEn: '' })).json() as ManagedFriend;
  let list = await (await fetch(origin + '/friends')).json() as FriendLink[];
  expect(list.map(item => item.id)).toEqual([second.id, first.id]);
  const saved = await write('/owner/' + first.id, 'PUT', { ...input, version: first.version, position: 0, visible: false });
  expect(saved.status).toBe(200);
  const hidden = await saved.json() as ManagedFriend;
  expect(hidden).toMatchObject({ visible: false, version: 2 });
  expect((await write('/owner/' + first.id, 'PUT', { ...input, version: 1 })).status).toBe(409);
  expect((await write('/owner/' + first.id, 'DELETE', { version: 1 })).status).toBe(409);
  list = await (await fetch(origin + '/friends')).json() as FriendLink[];
  expect(list.map(item => item.id)).toEqual([second.id]);
  const managed = await (await fetch(origin + '/owner', { headers: owner })).json() as ManagedFriend[];
  expect(managed.find(item => item.id === hidden.id)?.visible).toBe(false);
  expect((await write('/owner/' + first.id, 'PUT', { ...input, version: 2, position: 0 })).status).toBe(200);
  list = await (await fetch(origin + '/friends')).json() as FriendLink[];
  expect(list.map(item => item.id)).toEqual([first.id, second.id]);
  expect((await write('/owner/' + second.id, 'DELETE', { version: second.version })).status).toBe(204);
  expect((await (await fetch(origin + '/friends')).json() as FriendLink[]).map(item => item.id)).toEqual([first.id]);
  expect((await write('/owner/' + second.id, 'PUT', { ...input, version: second.version })).status).toBe(404);
});

it('requires owner identity and same-origin CSRF for every mutation', async () => {
  expect((await fetch(origin + '/owner')).status).toBe(401);
  expect((await fetch(origin + '/owner', { headers: reader })).status).toBe(403);
  for (const headers of [reader, { ...owner, origin: 'https://elsewhere.example' }, { ...owner, 'x-csrf-token': '' }]) {
    for (const [path, method] of [['/owner', 'POST'], ['/owner/test', 'PUT'], ['/owner/test', 'DELETE']]) {
      expect((await write(path!, method!, input, headers)).status).toBe(403);
    }
  }
});

it('rejects active content, credentials, local addresses, oversized and unexpected fields', async () => {
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.org', 'http://example.org', 'https://user:pass@example.org', 'https://127.0.0.1', 'https://[::1]', 'https://localhost', 'https://host.internal']) {
    expect(friendInput.safeParse({ ...input, url }).success).toBe(false);
    expect(friendInput.safeParse({ ...input, iconUrl: url }).success).toBe(false);
  }
  for (const changes of [{ name: ' ' }, { name: 'x'.repeat(81) }, { description: 'x'.repeat(401) }, { position: 0.5 }, { visible: 'yes' }, { id: 'forged' }]) {
    expect((await write('/owner', 'POST', { ...input, ...changes })).status).toBe(400);
  }
  expect(friendDomain('https://www.example.org/path')).toBe('example.org');
  expect(isAnalyticsPath('/friends')).toBe(true);
  expect(isAnalyticsPath('/en/friends')).toBe(true);
  expect(isAnalyticsPath('/manage/friends')).toBe(false);
});
