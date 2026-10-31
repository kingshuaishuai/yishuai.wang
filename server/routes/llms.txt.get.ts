import { defineEventHandler, setHeader } from 'h3';
import { discoveryEntries } from '../domain/discovery/read';
import { llms } from '../domain/resources';
export default defineEventHandler(async event => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  return llms(await discoveryEntries(bindings(event).BLOG_DB), siteOrigin(event));
});
