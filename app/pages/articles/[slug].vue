<script setup lang="ts">
definePageMeta({ key: route => route.path });
const route = useRoute();
const { data: post, error } = await useFetch(`/api/posts/${encodeURIComponent(String(route.params.slug))}`);
if (error.value || !post.value) {
  const statusCode = error.value?.statusCode || 404;
  throw createError({ statusCode, message: statusCode >= 500 ? '文章暂时无法载入，请稍后重试。' : statusCode === 410 ? '这篇文章已移除。' : '这篇文章暂未公开。' });
}
</script>
<template><PostReading v-if="post" :post="post" /></template>
