<script setup lang="ts">
import { QuireAnchor, QuireAvatar, QuireCollapsible, QuireIcon } from '@quirekit/ui/vue';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import type { PublicPost, Profile } from '~~/shared/types';
import ReadingCode from './ReadingCode.vue';
const props = defineProps<{ post: PublicPost }>();
const route = useRoute();
const { t, localePath, categoryLabel, languageTargets } = useBlogLocale();
const { headings } = useArticleHeadings();
const { data: author } = await useFetch<Profile>('/api/profile', { key: 'site-profile' });
const readingComponents = { pre: ReadingCode };
const origin = useRuntimeConfig().public.siteUrl;
const cover = props.post.coverUrl ? new URL(props.post.coverUrl, origin).href : undefined;
// The header renders before this child on SSR; update its shortcut after hydration.
onMounted(() => {
  watchEffect(() => { languageTargets.value = { path: route.path, versions: props.post.translations }; });
});
useBlogSeo(props.post.title || t('一则生活碎片', 'A note'), props.post.summary, props.post.url);
useSeoMeta({ ogImage: cover, twitterImage: cover, twitterCard: cover ? 'summary_large_image' : 'summary', ogType: 'article', articlePublishedTime: props.post.publishedAt, articleModifiedTime: props.post.updatedAt, author: 'Yishuai' });
useHead({ link: [{ rel: 'alternate', type: 'text/markdown', href: `${props.post.url}.md` }, ...props.post.translations.map(item => ({ rel: 'alternate' as const, type: 'text/html', hreflang: item.language === 'zh' ? 'zh-CN' : 'en', href: origin + item.url }))], script: [{ type: 'application/ld+json', textContent: JSON.stringify({
  '@context': 'https://schema.org', '@type': 'BlogPosting', headline: props.post.title || props.post.summary, description: props.post.summary, inLanguage: props.post.language === 'zh' ? 'zh-CN' : 'en',
  datePublished: props.post.publishedAt, dateModified: props.post.updatedAt, url: new URL(props.post.url, origin).href,
  ...(cover ? { image: [cover] } : {}), author: { '@type': 'Person', name: 'Yishuai', url: new URL(localePath('/about'), origin).href }, mainEntityOfPage: new URL(props.post.url, origin).href,
}).replaceAll('<', '\\u003c') }] });
</script>
<template>
  <article class="reading-page h-entry" :lang="post.language === 'zh' ? 'zh-CN' : 'en'">
    <NuxtLink :to="localePath(post.kind === 'article' ? '/articles' : '/life')" class="back-link"><QuireIcon name="arrowLeft" :size="16" /> {{ post.kind === 'article' ? t('所有文章', 'All articles') : t('生活碎片', 'All notes') }}</NuxtLink>
    <div class="reading-layout">
      <div class="reading-column">
        <header class="reading-header">
          <div class="reading-meta"><span>{{ categoryLabel(post.category) }}</span><span>·</span><time class="dt-published" :datetime="post.publishedAt">{{ post.date }}</time><nav v-if="post.translations.length > 1" class="article-languages" :aria-label="t('文章语言', 'Article language')"><NuxtLink v-for="version in post.translations" :key="version.language" :to="version.url" :lang="version.language" :aria-current="version.language === post.language ? 'page' : undefined">{{ version.language === 'zh' ? '中文' : 'English' }}</NuxtLink></nav></div>
          <h1 class="qk-type-display p-name">{{ post.title || t('此刻的一点记录', 'A moment worth keeping') }}</h1>
          <AiSummary v-if="post.aiSummary" :text="post.aiSummary.text" :language="post.language" />
          <div class="author-line"><QuireAvatar name="Yishuai" fallback="Y" :src="author?.avatarUrl || undefined" size="xs" /><NuxtLink :to="localePath('/about')" class="p-author h-card">Yishuai</NuxtLink><span class="reading-time">{{ Math.max(1, Math.ceil(post.language === 'en' ? post.markdown.split(/\s+/).length / 220 : post.markdown.length / 350)) }} {{ t('分钟阅读', 'min read') }}</span><span v-if="post.viewCount" class="article-views" :title="`${t('统计始于', 'Tracked since')} ${post.viewCount.since.slice(0, 10)}`"><QuireIcon name="eye" :size="16" />{{ post.viewCount.count.toLocaleString() }} {{ t('次浏览', 'views') }}</span><a class="article-markdown" :href="`${post.url}.md`"><QuireIcon name="fileText" :size="16" /> Markdown <QuireIcon name="arrowUpRight" :size="12" /></a></div>
        </header>
        <QuireCollapsible v-if="headings.length" class="reading-outline-mobile" :title="t('本篇目录', 'On this page')" variant="plain" size="md"><QuireAnchor :items="headings" :offset="32" :aria-label="t('文章目录', 'Article contents')" /></QuireCollapsible>
        <div class="reading-body"><div ref="articleContent" class="e-content"><QuireMarkdown v-if="post.sourceFormat !== 'html'" :content="post.markdown" :identity="post.id" :components="readingComponents" :html="false" /><div v-else class="published-html" v-html="post.html" /></div><div class="article-colophon"><span>{{ t('写于', 'Published') }} {{ post.date }}</span><span>{{ t('谢谢你读到这里。', 'Thanks for reading.') }}</span></div><PostComments :key="post.id" :post="post" /></div>
      </div>
      <aside v-if="headings.length" class="reading-outline"><QuireAnchor :items="headings" :offset="40" :title="t('本篇目录', 'On this page')" /><span class="outline-note">{{ t('留一点时间，读一点文字。', 'A little time, a few words.') }}</span></aside>
    </div>
  </article>
</template>
