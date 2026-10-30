import { localizedPath, pathLanguage } from '~~/shared/language';
/** Protects the writing UI; every server write also checks author identity. */
export default defineNuxtRouteMiddleware(async to => {
  const { refresh } = useBlogSession();
  const current = await refresh();
  if (!current) return navigateTo({ path: localizedPath('/login', pathLanguage(to.path)), query: { returnTo: to.fullPath } });
  if (!current.user.owner) throw createError({ statusCode: 403, message: '写作与内容管理只向作者开放。' });
});
