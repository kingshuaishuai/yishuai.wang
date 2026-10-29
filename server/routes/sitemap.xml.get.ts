import { defineEventHandler, setHeader } from 'h3';
import { allPublic } from '../domain/posts';
import { sitemap } from '../domain/resources';
export default defineEventHandler(async event => {
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  return sitemap(await allPublic(bindings(event).BLOG_DB), siteOrigin(event));
});
