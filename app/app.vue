<script setup lang="ts">
import { useVisitTracking } from './composables/useVisitTracking';
import { quireIconRegistry } from '@quirekit/ui';
import { QuireButton, QuireIcon, QuireIconButton, QuireIconProvider, QuireLocaleProvider } from '@quirekit/ui/vue';
const route = useRoute();
const { t, locale, basePath, localePath, switchPath } = useBlogLocale();
const { identity, refresh } = useBlogSession();
useVisitTracking();
const scheme = useCookie<'light' | 'dark'>('blog-scheme', { default: () => 'light', sameSite: 'lax', maxAge: 31536000 });
const dark = computed(() => scheme.value === 'dark');
const nav = computed(() => [{ label: t('首页', 'Home'), path: '/' }, { label: t('文章', 'Articles'), path: '/articles' }, { label: t('项目', 'Projects'), path: '/projects' }, { label: t('生活', 'Life'), path: '/life' }, { label: t('友链', 'Friends'), path: '/friends' }, { label: t('关于', 'About'), path: '/about' }]);
const writing = computed(() => basePath.value.startsWith('/write'));
const config = useRuntimeConfig();
const publishingOpen = ref(false);
/** @returns The visible navigation control after a publishing dialog closes. */
function publishingFocus(): HTMLElement | null {
  const desktop = document.querySelector<HTMLElement>('.publishing-nav-trigger');
  return desktop?.getClientRects().length ? desktop : document.querySelector<HTMLElement>('.mobile-toggle');
}
useHead(() => ({ htmlAttrs: { lang: locale.value === 'zh' ? 'zh-CN' : 'en', 'data-qk-scheme': dark.value ? 'dark' : 'light' }, link: [
  { rel: 'alternate', type: 'application/rss+xml', title: t('Yishuai 的文章', 'Articles by Yishuai'), href: localePath('/feed.xml') },
] }));
/** Toggles the theme on both server renders and client navigation. */
function toggleTheme(): void { scheme.value = dark.value ? 'light' : 'dark'; }
/** Moves keyboard focus into the current page. */
function focusMain(): void { document.getElementById('main-content')?.focus(); }
onMounted(() => { refresh().catch(() => {}); });
</script>

<template>
  <QuireLocaleProvider :locale="locale"><QuireIconProvider :registry="quireIconRegistry">
    <div class="site-shell" :class="{ 'site-shell--writing': writing }">
      <ClientOnly><LazyInkPainting v-if="!writing" :page="basePath" placement="heading" /></ClientOnly>
      <ClientOnly><LazyInkPainting v-if="!writing" :page="basePath" placement="margin" /></ClientOnly>
      <a class="skip-link" href="#main-content" @click.prevent="focusMain">{{ t('跳到主要内容', 'Skip to content') }}</a>
      <header class="site-header site-width" :class="{ 'site-header--writing': writing }">
        <SiteBrand v-if="!writing" />
        <NuxtLink v-else :to="localePath('/manage')" class="writer-back"><QuireIcon name="arrowLeft" :size="16" /><span>{{ t('返回', 'Back') }}</span></NuxtLink>
        <h1 v-if="writing" class="qk-type-heading writer-top-title">{{ t('写作', 'Write') }}</h1>
        <nav v-if="!writing" class="desktop-nav" :aria-label="t('主导航', 'Main navigation')">
          <NuxtLink v-for="item in nav" :key="item.path" :to="localePath(item.path)" :aria-current="basePath === item.path || (item.path !== '/' && basePath.startsWith(item.path + '/')) ? 'page' : undefined">{{ item.label }}</NuxtLink>
          <NuxtLink v-if="identity && !identity.user.owner" :to="localePath('/account')" :aria-current="basePath === '/account' ? 'page' : undefined">{{ t('个人中心', 'Account') }}</NuxtLink>
        <NuxtLink v-if="identity?.user.owner" :to="localePath('/manage')" :aria-current="basePath.startsWith('/manage') || basePath === '/analytics' ? 'page' : undefined">{{ t('创作管理', 'Manage') }}</NuxtLink>
          <QuireButton v-if="identity?.user.owner" class="publishing-nav-trigger" variant="text" size="md" aria-haspopup="dialog" :aria-expanded="publishingOpen" aria-controls="publishing-access-dialog" @click="publishingOpen = true">{{ t('发布接入', 'Publishing access') }}</QuireButton>
        </nav>
        <div class="header-actions"><NuxtLink class="language-switch" :to="switchPath" :lang="locale === 'zh' ? 'en' : 'zh-CN'" :aria-label="t('切换到英文', 'Switch to Chinese')">{{ t('EN', '中文') }}</NuxtLink>
          <NuxtLink v-if="!writing" class="header-rss" :to="localePath('/subscribe')" :aria-label="t('RSS 订阅', 'RSS feeds')"><RssIcon /></NuxtLink>
          <QuireIconButton :label="dark ? t('切换浅色', 'Switch to light mode') : t('切换深色', 'Switch to dark mode')" size="lg" @click="toggleTheme"><QuireIcon :name="dark ? 'sun' : 'moon'" /></QuireIconButton>
          <SiteMobileNav v-if="!writing" :items="nav" :identity="identity" @publishing="publishingOpen = true" />
        </div>
      </header>
      <main id="main-content" tabindex="-1" :class="['site-width', { 'writing-width': writing }]"><NuxtPage /></main>
      <footer v-if="!writing" class="site-footer site-width">
        <ClientOnly><LazyInkPainting :page="basePath" placement="footer" /></ClientOnly>
        <div class="footer-top"><div><SiteBrand /><p>{{ t('作品、文字，和日常的回声。', 'Projects, writing, and everyday life.') }}</p></div><div class="footer-links"><NuxtLink :to="localePath('/friends')">{{ t('友链', 'Friends') }}</NuxtLink><NuxtLink :to="localePath('/subscribe')"><RssIcon /> {{ t('RSS 订阅', 'RSS feeds') }}</NuxtLink><a href="/llms.txt">llms.txt <QuireIcon name="arrowUpRight" :size="12" /></a></div></div>
        <div class="footer-bottom"><span>© {{ new Date().getFullYear() }} Yishuai · Built with <a href="https://quirekit.com" target="_blank" rel="noreferrer">QuireKit</a></span><span v-if="String(config.public.indexable) !== 'true'" class="preview-caption">{{ t('开发环境', 'Development preview') }}</span><NuxtLink v-if="!identity?.user.owner" class="writer-link" :to="identity ? localePath('/account') : { path: localePath('/login'), query: { returnTo: route.fullPath } }">{{ identity ? t('个人中心', 'Account') : t('登录', 'Sign in') }} <QuireIcon name="arrowUpRight" :size="12" /></NuxtLink></div>
      </footer>
    </div>
    <ClientOnly><LazyPublishingAccess v-if="identity?.user.owner" v-model:open="publishingOpen" :return-focus="publishingFocus" /></ClientOnly>
  </QuireIconProvider></QuireLocaleProvider>
</template>
