<script setup lang="ts">
import { computed, defineComponent, h } from 'vue';
import { QuireProse } from '@quirekit/ui/vue';
import { renderReadingHtml } from '~/lib/reading/html';
import ReadingCode from './ReadingCode.vue';

const props = defineProps<{ html: string }>();
const nodes = computed(() => renderReadingHtml(props.html, ReadingCode));
const Content = defineComponent({
  /** @returns Sanitized publication content with QuireKit reading components. */
  render: () => h(QuireProse, {}, { default: () => nodes.value }),
});
</script>

<template><Content /></template>
