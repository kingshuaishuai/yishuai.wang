<script setup lang="ts">
import { QuireButton, QuireTag } from '@quirekit/ui/vue';
import type { ManagedPost } from '~~/shared/types';
defineProps<{ post: ManagedPost; busy: boolean }>();
defineEmits<{ action: [action: 'delete' | 'unpublish' | 'restore'] }>();
const labels = { draft: '草稿', published: '已发布', deleted: '已删除' };
</script>
<template>
  <article class="manage-post">
    <div class="manage-post-content">
      <NuxtLink v-if="post.status !== 'deleted'" :to="`/write/${post.id}`" class="manage-post-link" :aria-label="`编辑：${post.title || post.summary || '未命名草稿'}`">
        <img v-if="post.coverUrl" :src="post.coverUrl" class="manage-post-cover" alt="" loading="lazy" />
        <div><h3>{{ post.title || post.summary || '未命名草稿' }}</h3><p v-if="post.title && post.summary" class="manage-post-description">{{ post.summary }}</p></div>
      </NuxtLink>
      <h3 v-else>{{ post.title || post.summary || '未命名草稿' }}</h3>
      <div class="manage-post-meta"><time :datetime="post.updatedAt">{{ post.updatedAt.slice(0, 10) }}</time><QuireTag size="xs" color="neutral" variant="subtle">{{ post.kind === 'article' ? '文章' : '短记' }}</QuireTag><QuireTag size="xs" color="neutral" variant="subtle">{{ labels[post.status] }}</QuireTag></div>
    </div>
    <div class="manage-row-actions"><NuxtLink v-if="post.status === 'published'" :to="post.kind === 'article' ? `/articles/${post.slug}` : `/life/${post.id}`">查看</NuxtLink><QuireButton v-if="post.status === 'published'" variant="ghost" size="sm" :disabled="busy" @click="$emit('action', 'unpublish')">撤回</QuireButton><QuireButton v-if="post.status !== 'deleted'" variant="ghost" size="sm" :disabled="busy" @click="$emit('action', 'delete')">删除</QuireButton><QuireButton v-else variant="outline" size="sm" :disabled="busy" @click="$emit('action', 'restore')">恢复</QuireButton></div>
  </article>
</template>
