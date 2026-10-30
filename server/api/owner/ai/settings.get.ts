import { defineEventHandler } from 'h3';
import { readSettings } from '../../../domain/ai/settings';
export default defineEventHandler(async event => {
  await requireOwner(event);
  return readSettings(bindings(event).BLOG_DB, String(useRuntimeConfig(event).aiSettingsSecret || ''));
});
