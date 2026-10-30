<script setup lang="ts">
import { QuireClipboard, QuireIcon, QuireSegmented } from '@quirekit/ui/vue';
const { t, locale, localePath } = useBlogLocale();
const origin = useRuntimeConfig().public.siteUrl;
const language = ref<string>(locale.value);
const languages = computed(() => [{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'all', label: t('全部', 'All') }]);
const feed = computed(() => language.value === 'en' ? '/en/feed.xml' : `/feed.xml${language.value === 'all' ? '?lang=all' : ''}`);
const notesFeed = computed(() => language.value === 'en' ? '/en/life/feed.xml' : `/life/feed.xml${language.value === 'all' ? '?lang=all' : ''}`);
useBlogSeo(t('订阅', 'Subscribe'), t('通过 RSS 订阅文章与日常，获取 Markdown 和站点阅读索引。', 'Follow articles and notes via RSS, or take the Markdown with you.'), '/subscribe');
</script>
<template>
  <div class="page-intro"><span class="eyebrow">{{ t('保持连接', 'Keep in touch') }}</span><h1 class="qk-type-display">{{ t('在你的阅读器里见。', 'See you in your reader.') }}</h1><p>{{ t('用你喜欢的阅读器，按自己的节奏读。', 'Read at your own pace, in your favorite reader.') }}</p></div>
  <div class="subscribe-body">
    <section class="subscribe-feed" aria-labelledby="feed-heading">
      <div class="subscribe-heading"><RssIcon /><h2 id="feed-heading" class="qk-type-section-title">{{ t('RSS 订阅', 'RSS feeds') }}</h2><span>{{ t('文章更新', 'New articles') }}</span></div>
      <p>{{ t('把下面的地址添加到阅读器，新文章就会出现在那里。', 'Add this address to your reader to receive new articles.') }}</p>
      <div class="feed-language-options"><QuireSegmented v-model="language" :items="languages" :label="t('订阅语言', 'Feed language')" /></div>
      <QuireClipboard :value="origin + feed" mode="input" :label="t('RSS 订阅地址', 'RSS feed address')" size="xl" />
      <div class="subscribe-footnote"><a :href="feed" target="_blank" class="text-link">{{ t('查看订阅源', 'Open feed') }} <QuireIcon name="arrowUpRight" :size="16" /></a><span>{{ t('只包含已公开的文章，更新后同步到订阅源。', 'Published articles only, updated when a version is published.') }}</span></div>
      <p class="subscribe-footnote"><a :href="notesFeed" class="text-link">{{ t('也可以订阅生活碎片', 'Subscribe to notes too') }}</a></p>
    </section>
    <section class="subscribe-formats" aria-labelledby="formats-heading">
      <h2 id="formats-heading" class="qk-type-section-title">{{ t('文字，也可以带走。', 'Take the words with you.') }}</h2>
      <p>{{ t('每篇文章都提供 Markdown，方便保存或交给工具阅读。文章页就能找到入口。', 'Every article is available as Markdown. Follow the link on its page to save it or read it with other tools.') }}</p>
      <NuxtLink class="format-link" :to="localePath('/articles')"><QuireIcon name="fileText" :size="20" /><span><strong>{{ t('文章 Markdown', 'Articles in Markdown') }}</strong><small>{{ t('只有正文与必要信息', 'The text and essential metadata') }}</small></span><QuireIcon name="arrowUpRight" :size="16" /></NuxtLink>
      <a class="format-link" href="/llms.txt" target="_blank"><QuireIcon name="code" :size="20" /><span><strong>llms.txt</strong><small>{{ t('给 AI 与工具的站点阅读索引', 'A site index for AI and other tools') }}</small></span><QuireIcon name="arrowUpRight" :size="16" /></a>
    </section>
  </div>
</template>
