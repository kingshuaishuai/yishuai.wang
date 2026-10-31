import { createError, defineEventHandler, getHeader, sendNoContent } from 'h3';
import { z } from 'zod';
import { analyticsTarget, analyticsSource } from '../../domain/analytics/target';
import { analyticsConfiguration } from '../../domain/analytics/settings';
import { recordView } from '../../domain/analytics/record';
import { bindings } from '../../utils/bindings';
import { siteOrigin } from '../../utils/config';
import { requireOrigin } from '../../utils/security';
import { session } from '../../utils/session';
import { rateLimit } from '../../utils/rate';
import { readBytes } from '../../utils/bytes';

const signal = z.object({ path: z.string().max(160), visitor: z.string().uuid(), source: z.string().max(300).default('') }).strict();
const bots = /bot|crawler|spider|headless|slurp|bingpreview|facebookexternalhit|preview|curl|wget|python|uptime|lighthouse/i;

export default defineEventHandler(async event => {
  const origin = siteOrigin(event);
  requireOrigin(event, origin);
  const agent = getHeader(event, 'user-agent') ?? '';
  if (getHeader(event, 'dnt') === '1' || getHeader(event, 'sec-gpc') === '1' || !agent || bots.test(agent)) return sendNoContent(event);
  if ((await session(event))?.user.owner) return sendNoContent(event);
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415, message: '请发送 JSON。' });
  let input: z.infer<typeof signal>;
  try { input = signal.parse(JSON.parse(new TextDecoder().decode(await readBytes(event, 1024)))); }
  catch (error: any) { if (error.statusCode === 413) throw error; throw createError({ statusCode: 400, message: '统计数据无效。' }); }
  const db = bindings(event).BLOG_DB, settings = await analyticsConfiguration(db);
  // Salt the rate-limit bucket as well: no reversible IP or stable network key is stored.
  await rateLimit(event, `analytics:${settings.salt}`, 120, 3600);
  const target = await analyticsTarget(db, input.path);
  if (!target) return sendNoContent(event);
  await recordView(db, target, input.visitor, analyticsSource(input.source, origin), settings.salt);
  return sendNoContent(event);
});
