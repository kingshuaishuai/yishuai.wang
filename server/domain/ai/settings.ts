import type { D1Database } from '@cloudflare/workers-types';
import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import type { AiSettings } from '../../../shared/ai';
import type { SettingsRow } from './types';
import { encryptionReady, encryptKey } from './credentials';

export const settingsInput = z.object({ enabled: z.boolean(), model: z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/, '请填写有效的模型 ID。'), apiKey: z.string().trim().max(256).optional(), clearKey: z.boolean().default(false), revision: z.string().max(80) });
/** @param db - Private database. @returns Server-only saved configuration. */
export async function settingsRow(db: D1Database): Promise<SettingsRow | null> { return db.prepare('SELECT * FROM ai_settings WHERE id=1').first<SettingsRow>(); }
/** @param db - Private database. @param secret - Deployment encryption key. @returns Credential-free author configuration. */
export async function readSettings(db: D1Database, secret: string): Promise<AiSettings> {
  const row = await settingsRow(db);
  return { enabled: !!row?.enabled, model: row?.model || 'deepseek-flash', hasKey: !!row?.encrypted_key, encryptionReady: encryptionReady(secret), revision: row?.revision || '' };
}
/** @param db - Private database. @param secret - Deployment encryption key. @param input - Validated author settings. @returns Updated configuration without the credential. */
export async function saveSettings(db: D1Database, secret: string, input: z.infer<typeof settingsInput>): Promise<AiSettings> {
  if (!encryptionReady(secret)) throw createError({ statusCode: 503, message: '请先配置服务端 AI 密钥加密设置。' });
  const previous = await settingsRow(db);
  if ((previous?.revision || '') !== input.revision) throw createError({ statusCode: 409, message: '设置已更新，请重新打开后再保存。' });
  if (input.apiKey && (input.apiKey.length < 10 || /\s/.test(input.apiKey))) throw createError({ statusCode: 400, message: '请填写有效的 DeepSeek API Key。' });
  const encrypted = input.clearKey ? null : input.apiKey ? await encryptKey(input.apiKey, secret) : previous?.encrypted_key || null;
  if (input.enabled && !encrypted) throw createError({ statusCode: 400, message: '启用前请先填写 API Key。' });
  const revision = uuid(), now = new Date().toISOString();
  const result = previous
    ? await db.prepare('UPDATE ai_settings SET enabled=?,model=?,encrypted_key=?,revision=?,updated_at=? WHERE id=1 AND revision=?').bind(Number(input.enabled), input.model, encrypted, revision, now, input.revision).run()
    : await db.prepare('INSERT OR IGNORE INTO ai_settings(id,enabled,model,encrypted_key,revision,updated_at) VALUES(1,?,?,?,?,?)').bind(Number(input.enabled), input.model, encrypted, revision, now).run();
  if (!result.meta.changes) throw createError({ statusCode: 409, message: '设置已更新，请重新打开后再保存。' });
  return readSettings(db, secret);
}
