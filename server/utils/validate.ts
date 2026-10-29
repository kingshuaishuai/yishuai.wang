import { createError, getHeader, type H3Event } from 'h3';
import type { ZodType } from 'zod';
import { readBytes } from './bytes';
/** @param event - JSON request. @param schema - Public contract. @returns Validated bounded input. */
export async function body<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  if (!getHeader(event, 'content-type')?.startsWith('application/json')) throw createError({ statusCode: 415, message: '请发送 JSON。' });
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(await readBytes(event))); }
  catch (error: any) { if (error.statusCode === 413) throw error; throw createError({ statusCode: 400, message: 'JSON 格式无效。' }); }
  const result = schema.safeParse(value);
  if (!result.success) throw createError({ statusCode: 400, message: result.error.issues[0]?.message ?? '输入无效。' });
  return result.data;
}
