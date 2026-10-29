import { defineEventHandler } from 'h3';
import { contentOptions } from '../../domain/taxonomy';
export default defineEventHandler(async event => {
  await requireOwner(event);
  return contentOptions(bindings(event).BLOG_DB);
});
