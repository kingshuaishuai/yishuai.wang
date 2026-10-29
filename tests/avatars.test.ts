import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, createRouter, defineEventHandler, toNodeListener, getQuery } from 'h3';
import { v4 as uuid } from 'uuid';
import { bindings } from '../server/utils/bindings';
import { issueSession, session, requireOwner, requireSession } from '../server/utils/session';
import { readBytes } from '../server/utils/bytes';
import { rateLimit } from '../server/utils/rate';
import upload from '../server/api/account/avatar.put';
import remove from '../server/api/account/avatar.delete';
import publicAvatar from '../server/routes/avatars/[id].get';
import publicProfile from '../server/api/profile.get';
import { profile, saveAvatar } from '../server/domain/avatars';
import { createPost, transitionPost } from '../server/domain/posts';
import { normalizeContent } from '../server/domain/content';
import { createComment, listComments } from '../server/domain/comments';
import type { Bindings } from '../server/domain/types';
import type { Profile, Session } from '../shared/types';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    // Existing accounts must survive the avatar migration with initials intact.
    if (file === '0003_user_avatars.sql') for (const id of ['owner', 'reader']) {
      await platform.env.BLOG_DB.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
    }
    for (const sql of (await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  const app = createApp({ debug: false });
  app.use(defineEventHandler(event => { event.context.cloudflare = { env: platform.env }; }));
  const router = createRouter();
  router.get('/test-login', defineEventHandler(async event => { await issueSession(event, String(getQuery(event).user)); return { ok: true }; }));
  router.get('/session', defineEventHandler(session));
  router.get('/owner', defineEventHandler(async event => { await requireOwner(event); return { allowed: true }; }));
  router.put('/api/account/avatar', upload); router.delete('/api/account/avatar', remove);
  router.get('/avatars/:id', publicAvatar); router.get('/api/profile', publicProfile);
  app.use(router.handler);
  vi.stubGlobal('bindings', bindings); vi.stubGlobal('requireSession', requireSession);
  vi.stubGlobal('readBytes', readBytes); vi.stubGlobal('rateLimit', rateLimit);
  server = createServer(toNodeListener(app)); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'owner', public: { siteUrl: origin } }));
}, 60000);
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

/** @param user - Test-only identity. @returns Browser-equivalent session headers. */
async function login(user: string) {
  const response = await fetch(`${origin}/test-login?user=${user}`);
  const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  const current = await (await fetch(origin + '/session', { headers: { cookie } })).json() as Session;
  return { cookie, Origin: origin, 'x-csrf-token': current.csrf, 'Content-Type': 'image/png' };
}

it('lets readers change only their own avatar, preserving author permissions and CSRF checks', async () => {
  expect(await profile(platform.env, 'reader')).toEqual({ avatarUrl: null });
  for (const method of ['PUT', 'DELETE']) expect((await fetch(origin + '/api/account/avatar', { method, body: method === 'PUT' ? png : undefined })).status).toBe(401);
  const headers = await login('reader');
  expect((await fetch(origin + '/api/account/avatar', { method: 'PUT', headers: { ...headers, 'x-csrf-token': '' }, body: png })).status).toBe(403);
  expect((await fetch(origin + '/api/account/avatar', { method: 'PUT', headers: { ...headers, Origin: 'https://evil.test' }, body: png })).status).toBe(403);
  const response = await fetch(origin + '/api/account/avatar?userId=owner', { method: 'PUT', headers, body: png });
  expect(response.status).toBe(200);
  const saved = await response.json() as Profile;
  const current = await (await fetch(origin + '/session', { headers })).json() as Session;
  expect(current.user.avatarUrl).toBe(saved.avatarUrl); expect(current.user.owner).toBe(false);
  expect((await fetch(origin + '/owner', { headers })).status).toBe(403);
  expect(await (await fetch(origin + '/api/profile')).json()).toEqual({ avatarUrl: null });
});

