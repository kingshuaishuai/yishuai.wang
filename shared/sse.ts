/** A decoded SSE frame, without transport or provider assumptions. */
export type SseFrame = { event: string; data: string };

/**
 * Decode bounded UTF-8 SSE frames, including CRLF and split multi-byte characters.
 * @param stream - Response body owned by the caller.
 * @returns Frames with complete data fields only.
 */
export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = stream.getReader(), decoder = new TextDecoder();
  let buffer = '', event = 'message', data: string[] = [], total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > 262144) throw new Error('SSE response exceeded the size limit.');
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        if (!line) {
          if (data.length) yield { event, data: data.join('\n') };
          event = 'message'; data = [];
        } else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        else if (line.startsWith('event:')) event = line.slice(6).trim();
      }
    }
    // An unfinished frame is deliberately not accepted as a complete event.
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
