import { createError, type H3Event } from 'h3';
import type { Bindings } from '../domain/types';
/** @param event - Current request. @returns Configured local or production Cloudflare bindings. */
export function bindings(event: H3Event): Bindings {
  const env = event.context.cloudflare?.env as Bindings | undefined;
  if (!env?.BLOG_DB) throw createError({ statusCode: 503, message: '数据库尚未配置。' });
  return env;
}
