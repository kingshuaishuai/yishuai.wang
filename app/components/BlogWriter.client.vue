<script setup lang="ts">
import { MdEditor, MdProse, type MdEditorInstance, type MdEditorView } from '@quirekit/md-editor/vue';
import type { EditorState } from '@quirekit/cm-state';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import { QuireButton, QuireIcon, QuireTextarea, QuireSelect, QuireField, QuireSegmented, QuireDialogRoot, QuireDialogContent, QuireDialogCloseTrigger, QuireDialogTrigger } from '@quirekit/ui/vue';
import { postPath } from '~~/shared/language';
import type { DraftPost, Content } from '~~/shared/types';
import '@quirekit/md-editor/styles.css';
import '~/assets/writing.css';
import ReadingCode from './ReadingCode.vue';
import { codeAppearance } from '~/lib/code-appearance';
import { onBeforeRouteLeave } from 'vue-router';
const { t, locale, localePath } = useBlogLocale();
const props = defineProps<{ initial: DraftPost }>();
const emit = defineEmits<{ saved: [post: DraftPost] }>();
const draft = reactive<DraftPost>(structuredClone(toRaw(props.initial)));
const { identity, mutate } = useBlogSession();
const editor = ref<MdEditorInstance>();
const coverBusy = ref(false);
const editorView = ref<MdEditorView>('document');
const editableView = ref<MdEditorView>('document');
const readingState = shallowRef<EditorState>();
watch(editorView, view => {
  if (view === 'reading') readingState.value = editor.value?.editor?.state;
  else editableView.value = view;
});
const views = [{ value: 'document', label: t('文档') }, { value: 'preview', label: t('实时预览') }, { value: 'source', label: t('源码') }, { value: 'reading', label: t('阅读') }];
const preview = ref(false), publishOpen = ref(false), busy = ref(false), notice = ref(t('已打开草稿')), error = ref('');
const localBackup = ref<Content | null>(null), revision = ref(0), savedRevision = ref(0);
const readingComponents = { pre: ReadingCode };
const kinds = [{ value: 'article', label: t('文章') }, { value: 'note', label: t('短记') }];
const { data: translations } = useFetch<Pick<DraftPost, 'id' | 'language' | 'status'>[]>(`/api/owner/posts/${draft.id}/translations`);
const otherLanguage = computed(() => draft.language === 'zh' ? 'en' : 'zh');
const otherVersion = computed(() => translations.value?.find(item => item.language === otherLanguage.value));
const languages = [{ value: 'zh', label: '中文' }, { value: 'en', label: 'English' }];
const backupKey = `blog-draft:${draft.id}`;
let timer: ReturnType<typeof setTimeout> | undefined;
const dirty = computed(() => revision.value !== savedRevision.value);
const leaveOpen = ref(false);
let resolveLeave: ((leave: boolean) => void) | undefined;
/** Keeps in-app navigation from silently abandoning unsaved source or image uploads. */
onBeforeRouteLeave(() => {
  if (!dirty.value && !coverBusy.value) return true;
  backup();
  leaveOpen.value = true;
  return new Promise<boolean>(resolve => { resolveLeave = resolve; });
});
/** @param leave - Whether the captured destination can now be entered. */
function finishLeave(leave: boolean): void {
  const resolve = resolveLeave;
  resolveLeave = undefined;
  leaveOpen.value = false;
  resolve?.(leave);
}
/** Persists the current draft before resuming the interrupted navigation. */
async function saveAndLeave(): Promise<void> { if (await save()) finishLeave(true); }
watch(leaveOpen, open => { if (!open && resolveLeave) finishLeave(false); });
/** Takes one canonical snapshot at persistence/preview boundaries. @returns Editable content without session or publication metadata. */
function snapshot(): Content {
  draft.markdown = editor.value?.editor?.getMarkdown() ?? draft.markdown;
  return { kind: draft.kind, language: draft.language, title: draft.title, summary: draft.summary, coverUrl: draft.coverUrl, category: draft.category,
    tags: [...draft.tags], markdown: draft.markdown,
    sourceFormat: draft.sourceFormat, source: draft.sourceFormat === 'markdown' ? draft.markdown : draft.source, properties: draft.sourceFormat === 'markdown' ? Object.fromEntries(Object.entries(draft.properties).filter(([key]) => !['photo', 'content', 'mp-markdown'].includes(key))) : draft.properties };
}
/** Keeps a recovery copy without overwriting newer server content automatically. */
function backup(): void {
  if (!dirty.value) return;
  try { localStorage.setItem(backupKey, JSON.stringify({ version: draft.version, content: snapshot() })); }
  catch { error.value = t('本机备份失败，请先保存或复制你的文字。'); }
}
/** Marks source changes and bounds draft capture to pauses in typing. */
function changed(): void {
  revision.value++; notice.value = t('有未保存的修改');
  clearTimeout(timer); timer = setTimeout(backup, 500);
}
/** Source edits in the web editor become Markdown; imported HTML requires explicit conversion first. */
function sourceChanged(): void { if (draft.sourceFormat !== 'html') draft.sourceFormat = 'markdown'; changed(); }
/** @returns Whether the exact captured content was saved successfully. */
async function save(): Promise<boolean> {
  if (busy.value || coverBusy.value) return false;
  busy.value = true; error.value = '';
  const captured = revision.value, content = snapshot(); backup();
  try {
    const result = await mutate<DraftPost>(`/api/owner/posts/${draft.id}`, 'PUT', { version: draft.version, content });
    emit('saved', result);
    draft.version = result.version; draft.updatedAt = result.updatedAt; savedRevision.value = captured;
    if (!dirty.value) { localStorage.removeItem(backupKey); localBackup.value = null; }
    notice.value = dirty.value ? t('已保存，仍有新的修改') : t('已保存草稿'); return !dirty.value;
  } catch (e: any) { error.value = e.data?.message || t('保存失败，内容已在本机保留。请重试。'); return false; }
  finally { busy.value = false; }
}
/** Saves the source before opening its independently published language version. */
async function openTranslation(): Promise<void> {
  if (!await save()) return;
  busy.value = true; error.value = '';
  try {
    const target = await mutate<DraftPost>(`/api/owner/posts/${draft.id}/translation`, 'POST', { language: otherLanguage.value });
    await navigateTo(localePath(`/write/${target.id}`));
  } catch (cause: any) { error.value = cause.data?.message || t('无法创建语言版本，请重试。', 'Could not create the language version. Please try again.'); }
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
    publishOpen.value = false; notice.value = t('已发布，文章页和订阅源已更新。');
  } catch (e: any) { error.value = e.data?.message || t('发布未完成，草稿已保存。'); }
  finally { busy.value = false; }
}
/** Previews the current source with the public reading component. */
function togglePreview(): void { snapshot(); preview.value = !preview.value; }
/** Explicitly restores a recovered copy into the editor, retaining server version checks. */
function restoreBackup(): void {
  if (!localBackup.value) return;
  Object.assign(draft, localBackup.value);
  editor.value?.editor?.replaceDocument(draft.markdown, draft.id);
  if (editorView.value === 'reading') readingState.value = editor.value?.editor?.state;
  localBackup.value = null; changed();
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
watch([() => draft.title, () => draft.summary, () => draft.coverUrl, () => draft.category, () => draft.kind, () => draft.language, () => draft.tags], changed);
onMounted(() => {
  try { const saved = JSON.parse(localStorage.getItem(backupKey) || 'null'); if (saved?.content) localBackup.value = saved.content; } catch { /* Keep the server draft when the recovery copy is malformed. */ }
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => { clearTimeout(timer); backup(); window.removeEventListener('beforeunload', beforeUnload); });
</script>
<template>
  <div class="writer-workspace">
    <div class="writer-actions">
      <QuireSelect v-model="draft.kind" :items="kinds" :label="t('内容类型')" variant="text" width="88px" size="md" :disabled="!!draft.publishedAt || !!otherVersion || busy" />
      <div v-show="!preview" class="writer-modes"><QuireSegmented v-model="editorView" :items="views" :label="t('编辑视图')" :disabled="busy" /></div>
      <div class="writer-action-buttons">
        <QuireButton variant="ghost" size="md" :disabled="busy || coverBusy" @click="save">{{ t('保存') }}</QuireButton>
        <QuireButton variant="outline" size="md" @click="togglePreview">{{ preview ? t('编辑') : t('预览') }}</QuireButton>
        <QuireDialogRoot v-model:open="publishOpen">
          <QuireDialogTrigger as-child><QuireButton variant="solid" size="md" :disabled="busy || coverBusy" @click="snapshot">{{ draft.status === 'published' ? t('更新') : t('发布') }}<template #trailing><QuireIcon name="arrowUpRight" /></template></QuireButton></QuireDialogTrigger>
          <QuireDialogContent :title="t('准备发布')" :description="t('发布后，读者可以在文章页、订阅源和 Markdown 中看到这份内容。')">
            <div class="publish-summary"><span class="eyebrow">{{ draft.kind === 'article' ? t('文章') : t('生活短记') }}</span><h2 class="qk-type-section-title">{{ draft.title || t('一则新的生活记录') }}</h2><p>{{ draft.markdown.slice(0, 120) }}</p><p v-if="error" class="comment-error" role="alert">{{ error }}</p></div>
            <template #footer><QuireDialogCloseTrigger as-child><QuireButton variant="text" size="md">{{ t('继续修改') }}</QuireButton></QuireDialogCloseTrigger><QuireButton variant="solid" size="md" :disabled="busy || coverBusy" @click="publish">{{ busy ? t('正在保存…') : t('确认发布') }}</QuireButton></template>
          </QuireDialogContent>
        </QuireDialogRoot>
      </div>
    </div>
    <div v-if="localBackup" class="recovery-banner"><p>{{ t('发现一份尚未确认保存的本机备份。') }}</p><QuireButton variant="outline" size="sm" @click="restoreBackup">{{ t('恢复到编辑器') }}</QuireButton></div>
    <div v-if="draft.sourceFormat === 'html'" class="recovery-banner"><p>{{ t('这篇内容由 HTML 客户端发布。网页编辑前需要转为 Markdown，部分样式可能变化。') }}</p><QuireButton variant="outline" size="sm" @click="convert">{{ t('转为 Markdown 编辑') }}</QuireButton></div>
    <p v-if="error" class="comment-error writer-error" role="alert">{{ error }}</p>
    <div class="writer-layout">
      <section class="writer-paper" :aria-label="t('写作正文')">
        <div v-show="!preview && editorView !== 'reading'" class="editor-mount syntax-highlight"><MdEditor ref="editor" :view="editableView" :markdown="draft.markdown" :locale="locale === 'zh' ? 'zh-CN' : 'en'" :label="t('文章正文')" :read-only="busy || draft.sourceFormat === 'html'" :images="images" :extensions="[codeAppearance]" toolbar="fixed" :block-controls="true" layout="document" :placeholder="t('从这里开始。输入 / 插入内容…')" @change="sourceChanged" @error="error = t('编辑器遇到问题，请先保留你的文字。')">
          <template #header><div class="writer-title"><label v-if="draft.kind === 'article'" for="draft-title" class="sr-only">{{ t('文章标题') }}</label><input v-if="draft.kind === 'article'" id="draft-title" v-model="draft.title" :disabled="busy" :placeholder="t('起一个标题…')" /><span v-else class="note-writing-title qk-type-page-title">{{ t('此刻，想记下什么？') }}</span></div></template>
        </MdEditor></div>
        <div v-if="!preview && editorView === 'reading'" class="writer-reading"><h1 v-if="draft.kind === 'article'" class="writer-reading-title">{{ draft.title || t('未命名文章') }}</h1><MdProse v-if="readingState" :state="readingState" :components="readingComponents" :html="false" /></div>
        <div v-if="preview" class="writing-preview reading-body"><span class="eyebrow">{{ t('阅读预览') }}</span><h1 v-if="draft.kind === 'article'" class="qk-type-page-title">{{ draft.title || t('未命名文章') }}</h1><QuireMarkdown :content="draft.markdown" :components="readingComponents" :html="false" /></div>
      </section>
      <aside class="writer-settings" :aria-label="t('内容设置')">
        <section class="writer-language">
          <QuireField :label="t('内容语言', 'Content language')"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="draft.language" :items="languages" :label="t('内容语言', 'Content language')" width="100%" :disabled="!!draft.publishedAt || !!otherVersion || busy" /></template></QuireField>
          <QuireButton variant="text" size="sm" :disabled="busy || coverBusy || otherVersion?.status === 'deleted'" @click="openTranslation">{{ otherVersion ? t(otherLanguage === 'en' ? '编辑英文版' : '编辑中文版', otherLanguage === 'en' ? 'Edit English version' : 'Edit Chinese version') : t(otherLanguage === 'en' ? '创建英文版' : '创建中文版', otherLanguage === 'en' ? 'Create English version' : 'Create Chinese version') }}<template #trailing><QuireIcon name="arrowUpRight" /></template></QuireButton>
          <p class="profile-hint">{{ otherVersion?.status === 'deleted' ? t('请先在创作管理中永久删除旧的语言版本，再重新创建。', 'Permanently delete the old language version in Manage before creating a new one.') : t('两个版本独立编辑、发布。', 'Versions are edited and published separately.') }}</p>
        </section>
        <PostCoverUpload v-model="draft.coverUrl" :post-id="draft.id" :disabled="busy" @busy="coverBusy = $event" />
        <QuireField :label="t('描述（选填）')"><template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="draft.summary" :placeholder="t('留空时从正文提取')" :rows="3" :max-rows="8" auto-resize :maxlength="500" :disabled="busy" /></template></QuireField>
        <PostTaxonomy v-model:category="draft.category" v-model:tags="draft.tags" :disabled="busy" />
        <div class="writer-setting"><span>{{ t('可见范围') }}</span><strong>{{ draft.status === 'published' ? t('已发布，修改须再次发布') : t('草稿，仅自己可见') }}</strong></div>
        <PostAiSummary v-if="draft.kind === 'article'" :post-id="draft.id" :version="draft.version" :published="draft.status === 'published'" />
        <NuxtLink v-if="draft.status === 'published'" :to="postPath(draft)" class="text-link">{{ t('查看公开页面') }} <QuireIcon name="arrowUpRight" :size="16" /></NuxtLink>
      </aside>
    </div>
    <div class="writer-status"><span role="status">{{ notice }}</span><span>{{ t('保存草稿后，再发布给读者。') }}</span></div>
    <QuireDialogRoot v-model:open="leaveOpen"><QuireDialogContent :title="t('还有修改未保存')" :description="t('保存到草稿后再离开，返回时就能继续编辑。')" size="small">
      <p v-if="coverBusy" class="comment-status">{{ t('封面正在上传，请稍候。') }}</p><p v-if="error" class="comment-error" role="alert">{{ error }}</p>
      <template #footer><QuireButton variant="text" size="md" @click="finishLeave(false)">{{ t('继续编辑') }}</QuireButton><QuireButton variant="solid" size="md" :disabled="busy || coverBusy" @click="saveAndLeave">{{ busy ? t('正在保存…') : t('保存并离开') }}</QuireButton></template>
    </QuireDialogContent></QuireDialogRoot>
  </div>
</template>
