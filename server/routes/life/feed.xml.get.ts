import { defineEventHandler, setHeader } from 'h3';
import { allPublic } from '../../domain/posts';
import { rss } from '../../domain/resources';
export default defineEventHandler(async event => {
  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8');
  return rss(await allPublic(bindings(event).BLOG_DB), siteOrigin(event), 'note');
});
