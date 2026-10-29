<script setup lang="ts">
import type { NuxtError } from '#app';
defineProps<{ error: NuxtError }>();
useHead({ title: '暂时无法打开 · Yishuai', meta: [{ name: 'robots', content: 'noindex' }] });
</script>
<template><main class="site-width page-intro"><span class="eyebrow">{{ error.statusCode }}</span><h1 class="qk-type-display">{{ error.statusCode === 404 ? '这里还是一片留白。' : error.statusCode === 410 ? '这篇内容已撤下。' : '暂时没能打开这里。' }}</h1><p>{{ error.message }}</p><a href="/" class="text-link">回到首页</a></main></template>
