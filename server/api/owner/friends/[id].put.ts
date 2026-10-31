import { defineEventHandler, getRouterParam } from 'h3';
import { updateFriend } from '../../../domain/friends/store';
import { friendUpdate } from '../../../domain/friends/validation';
import { bindings } from '../../../utils/bindings';
import { requireOwner } from '../../../utils/session';
import { body } from '../../../utils/validate';

export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const { version, ...input } = await body(event, friendUpdate);
  return updateFriend(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, version, input);
});
