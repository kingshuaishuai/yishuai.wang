import { createError, getHeader, type H3Event } from 'h3';
import { bindings } from './bindings';
import { digest } from './security';
/** @param event - Request. @param action - Isolated action bucket. @param limit - Requests per window. @param seconds - Window duration. */
export async function rateLimit(event: H3Event, action: string, limit: number, seconds: number): Promise<void> {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const key = await digest(`${action}:${getHeader(event, 'cf-connecting-ip') ?? 'local'}:${window}`);
  await bindings(event).BLOG_DB.prepare('DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<? LIMIT 100)').bind(Date.now() - 86400000).run();
  const row = await bindings(event).BLOG_DB.prepare('INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, (window + 1) * seconds * 1000).first<{ count: number }>();
  if ((row?.count ?? limit + 1) > limit) throw createError({ statusCode: 429, message: '操作有些频繁，请稍后再试。' });
}
