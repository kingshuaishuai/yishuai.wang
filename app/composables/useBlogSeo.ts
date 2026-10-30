/** @param title - Page title. @param description - Search summary. @param path - Canonical site path. @param privatePage - Excludes private or filtered pages from indexing. */
export function useBlogSeo(title: string, description: string, path: string, privatePage = false): void {
  const config = useRuntimeConfig();
  const { t, locale, localePath } = useBlogLocale();
  const canonical = new URL(localePath(path), config.public.siteUrl).href;
  useSeoMeta({ title: title === 'Yishuai' ? t('Yishuai · 作品、文字与日常', 'Yishuai · Projects, writing & life') : `${title} · Yishuai`, description,
    ogTitle: title, ogDescription: description, ogUrl: canonical, ogSiteName: 'Yishuai', ogType: 'website',
    ogLocale: locale.value === 'zh' ? 'zh_CN' : 'en_US',
    twitterCard: 'summary', robots: privatePage || String(config.public.indexable) !== 'true' ? 'noindex, nofollow' : 'index, follow',
  });
  const staticPage = !privatePage && !/^\/(?:en\/)?(articles|life)\//.test(path);
  useHead({ link: [{ rel: 'canonical', href: canonical }, ...(staticPage ? (['zh', 'en'] as const).map(language => ({ rel: 'alternate' as const, type: 'text/html', hreflang: language === 'zh' ? 'zh-CN' : 'en', href: new URL(localePath(path, language), config.public.siteUrl).href })) : [])] });
}
