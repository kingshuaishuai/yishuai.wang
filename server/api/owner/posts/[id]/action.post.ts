import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { transitionPost } from '../../../../domain/posts';
export default defineEventHandler(async event => {
  await requireOwner(event, true); const input = await body(event, z.object({ version: z.number().int().positive(), action: z.enum(['publish','unpublish','delete','restore']) }));
  return transitionPost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, input.version, input.action);
});
