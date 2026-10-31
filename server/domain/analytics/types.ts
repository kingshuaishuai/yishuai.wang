import type { AnalyticsSettings } from '../../../shared/analytics';

/** Private settings remain exclusively on the server. */
export type AnalyticsConfiguration = AnalyticsSettings & { salt: string };
/** Only server-resolved canonical public pages can receive traffic. */
export type AnalyticsTarget = { key: string; path: string; postId: string | null; article: boolean };
/** Bounded client signal. Identity rotates daily and is hashed before persistence. */
export type AnalyticsSignal = { path: string; visitor: string; source: string };
