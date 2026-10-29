import { defineEventHandler, setResponseStatus } from 'h3';
import { z } from 'zod';
import { contentSchema } from '../../../domain/content';
import { createPost } from '../../../domain/posts';
export default defineEventHandler(async event => {
  const owner = await requireOwner(event, true), input = await body(event, z.object({ content: contentSchema, slug: z.string().max(120).optional() }));
  const post = await createPost(bindings(event).BLOG_DB, owner.user.id, input.content, input.slug);
  setResponseStatus(event, 201); return post;
});
