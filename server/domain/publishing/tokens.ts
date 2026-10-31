import { createError } from 'h3';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import type { D1Database } from '@cloudflare/workers-types';
import { publishingScopes, type CreatedPublishingToken, type PublishingToken } from '../../../shared/publishing';
import { digest, randomToken } from '../../utils/security';
import type { PublishingTokenRow } from './types';

const prefix = 'yw_mp_';
const columns = 'id,name,suffix,scopes,created_at,expires_at,last_used_at,revoked_at';
export const tokenInput = z.object({
  name: z.string().trim().min(1).max(60).regex(/^[^\x00-\x1f\x7f]+$/),
  expiresInDays: z.union([z.literal(30), z.literal(90), z.literal(365)]).default(365),
}).strict();

/** @param row - Stored metadata, excluding the credential hash. @returns Safe browser projection. */
function project(row: PublishingTokenRow): PublishingToken {
  return { id: row.id, name: row.name, suffix: row.suffix, scopes: row.scopes.split(' '), createdAt: row.created_at,
    expiresAt: row.expires_at, lastUsedAt: row.last_used_at, revokedAt: row.revoked_at };
}

/** @param db - Site database. @param ownerId - Current author. @returns Active tokens and recent history, without hashes. */
export async function listTokens(db: D1Database, ownerId: string): Promise<PublishingToken[]> {
  const rows = await db.prepare(`SELECT ${columns} FROM publishing_tokens WHERE owner_id=? ORDER BY (revoked_at IS NULL AND expires_at>?) DESC,created_at DESC LIMIT 30`).bind(ownerId, Date.now()).all<PublishingTokenRow>();
  return rows.results.map(project);
}

/** @param db - Site database. @param ownerId - Authenticated author. @param input - Bounded client name and lifetime. @returns One-time credential and safe metadata. */
export async function createToken(db: D1Database, ownerId: string, input: z.infer<typeof tokenInput>): Promise<CreatedPublishingToken> {
  const token = prefix + randomToken(), now = Date.now();
  const item: PublishingToken = { id: uuid(), name: input.name, suffix: token.slice(-6), scopes: [...publishingScopes],
    createdAt: now, expiresAt: now + input.expiresInDays * 86400000, lastUsedAt: null, revokedAt: null };
  // Enforce the active-token limit in the insert, including concurrent creation requests.
  const result = await db.prepare(`INSERT INTO publishing_tokens(id,owner_id,token_hash,name,suffix,scopes,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM publishing_tokens WHERE owner_id=? AND revoked_at IS NULL AND expires_at>?)<10`)
    .bind(item.id, ownerId, await digest(token), item.name, item.suffix, item.scopes.join(' '), now, item.expiresAt, ownerId, now).run();
  if (!result.meta.changes) throw createError({ statusCode: 409, message: '最多保留 10 个有效令牌，请先撤销不用的令牌。' });
  return { token, item };
}

/** @param db - Site database. @param ownerId - Authenticated author. @param id - Token identity. */
export async function revokeToken(db: D1Database, ownerId: string, id: string): Promise<void> {
  const result = await db.prepare('UPDATE publishing_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE id=? AND owner_id=?').bind(Date.now(), id, ownerId).run();
  if (!result.meta.changes) throw createError({ statusCode: 404, message: '令牌不存在。' });
}

/** @param db - Site database. @param ownerId - Current configured author. @param token - Untrusted bearer value. @returns Native scopes, or null only for a foreign token format. */
export async function nativeTokenScopes(db: D1Database, ownerId: string, token: string): Promise<Set<string> | null> {
  if (!token.startsWith(prefix)) return null;
  // Native credentials never reach an external identity provider, even when invalid or revoked.
  if (!/^yw_mp_[a-f0-9]{64}$/.test(token)) throw createError({ statusCode: 401, message: 'Invalid token.' });
  const now = Date.now();
  const row = await db.prepare(`SELECT ${columns} FROM publishing_tokens WHERE token_hash=? AND owner_id=? AND revoked_at IS NULL AND expires_at>?`)
    .bind(await digest(token), ownerId, now).first<PublishingTokenRow>();
  if (!row) throw createError({ statusCode: 401, message: 'Invalid or expired token.' });
  if (!row.last_used_at || row.last_used_at < now - 300000) {
    await db.prepare('UPDATE publishing_tokens SET last_used_at=? WHERE id=? AND (last_used_at IS NULL OR last_used_at<?)').bind(now, row.id, now - 300000).run();
  }
  return new Set(row.scopes.split(' '));
}
