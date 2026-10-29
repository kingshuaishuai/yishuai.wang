<script setup lang="ts">
import { QuireIcon } from '@quirekit/ui/vue';
import type { PublicPostSummary } from '~~/shared/types';
defineProps<{ articles: PublicPostSummary[]; compact?: boolean }>();
</script>

<template>
  <div class="article-list" :class="{ compact }">
    <NuxtLink v-for="post in articles" :key="post.slug" class="article-row" :to="post.url">
      <div class="article-row-meta"><time class="article-date" :datetime="post.date.replaceAll('.', '-')">{{ post.date.slice(5) }}</time><span class="article-category">{{ post.category }}</span></div>
      <div class="article-row-copy"><h3 class="qk-type-heading">{{ post.title }}</h3><p>{{ post.summary }}</p></div>
      <QuireIcon class="article-arrow" name="arrowUpRight" :size="16" />
    </NuxtLink>
  </div>
</template>
