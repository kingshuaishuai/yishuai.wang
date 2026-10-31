import { defineEventHandler } from 'h3';
import { managedFriends } from '../../../domain/friends/store';
import { bindings } from '../../../utils/bindings';
import { requireOwner } from '../../../utils/session';

export default defineEventHandler(async event => {
  await requireOwner(event);
  return managedFriends(bindings(event).BLOG_DB);
});
