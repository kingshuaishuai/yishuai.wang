import { defineEventHandler } from 'h3';
import { saveSettings, settingsInput } from '../../../domain/ai/settings';
export default defineEventHandler(async event => {
  await requireOwner(event, true);
  return saveSettings(bindings(event).BLOG_DB, String(useRuntimeConfig(event).aiSettingsSecret || ''), await body(event, settingsInput));
});
