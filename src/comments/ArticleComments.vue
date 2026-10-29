<script setup lang="ts">
import { defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { QuireButton, QuireField, QuireInput, QuireIcon } from '@quirekit/ui/vue';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import { previewName, previewRole, openLogin, resumeComment } from '../account/session';
import { readCommentDraft, readPendingComments, saveCommentState } from './storage';
import ReadingCode from '../components/ReadingCode.vue';
import type ComposerInstance from './MsfeComposer.vue';
/** Loads the comment editor only after the reader asks to write. @returns MSFE composer module. */
async function loadComposer() { return import('./MsfeComposer.vue'); }
const MsfeComposer = defineAsyncComponent(loadComposer);
const props = defineProps<{ slug: string }>();
const draft = reactive(readCommentDraft(props.slug));
const expanded = ref(!!draft.markdown), email = ref(''), error = ref(''), status = ref('');
const pending = ref(readPendingComments(props.slug));
const composer = ref<InstanceType<typeof ComposerInstance>>();
const section = shallowRef<HTMLElement | null>(null);
let visibility: IntersectionObserver | undefined;
const readingComponents = { pre: ReadingCode };

/** Retains the draft before navigation; an email address is never persisted in this preview. */
function preserve(): void {
  if (composer.value) draft.markdown = composer.value.getMarkdown();
  if (!saveCommentState(`comment-draft:${props.slug}`, { ...draft })) status.value = '无法保存到本机，请先保留你的文字。';
}
/** Accepts a source snapshot from the editor. @param markdown - Canonical MSFE source. */
function updateDraft(markdown: string): void { draft.markdown = markdown; saveCommentState(`comment-draft:${props.slug}`, { ...draft }); }
/** Opens or focuses the same composer, retaining any unfinished text.
 * @param author - Optional reply recipient from the visible discussion.
 */
async function begin(author = ''): Promise<void> { draft.replyTo = author; expanded.value = true; await nextTick(); composer.value?.focus(); }
/** Saves the draft before opening identity selection. */
function login(): void { preserve(); resumeComment.value = props.slug; openLogin(`/articles/${props.slug}`); }
/** Removes only a local unpublished preview. @param id - Preview identity. */
function removePending(id: string): void {
  const next = pending.value.filter(item => item.id !== id);
  if (saveCommentState(`comment-pending:${props.slug}`, next)) { pending.value = next; status.value = ''; }
  else status.value = '无法更新本机预览，请稍后重试。';
}
/** Validates and retains a local pending comment without making a network request.
 * @param markdown - Source snapshot from MSFE.
 */
function submit(markdown: string): void {
  error.value = '';
  const author = previewRole.value === 'guest' ? draft.nickname.trim() : previewName.value;
  if (!author) { error.value = '先留一个昵称，让大家知道怎么称呼你。'; return; }
  if (!markdown.trim()) { error.value = '先写一点内容再提交。'; return; }
  if (markdown.length > 10000) { error.value = '评论最多 10000 个字符，请精简后再提交。'; return; }
  if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { error.value = '请填写有效邮箱，或留空。'; return; }
  const item = { id: uuidv4(), author, markdown, replyTo: draft.replyTo, createdAt: new Date().toISOString() };
  const next = [...pending.value, item].slice(-30);
  if (!saveCommentState(`comment-pending:${props.slug}`, next)) { error.value = '本机保存失败，正文已保留，请稍后再试。'; return; }
  pending.value = next;
  draft.markdown = ''; draft.replyTo = ''; email.value = '';
  composer.value?.reset();
  preserve();
  status.value = '已保存本机预览，未提交到服务器。正式站的评论审核通过后才会公开。';
}
onBeforeUnmount(() => { preserve(); visibility?.disconnect(); });
onMounted(async () => {
  if (!expanded.value && section.value) {
    visibility = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      expanded.value = true;
      visibility?.disconnect();
    }, { rootMargin: '160px' });
    visibility.observe(section.value);
  }
  if (resumeComment.value !== props.slug) return;
  resumeComment.value = '';
  expanded.value = true;
  await nextTick();
  document.getElementById('comments-title')?.scrollIntoView({ block: 'start' });
});
</script>

<template>
  <section ref="section" class="article-comments" aria-labelledby="comments-title">
    <div class="comments-heading"><div><span class="eyebrow">文字之外，再聊两句</span><h2 id="comments-title">讨论</h2></div><span>示例讨论</span></div>
    <article class="comment-message"><div class="comment-avatar">读</div><div class="comment-message-body"><div class="comment-byline"><strong>一位读者</strong><span>示例</span></div><p>很喜欢这里留给文字的空间。读完以后，也想把自己的想法慢慢记下来。</p><button type="button" class="comment-reply" @click="begin('一位读者')">回复 <QuireIcon name="arrowUpRight" :size="12" /></button></div></article>
    <article class="comment-message comment-message--reply"><div class="comment-avatar">Y</div><div class="comment-message-body"><div class="comment-byline"><strong>Yishuai</strong><span class="comment-owner">作者 · 示例</span></div><p>谢谢，就从一段文字开始吧。</p><button type="button" class="comment-reply" @click="begin('Yishuai')">回复 <QuireIcon name="arrowUpRight" :size="12" /></button></div></article>
    <div v-if="pending.length" class="comment-pending"><span class="eyebrow">你的本机预览 · 仅当前标签页可见</span><article v-for="item in pending" :key="item.id" class="pending-item"><div class="comment-byline"><strong>{{ item.author }}</strong><span>待审核 · 演示</span><QuireButton variant="text" size="sm" @click="removePending(item.id)">移除预览</QuireButton></div><p v-if="item.replyTo" class="comment-reply-label">回复 {{ item.replyTo }}</p><QuireMarkdown :content="item.markdown" :components="readingComponents" /></article></div>
    <div class="comment-write-heading"><h3>留下你的想法</h3><a v-if="previewRole === 'guest'" href="#/login" @click.prevent="login">登录评论 <QuireIcon name="arrowUpRight" :size="12" /></a><a v-else href="#/login" @click.prevent="login">{{ previewName }} · 身份预览</a></div>
    <button v-if="!expanded" type="button" class="comment-start" @click="begin()"><span>说点什么？一个想法，或一个问题。</span><QuireIcon name="edit" :size="16" /></button>
    <div v-else class="comment-form">
      <div v-if="draft.replyTo" class="comment-reply-context"><span>回复 {{ draft.replyTo }}</span><QuireButton variant="text" size="sm" @click="draft.replyTo = ''">取消回复</QuireButton></div>
      <div v-if="previewRole === 'guest'" class="comment-fields"><QuireField label="昵称" required><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="draft.nickname" placeholder="怎么称呼你" width="100%" :maxlength="40" autocomplete="nickname" @blur="preserve" /></template></QuireField><QuireField label="邮箱（选填，不公开）"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="email" type="email" placeholder="用于接收回复" width="100%" autocomplete="email" /></template></QuireField></div>
      <MsfeComposer ref="composer" :initial="draft.markdown" :submit-label="draft.replyTo ? '提交回复' : '提交评论'" @draft="updateDraft" @submit="submit" />
      <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
    </div>
    <p class="comment-policy">{{ previewRole === 'guest' ? '无需登录也可以评论。' : '' }}友善交流，审核后公开。<span>当前为本机交互预览。</span></p>
    <p v-if="status" class="comment-status" role="status">{{ status }}</p>
  </section>
</template>
