<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
useBlogSeo('Yishuai', '开发者，QuireKit 作者。作品、技术思考，以及值得记住的日常。', '/');
const { data: articles } = await useFetch('/api/posts', { query: { size: 3 } });
const { data: notes } = await useFetch('/api/posts', { query: { kind: 'note', size: 2 } });
</script>
<template>
  <section class="hero"><div class="hero-copy"><p class="hero-greeting"><span class="hello-mark"></span>你好，我是 Yishuai。</p><h1 class="qk-type-display">认真做点东西。<br /><span>也好好记录生活。</span></h1><p class="hero-description">开发者，QuireKit 作者。<br />作品、技术思考，还有日常里值得记住的小事，<br class="desktop-break" />都放在这里。</p><div class="hero-links"><NuxtLink class="text-link" to="/about">更多关于我 <QuireIcon name="arrowRight" :size="16" /></NuxtLink><NuxtLink to="/subscribe" class="hero-subscribe"><RssIcon /> 订阅更新</NuxtLink></div></div></section>
  <ProjectFeature />
  <section class="home-writing"><div class="section-heading"><div><span class="eyebrow">所思 · 所写</span><h2 class="qk-type-section-title">最近的文章</h2></div><NuxtLink class="text-link" to="/articles">全部文章 <QuireIcon name="arrowRight" :size="16" /></NuxtLink></div><ArticleList :articles="articles?.items || []" /><p v-if="!articles?.items.length" class="empty-state">第一篇文章，正在慢慢酝酿。</p></section>
  <section class="life-preview"><div class="section-heading"><div><span class="eyebrow">日常的切片</span><h2 class="qk-type-section-title">生活，也值得记录</h2></div><NuxtLink class="text-link" to="/life">更多日常 <QuireIcon name="arrowRight" :size="16" /></NuxtLink></div><div class="note-preview-grid"><NuxtLink v-for="note in notes?.items" :key="note.id" :to="note.url" class="note-preview"><div><span>{{ note.category }}</span><time :datetime="note.publishedAt">{{ note.date }}</time></div><p>{{ note.summary }}</p><QuireIcon name="arrowUpRight" :size="16" /></NuxtLink></div><p v-if="!notes?.items.length" class="empty-state">从一件小事开始记录。</p></section>
</template>
