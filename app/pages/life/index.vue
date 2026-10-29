<script setup lang="ts">
definePageMeta({ key: route => route.fullPath });
const route = useRoute();
const { data, error } = await useFetch('/api/posts', { query: computed(() => ({ kind: 'note', page: route.query.page || 1 })) });
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, message: '暂时无法载入日常。' });
useBlogSeo('生活碎片', '不一定有结论，也不一定很重要。只是想记下来。', `/life${route.query.page ? `?page=${route.query.page}` : ''}`);
</script>
<template>
  <div class="page-intro"><span class="eyebrow">代码之外</span><h1 class="qk-type-display">生活碎片</h1><p>不一定有结论，也不一定很重要。只是想记下来。</p></div>
  <div class="life-timeline"><article v-for="note in data?.items" :key="note.id" class="life-entry"><time :datetime="note.publishedAt">{{ note.date }}</time><div><span class="eyebrow">{{ note.category }}</span><p>{{ note.summary }}</p><NuxtLink :to="note.url" class="text-link">读这一则与讨论 ↗</NuxtLink></div></article></div><p v-if="!data?.items.length" class="empty-state">从一件小事开始记录。</p>
  <nav v-if="data && data.pages > 1" class="pagination" aria-label="日常分页"><NuxtLink v-if="data.page > 1" :to="{ path: '/life', query: { page: data.page - 1 } }">上一页</NuxtLink><span>{{ data.page }} / {{ data.pages }}</span><NuxtLink v-if="data.page < data.pages" :to="{ path: '/life', query: { page: data.page + 1 } }">下一页</NuxtLink></nav><p class="archive-end">平常的日子，也有自己的光。</p>
</template>
