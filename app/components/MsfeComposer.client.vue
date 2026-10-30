<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useMsfeEditor, VueNodeViewHost } from '@quirekit/msfe-vue';
import { createMdEditorExtensions, mdCodeLanguages, setMdView, type MdEditableView } from '@quirekit/md-editor';
import { QuireButton, QuireIcon, QuireSegmented } from '@quirekit/ui/vue';
import { commentAppearance } from '~/lib/comment-appearance';
import { codeAppearance } from '~/lib/code-appearance';
const { t } = useBlogLocale();

const props = defineProps<{ initial: string; submitLabel: string; busy?: boolean }>();
const emit = defineEmits<{ submit: [markdown: string]; draft: [markdown: string] }>();
const parent = shallowRef<HTMLElement | null>(null);
const source = ref(props.initial), error = ref('');
const view = ref<MdEditableView>('document');
const views = [{ value: 'document', label: t('文档') }, { value: 'preview', label: t('实时预览') }, { value: 'source', label: t('源码') }];
const { editor, host } = useMsfeEditor(parent, () => ({
  markdown: props.initial, mode: 'live', label: t('评论正文'), readOnly: props.busy,
  codeLanguages: mdCodeLanguages,
  extensions: createMdEditorExtensions({ view: view.value, features: { heading: false, image: false, table: false }, containers: false, extras: false,
    extensions: [commentAppearance.configure({ placeholder: t('写下你的想法，让讨论从这里开始…', 'Share a thought. Start a conversation…') }), codeAppearance] }),
  onChange() { capture(); },
  onError() { error.value = t('编辑器暂时无法使用，文字已在本机保留，请刷新后重试。'); },
}));
// Presentation changes keep the mounted source, selection and history intact.
watch([view, () => props.busy], () => {
  if (editor.value) setMdView(editor.value, view.value, !!props.busy);
});
/** @returns The canonical MSFE document for submission or draft recovery. */
function getMarkdown(): string { return editor.value?.getMarkdown() ?? source.value; }
/** Preserves the current source before leaving this input. */
function capture(): void { source.value = getMarkdown(); emit('draft', source.value); }
/** Sends only a source snapshot to the parent for validation. */
function submit(): void { capture(); emit('submit', source.value); }
/** Clears the editor only after the parent has accepted the submitted comment. */
function reset(): void { editor.value?.replaceDocument('', 'comment-draft'); source.value = ''; emit('draft', ''); }
/** Returns focus to the canonical input. */
function focus(): void { editor.value?.focus(); }
defineExpose({ getMarkdown, reset, focus });
onBeforeUnmount(capture);
</script>

<template>
  <div class="comment-composer syntax-highlight" :aria-busy="busy || undefined" @focusout="capture">
    <div class="comment-compose-toolbar"><QuireSegmented v-model="view" :items="views" :label="t('评论编辑视图')" size="sm" :disabled="busy || !!error" /></div>
    <div ref="parent" class="comment-editor qk-scrollbars" /><VueNodeViewHost :host="host" />
    <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
    <div class="comment-compose-actions"><QuireButton variant="solid" size="sm" :disabled="!!error || busy || !source.trim()" @click="submit">{{ submitLabel }}<template #trailing><QuireIcon name="arrowUpRight" /></template></QuireButton></div>
  </div>
</template>
