import { createError, getQuery, setHeader, type H3Event } from 'h3';
import { allPublic } from '../domain/posts';
import { rss } from '../domain/resources';
import { bindings } from './bindings';
import { siteOrigin } from './config';
/** @param event - Feed request. @param kind - Feed content kind. @returns XML for one language or the explicit all-language feed. */
export async function feedResponse(event: H3Event, kind: 'article' | 'note'): Promise<string> {
  const language = getQuery(event).lang ?? (event.path.startsWith('/en/') ? 'en' : 'zh');
  if (language !== 'zh' && language !== 'en' && language !== 'all') throw createError({ statusCode: 400, message: 'Invalid feed language.' });
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8');
  return rss(await allPublic(bindings(event).BLOG_DB), siteOrigin(event), kind, language);
}
