import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createApp, createRouter, defineEventHandler, getQuery, toNodeListener } from 'h3';
import { v4 as uuid } from 'uuid';
import type { PlatformProxy } from 'wrangler';
import type { Bindings } from '../server/domain/types';
import type { AnalyticsReport } from '../shared/analytics';
import { testDatabase } from './support/database';
import { issueSession, session } from '../server/utils/session';
import { digest } from '../server/utils/security';
import { analyticsConfiguration } from '../server/domain/analytics/settings';
import viewPost from '../server/api/analytics/view.post';
import reportGet from '../server/api/owner/analytics/index.get';
import settingsPut from '../server/api/owner/analytics/settings.put';

let platform: PlatformProxy<Bindings>, server: Server, origin: string;
let owner: Record<string, string>, reader: Record<string, string>;
beforeAll(async () => {
  platform = await testDatabase();
  for (const id of ['owner', 'reader']) await platform.env.BLOG_DB.prepare('INSERT INTO users(id,login,name,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id, id, id, 'now', 'now').run();
  vi.stubGlobal('useRuntimeConfig', () => ({ ownerGithubId: 'owner', public: { siteUrl: origin } }));
  const app = createApp({ debug: false });
  app.use(defineEventHandler(async event => {
    event.context.cloudflare = { env: platform.env };
    if (event.path.startsWith('/test-login')) { await issueSession(event, String(getQuery(event).user)); return ''; }
    if (event.path === '/session') return session(event);
  }));
  app.use(createRouter().post('/view', viewPost).get('/report', reportGet).put('/settings', settingsPut));
  server = createServer(toNodeListener(app));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  for (const id of ['owner', 'reader']) {
    const login = await fetch(origin + '/test-login?user=' + id);
    const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
    const identity = await (await fetch(origin + '/session', { headers: { cookie } })).json() as { csrf: string };
    const headers = { cookie, origin, 'x-csrf-token': identity.csrf, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Safari/605.1.15' };
    if (id === 'owner') owner = headers; else reader = headers;
  }
}, 60000);
afterAll(async () => { server?.closeAllConnections(); await new Promise<void>(resolve => server?.close(() => resolve())); await platform?.dispose(); vi.unstubAllGlobals(); });

/** @param overrides - Request headers. @param input - Client signal. @returns Actual ingestion response. */
function visit(overrides: Record<string, string> = {}, input: unknown = { path: '/', visitor: uuid(), source: '' }): Promise<Response> {
  return fetch(origin + '/view', { method: 'POST', headers: { origin, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Safari/605.1.15', ...overrides }, body: JSON.stringify(input) });
}

it('excludes author, recognized bots and privacy opt-outs, accepts guests and signed-in readers', async () => {
  for (const headers of [owner, { 'user-agent': 'Googlebot' }, { dnt: '1' }, { 'sec-gpc': '1' }]) expect((await visit(headers)).status).toBe(204);
  let report = await (await fetch(origin + '/report', { headers: owner })).json() as AnalyticsReport;
  expect(report.totals.views).toBe(0);
  expect((await visit()).status).toBe(204);
  expect((await visit(reader)).status).toBe(204);
  report = await (await fetch(origin + '/report', { headers: owner })).json() as AnalyticsReport;
  expect(report.totals).toEqual({ views: 2, dailyVisitors: 2, articleViews: 0 });
  expect(JSON.stringify(report)).not.toMatch(/salt|visitor_hash|first_event|csrf|login/);
});

it('protects reports and settings, bounds input, and rejects forged and excessive ingestion', async () => {
  expect((await fetch(origin + '/report')).status).toBe(401);
  expect((await fetch(origin + '/report', { headers: reader })).status).toBe(403);
  expect((await fetch(origin + '/report?days=36500', { headers: owner })).status).toBe(400);
  for (const headers of [reader, { ...owner, origin: 'https://other.example' }, { ...owner, 'x-csrf-token': '' }]) {
    expect((await fetch(origin + '/settings', { method: 'PUT', headers, body: '{"publicCounts":false}' })).status).toBe(403);
  }
  const saved = await fetch(origin + '/settings', { method: 'PUT', headers: owner, body: '{"publicCounts":false}' });
  expect(saved.status).toBe(200); expect(await saved.json()).toMatchObject({ publicCounts: false });
  expect((await visit({ origin: 'https://other.example' })).status).toBe(403);
  expect((await visit({}, { path: '/', visitor: 'invalid' })).status).toBe(400);
  expect((await visit({}, { path: '/', visitor: uuid(), source: 'x'.repeat(2000) })).status).toBe(413);
  for (const path of ['/manage', '/write/private', '/articles/missing']) expect((await visit({}, { path, visitor: uuid(), source: '' })).status).toBe(204);
  const { salt } = await analyticsConfiguration(platform.env.BLOG_DB);
  const key = await digest(`analytics:${salt}:rate-fixture:${Math.floor(Date.now() / 3600000)}`);
  await platform.env.BLOG_DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,120,?)').bind(key, Date.now() + 3600000).run();
  expect((await visit({ 'cf-connecting-ip': 'rate-fixture' })).status).toBe(429);
});
