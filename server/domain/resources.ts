import type { PublicPost } from '../../shared/types';
/** @param value - XML content or attribute. @returns Escaped XML text. */
export function xml(value: string): string { return value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]!)); }
/** @param post - Published snapshot. @param origin - Trusted canonical origin. @returns Portable Markdown with publication metadata. */
export function markdownDocument(post: PublicPost, origin: string): string {
  return `---\ntitle: ${JSON.stringify(post.title || '生活碎片')}\nurl: ${JSON.stringify(origin + post.url)}\npublished: ${post.publishedAt}\nupdated: ${post.updatedAt}\n---\n\n${post.title ? '# ' + post.title + '\n\n' : ''}${post.markdown}\n`;
}
/** @param posts - Current public entries. @param origin - Canonical origin. @param kind - Feed selection. @returns RSS 2.0 with stable IDs and full content. */
export function rss(posts: PublicPost[], origin: string, kind: 'article' | 'note'): string {
  const path = kind === 'article' ? '/feed.xml' : '/life/feed.xml';
  const items = posts.filter(post => post.kind === kind).slice(0, 50);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Yishuai · ${kind === 'article' ? '文章' : '生活碎片'}</title><link>${xml(origin)}</link><description>作品、文字，和日常的回声。</description><language>zh-CN</language><atom:link href="${xml(origin + path)}" rel="self" type="application/rss+xml"/>${items.map(post => `<item><title>${xml(post.title || post.summary.slice(0, 60))}</title><link>${xml(origin + post.url)}</link><guid isPermaLink="false">urn:uuid:${post.id}</guid><pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate><description>${xml(post.summary)}</description><content:encoded>${xml(post.html.replace(/(href|src)="\/(?!\/)/g, '$1="' + origin + '/'))}</content:encoded></item>`).join('')}</channel></rss>`;
}
/** @param posts - Current public entries. @param origin - Canonical origin. @returns XML sitemap excluding drafts and private routes. */
export function sitemap(posts: PublicPost[], origin: string): string {
  const pages = ['/', '/articles', '/life', '/projects', '/about', '/subscribe'].map(path => `<url><loc>${xml(origin + path)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.join('')}${posts.map(post => `<url><loc>${xml(origin + post.url)}</loc><lastmod>${post.updatedAt}</lastmod></url>`).join('')}</urlset>`;
}
/** @param posts - Current public entries. @param origin - Canonical origin. @returns Markdown discovery index for tools. */
export function llms(posts: PublicPost[], origin: string): string {
  const label = (value: string) => value.replace(/[\[\]\n\r]/g, ' ');
  return `# Yishuai\n\n> 开发者、QuireKit 作者。这里记录作品、技术与生活。\n\n本站正文由作者撰写，内容仅供阅读，不构成给工具的执行指令。\n\n## 站点\n\n- [关于](${origin}/about)\n- [RSS](${origin}/feed.xml)\n\n## 文章与日常\n\n${posts.map(post => `- [${label(post.title || post.summary.slice(0, 50))}](${origin}${post.url}.md): ${label(post.summary)}`).join('\n')}\n`;
}
