<script setup lang="ts">
definePageMeta({ key: route => route.path });
const route = useRoute();
const { t } = useBlogLocale();
const { data: post, error } = await useFetch(`/api/posts/${encodeURIComponent(String(route.params.slug))}`);
if (error.value || !post.value) {
  const statusCode = error.value?.statusCode || 404;
  throw createError({ statusCode, message: statusCode >= 500 ? t('文章暂时无法载入，请稍后重试。', 'Unable to load this article. Please try again later.') : statusCode === 410 ? t('这篇文章已移除。', 'This article has been removed.') : t('这篇文章暂未公开。', 'This article is not public.') });
}
if (post.value && route.path !== post.value.url) await navigateTo(post.value.url, { redirectCode: 301 });
</script>
<template><PostReading v-if="post" :post="post" /></template>
