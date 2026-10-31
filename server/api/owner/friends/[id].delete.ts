import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { deleteFriend } from '../../../domain/friends/store';
import { friendRevision } from '../../../domain/friends/validation';
import { bindings } from '../../../utils/bindings';
import { requireOwner } from '../../../utils/session';
import { body } from '../../../utils/validate';

export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const { version } = await body(event, friendRevision);
  await deleteFriend(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, version);
  setResponseStatus(event, 204);
  return null;
});
