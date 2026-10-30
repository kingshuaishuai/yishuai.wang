import { createError, createEventStream, defineEventHandler, getRouterParam, setHeader } from 'h3';
import type { SummaryEvent } from '../../../../../shared/ai';
import { beginSummary, runSummary } from '../../../../domain/ai/jobs';
import { SummaryFailure } from '../../../../domain/ai/provider';
export default defineEventHandler(async event => {
  await requireOwner(event, true);
  await rateLimit(event, 'ai-summary', 10, 600);
  const db = bindings(event).BLOG_DB;
  const job = await beginSummary(db, getRouterParam(event, 'id')!, true);
  if (!job) throw createError({ statusCode: 409, message: '请先启用智能总结并发布文章，或等待当前生成完成。' });
  const stream = createEventStream(event);
  setHeader(event, 'cache-control', 'private, no-store');
  setHeader(event, 'x-accel-buffering', 'no');
  /** @param message - Author-only status without keys or provider internals. */
  async function emit(message: SummaryEvent): Promise<void> {
    await stream.push({ event: 'summary', data: JSON.stringify(message) }).catch(() => {});
  }
  const task = (async () => {
    try {
      const summary = await runSummary(db, String(useRuntimeConfig(event).aiSettingsSecret || ''), job, text => emit({ type: 'delta', text }));
      await emit({ type: 'complete', summary });
    } catch (error) { await emit({ type: 'error', code: error instanceof SummaryFailure ? error.code : 'provider' }); }
    finally { await stream.close().catch(() => {}); }
  })();
  event.context.waitUntil?.(task);
  return stream.send();
});
