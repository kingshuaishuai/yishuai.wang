import { defineEventHandler, setResponseStatus } from 'h3';
import { createFriend } from '../../../domain/friends/store';
import { friendInput } from '../../../domain/friends/validation';
import { bindings } from '../../../utils/bindings';
import { requireOwner } from '../../../utils/session';
import { body } from '../../../utils/validate';

export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const result = await createFriend(bindings(event).BLOG_DB, await body(event, friendInput));
  setResponseStatus(event, 201);
  return result;
});
