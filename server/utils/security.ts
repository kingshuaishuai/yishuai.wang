import { createError, getHeader, type H3Event } from 'h3';
import { v4 as uuid } from 'uuid';
/** @returns A high-entropy opaque token without exposing an identity in cookies. */
export function randomToken(): string { return uuid().replaceAll('-', '') + uuid().replaceAll('-', ''); }
/** @param value - Secret token. @returns One-way digest suitable for database storage. */
export async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
/** @param event - Browser write request. @param expected - Configured application origin. */
export function requireOrigin(event: H3Event, expected: string): void {
  if (getHeader(event, 'origin') !== new URL(expected).origin) throw createError({ statusCode: 403, message: '请从本站重新提交。' });
}
/** @param value - Untrusted return path. @returns Same-site relative path with no authority or control characters. */
export function returnPath(value: unknown): string {
  return typeof value === 'string' && /^\/(?![\/\\])/.test(value) && !/[\\\x00-\x20]/.test(value) ? value : '/';
}
