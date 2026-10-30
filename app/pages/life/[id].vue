<script setup lang="ts">
definePageMeta({ key: route => route.path });
const route = useRoute();
const { t } = useBlogLocale();
const { data: post, error } = await useFetch(`/api/notes/${encodeURIComponent(String(route.params.id))}`);
if (error.value || !post.value) {
  const statusCode = error.value?.statusCode || 404;
  throw createError({ statusCode, message: statusCode >= 500 ? t('日常暂时无法载入，请稍后重试。', 'Unable to load this note. Please try again later.') : statusCode === 410 ? t('这则日常已移除。', 'This note has been removed.') : t('这则日常暂未公开。', 'This note is not public.') });
}
if (post.value && route.path !== post.value.url) await navigateTo(post.value.url, { redirectCode: 301 });
</script>
<template><PostReading v-if="post" :post="post" /></template>
