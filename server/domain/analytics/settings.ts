import type { D1Database } from '@cloudflare/workers-types';
import type { AnalyticsSettings, PublicViewCount } from '../../../shared/analytics';
import { randomToken } from '../../utils/security';
import type { AnalyticsConfiguration } from './types';

/** @param db - Database. @returns Server-only configuration, initialized once at first use. */
export async function analyticsConfiguration(db: D1Database): Promise<AnalyticsConfiguration> {
  const row = await db.prepare('SELECT public_counts,salt,started_at FROM analytics_settings WHERE id=1')
    .first<{ public_counts: number; salt: string; started_at: string }>();
  if (row) return { publicCounts: !!row.public_counts, salt: row.salt, startedAt: row.started_at };
  await db.prepare('INSERT OR IGNORE INTO analytics_settings(id,salt,started_at) VALUES(1,?,?)')
    .bind(randomToken(), new Date().toISOString()).run();
  return analyticsConfiguration(db);
}
/** @param db - Database. @param publicCounts - Whether readers can see aggregate article views. @returns Safe saved settings. */
export async function setPublicCounts(db: D1Database, publicCounts: boolean): Promise<AnalyticsSettings> {
  const { startedAt } = await analyticsConfiguration(db);
  await db.prepare('UPDATE analytics_settings SET public_counts=? WHERE id=1').bind(Number(publicCounts)).run();
  return { publicCounts, startedAt };
}
/** @param db - Database. @param postId - Already verified public article. @returns Counter only when the owner has made it public. */
export async function publicViewCount(db: D1Database, postId: string): Promise<PublicViewCount | undefined> {
  const settings = await analyticsConfiguration(db);
  if (!settings.publicCounts) return undefined;
  const row = await db.prepare('SELECT COALESCE(SUM(views),0) AS count FROM analytics_page_daily WHERE post_id=?').bind(postId).first<{ count: number }>();
  return { count: row?.count ?? 0, since: settings.startedAt };
}
