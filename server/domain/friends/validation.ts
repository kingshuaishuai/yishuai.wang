import { z } from 'zod';

/** @param value - Submitted URL. @returns A normalized public HTTPS address, or null. */
function publicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname)
      || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)
      || url.hostname.includes(':')) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

const address = z.string().trim().max(1000).transform((value, ctx) => {
  const normalized = publicUrl(value);
  if (!normalized) { ctx.addIssue({ code: 'custom', message: '请填写公开站点的 HTTPS 地址，不包含账户信息。' }); return z.NEVER; }
  return normalized;
});

export const friendInput = z.object({
  name: z.string().trim().min(1, '请填写站点名称。').max(80),
  url: address,
  description: z.string().trim().max(400).default(''),
  descriptionEn: z.string().trim().max(600).default(''),
  iconUrl: z.union([z.literal(''), address]).default(''),
  position: z.number().int().min(0).max(9999).default(0),
  visible: z.boolean().default(true),
}).strict();
export const friendUpdate = friendInput.extend({ version: z.number().int().positive() });
export const friendRevision = z.object({ version: z.number().int().positive() }).strict();
