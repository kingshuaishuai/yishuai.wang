import type { D1Database } from '@cloudflare/workers-types';
import { postPath, unlocalizedPath } from '../../../shared/language';
import { isAnalyticsPath } from '../../../shared/analytics-path';
import type { AnalyticsTarget } from './types';

/** @param db - Database. @param path - Candidate path. @returns Verified public target, never drafts or nonexistent URLs. */
export async function analyticsTarget(db: D1Database, path: string): Promise<AnalyticsTarget | null> {
  if (path.length > 160 || !isAnalyticsPath(path)) return null;
  const match = unlocalizedPath(path).match(/^\/(articles|life)\/(.+)$/);
  if (!match) return { key: path, path, postId: null, article: false };
  const kind = match[1] === 'articles' ? 'article' : 'note';
  const row = await db.prepare(`SELECT id,slug,kind,COALESCE(json_extract(published_json,'$.language'),'zh') AS language
    FROM posts WHERE ${kind === 'article' ? 'slug' : 'id'}=? AND kind=? AND status='published' AND published_json IS NOT NULL`)
    .bind(match[2], kind).first<{ id: string; slug: string; kind: 'article' | 'note'; language: 'zh' | 'en' }>();
  if (!row || postPath(row) !== path) return null;
  return { key: row.id, path, postId: row.id, article: kind === 'article' };
}
/** @param source - Referring origin only. @param origin - Trusted own origin. @returns Domain attribution with no path, query or credentials. */
export function analyticsSource(source: string, origin: string): string {
  try {
    const url = new URL(source), own = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.hostname === own.hostname) return 'direct';
    return url.hostname.toLowerCase().slice(0, 253);
  } catch { return 'direct'; }
}
