<script setup lang="ts">
import { computed } from 'vue';
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
import { loginReturnPath, previewRole, setPreviewRole } from '../account/session';
import type { PreviewRole } from '../account/types';
const props = defineProps<{ writing?: boolean }>();
const destination = computed(() => props.writing ? '/write' : loginReturnPath.value);
/** Resumes a local preview with a clearly identified role. @param role - Preview identity. */
function enter(role: PreviewRole): void {
  setPreviewRole(role);
  window.location.hash = role === 'owner' || destination.value !== '/write' ? destination.value : '/articles';
}
</script>

<template>
  <section class="account-page">
    <a class="back-link" href="#/"><QuireIcon name="arrowLeft" :size="16" /> 返回网站</a>
    <div class="account-heading"><span class="eyebrow">一个自己的角落</span><h1>{{ writing ? '回来，继续写。' : '很高兴又见到你。' }}</h1><p>{{ writing ? '写作与内容管理只向作者开放。' : '登录后留下你的名字，也可以继续以访客身份阅读和评论。' }}</p></div>
    <div class="account-signin"><QuireButton size="lg" variant="solid" disabled>用 GitHub 登录</QuireButton><p>登录服务尚未连接，当前可体验下方的身份预览。</p></div>
    <div class="account-preview"><span class="eyebrow">设计预览</span><p>选择身份，看看各自能做什么。</p><div class="account-preview-actions"><QuireButton variant="outline" size="md" @click="enter('owner')">作者 · 写作与管理</QuireButton><QuireButton variant="outline" size="md" @click="enter('reader')">读者 · 参与讨论</QuireButton></div><QuireButton v-if="previewRole !== 'guest'" variant="text" size="md" @click="enter('guest')">退出身份预览</QuireButton><small>身份仅在当前浏览器标签页内模拟，不代表真实登录。</small></div>
  </section>
</template>
