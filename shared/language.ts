import type { Content, ContentLanguage } from './types';

/** @param path - Site path. @returns Its interface language, independent of content language. */
export function pathLanguage(path: string): ContentLanguage { return /^\/en(?:\/|\?|#|$)/.test(path) ? 'en' : 'zh'; }
/** @param path - Site path, optionally with query and fragment. @returns Path without its language prefix. */
export function unlocalizedPath(path: string): string {
  const base = path.replace(/^\/en(?=\/|\?|#|$)/, '');
  return base.startsWith('/') ? base : '/' + base;
}
/** @param path - Site-relative path. @param language - Requested interface language. @returns Stable language-prefixed URL. */
export function localizedPath(path: string, language: ContentLanguage): string {
  const base = unlocalizedPath(path);
  return language === 'en' ? '/en' + base.replace(/^\/(?=\?|#|$)/, '') : base;
}
/** @param post - Content identity. @returns Its permanent public URL. */
export function postPath(post: Pick<Content, 'kind' | 'language'> & { id: string; slug: string }): string {
  return localizedPath(post.kind === 'article' ? `/articles/${post.slug}` : `/life/${post.id}`, post.language || 'zh');
}
