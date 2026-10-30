import type { D1Database } from '@cloudflare/workers-types';
import { v4 as uuid } from 'uuid';
import type { AiSummary } from '../../../shared/ai';
import type { Content } from '../../../shared/types';
import type { PostRow } from '../types';
import type { SummaryJob } from './types';
import { settingsRow } from './settings';
import { summaryHash } from './source';
import { decryptKey } from './credentials';
import { streamSummary, SummaryFailure } from './provider';

/**
 * Claim at most one generation for a published revision, keeping the last good result.
 * @param db - Database with atomic lease ownership.
 * @param postId - Published article identity.
 * @param force - Explicit author request to replace a cached result.
 * @returns A claimed job, or null when disabled, cached or already running.
 */
export async function beginSummary(db: D1Database, postId: string, force = false): Promise<SummaryJob | null> {
  const settings = await settingsRow(db);
  if (!settings?.enabled || !settings.encrypted_key) return null;
  const post = await db.prepare('SELECT * FROM posts WHERE id=?').bind(postId).first<PostRow>();
  if (!post?.published_json || post.status !== 'published' || post.kind !== 'article') return null;
  const content = { language: 'zh', ...JSON.parse(post.published_json) } as Content;
  const hash = await summaryHash(content), requestId = uuid(), now = Date.now();
  const result = await db.prepare(`INSERT INTO ai_summaries(post_id,status,request_id,request_hash,started_at) VALUES(?,'generating',?,?,?)
    ON CONFLICT(post_id) DO UPDATE SET status='generating',request_id=excluded.request_id,request_hash=excluded.request_hash,started_at=excluded.started_at,error_code=NULL
    WHERE NOT (ai_summaries.status='generating' AND ai_summaries.request_hash=excluded.request_hash AND ai_summaries.started_at>?)
    AND (?=1 OR COALESCE(ai_summaries.source_hash,'')!=excluded.request_hash OR ai_summaries.summary_text='')`).bind(postId, requestId, hash, now, now - 60000, Number(force)).run();
  return result.meta.changes ? { postId, requestId, hash, content, settings } : null;
}
/**
 * Complete one owned lease; provider failures and stale results never replace a valid summary.
 * @param db - Database.
 * @param secret - Deployment-only encryption key.
 * @param job - Claimed published revision.
 * @param onDelta - Optional progress sink for an author SSE connection.
 * @returns The persisted result after all publication and settings guards pass.
 */
export async function runSummary(db: D1Database, secret: string, job: SummaryJob, onDelta?: (text: string) => Promise<void>): Promise<AiSummary> {
  try {
    // A queued job must still be authorized before it sends the published snapshot.
    const settings = await settingsRow(db);
    const starting = await db.prepare("SELECT * FROM posts WHERE id=? AND status='published'").bind(job.postId).first<PostRow>();
    const lease = await db.prepare('SELECT request_id FROM ai_summaries WHERE post_id=?').bind(job.postId).first<{ request_id: string }>();
    if (!settings?.enabled || settings.revision !== job.settings.revision || lease?.request_id !== job.requestId || !starting?.published_json || await summaryHash(JSON.parse(starting.published_json)) !== job.hash) throw new SummaryFailure('changed');
    let key: string;
    try { key = await decryptKey(job.settings.encrypted_key!, secret); }
    catch { throw new SummaryFailure('configuration'); }
    const text = await streamSummary(job.content, key, job.settings.model, onDelta);
    // Match the public snapshot, not the mutable draft or a later author's settings.
    const current = await db.prepare("SELECT * FROM posts WHERE id=? AND status='published'").bind(job.postId).first<PostRow>();
    if (!current?.published_json || await summaryHash(JSON.parse(current.published_json)) !== job.hash) throw new SummaryFailure('changed');
    const generatedAt = new Date().toISOString();
    const result = await db.prepare(`UPDATE ai_summaries SET status='ready',summary_text=?,source_hash=?,model=?,generated_at=?,error_code=NULL
      WHERE post_id=? AND request_id=?
      AND EXISTS(SELECT 1 FROM posts WHERE id=? AND status='published' AND published_json=?)
      AND EXISTS(SELECT 1 FROM ai_settings WHERE id=1 AND enabled=1 AND revision=?)`)
      .bind(text, job.hash, job.settings.model, generatedAt, job.postId, job.requestId, job.postId, current.published_json, job.settings.revision).run();
    if (!result.meta.changes) throw new SummaryFailure('changed');
    return { text, generatedAt };
  } catch (error) {
    const safe = error instanceof SummaryFailure ? error : new SummaryFailure('provider');
    await db.prepare("UPDATE ai_summaries SET status='failed',error_code=? WHERE post_id=? AND request_id=?").bind(safe.code, job.postId, job.requestId).run();
    throw safe;
  }
}
