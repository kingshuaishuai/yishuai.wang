<script setup lang="ts">
import { QuireAvatar, QuireIcon } from '@quirekit/ui/vue';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import type { PublicPost, Profile } from '~~/shared/types';
import ReadingCode from './ReadingCode.vue';
const props = defineProps<{ post: PublicPost }>();
const { data: author } = await useFetch<Profile>('/api/profile', { key: 'site-profile' });
const readingComponents = { pre: ReadingCode };
const headings = computed(() => props.post.markdown.split('\n').filter(line => line.startsWith('## ')).map(line => line.slice(3)));
const origin = useRuntimeConfig().public.siteUrl;
const cover = props.post.coverUrl ? new URL(props.post.coverUrl, origin).href : undefined;
useBlogSeo(props.post.title || '一则生活碎片', props.post.summary, props.post.url);
useSeoMeta({ ogImage: cover, twitterImage: cover, twitterCard: cover ? 'summary_large_image' : 'summary', ogType: 'article', articlePublishedTime: props.post.publishedAt, articleModifiedTime: props.post.updatedAt, author: 'Yishuai' });
useHead({ link: [{ rel: 'alternate', type: 'text/markdown', href: `${props.post.url}.md` }], script: [{ type: 'application/ld+json', textContent: JSON.stringify({
  '@context': 'https://schema.org', '@type': 'BlogPosting', headline: props.post.title || props.post.summary, description: props.post.summary,
  datePublished: props.post.publishedAt, dateModified: props.post.updatedAt, url: new URL(props.post.url, origin).href,
  ...(cover ? { image: [cover] } : {}), author: { '@type': 'Person', name: 'Yishuai', url: new URL('/about', origin).href }, mainEntityOfPage: new URL(props.post.url, origin).href,
}).replaceAll('<', '\\u003c') }] });
/** @param title - Visible section title rendered by the public Markdown component. */
function jumpTo(title: string): void {
  const heading = [...document.querySelectorAll('.reading-body h2')].find(node => node.textContent === title);
  heading?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
</script>
<template>
  <article class="reading-page h-entry">
    <NuxtLink :to="post.kind === 'article' ? '/articles' : '/life'" class="back-link"><QuireIcon name="arrowLeft" :size="16" /> {{ post.kind === 'article' ? '所有文章' : '生活碎片' }}</NuxtLink>
    <header class="reading-header"><div class="reading-meta"><span>{{ post.category }}</span><span>·</span><time class="dt-published" :datetime="post.publishedAt">{{ post.date }}</time></div><h1 class="qk-type-display p-name">{{ post.title || '此刻的一点记录' }}</h1><p v-if="post.kind === 'article'" class="p-summary">{{ post.summary }}</p><div class="author-line"><QuireAvatar name="Yishuai" fallback="Y" :src="author?.avatarUrl || undefined" size="xs" /><NuxtLink to="/about" class="p-author h-card">Yishuai</NuxtLink><span class="reading-time">{{ Math.max(1, Math.ceil(post.markdown.length / 350)) }} 分钟阅读</span><a class="article-markdown" :href="`${post.url}.md`"><QuireIcon name="fileText" :size="16" /> Markdown <QuireIcon name="arrowUpRight" :size="12" /></a></div><img v-if="post.coverUrl" :src="post.coverUrl" class="reading-cover u-featured" alt="" /></header>
    <div class="reading-layout"><div class="reading-body"><div class="e-content"><QuireMarkdown v-if="post.sourceFormat !== 'html'" :content="post.markdown" :identity="post.id" :components="readingComponents" :html="false" /><div v-else class="published-html" v-html="post.html" /></div><div class="article-colophon"><span>写于 {{ post.date }}</span><span>谢谢你读到这里。</span></div><PostComments :key="post.id" :post="post" /></div><aside v-if="headings.length" class="reading-outline" aria-label="文章目录"><span class="eyebrow">本篇目录</span><button v-for="(heading, i) in headings" :key="i" @click="jumpTo(heading)">{{ heading }}</button><span class="outline-note">留一点时间，<br />读一点文字。</span></aside></div>
  </article>
</template>
