<script setup lang="ts">
import { QuireButton } from '@quirekit/ui/vue';
const { t } = useBlogLocale();
defineProps<{ pages: number; label: string }>();
const page = defineModel<number>('page', { required: true });
</script>
<template>
  <nav v-if="pages > 1" class="pagination" :aria-label="label">
    <QuireButton variant="text" size="sm" :disabled="page <= 1" @click="page--">{{ t('上一页') }}</QuireButton>
    <span aria-live="polite">{{ page }} / {{ pages }}</span>
    <QuireButton variant="text" size="sm" :disabled="page >= pages" @click="page++">{{ t('下一页') }}</QuireButton>
  </nav>
</template>
