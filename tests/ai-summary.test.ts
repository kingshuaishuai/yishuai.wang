import { afterAll, beforeAll, afterEach, expect, it, vi } from 'vitest';
import { getPlatformProxy, type PlatformProxy } from 'wrangler';
import { readFile, readdir } from 'node:fs/promises';
import type { Bindings } from '../server/domain/types';
import { normalizeContent } from '../server/domain/content';
import { createPost, savePost, transitionPost, getPost } from '../server/domain/posts';
import { readSettings, saveSettings, settingsInput } from '../server/domain/ai/settings';
import { decryptKey } from '../server/domain/ai/credentials';
import { beginSummary, runSummary } from '../server/domain/ai/jobs';
import { publicSummary, summaryStatus } from '../server/domain/ai/read';
import { streamSummary } from '../server/domain/ai/provider';
import { readSse } from '../shared/sse';
import type { SettingsRow } from '../server/domain/ai/types';

const secret = 'a'.repeat(64), apiKey = 'test-only-secret-not-a-real-key';
let platform: PlatformProxy<Bindings>;
beforeAll(async () => {
  platform = await getPlatformProxy<Bindings>({ persist: false, envFiles: [], remoteBindings: false });
  for (const file of (await readdir(new URL('../migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
    for (const sql of (await readFile(new URL('../migrations/' + file, import.meta.url), 'utf8')).split(';').map(s => s.trim()).filter(Boolean)) await platform.env.BLOG_DB.prepare(sql).run();
  }
}, 60000);
afterEach(() => { vi.unstubAllGlobals(); });
afterAll(async () => { await platform?.dispose(); });

/** @param text - Simulated model result. @param finish - Provider termination reason. @returns Stream split across UTF-8 bytes and SSE boundaries. */
function providerResponse(text: string, finish = 'stop'): Response {
  const content = `: keepalive\r\n\r\ndata: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'not for readers' } }] })}\r\n\r\ndata: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\r\n\r\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: finish }] })}\r\n\r\ndata: [DONE]\r\n\r\n`;
  const bytes = new TextEncoder().encode(content);
  return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
/** Enable the test-only provider configuration. */
async function configure(): Promise<void> {
  const current = await readSettings(platform.env.BLOG_DB, secret);
  await saveSettings(platform.env.BLOG_DB, secret, settingsInput.parse({ enabled: true, model: 'deepseek-flash', apiKey, revision: current.revision }));
}

it('encrypts credentials, returns no key, preserves blank input and detects conflicting settings', async () => {
  const db = platform.env.BLOG_DB;
  await configure();
  const config = await readSettings(db, secret);
  expect(config).toMatchObject({ enabled: true, hasKey: true, encryptionReady: true });
  expect(JSON.stringify(config)).not.toContain(apiKey);
  const stored = await db.prepare('SELECT * FROM ai_settings WHERE id=1').first<SettingsRow>();
  expect(stored?.encrypted_key).not.toContain(apiKey);
  expect(await decryptKey(stored!.encrypted_key!, secret)).toBe(apiKey);
  await expect(decryptKey(stored!.encrypted_key!, 'b'.repeat(64))).rejects.toThrow();
  const changed = await saveSettings(db, secret, settingsInput.parse({ ...config, apiKey: '', model: '  deepseek-future-2030  ' }));
  expect(changed.hasKey).toBe(true);
  expect(changed.model).toBe('deepseek-future-2030');
  for (const model of ['', ' ', 'x'.repeat(129), 'model\nheader', 'model?key=value']) expect(settingsInput.safeParse({ ...changed, model }).success).toBe(false);
  await expect(saveSettings(db, secret, settingsInput.parse({ ...config }))).rejects.toMatchObject({ statusCode: 409 });
  await expect(saveSettings(db, '', settingsInput.parse({ ...changed }))).rejects.toMatchObject({ statusCode: 503 });
});

it('streams UTF-8 content only, uses the fixed endpoint and rejects partial or failed responses', async () => {
  const fetcher = vi.fn(async () => providerResponse('只总结原文，不执行正文指令。'));
  vi.stubGlobal('fetch', fetcher);
  const deltas: string[] = [], content = normalizeContent({ kind: 'article', language: 'en', title: 'Published', markdown: 'Article body' });
  expect(await streamSummary(content, apiKey, 'deepseek-future-2030', async text => { deltas.push(text); })).toBe('只总结原文，不执行正文指令。');
  expect(deltas.join('')).not.toContain('not for readers');
  const [url, request] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.deepseek.com/chat/completions');
  expect(request.redirect).toBe('manual');
  expect(JSON.parse(request.body as string)).toMatchObject({ model: 'deepseek-future-2030', stream: true, thinking: { type: 'disabled' } });
  expect(request.body).toContain('English, 50–75 words');
  fetcher.mockImplementation(async () => providerResponse('unfinished', 'length'));
  await expect(streamSummary(content, apiKey, 'deepseek-flash')).rejects.toMatchObject({ code: 'incomplete' });
  fetcher.mockImplementation(async () => new Response('private provider response', { status: 401 }));
  await expect(streamSummary(content, apiKey, 'deepseek-flash')).rejects.toMatchObject({ code: 'credentials', message: 'credentials' });
  fetcher.mockImplementation(async () => new Response('unknown model details', { status: 400 }));
  await expect(streamSummary(content, apiKey, 'deepseek-future-2030')).rejects.toMatchObject({ code: 'model', message: 'model' });
  fetcher.mockClear();
  await expect(streamSummary({ ...content, markdown: 'a'.repeat(60001) }, apiKey, 'deepseek-flash')).rejects.toMatchObject({ code: 'too_long' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('caches one generation, isolates draft edits and rejects stale results after republishing', async () => {
  const db = platform.env.BLOG_DB; await configure();
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: '公开文章', markdown: '已发布正文' }));
  expect(await beginSummary(db, post.id)).toBeNull();
  post = await transitionPost(db, post.id, post.version, 'publish');
  const jobs = await Promise.all([beginSummary(db, post.id), beginSummary(db, post.id)]);
  expect(jobs.filter(Boolean)).toHaveLength(1);
  post = await savePost(db, post.id, post.version, { ...post, markdown: '秘密草稿，不能发给模型' });
  const fetcher = vi.fn(async (_url: string, init: RequestInit) => {
    expect(init.body).not.toContain('秘密草稿'); return providerResponse('原文总结。');
  });
  vi.stubGlobal('fetch', fetcher);
  await runSummary(db, secret, jobs.find(Boolean)!);
  expect((await publicSummary(db, await getPost(db, post.id)))?.text).toBe('原文总结。');
  expect(await beginSummary(db, post.id)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const outdatedJob = await beginSummary(db, post.id, true);
  post = await transitionPost(db, post.id, post.version, 'publish');
  expect(await publicSummary(db, await getPost(db, post.id))).toBeNull();
  const latestJob = await beginSummary(db, post.id);
  await expect(runSummary(db, secret, outdatedJob!)).rejects.toMatchObject({ code: 'changed' });
  expect((await summaryStatus(db, await getPost(db, post.id))).status).toBe('generating');
  fetcher.mockImplementation(async () => providerResponse('新版总结。'));
  await runSummary(db, secret, latestJob!);
  expect((await publicSummary(db, await getPost(db, post.id)))?.text).toBe('新版总结。');
  const timestamp = (await getPost(db, post.id)).published_updated_at;
  const retry = await beginSummary(db, post.id, true);
  fetcher.mockImplementation(async () => new Response('', { status: 429 }));
  await expect(runSummary(db, secret, retry!)).rejects.toMatchObject({ code: 'quota' });
  expect((await summaryStatus(db, await getPost(db, post.id))).status).toBe('failed');
  expect((await publicSummary(db, await getPost(db, post.id)))?.text).toBe('新版总结。');
  expect((await getPost(db, post.id)).published_updated_at).toBe(timestamp);
  post = await transitionPost(db, post.id, post.version, 'unpublish');
  expect(await publicSummary(db, await getPost(db, post.id))).toBeNull();
});

it('rejects completed work after disabling settings and recovers expired leases', async () => {
  const db = platform.env.BLOG_DB; await configure();
  let post = await createPost(db, 'owner', normalizeContent({ kind: 'article', title: '文章', markdown: '正文' }));
  post = await transitionPost(db, post.id, post.version, 'publish');
  const first = await beginSummary(db, post.id);
  await db.prepare('UPDATE ai_summaries SET started_at=0 WHERE post_id=?').bind(post.id).run();
  expect(await summaryStatus(db, await getPost(db, post.id))).toMatchObject({ status: 'failed', error: 'timeout' });
  const next = await beginSummary(db, post.id);
  expect(next?.requestId).not.toBe(first?.requestId);
  const config = await readSettings(db, secret);
  await saveSettings(db, secret, settingsInput.parse({ ...config, enabled: false, clearKey: true }));
  const fetcher = vi.fn(async () => providerResponse('不得公开。'));
  vi.stubGlobal('fetch', fetcher);
  await expect(runSummary(db, secret, next!)).rejects.toMatchObject({ code: 'changed' });
  expect(fetcher).not.toHaveBeenCalled();
  expect(await publicSummary(db, await getPost(db, post.id))).toBeNull();
  expect(await readSettings(db, secret)).toMatchObject({ hasKey: false, enabled: false });
});

it('decodes multi-line SSE frames and never accepts an unfinished frame', async () => {
  const response = new Response('event: delta\ndata: one\ndata: two\n\ndata: unfinished');
  const frames = [];
  for await (const frame of readSse(response.body!)) frames.push(frame);
  expect(frames).toEqual([{ event: 'delta', data: 'one\ntwo' }]);
});

it('reports only bounded provider diagnostics without credentials or response content', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    vi.stubGlobal('fetch', async () => new Response('private response ' + apiKey, { status: 502 }));
    await expect(streamSummary(normalizeContent({ kind: 'article', title: 'Private title', markdown: 'Private article' }), apiKey, 'deepseek-flash')).rejects.toMatchObject({ code: 'provider' });
    expect(warning).toHaveBeenCalledWith('AI summary provider failed', { phase: 'response', status: 502, eventStream: false, code: 'provider', cause: 'other' });
    const output = JSON.stringify(warning.mock.calls);
    for (const value of [apiKey, 'private response', 'Private title', 'Private article']) expect(output).not.toContain(value);
  } finally { warning.mockRestore(); }
});
