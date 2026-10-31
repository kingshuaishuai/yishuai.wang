import type { D1Database } from '@cloudflare/workers-types';
import type { AnalyticsDay, AnalyticsPage, AnalyticsReport } from '../../../shared/analytics';
import { analyticsDay } from './record';
import { analyticsConfiguration } from './settings';

/** @param db - Database. @param days - Bounded report window. @param now - Current server time. @returns Safe aggregates with zero-filled calendar days. */
export async function analyticsReport(db: D1Database, days: 7 | 30, now = Date.now()): Promise<AnalyticsReport> {
  const { publicCounts, startedAt } = await analyticsConfiguration(db);
  const start = analyticsDay(now - (days - 1) * 86400000), end = analyticsDay(now);
  const [series, pages, sources] = await db.batch([
    db.prepare('SELECT day,views,visitors,article_views AS articleViews FROM analytics_daily WHERE day BETWEEN ? AND ? ORDER BY day').bind(start, end),
    db.prepare(`SELECT a.path,COALESCE(json_extract(p.published_json,'$.title'),'') AS title,
      SUM(a.views) AS views,CASE WHEN p.status='published' THEN 1 ELSE 0 END AS published
      FROM analytics_page_daily a JOIN posts p ON p.id=a.post_id
      WHERE a.day BETWEEN ? AND ? AND p.kind='article'
      GROUP BY a.page_key ORDER BY views DESC,a.path LIMIT 10`).bind(start, end),
    db.prepare('SELECT source,SUM(views) AS views FROM analytics_referrers_daily WHERE day BETWEEN ? AND ? GROUP BY source ORDER BY views DESC,source LIMIT 10').bind(start, end),
  ]);
  const recorded = new Map((series!.results as AnalyticsDay[]).map(day => [day.day, day]));
  const daily = Array.from({ length: days }, (_, index) => {
    const day = analyticsDay(now - (days - index - 1) * 86400000);
    return recorded.get(day) ?? { day, views: 0, visitors: 0, articleViews: 0 };
  });
  return { settings: { publicCounts, startedAt }, days, daily,
    totals: daily.reduce((sum, day) => ({ views: sum.views + day.views, dailyVisitors: sum.dailyVisitors + day.visitors, articleViews: sum.articleViews + day.articleViews }), { views: 0, dailyVisitors: 0, articleViews: 0 }),
    pages: (pages!.results as unknown as AnalyticsPage[]).map(page => ({ ...page, published: !!page.published })),
    sources: sources!.results as { source: string; views: number }[],
  };
}
