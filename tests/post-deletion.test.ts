import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createApp, createRouter, defineEventHandler, getQuery, toNodeListener } from 'h3';
import { v4 as uuid } from 'uuid';
import type { PlatformProxy } from 'wrangler';
import type { Bindings } from '../server/domain/types';
import { testDatabase } from './support/database';
import { issueSession, session } from '../server/utils/session';
import { normalizeContent } from '../server/domain/content';
import { createComment } from '../server/domain/comments';
import { allPublic, createPost, getPost, getPublicPost, listPublic, permanentlyDeletePost, savePost, transitionPost } from '../server/domain/posts';
import { createTranslation } from '../server/domain/translations';
import { storeImage } from '../server/domain/media';
import { llms, rss, sitemap } from '../server/domain/resources';
import ownerDelete from '../server/api/owner/posts/[id].delete';
import ownerAction from '../server/api/owner/posts/[id]/action.post';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
let owner: Record<string, string>, reader: Record<string, string>;
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
  app.use(createRouter().delete('/posts/:id', ownerDelete).post('/posts/:id/action', ownerAction));
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

/** @param postId - Fixture article. @returns References used to verify related data cleanup. */
async function relatedData(postId: string): Promise<{ commentId: string; mediaId: string }> {
  const db = platform.env.BLOG_DB;
  const comment = await createComment(db, { postId, author: 'Reader', email: 'private@example.test', markdown: 'A comment', requestKey: uuid() });
  await db.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(comment.id).run();
  await createComment(db, { postId, parentId: comment.id, author: 'Reply', markdown: 'A pending reply', requestKey: uuid() });
  await db.prepare("INSERT INTO ai_summaries(post_id,status,request_id,request_hash,started_at,summary_text) VALUES(?,'generating',?,?,?,?)").bind(postId, uuid(), 'hash', Date.now(), 'Old summary').run();
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]);
  const url = await storeImage(platform.env, new File([png], 'shared.png', { type: 'image/png' }), postId);
  return { commentId: comment.id, mediaId: url.split('/').at(-1)! };
}

/** @param id - Fixture entry. @param data - Submitted revision. @param headers - Credentials or an attack variation. @returns Real owner API response. */
function remove(id: string, data: unknown, headers = owner): Promise<Response> {
  return fetch(`${origin}/posts/${id}`, { method: 'DELETE', headers, body: JSON.stringify(data) });
}

it('permanently removes snapshots, comments and AI while retaining translations and shared images', async () => {
  const db = platform.env.BLOG_DB;
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'Delete only this article', markdown: 'Private and public content' }));
  post = await transitionPost(db, post.id, post.version, 'publish');
  const { mediaId } = await relatedData(post.id);
  let english = await createTranslation(db, post.id, 'en');
  english = await savePost(db, english.id, english.version, { ...english, title: 'Keep this version', markdown: 'English content', coverUrl: `/media/${mediaId}` });
  english = await transitionPost(db, english.id, english.version, 'publish');
  await createComment(db, { postId: english.id, author: 'Reader', markdown: 'Keep this comment', requestKey: uuid() });

  expect((await remove(post.id, { version: post.version })).status).toBe(204);
  await expect(getPost(db, post.id)).rejects.toMatchObject({ statusCode: 404 });
  await expect(getPublicPost(db, post.slug)).rejects.toMatchObject({ statusCode: 404 });
  await expect(savePost(db, post.id, post.version, post)).rejects.toMatchObject({ statusCode: 404 });
  await expect(transitionPost(db, post.id, post.version, 'restore')).rejects.toMatchObject({ statusCode: 404 });
  expect(await db.prepare('SELECT id FROM comments WHERE post_id=?').bind(post.id).first()).toBeNull();
  expect(await db.prepare('SELECT post_id FROM ai_summaries WHERE post_id=?').bind(post.id).first()).toBeNull();
  expect(await db.prepare('SELECT id FROM comments WHERE post_id=?').bind(english.id).first()).not.toBeNull();
  const media = await db.prepare('SELECT post_id,object_key FROM media WHERE id=?').bind(mediaId).first<{ post_id: string | null; object_key: string }>();
  expect(media?.post_id).toBeNull();
  expect(await platform.env.BLOG_MEDIA.head(media!.object_key)).not.toBeNull();
  expect((await getPublicPost(db, english.slug)).coverUrl).toBe(`/media/${mediaId}`);
  expect((await getPublicPost(db, english.slug)).translations).toHaveLength(1);
  expect((await listPublic(db)).items.some(item => item.id === post.id)).toBe(false);
  const remaining = await allPublic(db);
  for (const resource of [rss(remaining, origin, 'article'), sitemap(remaining, origin), llms(remaining, origin)]) expect(resource).not.toContain(post.slug);
  const replacement = await createTranslation(db, english.id, 'zh');
  expect(replacement.id).not.toBe(post.id);
  expect(replacement.status).toBe('draft');
});

