<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { useMsfeEditor, VueNodeViewHost } from '@quirekit/msfe-vue';
import { StarterKit } from '@quirekit/msfe-starter-kit';
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
import { commentAppearance } from '~/lib/comment-appearance';

const props = defineProps<{ initial: string; submitLabel: string; busy?: boolean }>();
const emit = defineEmits<{ submit: [markdown: string]; draft: [markdown: string] }>();
const parent = shallowRef<HTMLElement | null>(null);
const source = ref(props.initial), error = ref('');
const { editor, host } = useMsfeEditor(parent, () => ({
  markdown: props.initial, mode: 'live', label: '评论正文',
  extensions: [StarterKit.configure({ heading: false, image: false, table: false }), commentAppearance],
  onChange() { capture(); },
  onError() { error.value = '编辑器暂时无法使用，请重新打开评论框。'; },
}));
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
  <div class="comment-composer" @focusout="capture">
    <div ref="parent" class="comment-editor" /><VueNodeViewHost :host="host" />
    <p v-if="error" class="comment-error" role="alert">{{ error }}</p>
    <div class="comment-compose-actions"><QuireButton variant="solid" size="md" :disabled="!!error || busy || !source.trim()" @click="submit">{{ submitLabel }}<template #trailing><QuireIcon name="arrowUpRight" /></template></QuireButton></div>
  </div>
</template>
