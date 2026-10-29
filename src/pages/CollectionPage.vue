<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
import { notes } from '../content';
import ProjectFeature from '../components/ProjectFeature.vue';
defineProps<{ page: string }>();
</script>

<template>
  <template v-if="page === 'projects'"><div class="page-intro"><span class="eyebrow">把想法变成可以触碰的东西</span><h1 class="qk-type-display">作品</h1><p>持续投入，也持续使用。这里是我正在创造的东西。</p></div><ProjectFeature /><div class="project-footnote"><span class="qk-type-section-title">从真实的问题开始。</span><p>这个博客，也是其中一个。<br />用 QuireKit 搭建，在每天的阅读和写作中继续打磨。</p><a href="#/articles/building-quirekit" class="text-link">关于这个过程 <QuireIcon name="arrowRight" :size="16" /></a></div></template>
  <template v-else-if="page === 'life'"><div class="page-intro"><span class="eyebrow">代码之外</span><h1 class="qk-type-display">生活碎片</h1><p>不一定有结论，也不一定很重要。只是想记下来。</p></div><div class="life-timeline"><article v-for="note in notes" :key="note.date" class="life-entry"><time>2026.{{ note.date }}</time><div><span class="eyebrow">{{ note.mood }}</span><p>{{ note.text }}</p><span class="life-entry-end">— Yishuai</span></div></article></div><p class="archive-end">平常的日子，也有自己的光。</p></template>
  <template v-else-if="page === 'about'"><div class="page-intro"><span class="eyebrow">很高兴在这里遇见你</span><h1 class="qk-type-display">我是 Yishuai。</h1><p>开发者，QuireKit 作者。喜欢把想法做成可以使用的东西。</p></div><div class="about-body"><section><h2 class="qk-type-section-title">创造，也记录。</h2><p>这里是我的个人空间。你会看到正在做的项目、开发过程中的思考，以及一些生活里的小事。</p><p>我希望这里保持简单，让作品说话，让文字有足够的呼吸空间。偶尔回来更新，慢慢积累。</p></section><section><h2 class="qk-type-section-title">最近在做什么</h2><a href="https://quirekit.com" target="_blank" rel="noreferrer" class="about-project"><span>QuireKit</span><span>文档编辑器框架</span><QuireIcon name="arrowUpRight" :size="16" /></a><p>也在用它搭建这个博客，让阅读和写作回到自己的地方。</p></section><section><h2 class="qk-type-section-title">保持联系</h2><p>未来会在这里放上公开联系方式和订阅入口。</p><a href="https://github.com/quirekit/quirekit" target="_blank" rel="noreferrer" class="text-link">在 GitHub 看看 QuireKit <QuireIcon name="arrowUpRight" :size="16" /></a></section></div></template>
  <div v-else class="page-intro"><h1 class="qk-type-page-title">这里暂时还是一片留白。</h1><a class="text-link" href="#/">回到首页</a></div>
</template>
