<script setup lang="ts">
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
definePageMeta({ middleware: 'account' });
useBlogSeo('个人中心', '设置你的头像，带着自己的名字参与讨论。', '/account', true);
const { identity, logout } = useBlogSession();
const error = ref(''), busy = ref(false);
/** Ends this browser's session while keeping failed logout recoverable. */
async function signOut(): Promise<void> {
  busy.value = true; error.value = '';
  try { await logout(); }
  catch { error.value = '退出未能完成，请重试。'; }
  finally { busy.value = false; }
}
</script>
<template>
  <section class="account-page profile-page">
    <NuxtLink class="back-link" to="/"><QuireIcon name="arrowLeft" :size="16" /> 返回网站</NuxtLink>
    <div class="account-heading"><span class="eyebrow">以自己的样子出现</span><h1>个人中心</h1><p>换一张喜欢的头像，下次讨论时见。</p></div>
    <ClientOnly><LazyAvatarSettings /><template #fallback><p class="profile-loading" role="status">正在载入头像设置…</p></template></ClientOnly>
    <div class="profile-session"><div><span>GitHub 登录</span><p>@{{ identity?.user.login }}</p></div><QuireButton variant="text" size="md" :disabled="busy" @click="signOut">退出登录</QuireButton></div>
    <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
    <NuxtLink v-if="identity?.user.owner" class="text-link profile-management" to="/manage">创作管理 <QuireIcon name="arrowRight" :size="16" /></NuxtLink>
  </section>
</template>
