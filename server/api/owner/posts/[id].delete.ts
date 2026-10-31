import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { z } from 'zod';
import { permanentlyDeletePost } from '../../../domain/posts';
import { bindings } from '../../../utils/bindings';
import { requireOwner } from '../../../utils/session';
import { body } from '../../../utils/validate';

export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const { version } = await body(event, z.object({ version: z.number().int().positive() }).strict());
  await permanentlyDeletePost(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, version);
  setResponseStatus(event, 204);
  return null;
});
