import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';
import { fileURLToPath } from 'node:url';

const harness = createTestHarness({ workers: [{ config: {
  name: 'ai-provider-runtime-test', compatibility_date: '2026-10-29',
  main: fileURLToPath(new URL('./fixtures/ai-provider-worker.ts', import.meta.url)),
} }] });
beforeAll(async () => { await harness.listen(); }, 60000);
afterAll(async () => { await harness.close(); });

it('generates using request options supported by the real Workers runtime', async () => {
  const response = await harness.fetch('/success');
  expect(await response.json()).toEqual({ text: 'Workers 中生成的总结。', calls: 1, redirect: 'manual' });
});

it('rejects provider redirects without forwarding credentials to another destination', async () => {
  const response = await harness.fetch('/redirect');
  expect(await response.json()).toEqual({ code: 'provider', calls: 1, redirect: 'manual' });
});
