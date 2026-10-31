import { localizedPath, pathLanguage, unlocalizedPath } from './language';

/** @param path - Path without search or hash. @returns Whether it names a supported canonical public route. */
export function isAnalyticsPath(path: string): boolean {
  const plain = unlocalizedPath(path);
  if (path.length > 160 || localizedPath(plain, pathLanguage(path)) !== path) return false;
  return ['/', '/articles', '/life', '/projects', '/about', '/subscribe', '/friends'].includes(plain)
    || /^\/(articles|life)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plain);
}
