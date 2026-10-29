<script setup lang="ts">
import type { DraftPost } from '~~/shared/types';
definePageMeta({ middleware: 'owner', key: route => route.path });
useBlogSeo('写作', '从一段文字开始。', '/write', true);
const route = useRoute();
const { data: draft, error } = await useFetch<DraftPost>(`/api/owner/posts/${encodeURIComponent(String(route.params.id))}`, {
  // Hydration consumes the server snapshot; later visits fetch the latest revision.
  getCachedData: (key, app) => app.isHydrating ? app.payload.data[key] : undefined,
});
if (!draft.value || error.value) throw createError({ statusCode: error.value?.statusCode || 404, message: '草稿暂时无法打开。' });
if (draft.value.status === 'deleted') await navigateTo('/manage');
</script>
<template><ClientOnly><LazyBlogWriter v-if="draft" :initial="draft" @saved="draft = $event" /><template #fallback><p class="empty-state">正在打开你的草稿…</p></template></ClientOnly></template>
