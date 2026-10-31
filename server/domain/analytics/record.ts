import type { D1Database } from '@cloudflare/workers-types';
import { v4 as uuid } from 'uuid';
import { digest } from '../../utils/security';
import type { AnalyticsTarget } from './types';

/** @param now - UTC epoch milliseconds. @returns Calendar date in the site's reporting timezone, Asia/Shanghai. */
export function analyticsDay(now: number): string { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }

/** @param db - Database. @param target - Verified canonical public target. @param visitor - Daily anonymous browser identifier. @param source - Sanitized source domain. @param salt - Private server salt. @param now - Server time. @returns Whether a new view was counted. */
export async function recordView(db: D1Database, target: AnalyticsTarget, visitor: string, source: string, salt: string, now = Date.now()): Promise<boolean> {
  const day = analyticsDay(now), id = uuid();
  const hash = await digest(`${salt}:${day}:${visitor}`), bucket = Math.floor(now / 1800000);
  const expired = analyticsDay(now - 2 * 86400000);
  // D1 batch is transactional. A fresh nonce exists only for an accepted event, so
  // every aggregate is gated by that nonce even when concurrent requests collide.
  const result = await db.batch([
    db.prepare('INSERT OR IGNORE INTO analytics_events(id,day,page_key,path,post_id,article,visitor_hash,bucket,source) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(id, day, target.key, target.path, target.postId, Number(target.article), hash, bucket, source),
    db.prepare('INSERT OR IGNORE INTO analytics_visitors(day,visitor_hash,first_event_id) SELECT day,visitor_hash,id FROM analytics_events WHERE id=?').bind(id),
    db.prepare(`INSERT INTO analytics_daily(day,views,visitors,article_views)
      SELECT e.day,1,CASE WHEN v.first_event_id=e.id THEN 1 ELSE 0 END,e.article FROM analytics_events e
      JOIN analytics_visitors v ON v.day=e.day AND v.visitor_hash=e.visitor_hash WHERE e.id=?
      ON CONFLICT(day) DO UPDATE SET views=views+1,visitors=visitors+excluded.visitors,article_views=article_views+excluded.article_views`).bind(id),
    db.prepare(`INSERT INTO analytics_page_daily(day,page_key,path,post_id,views)
      SELECT day,page_key,path,post_id,1 FROM analytics_events WHERE id=?
      ON CONFLICT(day,page_key) DO UPDATE SET views=views+1`).bind(id),
    db.prepare(`INSERT INTO analytics_referrers_daily(day,source,views)
      SELECT day,source,1 FROM analytics_events WHERE id=?
      ON CONFLICT(day,source) DO UPDATE SET views=views+1`).bind(id),
    // Only aggregate counts survive retention. Cleanup is bounded on each request.
    db.prepare('DELETE FROM analytics_events WHERE id IN (SELECT id FROM analytics_events WHERE day<? LIMIT 100)').bind(expired),
    db.prepare('DELETE FROM analytics_visitors WHERE (day,visitor_hash) IN (SELECT day,visitor_hash FROM analytics_visitors WHERE day<? LIMIT 100)').bind(expired),
  ]);
  return result[0]!.meta.changes > 0;
}
