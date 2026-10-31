<script setup lang="ts">
import { postPath } from '~~/shared/language';
import { QuireButton, QuireTag } from '@quirekit/ui/vue';
import type { ManagedPost } from '~~/shared/types';
const { t, localePath } = useBlogLocale();
defineProps<{ post: ManagedPost; busy: boolean }>();
defineEmits<{ action: [action: 'delete' | 'unpublish', event: Event] }>();
const labels = { draft: t('草稿'), published: t('已发布'), deleted: t('已删除') };
</script>
<template>
  <article class="manage-post">
    <div class="manage-post-content">
      <NuxtLink v-if="post.status !== 'deleted'" :to="localePath(`/write/${post.id}`)" class="manage-post-link" :aria-label="`${t('编辑')}: ${post.title || post.summary || t('未命名草稿')}`">
        <img v-if="post.coverUrl" :src="post.coverUrl" class="manage-post-cover" alt="" loading="lazy" />
        <div><h3>{{ post.title || post.summary || t('未命名草稿') }}</h3><p v-if="post.title && post.summary" class="manage-post-description">{{ post.summary }}</p></div>
      </NuxtLink>
      <h3 v-else>{{ post.title || post.summary || t('未命名草稿') }}</h3>
      <div class="manage-post-meta"><time :datetime="post.updatedAt">{{ post.updatedAt.slice(0, 10) }}</time><span>{{ post.language === 'en' ? 'English' : '中文' }}</span><QuireTag size="xs" color="neutral" variant="subtle">{{ post.kind === 'article' ? t('文章') : t('短记') }}</QuireTag><QuireTag size="xs" color="neutral" variant="subtle">{{ labels[post.status] }}</QuireTag></div>
    </div>
    <div class="manage-row-actions">
      <NuxtLink v-if="post.status === 'published'" :to="postPath(post)">{{ t('查看') }}</NuxtLink>
      <QuireButton v-if="post.status === 'published'" variant="ghost" size="sm" :disabled="busy" @click="$emit('action', 'unpublish', $event)">{{ t('撤回') }}</QuireButton>
      <QuireButton variant="ghost" size="sm" :disabled="busy" @click="$emit('action', 'delete', $event)">{{ t('永久删除', 'Delete permanently') }}</QuireButton>
    </div>
  </article>
</template>
