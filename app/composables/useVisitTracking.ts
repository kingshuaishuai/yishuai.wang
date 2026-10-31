import { v4 as uuid } from 'uuid';
import { isAnalyticsPath } from '~~/shared/analytics-path';

/** Counts public pages only after five continuous visible seconds; never delays navigation. */
export function useVisitTracking(): void {
  const route = useRoute(), error = useError(), nuxt = useNuxtApp();
  const { identity } = useBlogSession();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastSent = '', source = '';
  /** Cancels pending work when navigation or visibility changes. */
  function cancel(): void { clearTimeout(timer); timer = undefined; }
  /** @returns Daily browser identifier, or null when browser storage is unavailable. */
  function visitor(): string | null {
    try {
      const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
      const stored = JSON.parse(localStorage.getItem('blog-visit') || 'null');
      if (stored?.day === day && /^[a-f0-9-]{36}$/.test(stored.id)) return stored.id;
      const id = uuid();
      localStorage.setItem('blog-visit', JSON.stringify({ day, id }));
      return id;
    } catch { return null; }
  }
  /** Schedules one bounded visit signal for the settled visible public page. */
  function schedule(): void {
    cancel();
    if (document.visibilityState !== 'visible' || navigator.doNotTrack === '1'
      || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
      || identity.value?.user.owner || error.value || !isAnalyticsPath(route.path)) return;
    const path = route.path, key = `${path}:${Math.floor(Date.now() / 1800000)}`;
    if (lastSent === key) return;
    timer = setTimeout(() => {
      if (path !== route.path || identity.value?.user.owner || error.value || document.visibilityState !== 'visible') return;
      const id = visitor(); if (!id) return;
      lastSent = key;
      // Attribution is only an origin. Search terms and private referrer paths never leave the browser.
      void $fetch('/api/analytics/view', { method: 'POST', body: { path, visitor: id, source }, retry: 0 }).catch(() => {});
    }, 5000);
  }
  onMounted(() => {
    try { source = document.referrer ? new URL(document.referrer).origin : ''; } catch { source = ''; }
    const start = nuxt.hook('page:start', cancel), finish = nuxt.hook('page:finish', schedule);
    const stopIdentity = watch(identity, schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();
    onScopeDispose(() => { cancel(); start(); finish(); stopIdentity(); document.removeEventListener('visibilitychange', schedule); });
  });
}
