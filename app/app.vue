<script setup lang="ts">
import { quireIconRegistry } from '@quirekit/ui';
import { QuireIcon, QuireIconButton, QuireIconProvider } from '@quirekit/ui/vue';
const route = useRoute();
const { identity, refresh } = useBlogSession();
const scheme = useCookie<'light' | 'dark'>('blog-scheme', { default: () => 'light', sameSite: 'lax', maxAge: 31536000 });
const dark = computed(() => scheme.value === 'dark');
const menuOpen = ref(false);
const nav = [{ label: '首页', path: '/' }, { label: '文章', path: '/articles' }, { label: '项目', path: '/projects' }, { label: '生活', path: '/life' }, { label: '关于', path: '/about' }];
const writing = computed(() => route.path.startsWith('/write'));
const config = useRuntimeConfig();
useHead(() => ({ htmlAttrs: { 'data-qk-scheme': dark.value ? 'dark' : 'light' }, link: [
  { rel: 'alternate', type: 'application/rss+xml', title: 'Yishuai 的文章', href: '/feed.xml' },
] }));
/** Toggles the theme on both server renders and client navigation. */
function toggleTheme(): void { scheme.value = dark.value ? 'light' : 'dark'; }
/** Returns focus when the mobile navigation is dismissed. */
function dismissMenu(): void { if (!menuOpen.value) return; menuOpen.value = false; document.getElementById('mobile-nav-trigger')?.focus(); }
/** Moves keyboard focus into the current page. */
function focusMain(): void { document.getElementById('main-content')?.focus(); }
watch(() => route.fullPath, () => { menuOpen.value = false; });
onMounted(() => { refresh().catch(() => {}); });
</script>

<template>
  <QuireIconProvider :registry="quireIconRegistry">
    <div class="site-shell" :class="{ 'site-shell--writing': writing, 'site-shell--menu-open': menuOpen }" @keydown.esc="dismissMenu">
      <ClientOnly><LazyInkPainting v-if="!writing" :page="route.path" placement="heading" /></ClientOnly>
      <ClientOnly><LazyInkPainting v-if="!writing" :page="route.path" placement="margin" /></ClientOnly>
      <a class="skip-link" href="#main-content" @click.prevent="focusMain">跳到主要内容</a>
      <header class="site-header site-width" :class="{ 'site-header--writing': writing }">
        <SiteBrand v-if="!writing" />
        <NuxtLink v-else to="/manage" class="writer-back"><QuireIcon name="arrowLeft" :size="16" /><span>返回</span></NuxtLink>
        <h1 v-if="writing" class="qk-type-heading writer-top-title">写作</h1>
        <nav v-if="!writing" class="desktop-nav" aria-label="主导航">
          <NuxtLink v-for="item in nav" :key="item.path" :to="item.path" :aria-current="route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path + '/')) ? 'page' : undefined">{{ item.label }}</NuxtLink>
          <NuxtLink v-if="identity && !identity.user.owner" to="/account" :aria-current="route.path === '/account' ? 'page' : undefined">个人中心</NuxtLink>
        <NuxtLink v-if="identity?.user.owner" to="/manage" :aria-current="route.path.startsWith('/manage') ? 'page' : undefined">创作管理</NuxtLink>
        </nav>
        <div class="header-actions">
          <NuxtLink v-if="!writing" class="header-rss" to="/subscribe" aria-label="RSS 订阅"><RssIcon /></NuxtLink>
          <QuireIconButton :label="dark ? '切换浅色' : '切换深色'" size="lg" @click="toggleTheme"><QuireIcon :name="dark ? 'sun' : 'moon'" /></QuireIconButton>
          <QuireIconButton v-if="!writing" id="mobile-nav-trigger" class="mobile-toggle" :label="menuOpen ? '收起导航' : '打开导航'" size="lg" :aria-expanded="menuOpen" aria-controls="mobile-nav" @click="menuOpen = !menuOpen"><QuireIcon :name="menuOpen ? 'close' : 'menu'" /></QuireIconButton>
        </div>
      </header>
      <nav v-if="menuOpen && !writing" id="mobile-nav" class="mobile-nav site-width" aria-label="手机导航">
        <NuxtLink v-for="item in nav" :key="item.path" :to="item.path" :aria-current="route.path === item.path ? 'page' : undefined">{{ item.label }}</NuxtLink>
        <NuxtLink v-if="identity && !identity.user.owner" to="/account" :aria-current="route.path === '/account' ? 'page' : undefined">个人中心</NuxtLink>
        <NuxtLink v-if="identity?.user.owner" to="/manage" :aria-current="route.path.startsWith('/manage') ? 'page' : undefined">创作管理</NuxtLink>
        <NuxtLink to="/subscribe">订阅 <RssIcon /></NuxtLink>
      </nav>
      <main id="main-content" tabindex="-1" :class="['site-width', { 'writing-width': writing }]"><NuxtPage /></main>
      <footer v-if="!writing" class="site-footer site-width">
        <ClientOnly><LazyInkPainting :page="route.path" placement="footer" /></ClientOnly>
        <div class="footer-top"><div><SiteBrand /><p>作品、文字，和日常的回声。</p></div><div class="footer-links"><NuxtLink to="/subscribe"><RssIcon /> RSS 订阅</NuxtLink><a href="/llms.txt">llms.txt <QuireIcon name="arrowUpRight" :size="12" /></a></div></div>
        <div class="footer-bottom"><span>© {{ new Date().getFullYear() }} Yishuai · Built with <a href="https://quirekit.com" target="_blank" rel="noreferrer">QuireKit</a></span><span v-if="String(config.public.indexable) !== 'true'" class="preview-caption">开发环境</span><NuxtLink v-if="!identity?.user.owner" class="writer-link" :to="identity ? '/account' : { path: '/login', query: { returnTo: route.fullPath } }">{{ identity ? '个人中心' : '登录' }} <QuireIcon name="arrowUpRight" :size="12" /></NuxtLink></div>
      </footer>
    </div>
  </QuireIconProvider>
</template>
