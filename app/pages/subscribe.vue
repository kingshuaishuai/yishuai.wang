<script setup lang="ts">
import { QuireClipboard, QuireIcon } from '@quirekit/ui/vue';
const origin = useRuntimeConfig().public.siteUrl;
useBlogSeo('订阅', '通过 RSS 订阅文章与日常，获取 Markdown 和站点阅读索引。', '/subscribe');
</script>

<template>
  <div class="page-intro"><span class="eyebrow">保持连接</span><h1 class="qk-type-display">在你的阅读器里见。</h1><p>用你喜欢的阅读器，按自己的节奏读。</p></div>
  <div class="subscribe-body">
    <section class="subscribe-feed" aria-labelledby="feed-heading">
      <div class="subscribe-heading"><RssIcon /><h2 id="feed-heading" class="qk-type-section-title">RSS 订阅</h2><span>文章更新</span></div>
      <p>把下面的地址添加到阅读器，新文章就会出现在那里。</p>
      <QuireClipboard :value="`${origin}/feed.xml`" mode="input" label="RSS 订阅地址" size="xl" />
      <div class="subscribe-footnote"><a href="/feed.xml" target="_blank" class="text-link">查看订阅源 <QuireIcon name="arrowUpRight" :size="16" /></a><span>只包含已公开的文章，更新后同步到订阅源。</span></div>
    <p class="subscribe-footnote"><a href="/life/feed.xml" class="text-link">也可以订阅生活碎片</a></p></section>
    <section class="subscribe-formats" aria-labelledby="formats-heading">
      <h2 id="formats-heading" class="qk-type-section-title">文字，也可以带走。</h2>
      <p>每篇文章都提供 Markdown，方便保存或交给工具阅读。文章页就能找到入口。</p>
      <a class="format-link" href="/articles" target="_blank"><QuireIcon name="fileText" :size="20" /><span><strong>文章 Markdown</strong><small>只有正文与必要信息</small></span><QuireIcon name="arrowUpRight" :size="16" /></a>
      <a class="format-link" href="/llms.txt" target="_blank"><QuireIcon name="code" :size="20" /><span><strong>llms.txt</strong><small>给 AI 与工具的站点阅读索引</small></span><QuireIcon name="arrowUpRight" :size="16" /></a>
    </section>
  </div>
</template>
