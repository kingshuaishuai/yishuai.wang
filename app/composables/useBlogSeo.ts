/** @param title - Page title. @param description - Search summary. @param path - Canonical site path. @param privatePage - Excludes private or filtered pages from indexing. */
export function useBlogSeo(title: string, description: string, path: string, privatePage = false): void {
  const config = useRuntimeConfig();
  const canonical = new URL(path, config.public.siteUrl).href;
  useSeoMeta({ title: title === 'Yishuai' ? 'Yishuai · 作品、文字与日常' : `${title} · Yishuai`, description,
    ogTitle: title, ogDescription: description, ogUrl: canonical, ogSiteName: 'Yishuai', ogType: 'website',
    twitterCard: 'summary', robots: privatePage || String(config.public.indexable) !== 'true' ? 'noindex, nofollow' : 'index, follow',
  });
  useHead({ link: [{ rel: 'canonical', href: canonical }] });
}
