import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { transitionPost } from '../../../../domain/posts';
import { scheduleSummary } from '../../../../utils/ai-summary';
import { bindings } from '../../../../utils/bindings';
import { requireOwner } from '../../../../utils/session';
import { body } from '../../../../utils/validate';
export default defineEventHandler(async event => {
  await requireOwner(event, true); const input = await body(event, z.object({ version: z.number().int().positive(), action: z.enum(['publish','unpublish']) }));
  const post = await transitionPost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, input.version, input.action);
  if (post.status === 'published') scheduleSummary(event, post.id);
  return post;
});
