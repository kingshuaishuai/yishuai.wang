<script setup lang="ts">
import { QuireAvatar, QuireButton, QuireDialogRoot, QuireDialogContent, QuireIcon } from '@quirekit/ui/vue';
import type { DraftPost, ManagedPost, ManagedComment, ManagementPage } from '~~/shared/types';
const { t, locale, localePath } = useBlogLocale();
definePageMeta({ middleware: 'owner' });
useBlogSeo(t('创作管理'), t('写文章，记日常，管理讨论。'), '/manage', true);
const { identity, mutate, logout } = useBlogSession();
const postPage = ref(1), commentPage = ref(1);
const { data: posts, error: postsError, refresh: refreshPosts } = await useFetch<ManagementPage<ManagedPost>>('/api/owner/posts', { query: { page: postPage } });
const { data: comments, error: commentsError, refresh: refreshComments } = await useFetch<ManagementPage<ManagedComment>>('/api/owner/comments', { query: { page: commentPage } });
const error = ref(''), notice = ref(''), busy = ref(false), actionBlocked = ref(false);
const confirmation = ref<{ post: ManagedPost; action: 'delete' | 'unpublish' } | null>(null);
const confirming = computed({ get: () => !!confirmation.value, set: value => { if (!value && !busy.value) confirmation.value = null; } });
const cancelId = useId();
let trigger: HTMLElement | null = null;
/** @returns The safe initial action in a destructive confirmation. */
function initialFocus(): HTMLElement | null { return document.getElementById(cancelId); }
/** @returns The triggering control, or the list heading after its row has been removed. */
function returnFocus(): HTMLElement | null { return trigger?.isConnected ? trigger : document.getElementById('manage-content-heading'); }
/** @param post - Snapshot that will be reviewed. @param action - Requested content operation. @param event - Opening pointer or keyboard action. */
function confirmAction(post: ManagedPost, action: 'delete' | 'unpublish', event: Event): void {
  trigger = event.currentTarget as HTMLElement;
  error.value = ''; notice.value = ''; actionBlocked.value = false;
  confirmation.value = { post: { ...post }, action };
}
/** Refreshes both lists and moves back a page when deletion empties the last page. */
async function refreshManagement(): Promise<void> {
  await Promise.all([refreshPosts(), refreshComments()]);
  if (posts.value && postPage.value > posts.value.pages) postPage.value = posts.value.pages;
  if (comments.value && commentPage.value > comments.value.pages) commentPage.value = comments.value.pages;
}
/** @param kind - Initial content type. */
async function create(kind: 'article' | 'note'): Promise<void> {
  if (busy.value) return; busy.value = true; error.value = '';
  try { const draft = await mutate<DraftPost>('/api/owner/posts', 'POST', { content: { kind, language: locale.value, category: kind === 'note' ? '日常' : '随笔' } }); await navigateTo(localePath(`/write/${draft.id}`)); }
  catch (e: any) { error.value = e.data?.message || t('创建草稿失败，请重试。'); }
  finally { busy.value = false; }
}
/** Applies only the action and revision explicitly reviewed in the dialog. */
async function confirmTransition(): Promise<void> {
  if (!confirmation.value || busy.value || actionBlocked.value) return;
  const { post, action } = confirmation.value;
  busy.value = true; error.value = ''; notice.value = '';
  try {
    if (action === 'delete') {
      await mutate(`/api/owner/posts/${post.id}`, 'DELETE', { version: post.version });
      try { localStorage.removeItem(`blog-draft:${post.id}`); } catch { /* Storage restrictions must not turn a completed deletion into an error. */ }
    } else await mutate(`/api/owner/posts/${post.id}/action`, 'POST', { version: post.version, action });
    await refreshManagement();
    confirmation.value = null;
    notice.value = action === 'delete' ? t('内容已永久删除。', 'Content permanently deleted.') : t('已撤回，内容保留为草稿。', 'Unpublished. The draft is still available.');
  } catch (cause: any) {
    const status = cause.statusCode ?? cause.response?.status;
    actionBlocked.value = status === 409 || status === 404;
    error.value = locale.value === 'zh' ? cause.data?.message || '操作失败，请重试。' : status === 409 ? 'This content changed. Close the dialog and review it again.' : status === 404 ? 'This content no longer exists. Close the dialog to update the list.' : 'Could not complete the action. Please retry.';
    if (actionBlocked.value) await refreshManagement();
  }
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
  <div class="manage-actions"><QuireButton variant="solid" size="md" :disabled="busy" @click="create('article')"><template #leading><QuireIcon name="plus" /></template>{{ t('写文章') }}</QuireButton><QuireButton variant="outline" size="md" :disabled="busy" @click="create('note')">{{ t('记日常') }}</QuireButton><div class="manage-settings"><NuxtLink :to="localePath('/manage/friends')" class="text-link manage-stats-link"><QuireIcon name="link" :size="16" />{{ t('友链管理', 'Friend links') }}</NuxtLink><NuxtLink :to="localePath('/analytics')" class="text-link manage-stats-link"><QuireIcon name="chartColumn" :size="16" />{{ t('访问统计', 'Traffic') }}</NuxtLink><AiSettings /></div></div>
  <p v-if="notice" class="manage-notice" role="status">{{ notice }}</p>
  <p v-if="error && !confirmation" class="comment-error" role="alert">{{ error }}</p>
  <section class="manage-section"><h2 id="manage-content-heading" tabindex="-1" class="qk-type-section-title">{{ t('我的内容') }}</h2><p v-if="postsError" class="comment-error" role="alert">{{ t('内容暂时无法载入，请刷新后重试。') }}</p><p v-else-if="posts && !posts.items.length" class="empty-state">{{ t('从第一篇开始。') }}</p><ManagedPostRow v-for="post in posts?.items" :key="post.id" :post="post" :busy="busy" @action="(action, event) => confirmAction(post, action, event)" /><ManagePagination v-if="posts" v-model:page="postPage" :pages="posts.pages" :label="t('内容分页')" /></section>
  <section class="manage-section"><h2 class="qk-type-section-title">{{ t('评论审核') }}</h2><p v-if="commentsError" class="comment-error" role="alert">{{ t('评论暂时无法载入，请刷新后重试。') }}</p><p v-else-if="comments && !comments.items.length" class="empty-state">{{ t('目前没有需要处理的评论。') }}</p><article v-for="comment in comments?.items" :key="String(comment.id)" class="manage-comment"><div class="comment-byline"><strong>{{ comment.author }}</strong><span>{{ comment.status === 'pending' ? t('待审核') : comment.status === 'approved' ? t('已公开') : t('已隐藏') }}</span></div><p class="eyebrow">{{ comment.postTitle || t('生活碎片') }}</p><div class="moderated-content" v-html="String(comment.html)" /><div class="manage-row-actions"><QuireButton v-if="comment.status !== 'approved'" variant="outline" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'approved')">{{ t('通过审核') }}</QuireButton><QuireButton v-if="comment.status !== 'hidden'" variant="text" size="sm" :disabled="busy" @click="moderate(String(comment.id), 'hidden')">{{ t('隐藏') }}</QuireButton></div></article><ManagePagination v-if="comments" v-model:page="commentPage" :pages="comments.pages" :label="t('评论分页')" /></section>
  <QuireDialogRoot v-model:open="confirming" role="alertdialog" :initial-focus-el="initialFocus" :final-focus-el="returnFocus" :close-on-escape="!busy" :close-on-interact-outside="false">
    <QuireDialogContent :title="confirmation?.action === 'delete' ? t('永久删除这篇内容？', 'Permanently delete this content?') : t('撤回这篇内容？')" :description="confirmation?.action === 'delete' ? t('删除后无法恢复，请确认要删除的内容。', 'This cannot be undone. Check the content before deleting.') : t('公开页面、订阅源和 Markdown 将同步撤下。内容仍会保留在创作管理中。')" size="small" :busy="busy" :show-close="!busy" :error-text="error">
      <div class="post-action-summary">
        <strong>{{ confirmation?.post.title || confirmation?.post.summary || t('未命名草稿') }}</strong>
        <p v-if="confirmation?.action === 'delete'">{{ t('正文、草稿、评论和智能总结会一并删除。其他语言版本保留。', 'The content, draft, comments and AI summary will be deleted. Other language versions will remain.') }}</p>
        <p v-if="confirmation?.action === 'delete'" class="post-action-hint">{{ t('上传图片保留，避免影响其他内容。', 'Uploaded images are kept so other content is not affected.') }}</p>
      </div>
      <template #footer>
        <QuireButton :id="cancelId" variant="text" size="md" :disabled="busy" @click="confirming = false">{{ t('取消') }}</QuireButton>
        <QuireButton :color="confirmation?.action === 'delete' ? 'danger' : 'neutral'" variant="solid" size="md" :busy="busy" :disabled="actionBlocked" @click="confirmTransition">{{ confirmation?.action === 'delete' ? t('永久删除', 'Delete permanently') : t('确认撤回', 'Unpublish') }}</QuireButton>
      </template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
