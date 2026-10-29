import { createError, getRequestWebStream, type H3Event } from 'h3';
/** Reads with a real byte bound even when Content-Length is absent or forged.
 * @param event - Incoming request. @param limit - Maximum admitted bytes. @returns Complete bounded body.
 */
export async function readBytes(event: H3Event, limit = 1024 * 1024): Promise<Uint8Array> {
  const reader = getRequestWebStream(event)?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      const chunk = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
      length += chunk.byteLength;
      // Drain an oversized request without retaining its payload. The Node H3
      // adapter owns the incoming stream and cannot safely be cancelled here.
      if (length > limit) chunks.length = 0;
      else chunks.push(chunk);
    }
  } finally { reader.releaseLock(); }
  if (length > limit) throw createError({ statusCode: 413, message: '请求内容过大。' });
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
