<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
const { t, locale, localePath, categoryLabel } = useBlogLocale();
definePageMeta({ key: route => route.fullPath });
const route = useRoute();
const { data, error } = await useFetch('/api/posts', { query: computed(() => ({ kind: 'note', lang: locale.value, page: route.query.page || 1 })) });
if (error.value) throw createError({ statusCode: error.value.statusCode || 500, message: t('暂时无法载入日常。') });
useBlogSeo(t('生活碎片'), t('不一定有结论，也不一定很重要。只是想记下来。'), `/life${route.query.page ? `?page=${route.query.page}` : ''}`);
</script>
<template>
  <div class="page-intro"><span class="eyebrow">{{ t('代码之外') }}</span><h1 class="qk-type-display">{{ t('生活碎片') }}</h1><p>{{ t('不一定有结论，也不一定很重要。只是想记下来。') }}</p></div>
  <div class="life-timeline"><article v-for="note in data?.items" :key="note.id" class="life-entry"><time :datetime="note.publishedAt">{{ note.date }}</time><div><span class="eyebrow">{{ categoryLabel(note.category) }}</span><p>{{ note.summary }}</p><NuxtLink v-if="note.coverUrl" :to="note.url" :aria-label="note.summary"><img :src="note.coverUrl" class="note-cover" alt="" loading="lazy" /></NuxtLink><NuxtLink :to="note.url" class="text-link">{{ t('读这一则与讨论') }} <QuireIcon name="arrowUpRight" :size="16" /></NuxtLink></div></article></div><p v-if="!data?.items.length" class="empty-state">{{ t('从一件小事开始记录。') }}</p>
  <nav v-if="data && data.pages > 1" class="pagination" :aria-label="t('日常分页')"><NuxtLink v-if="data.page > 1" :to="{ path: localePath('/life'), query: { page: data.page - 1 } }">{{ t('上一页') }}</NuxtLink><span>{{ data.page }} / {{ data.pages }}</span><NuxtLink v-if="data.page < data.pages" :to="{ path: localePath('/life'), query: { page: data.page + 1 } }">{{ t('下一页') }}</NuxtLink></nav><p class="archive-end">{{ t('平常的日子，也有自己的光。') }}</p>
</template>
