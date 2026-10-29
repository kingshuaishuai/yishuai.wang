<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { useMsfeEditor, VueNodeViewHost } from '@quirekit/msfe-vue';
import { StarterKit } from '@quirekit/msfe-starter-kit';
import { QuireMarkdown } from '@quirekit/incremark/vue';
import { QuireButton, QuireIcon, QuireIconButton } from '@quirekit/ui/vue';
import { commentAppearance } from '~/lib/comment-appearance';
import ReadingCode from './ReadingCode.vue';

const props = defineProps<{ initial: string; submitLabel: string; busy?: boolean }>();
const emit = defineEmits<{ submit: [markdown: string]; draft: [markdown: string] }>();
const parent = shallowRef<HTMLElement | null>(null);
const preview = ref(false), source = ref(props.initial), error = ref('');
const readingComponents = { pre: ReadingCode };
const { editor, host } = useMsfeEditor(parent, () => ({
  markdown: props.initial, mode: 'live', label: '评论正文',
  extensions: [StarterKit.configure({ heading: false, image: false, table: false }), commentAppearance],
  onChange() { capture(); },
  onError() { error.value = '编辑器暂时无法使用，请重新打开评论框。'; },
}));
/** @returns A source snapshot only when the host needs to save or preview. */
function getMarkdown(): string { return editor.value?.getMarkdown() ?? source.value; }
/** Preserves Markdown before switching presentation or leaving this input. */
function capture(): void { source.value = getMarkdown(); emit('draft', source.value); }
/** Switches preview without replacing the editor or losing undo history. */
function togglePreview(): void { capture(); preview.value = !preview.value; }
/** Applies an MSFE command while preserving its source selection. */
function bold(): void { editor.value?.commands.toggleBold(); editor.value?.focus(); }
/** Sends only a source snapshot to the parent for validation. */
function submit(): void { capture(); emit('submit', source.value); }
/** Clears an accepted local preview only after the parent has retained it. */
function reset(): void { editor.value?.replaceDocument('', 'comment-draft'); source.value = ''; preview.value = false; emit('draft', ''); }
/** Returns focus to the canonical input. */
function focus(): void { editor.value?.focus(); }
defineExpose({ getMarkdown, reset, focus });
onBeforeUnmount(capture);
</script>

<template>
  <div class="comment-composer" @focusout="capture">
    <div v-show="!preview" ref="parent" class="comment-editor" /><VueNodeViewHost :host="host" />
    <div v-if="preview" class="comment-preview"><QuireMarkdown v-if="source.trim()" :content="source" :components="readingComponents" /><p v-else>写一点内容，再来看看它的样子。</p></div>
    <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
    <div class="comment-compose-actions"><div class="comment-format-actions"><QuireIconButton v-if="!preview" label="加粗" size="md" @pointerdown.prevent @click="bold"><QuireIcon name="bold" /></QuireIconButton><QuireButton variant="text" size="md" :aria-pressed="preview" @click="togglePreview">{{ preview ? '编辑' : '预览' }}</QuireButton><span>Markdown</span></div><QuireButton variant="solid" size="md" :disabled="!!error || busy" @click="submit">{{ submitLabel }} <QuireIcon name="arrowUpRight" :size="16" /></QuireButton></div>
  </div>
</template>
