<script setup lang="ts">
import { MdEditor, type MdEditorInstance } from '@quirekit/md-editor/vue';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import { QuireButton, QuireIcon, QuireInput, QuireField, QuireSegmented, QuireDialogRoot, QuireDialogContent, QuireDialogCloseTrigger, QuireDialogTrigger } from '@quirekit/ui/vue';
import type { DraftPost, Content } from '~~/shared/types';
import '@quirekit/md-editor/styles.css';
import '~/assets/writing.css';
import ReadingCode from './ReadingCode.vue';
const props = defineProps<{ initial: DraftPost }>();
const emit = defineEmits<{ saved: [post: DraftPost] }>();
const draft = reactive<DraftPost>(structuredClone(toRaw(props.initial)));
const { identity, mutate } = useBlogSession();
const editor = ref<MdEditorInstance>();
const preview = ref(false), publishOpen = ref(false), busy = ref(false), notice = ref('已打开草稿'), error = ref('');
const localBackup = ref<Content | null>(null), revision = ref(0), savedRevision = ref(0);
const tagText = ref(draft.tags.join(', '));
const readingComponents = { pre: ReadingCode };
const kinds = [{ value: 'article', label: '文章' }, { value: 'note', label: '短记' }];
const backupKey = `blog-draft:${draft.id}`;
let timer: ReturnType<typeof setTimeout> | undefined;
const dirty = computed(() => revision.value !== savedRevision.value);
/** Takes one canonical snapshot at persistence/preview boundaries. @returns Editable content without session or publication metadata. */
function snapshot(): Content {
  draft.markdown = editor.value?.editor?.getMarkdown() ?? draft.markdown;
  return { kind: draft.kind, title: draft.title, summary: draft.summary, category: draft.category,
    tags: tagText.value.split(/[,，]/).map(t => t.trim()).filter(Boolean), markdown: draft.markdown,
    sourceFormat: draft.sourceFormat, source: draft.sourceFormat === 'markdown' ? draft.markdown : draft.source, properties: draft.sourceFormat === 'markdown' ? Object.fromEntries(Object.entries(draft.properties).filter(([key]) => !['photo', 'content', 'mp-markdown'].includes(key))) : draft.properties };
}
/** Keeps a recovery copy without overwriting newer server content automatically. */
function backup(): void {
  if (!dirty.value) return;
  try { localStorage.setItem(backupKey, JSON.stringify({ version: draft.version, content: snapshot() })); }
  catch { error.value = '本机备份失败，请先保存或复制你的文字。'; }
}
/** Marks source changes and bounds draft capture to pauses in typing. */
function changed(): void {
  revision.value++; notice.value = '有未保存的修改';
  clearTimeout(timer); timer = setTimeout(backup, 500);
}
/** Source edits in the web editor become Markdown; imported HTML requires explicit conversion first. */
function sourceChanged(): void { if (draft.sourceFormat !== 'html') draft.sourceFormat = 'markdown'; changed(); }
/** @returns Whether the exact captured content was saved successfully. */
async function save(): Promise<boolean> {
  if (busy.value) return false;
  busy.value = true; error.value = '';
  const captured = revision.value, content = snapshot(); backup();
  try {
    const result = await mutate<DraftPost>(`/api/owner/posts/${draft.id}`, 'PUT', { version: draft.version, content });
    emit('saved', result);
    draft.version = result.version; draft.updatedAt = result.updatedAt; savedRevision.value = captured;
    if (!dirty.value) localStorage.removeItem(backupKey);
    notice.value = dirty.value ? '已保存，仍有新的修改' : '已保存草稿'; return !dirty.value;
  } catch (e: any) { error.value = e.data?.message || '保存失败，内容已在本机保留。请重试。'; return false; }
  finally { busy.value = false; }
}
/** Updates the public snapshot only after the current editor snapshot has persisted. */
async function publish(): Promise<void> {
  if (!await save()) return;
  busy.value = true; error.value = '';
  try {
    const result = await mutate<DraftPost>(`/api/owner/posts/${draft.id}/action`, 'POST', { version: draft.version, action: 'publish' });
    emit('saved', result);
    draft.version = result.version; draft.status = result.status; draft.publishedAt = result.publishedAt;
    publishOpen.value = false; notice.value = '已发布，文章页和订阅源已更新。';
  } catch (e: any) { error.value = e.data?.message || '发布未完成，草稿已保存。'; }
  finally { busy.value = false; }
}
/** Previews the current source with the public reading component. */
function togglePreview(): void { snapshot(); preview.value = !preview.value; }
/** Explicitly restores a recovered copy into the editor, retaining server version checks. */
function restoreBackup(): void {
  if (!localBackup.value) return;
  Object.assign(draft, localBackup.value); tagText.value = draft.tags.join(', ');
  editor.value?.editor?.replaceDocument(draft.markdown, draft.id); localBackup.value = null; changed();
}
/** Converts a third-party HTML article to the displayed Markdown derivative only on author request. */
function convert(): void { draft.sourceFormat = 'markdown'; changed(); }
/** Warns only when the current text has not reached the server. @param event - Browser navigation request. */
function beforeUnload(event: BeforeUnloadEvent): void { backup(); if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
const images = {
  /** @param file - Image bytes. @param context - Upload lifetime and original name. @returns Persistent site-relative image URL. */
  async upload(file: Blob, context: { signal: AbortSignal; name?: string }): Promise<string> {
    const form = new FormData(); form.set('file', file, context.name || 'image'); form.set('postId', draft.id);
    const result = await $fetch<{ url: string }>('/api/owner/media', { method: 'POST', body: form, signal: context.signal, headers: { 'x-csrf-token': identity.value?.csrf || '' } });
    return result.url;
  },
};
watch([() => draft.title, () => draft.summary, () => draft.category, () => draft.kind, tagText], changed);
onMounted(() => {
  try { const saved = JSON.parse(localStorage.getItem(backupKey) || 'null'); if (saved?.content) localBackup.value = saved.content; } catch { /* Keep the server draft when the recovery copy is malformed. */ }
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => { clearTimeout(timer); backup(); window.removeEventListener('beforeunload', beforeUnload); });
</script>
<template>
  <div class="writer-actions"><QuireSegmented v-model="draft.kind" :items="kinds" label="内容类型" :disabled="!!draft.publishedAt || busy" /><div class="writer-action-buttons"><QuireButton variant="ghost" size="md" :disabled="busy" @click="save">保存</QuireButton><QuireButton variant="outline" size="md" @click="togglePreview">{{ preview ? '编辑' : '预览' }}</QuireButton><QuireDialogRoot v-model:open="publishOpen"><QuireDialogTrigger class="qk-button qk-button--neutral-solid qk-button--md" :disabled="busy" @click="snapshot">{{ draft.status === 'published' ? '更新' : '发布' }} <span class="publish-arrow"><QuireIcon name="arrowUpRight" :size="16" /></span></QuireDialogTrigger><QuireDialogContent title="准备发布" description="发布后，读者可以在文章页、订阅源和 Markdown 中看到这份内容。"><div class="publish-summary"><span class="eyebrow">{{ draft.kind === 'article' ? '文章' : '生活短记' }}</span><h2 class="qk-type-section-title">{{ draft.title || '一则新的生活记录' }}</h2><p>{{ draft.markdown.slice(0, 120) }}</p><p v-if="error" class="comment-error" role="alert">{{ error }}</p></div><template #footer><QuireDialogCloseTrigger class="qk-button qk-button--neutral-text qk-button--md">继续修改</QuireDialogCloseTrigger><QuireButton variant="solid" size="md" :disabled="busy" @click="publish">{{ busy ? '正在保存…' : '确认发布' }}</QuireButton></template></QuireDialogContent></QuireDialogRoot></div></div>
  <div v-if="localBackup" class="recovery-banner"><p>发现一份尚未确认保存的本机备份。</p><QuireButton variant="outline" size="sm" @click="restoreBackup">恢复到编辑器</QuireButton></div>
  <div v-if="draft.sourceFormat === 'html'" class="recovery-banner"><p>这篇内容由 HTML 客户端发布。网页编辑前需要转为 Markdown，部分样式可能变化。</p><QuireButton variant="outline" size="sm" @click="convert">转为 Markdown 编辑</QuireButton></div>
  <p v-if="error" class="comment-error writer-error" role="alert">{{ error }}</p>
  <div class="writer-layout"><section class="writer-paper" aria-label="写作正文"><div v-if="!preview" class="writer-title"><label v-if="draft.kind === 'article'" for="draft-title" class="sr-only">文章标题</label><input v-if="draft.kind === 'article'" id="draft-title" v-model="draft.title" :disabled="busy" placeholder="起一个标题…" /><span v-else class="note-writing-title qk-type-page-title">此刻，想记下什么？</span></div><div v-show="!preview" class="editor-mount"><MdEditor ref="editor" :markdown="draft.markdown" label="文章正文" :read-only="busy || draft.sourceFormat === 'html'" :images="images" toolbar="floating" :block-controls="false" layout="document" placeholder="从这里开始。输入 / 插入内容…" @change="sourceChanged" @error="error = '编辑器遇到问题，请先保留你的文字。'" /></div><div v-if="preview" class="writing-preview reading-body"><span class="eyebrow">阅读预览</span><h1 v-if="draft.kind === 'article'" class="qk-type-page-title">{{ draft.title || '未命名文章' }}</h1><QuireMarkdown :content="draft.markdown" :components="readingComponents" :html="false" /></div></section><aside class="writer-settings"><span class="eyebrow">这篇内容</span><QuireField label="摘要"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="draft.summary" placeholder="留空时从正文提取" width="100%" :maxlength="500" /></template></QuireField><QuireField label="分类"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="draft.category" width="100%" :maxlength="40" /></template></QuireField><QuireField label="标签"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="tagText" placeholder="用逗号分隔" width="100%" /></template></QuireField><div class="writer-setting"><span>可见范围</span><strong>{{ draft.status === 'published' ? '已发布，修改须再次发布' : '草稿，仅自己可见' }}</strong></div><NuxtLink v-if="draft.status === 'published'" :to="draft.kind === 'article' ? `/articles/${draft.slug}` : `/life/${draft.id}`" class="text-link">查看公开页面 ↗</NuxtLink></aside></div>
  <div class="writer-status"><span role="status">{{ notice }}</span><span>保存草稿后，再发布给读者。</span></div>
</template>
