<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { quireIconRegistry } from '@quirekit/ui';
import { QuireIcon, QuireIconButton, QuireIconProvider } from '@quirekit/ui/vue';
import { route } from './navigation';
import HomePage from './pages/HomePage.vue';
import ArticlesPage from './pages/ArticlesPage.vue';
import ArticlePage from './pages/ArticlePage.vue';
import CollectionPage from './pages/CollectionPage.vue';
import SubscribePage from './pages/SubscribePage.vue';
import SiteBrand from './components/SiteBrand.vue';
import RssIcon from './components/RssIcon.vue';
import LoginPage from './pages/LoginPage.vue';
import { previewRole, openLogin } from './account/session';

/** Keeps editor code out of the public reading route. @returns Editor page module. */
async function loadWriter() { return import('./pages/WritePage.vue'); }
const WritePage = defineAsyncComponent(loadWriter);
/** Loads decorative rendering independently of content and controls. @returns Ink ornament module. */
async function loadInkPainting() { return import('./components/InkPainting.vue'); }
const InkPainting = defineAsyncComponent(loadInkPainting);
const dark = ref(document.documentElement.dataset.qkScheme === 'dark');
const menuOpen = ref(false);
const nav = [{ label: '首页', path: '/' }, { label: '文章', path: '/articles' }, { label: '项目', path: '/projects' }, { label: '生活', path: '/life' }, { label: '关于', path: '/about' }];
const writing = computed(() => route.value === '/write' && previewRole.value === 'owner');
const article = computed(() => route.value.startsWith('/articles/'));

/** Updates the documented root attributes, including portaled QuireKit controls. */
function toggleTheme(): void {
  dark.value = !dark.value;
  document.documentElement.dataset.qkScheme = dark.value ? 'dark' : 'light';
  try { localStorage.setItem('yishuai-color-scheme', dark.value ? 'dark' : 'light'); } catch { /* Theme remains usable without storage. */ }
}

/** Closes mobile navigation after following a route. */
function closeMenu(): void { menuOpen.value = false; }
/** Returns keyboard focus to the trigger after dismissing mobile navigation. */
function dismissMenu(): void {
  if (!menuOpen.value) return;
  closeMenu();
  document.getElementById('mobile-nav-trigger')?.focus();
}
/** Moves keyboard reading to the current page without changing its route. */
function focusMain(): void { document.getElementById('main-content')?.focus(); }
watch(route, closeMenu);
</script>

<template>
  <QuireIconProvider :registry="quireIconRegistry">
    <div class="site-shell" :class="{ 'site-shell--writing': writing, 'site-shell--menu-open': menuOpen }" @keydown.esc="dismissMenu">
    <InkPainting v-if="!writing" :page="route" placement="heading" />
    <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳到主要内容</a>
    <header class="site-header site-width" :class="{ 'site-header--writing': writing }">
      <SiteBrand v-if="!writing" />
      <a v-else href="#/" class="writer-back" aria-label="返回网站"><QuireIcon name="arrowLeft" :size="16" /><span>返回</span></a>
      <h1 v-if="writing" class="qk-type-heading writer-top-title">写作</h1>
      <nav v-if="!writing" class="desktop-nav" aria-label="主导航">
        <a v-for="item in nav" :key="item.path" :href="`#${item.path}`" :aria-current="route === item.path || (article && item.path === '/articles') ? 'page' : undefined">{{ item.label }}</a>
      </nav>
      <div class="header-actions">
        <a v-if="!writing" class="header-rss" href="#/subscribe" aria-label="RSS 订阅" title="RSS 订阅"><RssIcon /></a>
        <QuireIconButton :label="dark ? '切换浅色' : '切换深色'" size="lg" @click="toggleTheme"><QuireIcon :name="dark ? 'sun' : 'moon'" /></QuireIconButton>
        <QuireIconButton v-if="!writing" id="mobile-nav-trigger" class="mobile-toggle" :label="menuOpen ? '收起导航' : '打开导航'" size="lg" :aria-expanded="menuOpen" aria-controls="mobile-nav" @click="menuOpen = !menuOpen"><QuireIcon :name="menuOpen ? 'close' : 'menu'" /></QuireIconButton>
      </div>
    </header>
    <nav v-if="menuOpen && !writing" id="mobile-nav" class="mobile-nav site-width" aria-label="手机导航">
      <a v-for="item in nav" :key="item.path" :href="`#${item.path}`" :aria-current="route === item.path ? 'page' : undefined">{{ item.label }}</a>
      <a href="#/subscribe" :aria-current="route === '/subscribe' ? 'page' : undefined">订阅 <RssIcon /></a>
    </nav>
    <main id="main-content" tabindex="-1" :class="['site-width', { 'writing-width': writing }]">
      <HomePage v-if="route === '/'" />
      <ArticlesPage v-else-if="route === '/articles'" />
      <ArticlePage v-else-if="article" :key="route" :slug="route.slice('/articles/'.length)" />
      <WritePage v-else-if="writing" />
      <LoginPage v-else-if="route === '/write' || route === '/login'" :writing="route === '/write'" />
      <SubscribePage v-else-if="route === '/subscribe'" />
      <CollectionPage v-else :page="route.slice(1)" />
    </main>
    <footer v-if="!writing" class="site-footer site-width">
      <InkPainting :page="route" placement="footer" />
      <div class="footer-top"><div><SiteBrand /><p>作品、文字，和日常的回声。</p></div><div class="footer-links"><a href="#/subscribe"><RssIcon /> RSS 订阅</a><a href="/llms.txt" target="_blank">llms.txt <QuireIcon name="arrowUpRight" :size="12" /></a></div></div>
      <div class="footer-bottom"><span>© 2026 Yishuai · Built with <a href="https://quirekit.com" target="_blank" rel="noreferrer">QuireKit</a></span><span class="preview-caption">设计预览 · 示例内容</span><a v-if="previewRole === 'owner'" class="writer-link" href="#/write"><QuireIcon name="edit" :size="16" /> 写作</a><a v-else class="writer-link" href="#/login" @click.prevent="openLogin(route)">{{ previewRole === 'guest' ? '登录' : '读者 · 身份预览' }} <QuireIcon name="arrowUpRight" :size="12" /></a></div>
    </footer>
    </div>
  </QuireIconProvider>
</template>
