<script setup lang="ts">
import { QuireButton, QuireInput, QuireSelect } from '@quirekit/ui/vue';
const { t, locale, localePath, categoryLabel } = useBlogLocale();
definePageMeta({ key: route => route.fullPath });
const route = useRoute();
const topic = ref(typeof route.query.category === 'string' ? route.query.category : 'all');
const query = ref(typeof route.query.q === 'string' ? route.query.q : '');
const language = ref(['zh', 'en', 'all'].includes(String(route.query.lang)) ? String(route.query.lang) : locale.value);
const filters = computed(() => ['all', '技术', '创造', '随笔'].map(value => ({ value, label: value !== 'all' ? categoryLabel(value) : t('全部分类', 'All topics') })));
const languages = computed(() => [{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'all', label: t('全部', 'All') }]);
const apiQuery = computed(() => ({ page: route.query.page || 1, q: route.query.q || '', category: route.query.category || '', lang: language.value }));
const { data, error } = await useFetch('/api/posts', { query: apiQuery });
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, message: t('暂时无法载入文章。', 'Unable to load articles right now.') });
useBlogSeo(t('文章', 'Articles'), t('关于技术、创造，以及偶尔冒出来的一点想法。', 'On technology, making things, and the occasional thought.'), `/articles${route.query.page ? `?page=${route.query.page}` : ''}`, !!route.query.q || !!route.query.category || !!route.query.lang);
/** Applies filters through shareable, server-rendered URLs and resets pagination. */
function search(): void { navigateTo({ path: localePath('/articles'), query: { ...(topic.value !== 'all' ? { category: topic.value } : {}), ...(query.value.trim() ? { q: query.value.trim() } : {}), ...(language.value !== locale.value ? { lang: language.value } : {}) } }); }
watch([topic, language], search);
</script>
<template>
  <div class="page-intro"><span class="eyebrow">{{ t('写下来的，才会留下', 'Written down, kept around') }}</span><h1 class="qk-type-display">{{ t('文章', 'Articles') }}</h1><p>{{ t('关于技术、创造，以及偶尔冒出来的一点想法。', 'On technology, making things, and the occasional thought.') }}</p></div>
  <form class="article-filters" @submit.prevent="search"><div class="article-filter-groups"><QuireSelect v-model="language" :items="languages" :label="t('内容语言', 'Content language')" variant="text" width="104px" size="sm" /><QuireSelect v-model="topic" :items="filters" :label="t('文章分类', 'Article topics')" variant="text" width="140px" size="sm" /></div><div class="article-search"><QuireInput v-model="query" :aria-label="t('搜索文章', 'Search articles')" :placeholder="t('搜索文章…', 'Search articles…')" width="100%" /><QuireButton type="submit" variant="text" size="sm">{{ t('搜索', 'Search') }}</QuireButton></div></form>
  <ArticleList :articles="data?.items || []" :show-language="language === 'all'" />
  <div v-if="!data?.items.length" class="empty-state" role="status"><p>{{ t('这里暂时还没有文章。', 'No articles here yet.') }}</p><NuxtLink v-if="language !== 'all'" :to="{ path: localePath('/articles'), query: { lang: 'all' } }" class="text-link">{{ t('看看所有语言的文章', 'Browse articles in all languages') }}</NuxtLink></div>
  <nav v-if="data && data.pages > 1" class="pagination" :aria-label="t('文章分页', 'Article pages')"><NuxtLink v-if="data.page > 1" :to="{ path: localePath('/articles'), query: { ...route.query, page: data.page - 1 } }">{{ t('上一页', 'Previous') }}</NuxtLink><span>{{ data.page }} / {{ data.pages }}</span><NuxtLink v-if="data.page < data.pages" :to="{ path: localePath('/articles'), query: { ...route.query, page: data.page + 1 } }">{{ t('下一页', 'Next') }}</NuxtLink></nav><p class="archive-end">{{ t('慢慢写，慢慢积累。', 'A little at a time.') }}</p>
</template>
