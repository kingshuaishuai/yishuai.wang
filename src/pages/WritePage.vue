<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue';
import { MdEditor } from '@quirekit/md-editor/vue';
import type { MdEditorInstance } from '@quirekit/md-editor/vue';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import { QuireButton, QuireIcon, QuireInput, QuireField, QuireSegmented, QuireDialogRoot, QuireDialogTrigger, QuireDialogContent, QuireDialogCloseTrigger } from '@quirekit/ui/vue';
import '@quirekit/md-editor/styles.css';
import '../styles/writing.css';
import { readDraft, storeDraft } from '../draft';
import { openLogin } from '../account/session';
import ReadingCode from '../components/ReadingCode.vue';
const readingComponents = { pre: ReadingCode };

const draft = reactive(readDraft());
const editor = ref<MdEditorInstance>();
const preview = ref(false);
const status = ref(draft.savedAt ? '已恢复本机草稿' : '尚未保存');
const kinds = [{ value: 'article', label: '文章' }, { value: 'note', label: '短记' }];

/** Takes source from the editor's public authority before preview or persistence. */
function captureSource(): void { draft.markdown = editor.value?.editor?.getMarkdown() ?? draft.markdown; }

/** Preserves the draft in this browser and reports failures without losing memory state. */
function save(): void {
  captureSource();
  draft.savedAt = new Date().toISOString();
  status.value = storeDraft({ ...draft }) ? '已保存到当前浏览器' : '本机保存失败，内容仍在编辑器中';
}

/** Uses the same source in the published-content reading component. */
function togglePreview(): void { captureSource(); preview.value = !preview.value; }

/** Completes only a publication review; no endpoint is contacted. */
function completeReview(): void { save(); status.value = '发布流程预览完成，草稿仍保存在本机'; }

onBeforeUnmount(save);
</script>

<template>
  <div class="writer-actions"><QuireSegmented v-model="draft.kind" :items="kinds" label="内容类型" /><div class="writer-action-buttons"><QuireButton variant="ghost" size="md" aria-label="保存草稿" @click="save">保存</QuireButton><QuireButton variant="outline" size="md" :aria-label="preview ? '继续编辑' : '预览文章'" @click="togglePreview">{{ preview ? '编辑' : '预览' }}</QuireButton><QuireDialogRoot><QuireDialogTrigger class="qk-button qk-button--neutral-solid qk-button--md" @click="captureSource">发布 <span class="publish-arrow"><QuireIcon name="arrowUpRight" :size="16" /></span></QuireDialogTrigger><QuireDialogContent title="准备发布" description="再看一眼，这篇内容即将以怎样的方式出现。"><div class="publish-summary"><span class="eyebrow">{{ draft.kind === 'article' ? '文章' : '生活短记' }}</span><h2 class="qk-type-section-title">{{ draft.kind === 'article' ? draft.title || '未命名文章' : '一则新的生活记录' }}</h2><p>{{ draft.markdown.slice(0, 120) }}…</p><div class="publish-target"><QuireIcon name="globe" :size="16" /><span>你的个人网站</span><span>公开</span></div><p class="preview-disclaimer">当前是设计预览，不会发布到互联网。</p></div><template #footer><QuireDialogCloseTrigger class="qk-button qk-button--neutral-text qk-button--md">继续修改</QuireDialogCloseTrigger><QuireDialogCloseTrigger class="qk-button qk-button--neutral-solid qk-button--md" @click="completeReview">完成预览</QuireDialogCloseTrigger></template></QuireDialogContent></QuireDialogRoot></div></div>
  <div class="writer-layout"><section class="writer-paper" aria-label="写作正文"><div v-if="!preview" class="writer-title"><label v-if="draft.kind === 'article'" for="draft-title" class="sr-only">文章标题</label><input v-if="draft.kind === 'article'" id="draft-title" v-model="draft.title" placeholder="起一个标题…" /><span v-else class="note-writing-title qk-type-page-title">此刻，想记下什么？</span></div><div v-show="!preview" class="editor-mount"><MdEditor ref="editor" :markdown="draft.markdown" label="文章正文" toolbar="floating" :block-controls="false" layout="document" placeholder="从这里开始。输入 / 插入内容…" /></div><div v-if="preview" class="writing-preview reading-body"><span class="eyebrow">阅读预览</span><h1 v-if="draft.kind === 'article'" class="qk-type-page-title">{{ draft.title || '未命名文章' }}</h1><QuireMarkdown :content="draft.markdown" :components="readingComponents" /></div></section><aside class="writer-settings"><span class="eyebrow">这篇内容</span><QuireField label="标签"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="draft.tags" placeholder="添加标签，用逗号分隔" width="100%" /></template></QuireField><div class="writer-setting"><span>发布位置</span><strong>{{ draft.kind === 'article' ? '文章' : '生活' }}</strong></div><div class="writer-setting"><span>可见范围</span><strong>公开</strong></div><div class="writer-hint"><QuireIcon name="notebookPen" :size="16" /><p>长文章，或短短一句。<br />让记录成为一件轻松的事。</p></div></aside></div>
  <div class="writer-identity"><span>作者身份预览 · 登录服务未连接</span><a href="#/login" @click.prevent="openLogin('/write')">切换身份</a></div>
  <div class="writer-status"><span aria-live="polite">{{ status }}</span><span>设计预览 · 草稿仅保存在本机</span></div>
</template>
