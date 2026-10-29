<script setup lang="ts">
import { QuireButton, QuireInput, QuireSegmented } from '@quirekit/ui/vue';
definePageMeta({ key: route => route.fullPath });
const route = useRoute();
const topic = ref(typeof route.query.category === 'string' ? route.query.category : '全部');
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const filters = ['全部', '技术', '创造', '随笔'].map(value => ({ value, label: value }));
const apiQuery = computed(() => ({ page: route.query.page || 1, q: route.query.q || '', category: route.query.category || '' }));
const { data, error } = await useFetch('/api/posts', { query: apiQuery });
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, message: '暂时无法载入文章。' });
useBlogSeo('文章', '关于技术、创造，以及偶尔冒出来的一点想法。', `/articles${route.query.page ? `?page=${route.query.page}` : ''}`, !!route.query.q || !!route.query.category);
/** Applies filter changes through shareable, server-rendered URLs. */
function search(): void { navigateTo({ path: '/articles', query: { ...(topic.value !== '全部' ? { category: topic.value } : {}), ...(query.value.trim() ? { q: query.value.trim() } : {}) } }); }
watch(topic, search);
</script>
<template>
  <div class="page-intro"><span class="eyebrow">写下来的，才会留下</span><h1 class="qk-type-display">文章</h1><p>关于技术、创造，以及偶尔冒出来的一点想法。</p></div>
  <form class="article-filters" @submit.prevent="search"><QuireSegmented v-model="topic" :items="filters" label="文章分类" /><div class="article-search"><QuireInput v-model="query" aria-label="搜索文章" placeholder="搜索文章，按回车确认…" width="100%" /><QuireButton type="submit" variant="text" size="sm">搜索</QuireButton></div></form>
  <ArticleList :articles="data?.items || []" /><p v-if="!data?.items.length" class="empty-state" role="status">这里暂时还没有文章。稍后再来看看。</p>
  <nav v-if="data && data.pages > 1" class="pagination" aria-label="文章分页"><NuxtLink v-if="data.page > 1" :to="{ path: '/articles', query: { ...route.query, page: data.page - 1 } }">上一页</NuxtLink><span>{{ data.page }} / {{ data.pages }}</span><NuxtLink v-if="data.page < data.pages" :to="{ path: '/articles', query: { ...route.query, page: data.page + 1 } }">下一页</NuxtLink></nav><p class="archive-end">慢慢写，慢慢积累。</p>
</template>
