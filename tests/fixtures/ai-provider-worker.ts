import { streamSummary, SummaryFailure } from '../../server/domain/ai/provider';
import type { Content } from '../../shared/types';

const article: Content = { kind: 'article', language: 'zh', title: 'Runtime acceptance', markdown: 'Published text', summary: '', coverUrl: '', category: '', tags: [], sourceFormat: 'markdown', source: '', properties: {} };

export default {
  /** @param incoming - Selects the simulated provider response. @returns The real Workers runtime result without making external requests. */
  async fetch(incoming: Request): Promise<Response> {
    let calls = 0, redirect: string | undefined;
    const nativeFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      calls += 1;
      // Native workerd Request validates options before the test substitutes provider bytes.
      const request = new Request(input, init);
      redirect = request.redirect;
      if (new URL(incoming.url).pathname === '/redirect') return new Response('', { status: 302, headers: { location: 'https://elsewhere.invalid/' } });
      return new Response([
        `data: ${JSON.stringify({ choices: [{ delta: { content: 'Workers 中生成的总结。' } }] })}\n\n`,
        `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
        'data: [DONE]\n\n',
      ].join(''), { headers: { 'content-type': 'text/event-stream' } });
    };
    try {
      const text = await streamSummary(article, 'test-only-not-a-real-key', 'deepseek-flash');
      return Response.json({ text, calls, redirect });
    } catch (error) {
      return Response.json({ code: error instanceof SummaryFailure ? error.code : 'unexpected', calls, redirect });
    } finally { globalThis.fetch = nativeFetch; }
  },
};
