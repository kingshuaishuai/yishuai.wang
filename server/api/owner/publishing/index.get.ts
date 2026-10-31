import { defineEventHandler, setHeader } from 'h3';
import { listTokens } from '../../../domain/publishing/tokens';
import type { PublishingAccess } from '../../../../shared/publishing';

export default defineEventHandler(async (event): Promise<PublishingAccess> => {
  const owner = await requireOwner(event);
  setHeader(event, 'Cache-Control', 'private, no-store');
  const origin = siteOrigin(event);
  return { siteUrl: origin + '/', endpoint: origin + '/api/micropub', mediaEndpoint: origin + '/api/micropub/media',
    tokens: await listTokens(bindings(event).BLOG_DB, owner.user.id) };
});
