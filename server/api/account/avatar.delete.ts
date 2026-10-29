import { defineEventHandler } from 'h3';
import { saveAvatar } from '../../domain/avatars';

export default defineEventHandler(async event => {
  const current = await requireSession(event, true);
  await rateLimit(event, 'avatar', 30, 600);
  return saveAvatar(bindings(event), current.user.id, null);
});
