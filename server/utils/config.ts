import type { H3Event } from 'h3';
/** @param event - Request whose environment overrides must be honored. @returns Validated site origin. */
export function siteOrigin(event: H3Event): string { return new URL(useRuntimeConfig(event).public.siteUrl).origin; }
/** @param event - Current request. @returns Whether public indexing is explicitly enabled. */
export function indexable(event: H3Event): boolean { return String(useRuntimeConfig(event).public.indexable) === 'true'; }
