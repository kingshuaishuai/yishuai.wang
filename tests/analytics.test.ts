import { afterAll, beforeAll, expect, it } from 'vitest';
import { v4 as uuid } from 'uuid';
import type { PlatformProxy } from 'wrangler';
import type { Bindings } from '../server/domain/types';
import { normalizeContent } from '../server/domain/content';
import { createPost, savePost, transitionPost } from '../server/domain/posts';
import { analyticsConfiguration, publicViewCount, setPublicCounts } from '../server/domain/analytics/settings';
import { analyticsTarget, analyticsSource } from '../server/domain/analytics/target';
import { analyticsDay, recordView } from '../server/domain/analytics/record';
import { analyticsReport } from '../server/domain/analytics/report';
import { testDatabase } from './support/database';

let platform: PlatformProxy<Bindings>;
beforeAll(async () => { platform = await testDatabase(); }, 60000);
afterAll(async () => { await platform?.dispose(); });

it('counts concurrent visits atomically and separates daily visitors from page views', async () => {
  const db = platform.env.BLOG_DB, now = Date.parse('2026-10-31T04:05:00Z'), visitor = uuid();
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: 'Published title', markdown: 'Hello' }), 'traffic');
  expect(await analyticsTarget(db, '/articles/traffic')).toBeNull();
  post = await transitionPost(db, post.id, post.version, 'publish');
  const target = (await analyticsTarget(db, '/articles/traffic'))!;
  const { salt } = await analyticsConfiguration(db);
  const results = await Promise.all(Array.from({ length: 8 }, () => recordView(db, target, visitor, 'example.com', salt, now)));
  expect(results.filter(Boolean)).toHaveLength(1);
  await recordView(db, target, uuid(), 'direct', salt, now);
  await recordView(db, (await analyticsTarget(db, '/'))!, visitor, 'example.com', salt, now);
  await recordView(db, target, visitor, 'example.com', salt, now + 1800000);
  const report = await analyticsReport(db, 7, now);
  expect(report.daily).toHaveLength(7);
  expect(report.totals).toEqual({ views: 4, dailyVisitors: 2, articleViews: 3 });
  expect(report.pages[0]).toMatchObject({ title: 'Published title', views: 3, path: '/articles/traffic' });
  expect(report.sources).toContainEqual({ source: 'example.com', views: 3 });
  expect(await publicViewCount(db, post.id)).toMatchObject({ count: 3 });
  await setPublicCounts(db, false);
  expect(await publicViewCount(db, post.id)).toBeUndefined();
  expect((await analyticsReport(db, 7, now)).totals.views).toBe(4);
  await setPublicCounts(db, true);
  await recordView(db, target, visitor, 'direct', salt, now + 86400000);
  expect((await analyticsReport(db, 7, now + 86400000)).totals).toEqual({ views: 5, dailyVisitors: 3, articleViews: 4 });
  const privateRows = await db.prepare('SELECT * FROM analytics_events').all();
  const persisted = JSON.stringify(privateRows.results);
  expect(persisted).not.toContain(visitor); expect(persisted).not.toContain(salt);
  expect(new Set(privateRows.results.map(row => row.visitor_hash)).size).toBe(3);
  post = await savePost(db, post.id, post.version, { ...post, title: 'Private draft title' });
  expect((await analyticsReport(db, 7, now)).pages[0]!.title).toBe('Published title');
  post = await transitionPost(db, post.id, post.version, 'unpublish');
  expect(await analyticsTarget(db, '/articles/traffic')).toBeNull();
  expect((await analyticsReport(db, 7, now)).pages[0]!.published).toBe(false);
  // Cleanup removes expired deduplication identities without losing aggregate counts.
  await recordView(db, (await analyticsTarget(db, '/'))!, uuid(), 'direct', salt, now + 5 * 86400000);
  expect((await db.prepare('SELECT count(*) AS n FROM analytics_events WHERE day<?').bind('2026-11-03').first())!.n).toBe(0);
  expect(await publicViewCount(db, post.id)).toMatchObject({ count: 4 });
});

it('admits only canonical public paths and discards private referrer components', async () => {
  const db = platform.env.BLOG_DB;
  for (const path of ['/manage', '/en/account', '/api/posts', '/write/test', '/analytics', '/articles/missing', '/en/articles/traffic', '/articles/traffic.md', '/?q=private', '/en/']) expect(await analyticsTarget(db, path)).toBeNull();
  expect(await analyticsTarget(db, '/en')).toMatchObject({ path: '/en', postId: null });
  expect(analyticsSource('https://user:secret@search.example/find?q=private#fragment', 'https://yishuai.wang')).toBe('search.example');
  expect(analyticsSource('https://yishuai.wang/write/private', 'https://yishuai.wang')).toBe('direct');
  expect(analyticsSource('javascript:secret', 'https://yishuai.wang')).toBe('direct');
  expect(analyticsDay(Date.parse('2026-10-30T16:00:00Z'))).toBe('2026-10-31');
});
