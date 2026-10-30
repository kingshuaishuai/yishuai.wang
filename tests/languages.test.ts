import { beforeAll, afterAll, expect, it } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { readFile, readdir } from 'node:fs/promises';
import type { Bindings } from '../server/domain/types';
import { normalizeContent } from '../server/domain/content';
import { createPost, getPost, getPublicPost, savePost, transitionPost, allPublic, listPublic } from '../server/domain/posts';
import { createTranslation } from '../server/domain/translations';
import { rss, sitemap, markdownDocument } from '../server/domain/resources';
import { fromProperties, sourceProperties } from '../server/micropub/content';
import { postFromUrl, updatePost } from '../server/micropub/posts';
import { localizedPath, pathLanguage, unlocalizedPath } from '../shared/language';
let platform: PlatformProxy<Bindings>;
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    const schema = await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8');
    for (const sql of schema.split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
}, 60000);
afterAll(async () => { await platform?.dispose(); });

it('preserves query strings and fragments when switching the home language', () => {
  expect(pathLanguage('/en?source=rss')).toBe('en');
  expect(unlocalizedPath('/en#main')).toBe('/#main');
  expect(localizedPath('/en?source=rss', 'zh')).toBe('/?source=rss');
  expect(localizedPath('/?source=rss', 'en')).toBe('/en?source=rss');
  expect(localizedPath('/articles?lang=all', 'en')).toBe('/en/articles?lang=all');
});

it('isolates language versions, filters published snapshots and withdraws alternate links', async () => {
  const db = platform.env.BLOG_DB, origin = 'https://yishuai.wang';
  let zh = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: '中文', markdown: '正文' }), 'language-zh');
  // Historical JSON predates the language field and must remain readable.
  await db.prepare("UPDATE posts SET draft_json=json_remove(draft_json,'$.language') WHERE id=?").bind(zh.id).run();
  zh = await transitionPost(db, zh.id, zh.version, 'publish');
  expect((await getPublicPost(db, zh.slug)).language).toBe('zh');
  const attempts = await Promise.all([createTranslation(db, zh.id, 'en'), createTranslation(db, zh.id, 'en')]);
  expect(attempts[0].id).toBe(attempts[1].id);
  let en = attempts[0];
  expect(en.markdown).toBe('');
  expect((await getPublicPost(db, zh.slug)).translations).toEqual([{ language: 'zh', url: '/articles/language-zh' }]);
  expect((await listPublic(db, { language: 'en' })).total).toBe(0);
  en = await savePost(db, en.id, en.version, { ...en, title: 'English version', markdown: 'English body' });
  en = await transitionPost(db, en.id, en.version, 'publish');
  const englishUrl = `/en/articles/${en.slug}`;
  const publicZh = await getPublicPost(db, zh.slug), publicEn = await getPublicPost(db, en.slug);
  expect(publicEn.url).toBe(englishUrl);
  expect(publicZh.translations).toEqual(publicEn.translations);
  expect(publicZh.translations).toContainEqual({ language: 'en', url: englishUrl });
  expect((await listPublic(db, { language: 'zh' })).items.map(p => p.id)).toEqual([zh.id]);
  expect((await listPublic(db, { language: 'en' })).items.map(p => p.id)).toEqual([en.id]);
  expect((await listPublic(db, { language: 'all' })).total).toBe(2);
  const posts = await allPublic(db);
  expect(rss(posts, origin, 'article', 'zh')).not.toContain('English body');
  expect(rss(posts, origin, 'article', 'en')).toContain('English body');
  expect(rss(posts, origin, 'article', 'all')).toContain('正文');
  expect(sitemap(posts, origin)).toContain(`hreflang="en" href="${origin}${englishUrl}"`);
  expect(markdownDocument(publicEn, origin)).toContain('language: en');
  await expect(savePost(db, en.id, en.version, { ...en, language: 'zh' })).rejects.toMatchObject({ statusCode: 409 });
  en = await transitionPost(db, en.id, en.version, 'unpublish');
  expect((await getPublicPost(db, zh.slug)).translations).toHaveLength(1);
  expect(sitemap(await allPublic(db), origin)).not.toContain(origin + englishUrl);
  await expect(savePost(db, en.id, en.version, { ...en, language: 'zh' })).rejects.toMatchObject({ statusCode: 409 });
});

it('round trips language through Micropub and protects the permanent route', async () => {
  const db = platform.env.BLOG_DB, origin = 'https://yishuai.wang';
  const content = fromProperties({ name: ['A note on language'], content: ['Hello'], lang: ['en'] });
  let draft = await createPost(db, 'owner', content);
  draft = await transitionPost(db, draft.id, draft.version, 'publish');
  expect(sourceProperties(draft).lang).toEqual(['en']);
  const row = await postFromUrl(db, `${origin}/en/articles/${draft.slug}`, origin);
  expect(row.id).toBe(draft.id);
  await expect(updatePost(db, await getPost(db, draft.id), { ...content, language: 'zh' }, true)).rejects.toMatchObject({ statusCode: 409 });
  await expect(postFromUrl(db, `${origin}/articles/${draft.slug}`, origin)).rejects.toMatchObject({ statusCode: 400 });
});
