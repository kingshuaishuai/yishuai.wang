/** Loads the current account before opening its private settings. */
export default defineNuxtRouteMiddleware(async to => {
  const { refresh } = useBlogSession();
  if (!await refresh()) return navigateTo({ path: '/login', query: { returnTo: to.fullPath } });
});
