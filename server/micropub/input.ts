import { getHeader, type H3Event } from 'h3';
import { z } from 'zod';
import type { MicropubInput, Properties } from './types';
import { mpError } from './errors';
import { readBytes } from '../utils/bytes';
const propertyMap = z.record(z.string().min(1).max(80).refine(key => !['__proto__','constructor','prototype'].includes(key)), z.array(z.unknown()).max(100));
const envelope = z.object({ action: z.string().optional(), url: z.string().max(2048).optional(), type: z.array(z.string()).max(5).optional(), properties: propertyMap.optional(),
  replace: propertyMap.optional(), add: propertyMap.optional(), delete: z.union([propertyMap, z.array(z.string()).max(100)]).optional(),
  'mp-slug': z.string().max(120).optional(), access_token: z.string().max(4096).optional(),
});
/** @param event - Form or JSON request. @returns A bounded standard Micropub envelope. */
export async function input(event: H3Event): Promise<MicropubInput> {
  const mime = (getHeader(event, 'content-type') || '').split(';')[0];
  const bytes = await readBytes(event);
  let value: unknown;
  if (mime === 'application/json') {
    try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw mpError(400, 'Invalid JSON.'); }
  } else if (mime === 'application/x-www-form-urlencoded' || mime === 'multipart/form-data') {
    const form = mime === 'application/x-www-form-urlencoded' ? new URLSearchParams(new TextDecoder().decode(bytes)) : await new Request('http://local/form', { method: 'POST', body: bytes as BodyInit, headers: { 'Content-Type': getHeader(event, 'content-type')! } }).formData();
    const properties: Properties = Object.create(null); const data: Record<string, unknown> = { properties };
    for (const [key, item] of form.entries()) {
      if (typeof item !== 'string') throw mpError(400, 'Upload files to the advertised media endpoint first.');
      if (['action','url','access_token','mp-slug'].includes(key)) { data[key] = item; continue; }
      if (key === 'h') { data.type = [`h-${item}`]; continue; }
      const name = key.replace(/\[\]$/, '');
      if (name === 'content[html]') { properties.content = [{ html: item }]; continue; }
      if (!['__proto__','constructor','prototype'].includes(name)) (properties[name] ||= []).push(item);
    }
    value = data;
  } else throw mpError(415, 'Use form encoding or JSON.');
  const parsed = envelope.safeParse(value);
  if (!parsed.success) throw mpError(400, 'Invalid Micropub properties.');
  const data = parsed.data;
  return { action: data.action, url: data.url, type: data.type, properties: data.properties, replace: data.replace, add: data.add, delete: data.delete, slug: data['mp-slug'], accessToken: data.access_token };
}
