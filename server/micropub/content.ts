import type { Content, DraftPost } from '../../shared/types';
import type { Properties, MicropubInput } from './types';
import { normalizeContent, renderContent } from '../domain/content';
import { mpError } from './errors';
/** @param properties - Microformats properties. @param kind - Existing permanent route type, when editing. @returns One source-preserving content snapshot. */
export function fromProperties(properties: Properties, kind?: 'article' | 'note'): Content {
  const status = properties['post-status'], visibility = properties.visibility;
  if (status && (status.length !== 1 || !['published', 'draft'].includes(String(status[0])))) throw mpError(400, 'Only published and draft post-status are supported.');
  if (visibility && (visibility.length !== 1 || visibility[0] !== 'public')) throw mpError(400, 'Private and unlisted posts are not supported. Use post-status=draft.');
  const text = (key: string) => typeof properties[key]?.[0] === 'string' ? properties[key]![0] as string : '';
  const value = properties.content?.[0];
  const html = value && typeof value === 'object' && 'html' in value && typeof value.html === 'string' ? value.html : null;
  const markdown = text('mp-markdown');
  const title = text('name'), sourceFormat = markdown ? 'markdown' : html !== null ? 'html' : 'text';
  const tags = (properties.category || []).filter((value): value is string => typeof value === 'string');
  let source = html ?? (typeof value === 'string' ? value : '');
  // External images remain URLs; the server never fetches arbitrary client-supplied hosts.
  const photos = (properties.photo || []).map(value => typeof value === 'string' ? { value, alt: '' } : value as { value?: string; alt?: string }).filter(value => value && typeof value.value === 'string');
  if (photos.length && sourceFormat !== 'markdown') {
    const original = sourceFormat === 'html' ? source : renderContent(normalizeContent({ kind: 'note', sourceFormat: 'text', source }));
    source = original + photos.map(photo => { let url: URL; try { url = new URL(photo.value!); } catch { throw mpError(400, 'Invalid photo URL.'); } if (!['https:','http:'].includes(url.protocol)) throw mpError(400, 'Invalid photo URL.'); return `<img src="${url.href.replaceAll('&','&amp;').replaceAll('"','&quot;')}" alt="${String(photo.alt || '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')}">`; }).join('');
  }
  const featured = properties.featured?.[0];
  const coverUrl = typeof featured === 'string' ? featured : featured && typeof featured === 'object' && 'value' in featured ? featured.value : '';
  return normalizeContent({ kind: kind || (title ? 'article' : 'note'), title, language: text('lang') || 'zh', summary: text('summary'), coverUrl, category: tags[0] || '随笔', tags,
    sourceFormat: photos.length && sourceFormat !== 'markdown' ? 'html' : sourceFormat, source, markdown, properties });
}
/** @param post - Owner projection. @returns Current source using standard HTML/plaintext content semantics. */
export function sourceProperties(post: DraftPost): Properties {
  return { ...post.properties, lang: [post.language || 'zh'], name: post.title ? [post.title] : [], summary: post.summary ? [post.summary] : [], featured: post.coverUrl ? [post.coverUrl] : [], category: post.tags,
    content: post.properties.photo?.length && post.sourceFormat !== 'markdown' ? post.properties.content || [] : [post.sourceFormat === 'text' ? post.source : { html: post.sourceFormat === 'html' ? post.source : renderContent(post) }],
    ...(post.sourceFormat === 'markdown' ? { 'mp-markdown': [post.markdown] } : {}),
    'post-status': [post.status === 'published' ? 'published' : 'draft'], ...(post.publishedAt ? { published: [post.publishedAt] } : {}) };
}
/** @param current - Existing property values. @param update - Replace/add/delete operation. @returns Independent updated properties without mutating the stored source. */
export function updateProperties(current: Properties, update: MicropubInput): Properties {
  const result: Properties = structuredClone(current);
  if (update.replace) for (const [key, values] of Object.entries(update.replace)) result[key] = values;
  if (update.add) for (const [key, values] of Object.entries(update.add)) result[key] = [...(result[key] || []), ...values];
  if (Array.isArray(update.delete)) for (const key of update.delete) delete result[key];
  else if (update.delete) for (const [key, values] of Object.entries(update.delete)) result[key] = (result[key] || []).filter(value => !values.some(remove => JSON.stringify(value) === JSON.stringify(remove)));
  if (update.replace?.content || update.add?.content || Array.isArray(update.delete) && update.delete.includes('content') || !Array.isArray(update.delete) && update.delete?.content) delete result['mp-markdown'];
  return result;
}
