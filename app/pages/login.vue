<script setup lang="ts">
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
const route = useRoute();
const { identity, logout } = useBlogSession();
const { data: status } = await useFetch('/api/auth/status');
const destination = typeof route.query.returnTo === 'string' && route.query.returnTo.startsWith('/') && !route.query.returnTo.startsWith('//') ? route.query.returnTo : '/';
useBlogSeo('登录', '登录后参与讨论，作者可以写作与管理内容。', '/login', true);
/** Starts the server-owned OAuth flow using a full navigation. */
function login(): void { window.location.assign(`/api/auth/github?returnTo=${encodeURIComponent(destination)}`); }
</script>
<template>
  <section class="account-page"><NuxtLink class="back-link" to="/"><QuireIcon name="arrowLeft" :size="16" /> 返回网站</NuxtLink><div class="account-heading"><span class="eyebrow">一个自己的角落</span><h1>很高兴又见到你。</h1><p>登录后留下你的名字，也可以继续以访客身份阅读和评论。</p></div>
    <div v-if="identity" class="account-signin"><p>已登录为 {{ identity.user.name }}</p><NuxtLink v-if="identity.user.owner" to="/manage" class="text-link">进入写作与管理 <QuireIcon name="arrowRight" :size="16" /></NuxtLink><QuireButton size="md" variant="text" @click="logout">退出登录</QuireButton></div>
    <div v-else class="account-signin"><QuireButton size="lg" variant="solid" :disabled="!status?.github" @click="login">用 GitHub 登录</QuireButton><p v-if="!status?.github">登录服务正在配置，阅读与访客评论不受影响。</p><p v-else>仅使用你的公开身份，不需要仓库权限。</p><p v-if="route.query.error" role="alert">登录没有完成，可以重新试一次。</p></div>
  </section>
</template>