it('serves current avatars and updates existing comments, while retiring replaced and removed images', async () => {
  const env = platform.env, headers = await login('reader');
  const post = await createPost(env.BLOG_DB, 'owner', normalizeContent({ kind: 'note', markdown: 'Avatar discussion' }));
  await transitionPost(env.BLOG_DB, post.id, post.version, 'publish');
  for (const userId of ['reader', undefined]) {
    const comment = await createComment(env.BLOG_DB, { postId: post.id, author: userId || 'Guest', userId, markdown: 'Hello', requestKey: uuid() });
    await env.BLOG_DB.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(comment.id).run();
  }
  const old = await profile(env, 'reader');
  const response = await fetch(origin + '/api/account/avatar', { method: 'PUT', headers, body: png });
  const saved = await response.json() as Profile;
  expect(saved.avatarUrl).not.toBe(old.avatarUrl);
  const image = await fetch(origin + saved.avatarUrl);
  expect(image.status).toBe(200); expect(image.headers.get('content-type')).toBe('image/png');
  expect(Buffer.from(await image.arrayBuffer())).toEqual(png);
  expect((await fetch(origin + old.avatarUrl)).status).toBe(404);
  expect(await env.BLOG_MEDIA.head(old.avatarUrl!.slice(1))).toBeNull();
  const discussion = await listComments(env.BLOG_DB, post.id, 'owner');
  expect(discussion.find(c => c.author === 'reader')?.avatarUrl).toBe(saved.avatarUrl);
  expect(discussion.find(c => c.author === 'Guest')?.avatarUrl).toBeNull();
  expect((await fetch(origin + '/api/account/avatar', { method: 'DELETE', headers: { ...headers, 'x-csrf-token': '' } })).status).toBe(403);
  expect((await fetch(origin + '/api/account/avatar', { method: 'DELETE', headers })).status).toBe(200);
  expect((await fetch(origin + saved.avatarUrl)).status).toBe(404);
  expect((await listComments(env.BLOG_DB, post.id, 'owner')).every(c => c.avatarUrl === null)).toBe(true);
  const author = await saveAvatar(env, 'owner', png);
  expect(await (await fetch(origin + '/api/profile')).json()).toEqual(author);
});

it('rejects unsafe or oversized uploads without replacing the existing avatar', async () => {
  const headers = await login('owner'), before = await profile(platform.env, 'owner');
  for (const body of [new Uint8Array(0), new Uint8Array(64), Buffer.from('<svg onload="evil()">not a raster image</svg>'), Buffer.from('GIF89a' + 'x'.repeat(60))]) {
    expect((await fetch(origin + '/api/account/avatar', { method: 'PUT', headers, body })).status).toBe(415);
  }
  expect((await fetch(origin + '/api/account/avatar', { method: 'PUT', headers, body: new Uint8Array(1024 * 1024 + 1) })).status).toBe(413);
  expect(await profile(platform.env, 'owner')).toEqual(before);
});

it('preserves the current reference on storage failure or a competing update and cleans abandoned objects', async () => {
  const env = platform.env, before = await profile(env, 'owner');
  const failing = { ...env, BLOG_MEDIA: { put: async () => { throw new Error('Unavailable'); } } } as unknown as Bindings;
  await expect(saveAvatar(failing, 'owner', png)).rejects.toThrow('Unavailable');
  expect(await profile(env, 'owner')).toEqual(before);
  let abandoned = '', winner: Profile | undefined;
  const competing = { ...env, BLOG_MEDIA: {
    put: async (key: string, bytes: Uint8Array, options: unknown) => {
      abandoned = key;
      await env.BLOG_MEDIA.put(key, bytes, options as Parameters<typeof env.BLOG_MEDIA.put>[2]);
      winner = await saveAvatar(env, 'owner', png);
    },
    delete: (key: string) => env.BLOG_MEDIA.delete(key),
  } } as unknown as Bindings;
  await expect(saveAvatar(competing, 'owner', png)).rejects.toMatchObject({ statusCode: 409 });
  expect(await profile(env, 'owner')).toEqual(winner);
  expect(await env.BLOG_MEDIA.head(abandoned)).toBeNull();
});
