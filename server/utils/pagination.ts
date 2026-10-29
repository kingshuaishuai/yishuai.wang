import { createError, getQuery, type H3Event } from 'h3';

/** @param event - List request. @returns A bounded one-based page number. */
export function pageNumber(event: H3Event): number {
  const page = Number(getQuery(event).page ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw createError({ statusCode: 400, message: '页码无效。' });
  return page;
}
