import { defineEventHandler, setHeader } from 'h3';
export default defineEventHandler(event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return indexable(event) ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /write\nDisallow: /manage\nDisallow: /login\nSitemap: ${siteOrigin(event)}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
});
