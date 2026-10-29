/** Protects the writing UI; every server write also checks author identity. */
export default defineNuxtRouteMiddleware(async to => {
  const { refresh } = useBlogSession();
  const current = await refresh();
  if (!current) return navigateTo({ path: '/login', query: { returnTo: to.fullPath } });
  if (!current.user.owner) throw createError({ statusCode: 403, message: '写作与内容管理只向作者开放。' });
});
