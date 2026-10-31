import { defineEventHandler, setHeader, setResponseStatus } from 'h3';
import { createToken, tokenInput } from '../../../domain/publishing/tokens';

export default defineEventHandler(async event => {
  const owner = await requireOwner(event, true);
  await rateLimit(event, 'publishing-token-create', 10, 3600);
  const input = await body(event, tokenInput);
  const result = await createToken(bindings(event).BLOG_DB, owner.user.id, input);
  setHeader(event, 'Cache-Control', 'private, no-store');
  setResponseStatus(event, 201);
  return result;
});
