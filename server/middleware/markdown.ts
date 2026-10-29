import { defineEventHandler, setHeader } from 'h3';
import { getPublicPost } from '../domain/posts';
import { markdownDocument } from '../domain/resources';
/** Nitro's segment parameters do not constrain file suffixes; match exports before page routing. */
export default defineEventHandler(async event => {
  const path = event.path.split('?')[0] || '';
  const match = /^\/(articles|life)\/([a-z0-9-]+)\.md$/.exec(path);
  if (!match || !['GET', 'HEAD'].includes(event.method)) return;
  const post = await getPublicPost(bindings(event).BLOG_DB, match[2]!, match[1] === 'articles' ? 'article' : 'note');
  setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8');
  return markdownDocument(post, siteOrigin(event));
});
