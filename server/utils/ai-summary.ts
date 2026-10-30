import type { H3Event } from 'h3';
import { beginSummary, runSummary } from '../domain/ai/jobs';
import { bindings } from './bindings';
/** @param event - Publishing request. @param postId - Just-published article identity. */
export function scheduleSummary(event: H3Event, postId: string): void {
  const secret = String(useRuntimeConfig(event).aiSettingsSecret || '');
  const db = bindings(event).BLOG_DB;
  const task = (async () => {
    const job = await beginSummary(db, postId);
    if (job) await runSummary(db, secret, job);
  })().catch(() => { /* Failure state is private; publishing never depends on the model. */ });
  const waitUntil = event.context.waitUntil || event.context.cloudflare?.context?.waitUntil?.bind(event.context.cloudflare.context);
  if (waitUntil) waitUntil(task);
}
