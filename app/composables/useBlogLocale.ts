import { englishMessages } from '~/lib/messages';
import type { ContentLanguage, Translation } from '~~/shared/types';
import { localizedPath, pathLanguage, unlocalizedPath } from '~~/shared/language';
/** @returns URL-owned interface language and small, typed bilingual helpers. */
export function useBlogLocale() {
  const route = useRoute();
  const locale = computed(() => pathLanguage(route.path));
  const basePath = computed(() => unlocalizedPath(route.path));
  const languageTargets = useState<{ path: string; versions: Translation[] } | null>('blog-language-targets', () => null);
  /** @param zh - Chinese copy. @param en - English copy. @returns Copy for the current interface. */
  function t(zh: string, en?: string): string { return locale.value === 'en' ? en ?? englishMessages[zh] ?? zh : zh; }
  /** @param path - Site path. @param language - Optional destination language. @returns Localized navigation URL. */
  function localePath(path: string, language: ContentLanguage = locale.value): string { return localizedPath(path, language); }
  /** @param value - Stable category key or custom category. @returns Localized display label without changing stored content. */
  function categoryLabel(value: string): string {
    const english: Record<string, string> = { 技术: 'Technology', 创造: 'Making', 随笔: 'Essays', 日常: 'Everyday', 小记: 'Notes' };
    return locale.value === 'en' ? english[value] || value : value;
  }
  const switchPath = computed(() => {
    const language = locale.value === 'en' ? 'zh' : 'en';
    if (/^\/(articles|life)\/.+/.test(basePath.value)) {
      const versions = languageTargets.value?.path === route.path ? languageTargets.value.versions : [];
      return versions.find(item => item.language === language)?.url || localePath(basePath.value.startsWith('/articles/') ? '/articles' : '/life', language);
    }
    return localePath(route.path, language);
  });
  return { locale, basePath, t, localePath, categoryLabel, languageTargets, switchPath };
}
