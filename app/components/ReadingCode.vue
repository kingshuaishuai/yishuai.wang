<script setup lang="ts">
import { QuireProseSource } from '@quirekit/ui/vue';
import { highlightCode } from '~/lib/code-highlighting';
const props = withDefaults(defineProps<{ code?: string; language?: string }>(), { code: '', language: '' });
const { data: tokens } = await useAsyncData(`code-${useId()}`, () => highlightCode(props.code, props.language), {
  watch: [() => props.code, () => props.language],
  default: () => [{ text: props.code, className: '' }],
});
defineOptions({ inheritAttrs: false });
</script>

<template>
  <QuireProseSource v-bind="$attrs" :code="code" :language="language" :default-collapsed="false" class="reading-code syntax-highlight" :data-code-language="language">
    <template #code><code><span v-for="(token, index) in tokens" :key="index" :class="token.className">{{ token.text }}</span></code></template>
  </QuireProseSource>
</template>
