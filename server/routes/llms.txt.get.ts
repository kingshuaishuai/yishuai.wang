import { defineEventHandler, setHeader } from 'h3';
import { allPublic } from '../domain/posts';
import { llms } from '../domain/resources';
export default defineEventHandler(async event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return llms(await allPublic(bindings(event).BLOG_DB), siteOrigin(event));
});
