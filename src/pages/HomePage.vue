<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
import { articles, notes } from '../content';
import ProjectFeature from '../components/ProjectFeature.vue';
import ArticleList from '../components/ArticleList.vue';
</script>

<template>
  <section class="hero">
    <div class="hero-copy"><p class="hero-greeting"><span class="hello-mark"></span>你好，我是 Yishuai。</p><h1 class="qk-type-display">认真做点东西。<br /><span>也好好记录生活。</span></h1><p class="hero-description">开发者，QuireKit 作者。<br />这里收藏我的作品、技术思考，以及日常里值得记住的小事。</p><a class="text-link" href="#/about">更多关于我 <QuireIcon name="arrowRight" :size="16" /></a></div>
    <div class="hero-aside"><span class="eyebrow">此刻</span><p>QuireKit 已发布。<br />开始用自己的工具，<br />搭建自己的小天地。</p><a href="#/articles/building-quirekit">读读这段旅程 <QuireIcon name="arrowUpRight" :size="16" /></a></div>
  </section>
  <ProjectFeature />
  <section class="home-writing"><div class="section-heading"><div><span class="eyebrow">所思 · 所写</span><h2 class="qk-type-section-title">最近的文章</h2></div><a class="text-link" href="#/articles">全部文章 <QuireIcon name="arrowRight" :size="16" /></a></div><ArticleList :articles="articles" /></section>
  <section class="life-preview"><div class="section-heading"><div><span class="eyebrow">日常的切片</span><h2 class="qk-type-section-title">生活，也值得记录</h2></div><a class="text-link" href="#/life">更多日常 <QuireIcon name="arrowRight" :size="16" /></a></div><div class="note-preview-grid"><a v-for="note in notes.slice(0, 2)" :key="note.date" href="#/life" class="note-preview"><div><span>{{ note.mood }}</span><time>{{ note.date }}</time></div><p>{{ note.text }}</p><QuireIcon name="arrowUpRight" :size="16" /></a></div></section>
</template>
