import type { D1Database } from '@cloudflare/workers-types';
import type { AiSummary, SummaryStatus } from '../../../shared/ai';
import type { Content } from '../../../shared/types';
import type { PostRow } from '../types';
import type { SummaryRow } from './types';
import { summaryHash } from './source';
import { settingsRow } from './settings';

/** @param db - Database. @param post - Visible published row. @returns Only a complete current result when the feature is enabled. */
export async function publicSummary(db: D1Database, post: PostRow): Promise<AiSummary | null> {
  if (post.status !== 'published' || post.kind !== 'article' || !post.published_json) return null;
  const row = await db.prepare('SELECT s.* FROM ai_summaries s JOIN ai_settings c ON c.id=1 AND c.enabled=1 WHERE s.post_id=? AND s.summary_text!=?').bind(post.id, '').first<SummaryRow>();
  if (!row?.generated_at || row.source_hash !== await summaryHash(JSON.parse(post.published_json))) return null;
  return { text: row.summary_text, generatedAt: row.generated_at };
}
/** @param db - Database. @param post - Owner-visible post row. @returns Safe status for author controls. */
export async function summaryStatus(db: D1Database, post: PostRow): Promise<SummaryStatus> {
  const config = await settingsRow(db);
  if (!config?.enabled || !config.encrypted_key) return { status: 'disabled', summary: null, error: null };
  if (post.status !== 'published' || post.kind !== 'article' || !post.published_json) return { status: 'unpublished', summary: null, error: null };
  const row = await db.prepare('SELECT * FROM ai_summaries WHERE post_id=?').bind(post.id).first<SummaryRow>();
  const hash = await summaryHash(JSON.parse(post.published_json) as Content);
  const summary = row?.source_hash === hash && row.generated_at && row.summary_text ? { text: row.summary_text, generatedAt: row.generated_at } : null;
  if (!row) return { status: 'missing', summary: null, error: null };
  if (row.request_hash !== hash) return { status: 'stale', summary, error: null };
  if (row.status === 'generating') return Date.now() - row.started_at < 60000 ? { status: 'generating', summary, error: null } : { status: 'failed', summary, error: 'timeout' };
  if (row.status === 'failed') return { status: 'failed', summary, error: row.error_code };
  return { status: summary ? 'ready' : 'stale', summary, error: null };
}
