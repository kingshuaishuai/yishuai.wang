<script setup lang="ts">
import { QuireButton, QuireFileUpload, QuireIcon } from '@quirekit/ui/vue';
const props = defineProps<{ postId: string; disabled?: boolean }>();
const cover = defineModel<string>({ required: true });
const emit = defineEmits<{ busy: [value: boolean] }>();
const { identity } = useBlogSession();
const files = ref<File[]>([]), busy = ref(false), error = ref('');
let controller: AbortController | undefined;
watch(() => files.value[0], async file => {
  if (!file) return;
  controller = new AbortController(); busy.value = true; emit('busy', true); error.value = '';
  const form = new FormData(); form.set('file', file); form.set('postId', props.postId);
  try {
    const result = await $fetch<{ url: string }>('/api/owner/media', { method: 'POST', body: form, signal: controller.signal, headers: { 'x-csrf-token': identity.value?.csrf || '' } });
    cover.value = result.url;
  } catch (cause: any) {
    if (!controller.signal.aborted) error.value = cause.data?.message || '上传未完成，请重新选择图片。';
  } finally { files.value = []; busy.value = false; emit('busy', false); }
});
onBeforeUnmount(() => controller?.abort());
</script>
<template>
  <section class="cover-field" aria-labelledby="cover-label" :aria-busy="busy">
    <h2 id="cover-label">封面 <span>选填</span></h2>
    <img v-if="cover" :src="cover" class="cover-thumbnail" alt="当前封面预览" />
    <QuireFileUpload v-model="files" label="选择封面" accept="image/png,image/jpeg,image/webp,image/gif" :max-files="1" :max-file-size="8 * 1024 * 1024" :disabled="disabled || busy" @file-reject="error = '请选择不超过 8 MB 的图片。'">
      <template #default="upload"><div class="cover-actions"><QuireButton variant="outline" size="sm" :disabled="upload.disabled" :busy="busy" @click="upload.openFilePicker"><template #leading><QuireIcon name="image" /></template>{{ cover ? '更换封面' : '上传封面' }}</QuireButton><QuireButton v-if="cover" variant="text" size="sm" :disabled="disabled || busy" @click="cover = ''">移除</QuireButton></div></template>
    </QuireFileUpload>
    <p class="profile-hint">可留空，图片最大 8 MB。</p><p v-if="error" class="comment-error" role="alert">{{ error }}</p>
  </section>
</template>
