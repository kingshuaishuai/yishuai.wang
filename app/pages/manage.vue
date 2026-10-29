<script setup lang="ts">
import { QuireButton, QuireDialogRoot, QuireDialogContent, QuireDialogCloseTrigger, QuireIcon } from '@quirekit/ui/vue';
import type { DraftPost, ManagedPost, ManagedComment, ManagementPage } from '~~/shared/types';
definePageMeta({ middleware: 'owner' });
useBlogSeo('创作管理', '写文章，记日常，管理讨论。', '/manage', true);
const { identity, mutate, logout } = useBlogSession();
const postPage = ref(1), commentPage = ref(1);
const { data: posts, error: postsError, refresh: refreshPosts } = await useFetch<ManagementPage<ManagedPost>>('/api/owner/posts', { query: { page: postPage } });
const { data: comments, error: commentsError, refresh: refreshComments } = await useFetch<ManagementPage<ManagedComment>>('/api/owner/comments', { query: { page: commentPage } });
const error = ref(''), busy = ref(false);
const confirmation = ref<{ post: ManagedPost; action: 'delete' | 'unpublish' } | null>(null);
const confirming = computed({ get: () => !!confirmation.value, set: value => { if (!value) confirmation.value = null; } });
const labels = { draft: '草稿', published: '已发布', deleted: '已删除' };
/** @param kind - Initial content type. */
async function create(kind: 'article' | 'note'): Promise<void> {
  if (busy.value) return; busy.value = true; error.value = '';
  try { const draft = await mutate<DraftPost>('/api/owner/posts', 'POST', { content: { kind } }); await navigateTo(`/write/${draft.id}`); }
  catch (e: any) { error.value = e.data?.message || '创建草稿失败，请重试。'; }
  finally { busy.value = false; }
}
/** @param post - Current row. @param action - Reversible visibility change. */
async function transition(post: ManagedPost, action: 'delete' | 'unpublish' | 'restore'): Promise<void> {
  busy.value = true; error.value = '';
  try { await mutate(`/api/owner/posts/${post.id}/action`, 'POST', { version: post.version, action }); confirmation.value = null; await refreshPosts(); }
  catch (e: any) { error.value = e.data?.message || '操作失败，请刷新后重试。'; }
  finally { busy.value = false; }
}
/** @param id - Pending or visible comment. @param status - New moderation state. */
async function moderate(id: string, status: 'approved' | 'hidden'): Promise<void> {
  busy.value = true; error.value = '';
  try { await mutate(`/api/owner/comments/${id}`, 'PATCH', { status }); await refreshComments(); }
  catch (e: any) { error.value = e.data?.message || '审核未能保存。'; }
  finally { busy.value = false; }
}
</script>
<template>
  <div class="manage-heading"><div><span class="eyebrow">{{ identity?.user.name }} 的书桌</span><h1 class="qk-type-display">创作管理</h1><p>写一点，存下来。准备好了，再分享出去。</p></div><QuireButton variant="text" size="sm" @click="logout">退出登录</QuireButton></div>
  <div class="manage-actions"><QuireButton variant="solid" size="md" :disabled="busy" @click="create('article')"><QuireIcon name="plus" :size="16" /> 写文章</QuireButton><QuireButton variant="outline" size="md" :disabled="busy" @click="create('note')">记日常</QuireButton></div>
  <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
  <section class="manage-section"><h2 class="qk-type-section-title">我的内容</h2><p v-if="postsError" class="comment-error" role="alert">内容暂时无法载入，请刷新后重试。</p><p v-else-if="posts && !posts.items.length" class="empty-state">从第一篇开始。</p><article v-for="post in posts?.items" :key="post.id" class="manage-post"><div><span class="eyebrow">{{ post.kind === 'article' ? '文章' : '短记' }} · {{ labels[post.status] }}</span><h3>{{ post.title || post.summary || '未命名草稿' }}</h3><time :datetime="post.updatedAt">{{ post.updatedAt.slice(0, 10) }}</time></div><div class="manage-row-actions"><NuxtLink v-if="post.status !== 'deleted'" :to="`/write/${post.id}`" class="text-link">编辑</NuxtLink><NuxtLink v-if="post.status === 'published'" :to="post.kind === 'article' ? `/articles/${post.slug}` : `/life/${post.id}`">查看</NuxtLink><QuireButton v-if="post.status === 'published'" variant="text" size="sm" :disabled="busy" @click="confirmation = { post, action: 'unpublish' }">撤回</QuireButton><QuireButton v-if="post.status !== 'deleted'" variant="text" size="sm" :disabled="busy" @click="confirmation = { post, action: 'delete' }">删除</QuireButton><QuireButton v-else variant="text" size="sm" :disabled="busy" @click="transition(post, 'restore')">恢复</QuireButton></div></article><ManagePagination v-if="posts" v-model:page="postPage" :pages="posts.pages" label="内容分页" /></section>
  <section class="manage-section"><h2 class="qk-type-section-title">评论审核</h2><p v-if="commentsError" class="comment-error" role="alert">评论暂时无法载入，请刷新后重试。</p><p v-else-if="comments && !comments.items.length" class="empty-state">目前没有需要处理的评论。</p><article v-for="comment in comments?.items" :key="String(comment.id)" class="manage-comment"><div class="comment-byline"><strong>{{ comment.author }}</strong><span>{{ comment.status === 'pending' ? '待审核' : comment.status === 'approved' ? '已公开' : '已隐藏' }}</span></div><p class="eyebrow">{{ comment.postTitle || '生活碎片' }}</p><div class="moderated-content" v-html="String(comment.html)" /><div class="manage-row-actions"><QuireButton v-if="comment.status !== 'approved'" variant="outline" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'approved')">通过审核</QuireButton><QuireButton v-if="comment.status !== 'hidden'" variant="text" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'hidden')">隐藏</QuireButton></div></article><ManagePagination v-if="comments" v-model:page="commentPage" :pages="comments.pages" label="评论分页" /></section>
  <QuireDialogRoot v-model:open="confirming"><QuireDialogContent :title="confirmation?.action === 'delete' ? '删除这篇内容？' : '撤回这篇内容？'" description="公开页面、订阅源和 Markdown 将同步撤下。内容仍会保留在创作管理中。"><template #footer><QuireDialogCloseTrigger class="qk-button qk-button--neutral-text qk-button--md">取消</QuireDialogCloseTrigger><QuireButton variant="solid" size="md" :disabled="busy" @click="confirmation && transition(confirmation.post, confirmation.action)">确认{{ confirmation?.action === 'delete' ? '删除' : '撤回' }}</QuireButton></template></QuireDialogContent></QuireDialogRoot>
</template>
