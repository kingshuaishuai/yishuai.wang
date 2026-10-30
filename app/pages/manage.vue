<script setup lang="ts">
import { QuireAvatar, QuireButton, QuireDialogRoot, QuireDialogContent, QuireDialogCloseTrigger, QuireIcon } from '@quirekit/ui/vue';
import type { DraftPost, ManagedPost, ManagedComment, ManagementPage } from '~~/shared/types';
const { t, locale, localePath } = useBlogLocale();
definePageMeta({ middleware: 'owner' });
useBlogSeo(t('创作管理'), t('写文章，记日常，管理讨论。'), '/manage', true);
const { identity, mutate, logout } = useBlogSession();
const postPage = ref(1), commentPage = ref(1);
const { data: posts, error: postsError, refresh: refreshPosts } = await useFetch<ManagementPage<ManagedPost>>('/api/owner/posts', { query: { page: postPage } });
const { data: comments, error: commentsError, refresh: refreshComments } = await useFetch<ManagementPage<ManagedComment>>('/api/owner/comments', { query: { page: commentPage } });
const error = ref(''), busy = ref(false);
const confirmation = ref<{ post: ManagedPost; action: 'delete' | 'unpublish' } | null>(null);
const confirming = computed({ get: () => !!confirmation.value, set: value => { if (!value) confirmation.value = null; } });
/** @param kind - Initial content type. */
async function create(kind: 'article' | 'note'): Promise<void> {
  if (busy.value) return; busy.value = true; error.value = '';
  try { const draft = await mutate<DraftPost>('/api/owner/posts', 'POST', { content: { kind, language: locale.value, category: kind === 'note' ? '日常' : '随笔' } }); await navigateTo(localePath(`/write/${draft.id}`)); }
  catch (e: any) { error.value = e.data?.message || t('创建草稿失败，请重试。'); }
  finally { busy.value = false; }
}
/** @param post - Current row. @param action - Reversible visibility change. */
async function transition(post: ManagedPost, action: 'delete' | 'unpublish' | 'restore'): Promise<void> {
  busy.value = true; error.value = '';
  try { await mutate(`/api/owner/posts/${post.id}/action`, 'POST', { version: post.version, action }); confirmation.value = null; await refreshPosts(); }
  catch (e: any) { error.value = e.data?.message || t('操作失败，请刷新后重试。'); }
  finally { busy.value = false; }
}
/** @param id - Pending or visible comment. @param status - New moderation state. */
async function moderate(id: string, status: 'approved' | 'hidden'): Promise<void> {
  busy.value = true; error.value = '';
  try { await mutate(`/api/owner/comments/${id}`, 'PATCH', { status }); await refreshComments(); }
  catch (e: any) { error.value = e.data?.message || t('审核未能保存。'); }
  finally { busy.value = false; }
}
</script>
<template>
  <div class="manage-heading"><div><NuxtLink :to="localePath('/account')" class="manage-profile"><QuireAvatar :name="identity?.user.name || 'Yishuai'" :fallback="identity?.user.name.slice(0, 1)" :src="identity?.user.avatarUrl || undefined" size="xs" /><span>{{ identity?.user.name }}{{ t('的书桌') }}</span><span>{{ t('设置头像') }}</span><QuireIcon name="arrowUpRight" :size="12" /></NuxtLink><h1 class="qk-type-display">{{ t('创作管理') }}</h1><p>{{ t('写一点，存下来。准备好了，再分享出去。') }}</p></div><QuireButton variant="text" size="sm" @click="logout">{{ t('退出登录') }}</QuireButton></div>
  <div class="manage-actions"><QuireButton variant="solid" size="md" :disabled="busy" @click="create('article')"><template #leading><QuireIcon name="plus" /></template>{{ t('写文章') }}</QuireButton><QuireButton variant="outline" size="md" :disabled="busy" @click="create('note')">{{ t('记日常') }}</QuireButton><div class="manage-settings"><AiSettings /></div></div>
  <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
  <section class="manage-section"><h2 class="qk-type-section-title">{{ t('我的内容') }}</h2><p v-if="postsError" class="comment-error" role="alert">{{ t('内容暂时无法载入，请刷新后重试。') }}</p><p v-else-if="posts && !posts.items.length" class="empty-state">{{ t('从第一篇开始。') }}</p><ManagedPostRow v-for="post in posts?.items" :key="post.id" :post="post" :busy="busy" @action="action => action === 'restore' ? transition(post, action) : confirmation = { post, action }" /><ManagePagination v-if="posts" v-model:page="postPage" :pages="posts.pages" :label="t('内容分页')" /></section>
  <section class="manage-section"><h2 class="qk-type-section-title">{{ t('评论审核') }}</h2><p v-if="commentsError" class="comment-error" role="alert">{{ t('评论暂时无法载入，请刷新后重试。') }}</p><p v-else-if="comments && !comments.items.length" class="empty-state">{{ t('目前没有需要处理的评论。') }}</p><article v-for="comment in comments?.items" :key="String(comment.id)" class="manage-comment"><div class="comment-byline"><strong>{{ comment.author }}</strong><span>{{ comment.status === 'pending' ? t('待审核') : comment.status === 'approved' ? t('已公开') : t('已隐藏') }}</span></div><p class="eyebrow">{{ comment.postTitle || t('生活碎片') }}</p><div class="moderated-content" v-html="String(comment.html)" /><div class="manage-row-actions"><QuireButton v-if="comment.status !== 'approved'" variant="outline" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'approved')">{{ t('通过审核') }}</QuireButton><QuireButton v-if="comment.status !== 'hidden'" variant="text" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'hidden')">{{ t('隐藏') }}</QuireButton></div></article><ManagePagination v-if="comments" v-model:page="commentPage" :pages="comments.pages" :label="t('评论分页')" /></section>
  <QuireDialogRoot v-model:open="confirming"><QuireDialogContent :title="confirmation?.action === 'delete' ? t('删除这篇内容？') : t('撤回这篇内容？')" :description="t('公开页面、订阅源和 Markdown 将同步撤下。内容仍会保留在创作管理中。')"><template #footer><QuireDialogCloseTrigger as-child><QuireButton variant="text" size="md">{{ t('取消') }}</QuireButton></QuireDialogCloseTrigger><QuireButton variant="solid" size="md" :disabled="busy" @click="confirmation && transition(confirmation.post, confirmation.action)">{{ t('确认') }} {{ confirmation?.action === 'delete' ? t('删除') : t('撤回') }}</QuireButton></template></QuireDialogContent></QuireDialogRoot>
</template>
