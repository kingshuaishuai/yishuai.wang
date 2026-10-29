import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { contentSchema } from '../../../domain/content';
import { savePost } from '../../../domain/posts';
export default defineEventHandler(async event => {
  await requireOwner(event, true); const input = await body(event, z.object({ version: z.number().int().positive(), content: contentSchema }));
  return savePost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, input.version, input.content);
});
