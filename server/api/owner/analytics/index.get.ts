import { createError, defineEventHandler, getQuery } from 'h3';
import { analyticsReport } from '../../../domain/analytics/report';
import { requireOwner } from '../../../utils/session';
import { bindings } from '../../../utils/bindings';

export default defineEventHandler(async event => {
  await requireOwner(event);
  const days = String(getQuery(event).days ?? '7');
  if (days !== '7' && days !== '30') throw createError({ statusCode: 400, message: '请选择最近 7 天或 30 天。' });
  return analyticsReport(bindings(event).BLOG_DB, Number(days) as 7 | 30);
});
