import MarkdownIt from 'markdown-it';
import Turndown from 'turndown';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import type { Content } from '../../shared/types';

/** @param value - Optional cover address. @returns Whether it is a stored image or an ordinary external image URL. */
function validCover(value: string): boolean {
  if (!value || /^\/media\/[a-f0-9-]{36}$/.test(value)) return true;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
  catch { return false; }
}
export const contentSchema = z.object({
  language: z.enum(['zh', 'en']).default('zh'),
  kind: z.enum(['article', 'note']), title: z.string().trim().max(200).default(''),
  summary: z.string().trim().max(500).default(''), markdown: z.string().max(200000).default(''),
  coverUrl: z.string().trim().max(2048).refine(validCover, '封面地址无效。').default(''),
  category: z.string().trim().max(40).default('随笔'), tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  sourceFormat: z.enum(['markdown', 'text', 'html']).default('markdown'), source: z.string().max(200000).default(''),
  properties: z.record(z.string().max(80), z.array(z.unknown()).max(100)).default({}),
});
const toMarkdown = new Turndown({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
const parser = new MarkdownIt({ html: false, linkify: false });
/** @param source - HTML from a third-party publishing client. @returns Safe semantic HTML. */
export function safeHtml(source: string): string {
  return sanitizeHtml(source, { allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: { a: ['href', 'title', 'rel'], img: ['src', 'alt', 'width', 'height'], code: ['class'], th: ['scope', 'colspan'], td: ['colspan'] },
    allowedSchemes: ['https', 'http', 'mailto'], allowedSchemesByTag: { img: ['https', 'http'] }, allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow ugc noopener' }) },
  });
}
/** @param content - Stored source. @returns Safe HTML for non-Markdown sources and comments. */
export function renderContent(content: Content): string {
  return safeHtml(content.sourceFormat === 'html' ? content.source : parser.render(content.sourceFormat === 'text' ? escapeMarkdown(content.source) : content.markdown));
}
/** @param value - Plain source. @returns Literal Markdown with no accidental formatting. */
export function escapeMarkdown(value: string): string { return value.replace(/[\\`*_{}[\]<>#+.!|~-]/g, '\\$&'); }
/** @param value - User submitted content. @returns Normalized draft with the original source retained. */
export function normalizeContent(value: unknown): Content {
  const parsed = contentSchema.parse(value);
  if (parsed.sourceFormat === 'markdown') parsed.source = parsed.markdown;
  if (parsed.sourceFormat === 'html') parsed.markdown = toMarkdown.turndown(safeHtml(parsed.source));
  if (parsed.sourceFormat === 'text') parsed.markdown = escapeMarkdown(parsed.source);
  parsed.tags = [...new Set(parsed.tags)];
  if (!parsed.summary) parsed.summary = sanitizeHtml(renderContent(parsed), { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').slice(0, 180);
  return parsed;
}
/** @param content - Proposed public snapshot. @returns Whether it contains publishable content. */
export function canPublish(content: Content): boolean {
  return !!(content.sourceFormat === 'markdown' ? content.markdown : content.source).trim() && (content.kind === 'note' || !!content.title.trim());
}
/** @param markdown - Anonymous or authenticated comment. @returns Sanitized markup with UGC links. */
export function renderComment(markdown: string): string {
  return sanitizeHtml(parser.render(markdown), { allowedTags: ['p','br','strong','em','s','code','pre','blockquote','ul','ol','li','a'],
    allowedAttributes: { a: ['href','title','rel'] }, allowedSchemes: ['https','http','mailto'], allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'ugc nofollow noopener' }) },
  });
}
