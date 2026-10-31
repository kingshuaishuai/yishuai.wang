import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import micropubGet from '../server/api/micropub/index.get';
import micropubPost from '../server/api/micropub/index.post';
import mediaPost from '../server/api/micropub/media.post';
import mediaGet from '../server/routes/media/[id].get';
import { bindings } from '../server/utils/bindings';
import { readBytes } from '../server/utils/bytes';
import { rateLimit } from '../server/utils/rate';
import { getPublicPost, getPost, draftView, savePost, transitionPost } from '../server/domain/posts';
import type { Bindings } from '../server/domain/types';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
const nativeFetch = fetch;
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of (await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
  // Only the external identity provider is simulated; HTTP handlers and storage are real.
  vi.stubGlobal('bindings', bindings); vi.stubGlobal('readBytes', readBytes); vi.stubGlobal('rateLimit', rateLimit);
  vi.stubGlobal('session', async () => null); vi.stubGlobal('siteOrigin', () => origin);
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'test-owner', indieauthIntrospectionEndpoint: 'https://identity.example/token' }));
  vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
    if (url !== 'https://identity.example/token') return nativeFetch(url, options);
    expect(options?.redirect).toBe('manual');
    const token = new URLSearchParams(String(options?.body)).get('token');
    return Response.json({ active: token !== 'invalid', me: origin + '/', scope: token === 'create-only' ? 'create' : 'create update delete undelete' });
  });
  const router = createRouter().get('/api/micropub', micropubGet).post('/api/micropub', micropubPost).post('/api/micropub/media', mediaPost).get('/media/:id', mediaGet);
  const app = createApp({ debug: false });
  app.use(defineEventHandler(event => { event.context.cloudflare = { env: platform.env }; })); app.use(router);
  server = createServer(toNodeListener(app)); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}, 60000);
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

/** @param body - Protocol request. @param token - Test scope grant. @returns Real HTTP response. */
function send(body: object, token = 'full'): Promise<Response> {
  return fetch(origin + '/api/micropub', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
it('creates, reads, updates, deletes and restores through the actual HTTP protocol', async () => {
  const headers = { Authorization: 'Bearer full' };
  const config = await (await fetch(origin + '/api/micropub?q=config', { headers })).json() as Record<string, string>;
  expect(config['media-endpoint']).toBe(origin + '/api/micropub/media');
  const created = await send({ type: ['h-entry'], 'mp-slug': 'protocol-entry', properties: { name: ['协议验收'], content: [{ html: '<p>原文 <strong>加粗</strong></p>' }], category: ['技术'], custom: ['保留'] } });
  expect(created.status).toBe(201); const url = created.headers.get('location')!;
  expect(url).toBe(origin + '/articles/protocol-entry');
  expect((await getPublicPost(platform.env.BLOG_DB, 'protocol-entry')).html).toContain('<strong>加粗</strong>');
  const source = await (await fetch(origin + '/api/micropub?q=source&url=' + encodeURIComponent(url), { headers })).json() as { properties: Record<string, unknown> };
  expect(source.properties.content).toEqual([{ html: '<p>原文 <strong>加粗</strong></p>' }]); expect(source.properties.custom).toEqual(['保留']);
  expect((await send({ action: 'update', url, replace: { name: ['新标题'] }, add: { category: ['写作'] }, delete: { category: ['技术'] } })).status).toBe(204);
  expect((await getPublicPost(platform.env.BLOG_DB, 'protocol-entry')).tags).toEqual(['写作']);
  const denied = await send({ action: 'delete', url }, 'create-only');
  expect(denied.status).toBe(403); expect((await denied.json() as { error: string }).error).toBe('insufficient_scope');
  expect((await send({ action: 'delete', url })).status).toBe(204);
  await expect(getPublicPost(platform.env.BLOG_DB, 'protocol-entry')).rejects.toMatchObject({ statusCode: 410 });
  expect((await send({ action: 'undelete', url })).status).toBe(204);
  expect((await getPublicPost(platform.env.BLOG_DB, 'protocol-entry')).title).toBe('新标题');
  expect((await send({ action: 'update', url: 'https://elsewhere.example/articles/protocol-entry', replace: { name: ['wrong'] } })).status).toBe(400);
  const invalid = await fetch(origin + '/api/micropub?q=config', { headers: { Authorization: 'Bearer invalid' } });
  expect(invalid.status).toBe(401); expect(invalid.headers.get('www-authenticate')).toBe('Bearer');
});
it('accepts form creation and keeps uploaded media private until a published post references it', async () => {
  const form = new FormData();
  form.set('file', new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], 'test.png', { type: 'image/png' }));
  const upload = await fetch(origin + '/api/micropub/media', { method: 'POST', headers: { Authorization: 'Bearer full' }, body: form });
  expect(upload.status).toBe(201); const photo = upload.headers.get('location')!;
  expect((await fetch(photo)).status).toBe(404);
  const created = await fetch(origin + '/api/micropub', { method: 'POST', body: new URLSearchParams({ h: 'entry', content: '带图日常', photo, access_token: 'full' }) });
  expect(created.status).toBe(201); const url = created.headers.get('location')!;
  const image = await fetch(photo); expect(image.status).toBe(200); expect(image.headers.get('content-type')).toBe('image/png');
  expect((await send({ action: 'delete', url })).status).toBe(204);
  expect((await fetch(photo)).status).toBe(404);
});
it('rejects unsupported visibility and oversized fields without creating a public post', async () => {
  for (const properties of [{ content: ['private'], visibility: ['private'] }, { content: ['scheduled'], 'post-status': ['scheduled'] }, { name: ['x'.repeat(201)], content: ['too long'] }]) {
    const result = await send({ type: ['h-entry'], properties });
    expect(result.status).toBe(400);
    expect((await result.json() as { error: string }).error).toBe('invalid_request');
  }
});

