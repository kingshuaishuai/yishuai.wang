<script setup lang="ts">
definePageMeta({ key: route => route.path });
const route = useRoute();
const { data: post, error } = await useFetch(`/api/notes/${encodeURIComponent(String(route.params.id))}`);
if (error.value || !post.value) {
  const statusCode = error.value?.statusCode || 404;
  throw createError({ statusCode, message: statusCode >= 500 ? '日常暂时无法载入，请稍后重试。' : statusCode === 410 ? '这则日常已移除。' : '这则日常暂未公开。' });
}
</script>
<template><PostReading v-if="post" :post="post" /></template>
