<script setup lang="ts">
import { v4 as uuid } from 'uuid';
import { QuireButton, QuireField, QuireInput, QuireIcon } from '@quirekit/ui/vue';
import type { PublicPost, PublicComment } from '~~/shared/types';
import type Composer from './MsfeComposer.client.vue';
const props = defineProps<{ post: PublicPost }>();
const { identity, mutate } = useBlogSession();
const { data: comments, error: loadError } = await useFetch<PublicComment[]>(`/api/posts/${props.post.id}/comments`);
const expanded = ref(false), nickname = ref(''), email = ref(''), markdown = ref(''), website = ref('');
const reply = ref<PublicComment | null>(null), error = ref(''), status = ref(''), busy = ref(false);
const requestKey = ref('');
const composer = ref<InstanceType<typeof Composer>>();
const ordered = computed(() => (comments.value || []).filter(c => !c.parentId).flatMap(c => [c, ...(comments.value || []).filter(r => r.parentId === c.id)]));
const storageKey = `blog-comment:${props.post.id}`;
/** Preserves only comment text and nickname; private email is never saved in browser storage. */
function preserve(): void {
  if (import.meta.server) return;
  markdown.value = composer.value?.getMarkdown() ?? markdown.value;
  try { sessionStorage.setItem(storageKey, JSON.stringify({ markdown: markdown.value, nickname: nickname.value, requestKey: requestKey.value })); } catch { status.value = '本机备份失败，请先保留你的文字。'; }
}
/** @param source - Current canonical MSFE source. */
function updateDraft(source: string): void { markdown.value = source; preserve(); }
/** @param comment - Optional reply recipient. */
async function begin(comment?: PublicComment): Promise<void> { reply.value = comment || null; expanded.value = true; await nextTick(); composer.value?.focus(); }
/** Submits a real comment; only an accepted receipt clears the draft. @param source - Markdown source from MSFE. */
async function submit(source: string): Promise<void> {
  if (busy.value) return;
  error.value = ''; markdown.value = source; preserve();
  if (!source.trim() || (!identity.value && !nickname.value.trim())) { error.value = '请填写昵称和评论内容。'; return; }
  busy.value = true;
  try {
    await mutate(`/api/posts/${props.post.id}/comments`, 'POST', { parentId: reply.value?.id, author: nickname.value, email: email.value, markdown: source, requestKey: requestKey.value, website: website.value });
    requestKey.value = uuid(); composer.value?.reset(); markdown.value = ''; email.value = ''; reply.value = null; preserve(); status.value = '评论已提交，审核后会公开。谢谢你留下想法。';
  } catch (e: any) { error.value = e.data?.message || '提交失败，文字已保留，请稍后重试。'; }
  finally { busy.value = false; }
}
onMounted(() => {
  requestKey.value = uuid();
  try { const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null'); if (saved) { markdown.value = String(saved.markdown || ''); nickname.value = String(saved.nickname || ''); requestKey.value = saved.requestKey || requestKey.value; expanded.value = !!markdown.value; } } catch { /* A malformed local backup never replaces server content. */ }
});
onBeforeUnmount(preserve);
</script>
<template>
  <section class="article-comments" aria-labelledby="comments-title"><div class="comments-heading"><div><span class="eyebrow">文字之外，再聊两句</span><h2 id="comments-title">讨论</h2></div><span>{{ comments?.length || 0 }} 条评论</span></div>
    <p v-if="loadError" role="status">评论暂时未能载入。</p>
    <article v-for="comment in ordered" :key="comment.id" class="comment-message" :class="{ 'comment-message--reply': comment.parentId }"><div class="comment-avatar">{{ comment.author.slice(0, 1) }}</div><div class="comment-message-body"><div class="comment-byline"><strong>{{ comment.author }}</strong><span v-if="comment.owner" class="comment-owner">作者</span><time :datetime="comment.createdAt">{{ comment.createdAt.slice(0, 10) }}</time></div><div v-html="comment.html" /><button type="button" class="comment-reply" @click="begin(comment)">回复 <QuireIcon name="arrowUpRight" :size="12" /></button></div></article>
    <div class="comment-write-heading"><h3>留下你的想法</h3><NuxtLink v-if="!identity" :to="{ path: '/login', query: { returnTo: post.url + '#comments-title' } }" @click="preserve">登录评论 ↗</NuxtLink><span v-else>{{ identity.user.name }}</span></div>
    <button v-if="!expanded" type="button" class="comment-start" @click="begin()"><span>说点什么？一个想法，或一个问题。</span><QuireIcon name="edit" :size="16" /></button>
    <div v-else class="comment-form"><div v-if="reply" class="comment-reply-context"><span>回复 {{ reply.author }}</span><QuireButton variant="text" size="sm" @click="reply = null">取消回复</QuireButton></div><div v-if="!identity" class="comment-fields"><QuireField label="昵称" required><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="nickname" width="100%" :maxlength="60" autocomplete="nickname" /></template></QuireField><QuireField label="邮箱（选填，不公开）"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="email" type="email" width="100%" autocomplete="email" /></template></QuireField></div><input v-model="website" class="honeypot" tabindex="-1" aria-hidden="true" autocomplete="off" name="website" /><ClientOnly><LazyMsfeComposer ref="composer" :initial="markdown" :submit-label="busy ? '提交中…' : reply ? '提交回复' : '提交评论'" :busy="busy" @draft="updateDraft" @submit="submit" /></ClientOnly><p v-if="error" class="comment-error" role="alert">{{ error }}</p></div>
    <p class="comment-policy">无需登录也可以评论。友善交流，审核后公开。</p><p v-if="status" class="comment-status" role="status">{{ status }}</p>
  </section>
</template>
