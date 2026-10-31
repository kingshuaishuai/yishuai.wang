import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestHarness } from 'wrangler';
import { fileURLToPath } from 'node:url';

const harness = createTestHarness({ workers: [{ config: {
  name: 'micropub-auth-runtime-test', compatibility_date: '2026-10-29',
  main: fileURLToPath(new URL('./fixtures/micropub-auth-worker.ts', import.meta.url)),
} }] });
beforeAll(async () => { await harness.listen(); }, 60000);
afterAll(async () => { await harness.close(); });

it('uses introspection options supported by Workers and never follows credential-bearing redirects', async () => {
  expect(await (await harness.fetch('/success')).json()).toEqual({ active: true, calls: 1, redirect: 'manual' });
  expect(await (await harness.fetch('/redirect')).json()).toEqual({ status: 401, calls: 1, redirect: 'manual' });
});
