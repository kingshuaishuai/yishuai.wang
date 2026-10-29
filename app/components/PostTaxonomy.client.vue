<script setup lang="ts">
import { QuireButton, QuireCheckboxGroup, QuireDialogContent, QuireDialogRoot, QuireDialogTrigger, QuireField, QuireIcon, QuireScrollArea, QuireSelect } from '@quirekit/ui/vue';
import type { ContentOptions } from '~~/shared/types';
import { defaultCategories, defaultTags } from '~~/shared/content-options';
defineProps<{ disabled?: boolean }>();
const category = defineModel<string>('category', { required: true });
const tags = defineModel<string[]>('tags', { required: true });
const { data, error, refresh } = useFetch<ContentOptions>('/api/owner/taxonomy');
const open = ref(false), selection = ref<string[]>([]);
const categories = computed(() => [...new Set([...(data.value?.categories || defaultCategories), category.value])].map(value => ({ value, label: value })));
const tagItems = computed(() => [...new Set([...(data.value?.tags || defaultTags), ...tags.value])].map(value => ({ value, label: value, disabled: selection.value.length >= 20 && !selection.value.includes(value) })));
watch(open, value => { if (value) selection.value = [...tags.value]; });
/** Saves the selected vocabulary only when the author confirms the dialog. */
function confirm(): void { tags.value = [...selection.value]; open.value = false; }
</script>
<template>
  <QuireField label="分类"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="category" label="分类" :items="categories" width="100%" :disabled="disabled" /></template></QuireField>
  <section class="writer-tags" aria-labelledby="tags-label">
    <h2 id="tags-label">标签</h2>
    <QuireDialogRoot v-model:open="open">
      <QuireDialogTrigger as-child><QuireButton class="tag-picker-trigger" variant="outline" size="md" :disabled="disabled">{{ tags.length ? `已选 ${tags.length} 个标签` : '选择标签' }}<template #trailing><QuireIcon name="chevronDown" /></template></QuireButton></QuireDialogTrigger>
      <QuireDialogContent title="选择标签" description="可以多选，也可以不选。" size="small">
        <QuireScrollArea class="tag-options" label="可选标签"><QuireCheckboxGroup v-model="selection" label="标签" :items="tagItems" hide-label /></QuireScrollArea>
        <template #footer><QuireButton variant="text" size="md" @click="open = false">取消</QuireButton><QuireButton variant="solid" size="md" @click="confirm">确定</QuireButton></template>
      </QuireDialogContent>
    </QuireDialogRoot>
    <p v-if="tags.length" class="selected-tags">{{ tags.join(' · ') }}</p>
    <p v-if="error" class="comment-error" role="alert">已有选项未能载入。<QuireButton variant="text" size="sm" @click="refresh()">重试</QuireButton></p>
  </section>
</template>