it('retains featured covers through updates and removes public access when withdrawn', async () => {
  const form = new FormData();
  form.set('file', new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], 'cover.png', { type: 'image/png' }));
  const upload = await fetch(origin + '/api/micropub/media', { method: 'POST', headers: { Authorization: 'Bearer full' }, body: form });
  const cover = upload.headers.get('location')!;
  const created = await send({ type: ['h-entry'], 'mp-slug': 'cover-entry', properties: { name: ['封面'], content: ['正文'], featured: [cover], 'post-status': ['draft'] } });
  const url = created.headers.get('location')!;
  expect(created.status).toBe(201); expect((await fetch(cover)).status).toBe(404);
  expect((await send({ action: 'update', url, replace: { 'post-status': ['published'], summary: ['描述'] } })).status).toBe(204);
  expect((await getPublicPost(platform.env.BLOG_DB, 'cover-entry')).coverUrl).toBe(cover);
  expect((await fetch(cover)).status).toBe(200);
  const source = await (await fetch(origin + '/api/micropub?q=source&url=' + encodeURIComponent(url), { headers: { Authorization: 'Bearer full' } })).json() as { properties: Record<string, unknown> };
  expect(source.properties.featured).toEqual([cover]);
  expect((await send({ action: 'update', url, delete: ['featured'] })).status).toBe(204);
  expect((await getPublicPost(platform.env.BLOG_DB, 'cover-entry')).coverUrl).toBe('');
  expect((await fetch(cover)).status).toBe(404);
  await send({ action: 'update', url, replace: { featured: [cover] } });
  const published = await getPublicPost(platform.env.BLOG_DB, 'cover-entry');
  let draft = draftView(await getPost(platform.env.BLOG_DB, published.id));
  draft = await savePost(platform.env.BLOG_DB, draft.id, draft.version, { ...draft, coverUrl: '' });
  expect((await fetch(cover)).status).toBe(200);
  await transitionPost(platform.env.BLOG_DB, draft.id, draft.version, 'publish');
  expect(draft.properties.featured).toEqual([cover]);
  expect((await fetch(cover)).status).toBe(404);
});
