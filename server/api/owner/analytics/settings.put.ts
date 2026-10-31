import { defineEventHandler } from 'h3';
import { z } from 'zod';
import { setPublicCounts } from '../../../domain/analytics/settings';
import { requireOwner } from '../../../utils/session';
import { bindings } from '../../../utils/bindings';
import { body } from '../../../utils/validate';

export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const input = await body(event, z.object({ publicCounts: z.boolean() }).strict());
  return setPublicCounts(bindings(event).BLOG_DB, input.publicCounts);
});
