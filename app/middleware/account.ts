import { localizedPath, pathLanguage } from '~~/shared/language';
/** Loads the current account before opening its private settings. */
export default defineNuxtRouteMiddleware(async to => {
  const { refresh } = useBlogSession();
  if (!await refresh()) return navigateTo({ path: localizedPath('/login', pathLanguage(to.path)), query: { returnTo: to.fullPath } });
});
