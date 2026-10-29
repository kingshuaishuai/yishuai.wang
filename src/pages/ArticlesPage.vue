<script setup lang="ts">
import { computed, ref } from 'vue';
import { QuireInput, QuireSegmented } from '@quirekit/ui/vue';
import { articles } from '../content';
import ArticleList from '../components/ArticleList.vue';
const topic = ref('全部');
const query = ref('');
const filters = ['全部', '技术', '创造', '随笔'].map(value => ({ value, label: value }));
const visible = computed(() => articles.filter(post => (topic.value === '全部' || post.category === topic.value) && `${post.title}${post.summary}`.includes(query.value.trim())));
</script>

<template>
  <div class="page-intro"><span class="eyebrow">写下来的，才会留下</span><h1 class="qk-type-display">文章</h1><p>关于技术、创造，以及偶尔冒出来的一点想法。</p></div>
  <div class="article-filters"><QuireSegmented v-model="topic" :items="filters" label="文章分类" /><div class="article-search"><QuireInput v-model="query" aria-label="搜索文章" placeholder="搜索文章…" width="100%" /></div></div>
  <div class="archive-year">2026</div><ArticleList :articles="visible" />
  <p v-if="!visible.length" class="empty-state" role="status">还没有找到这篇文章。换个关键词试试。</p>
  <p class="archive-end">慢慢写，慢慢积累。</p>
</template>
