import { defineEventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { createTranslation } from '../../../../domain/translations';
export default defineEventHandler(async event => {
  await requireOwner(event, true);
  const { language } = await body(event, z.object({ language: z.enum(['zh', 'en']) }));
  return createTranslation(bindings(event).BLOG_DB, getRouterParam(event, 'id')!, language);
});
