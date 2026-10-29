import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { readFile, readdir } from 'node:fs/promises';
import { v4 as uuid } from 'uuid';
import type { Bindings } from '../server/domain/types';
import { normalizeContent, renderComment } from '../server/domain/content';
import { createPost, getPost, getPublicPost, savePost, transitionPost, allPublic, listPublic } from '../server/domain/posts';
import { createComment, listComments } from '../server/domain/comments';
import { llms, markdownDocument, rss, sitemap } from '../server/domain/resources';
import { imageMime, storeImage } from '../server/domain/media';
let platform: PlatformProxy<Bindings>;
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    const schema = await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8');
    for (const sql of schema.split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
}, 60000);
afterAll(async () => { await platform?.dispose(); });

describe('publication consistency on local D1', () => {
  it('isolates draft edits, rejects stale writers and withdraws every derived resource', async () => {
    const db = platform.env.BLOG_DB;
    const original = normalizeContent({ kind: 'article', title: '真实标题', markdown: '第一版正文', summary: '第一版摘要' });
    let draft = await createPost(db, 'owner', original, 'lifecycle');
    await expect(getPublicPost(db, draft.slug)).rejects.toMatchObject({ statusCode: 404 });
    draft = await transitionPost(db, draft.id, draft.version, 'publish');
    const first = await getPublicPost(db, draft.slug);
    const changes = { ...original, title: '未发布标题', markdown: '私有草稿文字', summary: '草稿摘要' };
    const oldVersion = draft.version;
    draft = await savePost(db, draft.id, draft.version, changes);
    await expect(savePost(db, draft.id, oldVersion, original)).rejects.toMatchObject({ statusCode: 409 });
    expect((await getPublicPost(db, draft.slug)).markdown).toBe('第一版正文');
    const listing = await listPublic(db);
    expect(listing.items[0]?.title).toBe('真实标题');
    expect(listing.items[0]).not.toHaveProperty('markdown');
    expect(JSON.stringify(listing)).not.toContain('私有草稿');
    const entries = await allPublic(db);
    for (const text of [rss(entries, 'https://yishuai.wang', 'article'), sitemap(entries, 'https://yishuai.wang'), llms(entries, 'https://yishuai.wang'), markdownDocument(first, 'https://yishuai.wang')]) {
      expect(text).not.toContain('私有草稿'); expect(text).not.toContain('未发布标题');
    }
    draft = await transitionPost(db, draft.id, draft.version, 'publish');
    expect((await getPublicPost(db, draft.slug)).publishedAt).toBe(first.publishedAt);
    expect((await getPublicPost(db, draft.slug)).markdown).toBe('私有草稿文字');
    draft = await transitionPost(db, draft.id, draft.version, 'unpublish');
    await expect(getPublicPost(db, draft.slug)).rejects.toMatchObject({ statusCode: 404 });
    expect((await allPublic(db)).some(p => p.id === draft.id)).toBe(false);
    draft = await transitionPost(db, draft.id, draft.version, 'delete');
    await expect(getPublicPost(db, draft.slug)).rejects.toMatchObject({ statusCode: 410 });
    draft = await transitionPost(db, draft.id, draft.version, 'restore');
    expect(draft.status).toBe('draft');
    expect((await getPost(db, draft.id)).draft_json).toContain('私有草稿');
  });
  it('keeps permanent routes and published timestamps stable', async () => {
    const db = platform.env.BLOG_DB;
    let draft = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'Stable', markdown: 'body' }));
    draft = await transitionPost(db, draft.id, draft.version, 'publish');
    const first = await getPublicPost(db, draft.slug);
    await expect(savePost(db, draft.id, draft.version, { ...draft, kind: 'note' })).rejects.toMatchObject({ statusCode: 409 });
    draft = await transitionPost(db, draft.id, draft.version, 'publish');
    expect((await getPublicPost(db, draft.slug)).updatedAt).toBe(first.updatedAt);
    draft = await transitionPost(db, draft.id, draft.version, 'delete');
    await transitionPost(db, draft.id, draft.version, 'restore');
    expect((await getPublicPost(db, draft.slug)).url).toBe(first.url);
    expect((await listPublic(db, { query: '一个很长的中文关键词，不应该触发数据库的 LIKE 五十字节限制' })).total).toBe(0);
  });
});

describe('moderation and user-generated content', () => {
  it('keeps pending text/email private, makes retries idempotent and hides child replies', async () => {
    const db = platform.env.BLOG_DB;
    const post = await createPost(db, 'owner', normalizeContent({ kind: 'note', markdown: '讨论正文' }));
    await transitionPost(db, post.id, post.version, 'publish');
    const request = { postId: post.id, author: '读者', email: 'private@example.test', markdown: '留言 [链接](https://example.com)', requestKey: uuid() };
    const receipts = await Promise.all([createComment(db, request), createComment(db, request)]);
    expect(receipts[0]?.id).toBe(receipts[1]?.id);
    expect(await listComments(db, post.id, 'owner')).toEqual([]);
    const parentId = receipts[0]!.id;
    await db.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(parentId).run();
    const visible = await listComments(db, post.id, 'owner');
    expect(visible[0]?.html).toContain('ugc nofollow noopener');
    expect(JSON.stringify(visible)).not.toContain('private@example.test');
    expect(Object.keys(visible[0]!)).not.toContain('email');
    const reply = await createComment(db, { ...request, parentId, requestKey: uuid() });
    await db.prepare("UPDATE comments SET status='approved' WHERE id=?").bind(reply.id).run();
    expect((await listComments(db, post.id, 'owner')).length).toBe(2);
    await db.prepare("UPDATE comments SET status='hidden' WHERE id=?").bind(parentId).run();
    expect(await listComments(db, post.id, 'owner')).toEqual([]);
    const other = await createPost(db, 'owner', normalizeContent({ kind: 'note', markdown: '另一则' }));
    await transitionPost(db, other.id, other.version, 'publish');
    await expect(createComment(db, { ...request, postId: other.id, parentId: reply.id, requestKey: uuid() })).rejects.toMatchObject({ statusCode: 400 });
  });
  it('preserves source while sanitizing public HTML and exporting Markdown', () => {
    const source = '<h2>标题</h2><p>正文<script>alert(1)</script><img src="x" onerror="evil()"></p>';
    const content = normalizeContent({ kind: 'note', sourceFormat: 'html', source });
    expect(content.source).toBe(source); expect(content.markdown).toContain('## 标题'); expect(content.markdown).not.toContain('alert(1)');
    const rendered = renderComment('<img src=x onerror=evil()> [x](javascript:evil)');
    expect(rendered).not.toContain('<img'); expect(rendered).not.toContain('href="javascript:');
  });
});

it('stores supported images in local R2 and rejects active document uploads', async () => {
  expect(() => imageMime(new TextEncoder().encode('<svg onload="evil()"/>'))).toThrow();
  const bytes = Uint8Array.from([137,80,78,71,13,10,26,10,0,0]);
  const url = await storeImage(platform.env, new File([bytes], 'image.png', { type: 'image/png' }));
  const record = await platform.env.BLOG_DB.prepare('SELECT object_key FROM media WHERE id=?').bind(url.split('/').at(-1)).first<{ object_key: string }>();
  expect(await platform.env.BLOG_MEDIA.head(record!.object_key)).not.toBeNull();
});
