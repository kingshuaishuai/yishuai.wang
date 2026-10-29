import { articles } from '../content.ts';
import type { Article } from '../types.ts';
import type { PublicResource } from './types.ts';

const origin = 'https://yishuai.wang';

/**
 * Escape text nodes and attributes without allowing article content to form XML.
 * @param value - Unescaped content.
 * @returns XML-safe text.
 */
function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

/**
 * Package the original Markdown with its permanent attribution and source URL.
 * @param article - One public example article.
 * @returns Standalone Markdown with no site navigation or editor state.
 */
function markdown(article: Article): string {
  return `# ${article.title}\n\n> ${article.summary}\n\n作者：Yishuai  \n日期：${article.date.replaceAll('.', '-')}  \n原文：${origin}/articles/${article.slug}\n\n${article.content}\n`;
}

/**
 * Build a valid RSS summary feed with stable entry identities.
 * @returns RSS 2.0 XML; the example dates stay stable across builds.
 */
function rss(): string {
  const items = articles.map(article => {
    const url = `${origin}/articles/${article.slug}`;
    const published = new Date(`${article.date.replaceAll('.', '-')}T12:00:00+08:00`).toUTCString();
    return `<item><title>${xml(article.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><description>${xml(article.summary)}</description><category>${xml(article.category)}</category><pubDate>${published}</pubDate></item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Yishuai · 创造与记录</title><link>${origin}/</link><description>作品、技术思考与生活记录。当前为示例内容预览。</description><language>zh-CN</language><atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>\n${items.join('\n')}\n</channel></rss>\n`;
}

/**
 * Generate the same public resources for development and a static preview build.
 * @returns Feed, concise agent index and individual Markdown documents.
 */
export function createPublicResources(): PublicResource[] {
  const index = `# Yishuai\n\n> yishuai.wang 是 Yishuai 的个人主页与博客，记录项目、技术思考与生活。\n\n网站使用 QuireKit。当前内容为设计预览的示例文章，正式域名内容尚待部署。文章的 Markdown 包含作者、日期与原文地址。RSS 提供文章摘要。\n\n## 文章\n\n${articles.map(article => `- [${article.title}](${origin}/articles/${article.slug}.md): ${article.summary}`).join('\n')}\n\n## Optional\n\n- [RSS 订阅](${origin}/feed.xml): 文章更新与永久地址。\n`;
  return [
    { path: '/feed.xml', body: rss(), contentType: 'application/rss+xml; charset=utf-8' },
    { path: '/llms.txt', body: index, contentType: 'text/plain; charset=utf-8' },
    ...articles.map(article => ({ path: `/articles/${article.slug}.md`, body: markdown(article), contentType: 'text/markdown; charset=utf-8', canonical: `${origin}/articles/${article.slug}` })),
  ];
}
