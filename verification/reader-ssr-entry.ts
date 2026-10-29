import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { QuireMarkdown } from '@quirekit/incremark/vue';

const markdown = [
  '# 服务端可读标题',
  '这是服务端直接生成的正文。',
  '[内部文章](/articles/second-post)',
  '## 小节标题',
  '```ts\nconst answer = 42;\n```',
  '| 列 A | 列 B |\n| --- | --- |\n| 内容一 | 内容二 |',
].join('\n\n');

/**
 * Render representative blog content without installing browser globals.
 * @returns Semantic HTML produced by the published reading component.
 */
export async function renderReaderFixture(): Promise<string> {
  return renderToString(createSSRApp({
    render: () => h(QuireMarkdown, { content: markdown, ssr: 'semantic' }),
  }));
}
