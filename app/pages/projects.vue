<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
useBlogSeo('作品', '持续投入，也持续使用。Yishuai 正在创造的东西。', '/projects');
</script>
<template><div class="page-intro"><span class="eyebrow">把想法变成可以触碰的东西</span><h1 class="qk-type-display">作品</h1><p>持续投入，也持续使用。这里是我正在创造的东西。</p></div><ProjectFeature /><div class="project-footnote"><span class="qk-type-section-title">从真实的问题开始。</span><p>这个博客，也是其中一个。<br />用 QuireKit 搭建，在每天的阅读和写作中继续打磨。</p><a href="/articles" class="text-link">关于这个过程 <QuireIcon name="arrowRight" :size="16" /></a></div></template>
