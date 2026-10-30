<script setup lang="ts">
import BrandMark from './BrandMark.vue';
const { t, localePath } = useBlogLocale();
</script>

<template>
  <a class="site-brand" :href="localePath('/')" :aria-label="t('yishuai.wang 首页', 'yishuai.wang home')">
    <BrandMark /><span class="brand-name">yishuai<span class="brand-domain">.wang</span></span>
  </a>
</template>
