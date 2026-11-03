import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import { renderReadingHtml } from '../app/lib/reading/html';
import { safeHtml } from '../server/domain/content';
import { highlightCode } from '../app/lib/code-highlighting';

describe('HTML article reading', () => {
  it('routes imported code through the shared renderer without losing source or language', async () => {
    const received: { code: string; language: string }[] = [];
    const Code = defineComponent({
      props: { code: { type: String, required: true }, language: String },
      async setup(props) {
        received.push({ code: props.code, language: props.language || '' });
        const tokens = await highlightCode(props.code, props.language);
        return () => h('pre', { 'data-reading-code': true }, h('code', tokens.map(token => h('span', { class: token.className }, token.text))));
      },
    });
    const html = safeHtml('<h2>代码与原文</h2><p>保留 <strong>重点</strong> 和 <code>inline()</code>。</p><blockquote><pre><code class="language-typescript">const html = &quot;&lt;img src=x onerror=alert(1)&gt;&quot;;\n\t// 中文 &amp; 空白  \n</code></pre></blockquote><pre>unknown &lt;literal&gt;\n</pre><table><tbody><tr><td colspan="2">单元格</td></tr></tbody></table>');
    const output = await renderToString(createSSRApp({ render: () => h('article', renderReadingHtml(html, Code)) }));
    expect(received).toEqual([
      { code: 'const html = "<img src=x onerror=alert(1)>";\n\t// 中文 & 空白  \n', language: 'typescript' },
      { code: 'unknown <literal>\n', language: '' },
    ]);
    expect(output).toContain('class="tok-keyword">const');
    expect(output).toContain('<h2>代码与原文</h2>');
    expect(output).toContain('<code>inline()</code>');
    expect(output).toContain('<td colspan="2">单元格</td>');
    expect(output).not.toContain('<img');
    expect(output.match(/data-reading-code/g)).toHaveLength(2);
  });

  it('preserves safe images and links while keeping unsafe HTML out of the reading tree', async () => {
    const html = safeHtml('<p><img src="https://example.com/image.png" alt="图" onerror="alert(1)"></p><a href="javascript:alert(1)">unsafe</a><a href="https://example.com">safe</a><script>alert(1)</script>');
    const output = await renderToString(createSSRApp({ render: () => h('article', renderReadingHtml(html, defineComponent({ render: () => null }))) }));
    expect(output).toContain('alt="图"');
    expect(output).toContain('rel="nofollow ugc noopener"');
    expect(output).not.toMatch(/onerror|javascript:|<script/);
  });
});
