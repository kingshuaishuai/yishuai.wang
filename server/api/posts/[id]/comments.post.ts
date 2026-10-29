import { defineEventHandler, getRouterParam, setResponseStatus, createError, getHeader } from 'h3';
import { z } from 'zod';
import { createComment } from '../../../domain/comments';
export default defineEventHandler(async event => {
  requireOrigin(event, siteOrigin(event)); await rateLimit(event, 'comment', 10, 600);
  const current = await session(event);
  if (current && getHeader(event, 'x-csrf-token') !== current.csrf) throw createError({ statusCode: 403, message: '会话已变化，请刷新后重试。' });
  const input = await body(event, z.object({ parentId: z.string().uuid().optional(), author: z.string().trim().max(60).default(''), email: z.union([z.email(), z.literal('')]).optional(), markdown: z.string().trim().min(1).max(10000), requestKey: z.string().uuid(), website: z.string().max(0).optional() }));
  const author = current?.user.name || input.author;
  if (!author) throw createError({ statusCode: 400, message: '请填写昵称。' });
  const receipt = await createComment(bindings(event).BLOG_DB, { ...input, postId: getRouterParam(event, 'id')!, author, userId: current?.user.id });
  setResponseStatus(event, 201); return receipt;
});
