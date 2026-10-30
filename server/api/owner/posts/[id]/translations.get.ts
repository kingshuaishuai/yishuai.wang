import { defineEventHandler, getRouterParam } from 'h3';
import { ownerTranslations } from '../../../../domain/translations';
export default defineEventHandler(async event => {
  await requireOwner(event);
  return ownerTranslations(bindings(event).BLOG_DB, getRouterParam(event, 'id')!);
});