it('rejects stale revisions without deleting or detaching anything', async () => {
  const db = platform.env.BLOG_DB;
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'Concurrent edit', markdown: 'Before' }));
  post = await transitionPost(db, post.id, post.version, 'publish');
  const { commentId, mediaId } = await relatedData(post.id), stale = post.version;
  post = await savePost(db, post.id, post.version, { ...post, markdown: 'Keep the new revision' });
  expect((await remove(post.id, { version: stale })).status).toBe(409);
  expect((await getPost(db, post.id)).draft_json).toContain('Keep the new revision');
  expect(await db.prepare('SELECT id FROM comments WHERE id=?').bind(commentId).first()).not.toBeNull();
  expect(await db.prepare('SELECT post_id FROM ai_summaries WHERE post_id=?').bind(post.id).first()).not.toBeNull();
  expect(await db.prepare('SELECT post_id FROM media WHERE id=?').bind(mediaId).first()).toEqual({ post_id: post.id });
});

it('cleans drafts and legacy soft-deleted entries without a recovery path', async () => {
  const db = platform.env.BLOG_DB;
  for (const kind of ['article', 'note'] as const) {
    for (const softDeleted of [false, true]) {
      let draft = await createPost(db, 'owner', normalizeContent({ kind }));
      if (softDeleted) draft = await transitionPost(db, draft.id, draft.version, 'delete');
      await permanentlyDeletePost(db, draft.id, draft.version);
      await expect(getPost(db, draft.id)).rejects.toMatchObject({ statusCode: 404 });
      expect((await remove(draft.id, { version: draft.version })).status).toBe(404);
    }
  }
});

it('rolls the entire cleanup back if the final record cannot be removed', async () => {
  const db = platform.env.BLOG_DB;
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'Atomic deletion', markdown: 'Keep on failure' }));
  post = await transitionPost(db, post.id, post.version, 'publish');
  const { commentId, mediaId } = await relatedData(post.id);
  await db.prepare('CREATE TABLE deletion_guard(post_id TEXT REFERENCES posts(id))').run();
  await db.prepare('INSERT INTO deletion_guard VALUES(?)').bind(post.id).run();
  await expect(permanentlyDeletePost(db, post.id, post.version)).rejects.toThrow();
  expect((await getPost(db, post.id)).status).toBe('published');
  expect(await db.prepare('SELECT id FROM comments WHERE id=?').bind(commentId).first()).not.toBeNull();
  expect(await db.prepare('SELECT post_id FROM ai_summaries WHERE post_id=?').bind(post.id).first()).not.toBeNull();
  expect(await db.prepare('SELECT post_id FROM media WHERE id=?').bind(mediaId).first()).toEqual({ post_id: post.id });
  await db.prepare('DROP TABLE deletion_guard').run();
});

it('requires an owner session, origin, CSRF and an explicit validated revision', async () => {
  const db = platform.env.BLOG_DB, draft = await createPost(db, 'owner', normalizeContent({ kind: 'article' }));
  expect((await remove(draft.id, { version: draft.version }, { 'content-type': 'application/json' })).status).toBe(401);
  for (const headers of [reader, { ...owner, origin: 'https://elsewhere.example' }, { ...owner, 'x-csrf-token': '' }]) expect((await remove(draft.id, { version: draft.version }, headers)).status).toBe(403);
  for (const body of [{}, { version: 0 }, { version: 1.5 }, { version: '1' }, { version: 1, all: true }]) expect((await remove(draft.id, body)).status).toBe(400);
  // Old tabs must never turn a previously reversible confirmation into a permanent deletion.
  for (const action of ['delete', 'restore']) expect((await fetch(`${origin}/posts/${draft.id}/action`, { method: 'POST', headers: owner, body: JSON.stringify({ version: draft.version, action }) })).status).toBe(400);
  expect((await getPost(db, draft.id)).status).toBe('draft');
});
