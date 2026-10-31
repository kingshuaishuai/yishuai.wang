import { defineEventHandler, getHeader, setHeader, setResponseStatus } from 'h3';
import { discoveryEntries } from '../domain/discovery/read';
import { sitemap } from '../domain/resources';
import { bindings } from '../utils/bindings';
import { siteOrigin } from '../utils/config';
import { digest } from '../utils/security';
export default defineEventHandler(async event => {
  const content = sitemap(await discoveryEntries(bindings(event).BLOG_DB), siteOrigin(event));
  const etag = `"${await digest(content)}"`;
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  // Revalidate every time: withdrawing an entry must immediately remove its URL.
  setHeader(event, 'Cache-Control', 'public, max-age=0, must-revalidate');
  setHeader(event, 'ETag', etag);
  const candidates = (getHeader(event, 'if-none-match') ?? '').split(',').map(value => value.trim().replace(/^W\//, ''));
  if (candidates.includes(etag) || candidates.includes('*')) { setResponseStatus(event, 304); return ''; }
  return content;
});
