<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { architecture, bamboo, mountains, plum, waves } from '@quirekit/inkwash';
import { InkWash } from '@quirekit/inkwash/vue';
import type { InkWashOptions } from '@quirekit/inkwash';

const props = defineProps<{ page: string; placement: 'heading' | 'footer' }>();
const root = shallowRef<HTMLElement | null>(null);
const visible = ref(false);
let observer: IntersectionObserver | undefined;
const compact = computed(() => props.page.startsWith('/articles/') || props.page === '/login' || props.page === '/write');
const scene = computed(() => {
  if (props.placement === 'footer') return mountains;
  if (props.page.startsWith('/articles')) return bamboo;
  if (props.page === '/life' || props.page === '/subscribe') return waves;
  if (props.page === '/about' || props.page === '/login') return plum;
  if (props.page === '/projects') return architecture;
  return mountains;
});
const clearing: InkWashOptions['clearing'] = { center: [0.08, 0.5], radius: [0.72, 0.8] };
const themeAttributes = ['data-qk-scheme', 'data-qk-theme'];

// Only visible ornaments own a renderer. Frozen mode paints a complete scene once;
// scrolling past it releases the context instead of accumulating offscreen canvases.
onMounted(() => {
  observer = new IntersectionObserver(entries => { visible.value = entries.some(entry => entry.isIntersecting); });
  if (root.value) observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div ref="root" class="ink-painting" :class="[`ink-painting--${placement}`, { 'ink-painting--home': page === '/', 'ink-painting--compact': compact }]" :data-scene="scene.name" aria-hidden="true">
    <!-- A retired subject's canvas must not update the next subject's readiness. -->
    <InkWash v-if="visible" :key="scene.name" class="ink-painting-canvas" :scene="scene" orbit="fixed" frozen still :ambient="false" :eye="placement === 'footer' ? 3.6 : undefined" :clearing="clearing" :theme-attributes="themeAttributes" />
  </div>
</template>
