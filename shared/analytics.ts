/** Metrics are estimates, not a record of identified people or completed reads. */
export type AnalyticsDay = { day: string; views: number; visitors: number; articleViews: number };
/** Top content uses stable entry IDs, independent of its current title. */
export type AnalyticsPage = { path: string; title: string; views: number; published: boolean };
/** Safe owner-facing preferences omit the private hashing salt. */
export type AnalyticsSettings = { publicCounts: boolean; startedAt: string };
/** Owner-only aggregate report; visitors are summed daily uniques, not period uniques. */
export type AnalyticsReport = {
  settings: AnalyticsSettings; days: number; daily: AnalyticsDay[];
  totals: { views: number; dailyVisitors: number; articleViews: number };
  pages: AnalyticsPage[]; sources: { source: string; views: number }[];
};
/** Optional public counter deliberately says views rather than completed reads. */
export type PublicViewCount = { count: number; since: string };
