import { defineEventHandler, getRouterParam, sendNoContent } from 'h3';
import { revokeToken } from '../../../domain/publishing/tokens';

export default defineEventHandler(async event => {
  const owner = await requireOwner(event, true);
  await revokeToken(bindings(event).BLOG_DB, owner.user.id, getRouterParam(event, 'id') || '');
  return sendNoContent(event);
});
