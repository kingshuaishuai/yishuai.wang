<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { quireIconRegistry } from '@quirekit/ui';
import { QuireIcon, QuireIconButton, QuireIconProvider } from '@quirekit/ui/vue';
import { route } from './navigation';
import HomePage from './pages/HomePage.vue';
import ArticlesPage from './pages/ArticlesPage.vue';
import ArticlePage from './pages/ArticlePage.vue';
import CollectionPage from './pages/CollectionPage.vue';

/** Keeps editor code out of the public reading route. @returns Editor page module. */
async function loadWriter() { return import('./pages/WritePage.vue'); }
const WritePage = defineAsyncComponent(loadWriter);
const dark = ref(false);
const menuOpen = ref(false);
const nav = [{ label: '首页', path: '/' }, { label: '文章', path: '/articles' }, { label: '项目', path: '/projects' }, { label: '生活', path: '/life' }, { label: '关于', path: '/about' }];
const writing = computed(() => route.value === '/write');
const article = computed(() => route.value.startsWith('/articles/'));

/** Updates the documented root attributes, including portaled QuireKit controls. */
function toggleTheme(): void {
  dark.value = !dark.value;
  document.documentElement.dataset.qkScheme = dark.value ? 'dark' : 'light';
}

/** Closes mobile navigation after following a route. */
function closeMenu(): void { menuOpen.value = false; }
watch(route, closeMenu);
</script>

<template>
  <QuireIconProvider :registry="quireIconRegistry">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <header class="site-header site-width" :class="{ 'site-header--writing': writing }">
      <a v-if="!writing" class="wordmark" href="#/" aria-label="Yishuai 首页">yishuai<span>.</span></a>
      <a v-else href="#/" class="writer-back" aria-label="返回网站"><QuireIcon name="arrowLeft" :size="16" /><span>返回</span></a>
      <h1 v-if="writing" class="qk-type-heading writer-top-title">写作</h1>
      <nav v-if="!writing" class="desktop-nav" aria-label="主导航">
        <a v-for="item in nav" :key="item.path" :href="`#${item.path}`" :aria-current="route === item.path || (article && item.path === '/articles') ? 'page' : undefined">{{ item.label }}</a>
      </nav>
      <div class="header-actions">
        <QuireIconButton :label="dark ? '切换浅色' : '切换深色'" size="lg" @click="toggleTheme"><QuireIcon :name="dark ? 'sun' : 'moon'" /></QuireIconButton>
        <QuireIconButton v-if="!writing" class="mobile-toggle" :label="menuOpen ? '收起导航' : '打开导航'" size="lg" :aria-expanded="menuOpen" aria-controls="mobile-nav" @click="menuOpen = !menuOpen"><QuireIcon name="menu" /></QuireIconButton>
      </div>
    </header>
    <nav v-if="menuOpen && !writing" id="mobile-nav" class="mobile-nav site-width" aria-label="手机导航">
      <a v-for="item in nav" :key="item.path" :href="`#${item.path}`" :aria-current="route === item.path ? 'page' : undefined">{{ item.label }}</a>
    </nav>
    <main id="main-content" :class="['site-width', { 'writing-width': writing }]">
      <HomePage v-if="route === '/'" />
      <ArticlesPage v-else-if="route === '/articles'" />
      <ArticlePage v-else-if="article" :key="route" :slug="route.slice('/articles/'.length)" />
      <WritePage v-else-if="writing" />
      <CollectionPage v-else :page="route.slice(1)" />
    </main>
    <footer v-if="!writing" class="site-footer site-width">
      <div class="footer-top"><a class="wordmark" href="#/">yishuai<span>.</span></a><p>创造一些东西，记录一些日子。</p><a class="text-link" href="#/about">保持联系 <QuireIcon name="arrowUpRight" :size="16" /></a></div>
      <div class="footer-bottom"><span>© 2026 Yishuai · Built with <a href="https://quirekit.com" target="_blank" rel="noreferrer">QuireKit</a></span><span class="preview-caption">设计预览 · 文案为示例</span><a class="writer-link" href="#/write"><QuireIcon name="edit" :size="16" /> 写作</a></div>
    </footer>
  </QuireIconProvider>
</template>
