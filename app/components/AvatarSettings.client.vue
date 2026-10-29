<script setup lang="ts">
import { QuireAvatar, QuireButton, QuireDialogRoot, QuireDialogContent, QuireFileUpload, QuireImageCropper, type QuireKitImageCropperApi } from '@quirekit/ui/vue';
import type { Profile } from '~~/shared/types';
const { identity } = useBlogSession();
const files = ref<File[]>([]), source = ref(''), ready = ref(false), busy = ref(false);
const error = ref(''), status = ref('');
const cropper = ref<QuireKitImageCropperApi>();
const cropOpen = computed({ get: () => !!source.value, set: value => { if (!value && !busy.value) files.value = []; } });
/** @returns The picker button, so dismissing a crop returns keyboard focus. */
function pickerButton(): HTMLElement | null { return document.getElementById('avatar-picker'); }
watch(() => files.value[0], file => {
  if (source.value) URL.revokeObjectURL(source.value);
  source.value = file ? URL.createObjectURL(file) : ''; ready.value = false;
  error.value = ''; status.value = '';
});
onBeforeUnmount(() => { if (source.value) URL.revokeObjectURL(source.value); });
/** @param cause - Rejected export or request. @returns A useful message without transport details. */
function failure(cause: unknown): string {
  return (cause as { data?: { message?: string } })?.data?.message || '头像未能保存，所选图片仍在，可以重试。';
}
/** @param remove - Restore initials instead of exporting the current crop. */
async function save(remove = false): Promise<void> {
  if (busy.value || !identity.value || (!remove && !ready.value)) return;
  busy.value = true; error.value = ''; status.value = '';
  try {
    const blob = remove ? undefined : await cropper.value!.getCroppedImage({ type: 'image/webp', quality: .9, maxSize: { width: 512, height: 512 } });
    const result = await $fetch<Profile>('/api/account/avatar', {
      method: remove ? 'DELETE' : 'PUT', body: blob,
      headers: { 'x-csrf-token': identity.value.csrf, ...(blob ? { 'Content-Type': blob.type } : {}) },
    });
    identity.value.user.avatarUrl = result.avatarUrl;
    files.value = []; await nextTick();
    status.value = remove ? '已恢复默认头像。' : '头像已更新，会显示在你的评论旁。';
    // Public author views read the same account reference on their next render.
    clearNuxtData('site-profile');
  } catch (cause) { error.value = failure(cause); }
  finally { busy.value = false; }
}
</script>
<template>
  <section class="profile-avatar" aria-labelledby="avatar-heading" :aria-busy="busy">
    <div class="profile-avatar-summary"><QuireAvatar :name="identity?.user.name || '访客'" :fallback="identity?.user.name.slice(0, 1)" :src="identity?.user.avatarUrl || undefined" size="xl" /><div><h2 id="avatar-heading">{{ identity?.user.name }}</h2><p>你的头像会公开显示在评论中。</p></div></div>
    <QuireFileUpload v-model="files" label="选择头像" accept="image/png,image/jpeg,image/webp" :max-files="1" :max-file-size="5 * 1024 * 1024" :multiple="false" :disabled="busy" @file-reject="error = '请选择不超过 5 MB 的 PNG、JPEG 或 WebP 图片。'">
      <template #default="upload">
        <div class="profile-avatar-actions"><QuireButton id="avatar-picker" variant="outline" size="md" :disabled="upload.disabled" @click="upload.openFilePicker">{{ identity?.user.avatarUrl ? '更换头像' : '上传头像' }}</QuireButton><QuireButton v-if="identity?.user.avatarUrl" variant="text" size="md" :disabled="busy" @click="save(true)">恢复默认</QuireButton></div>
        <QuireDialogRoot v-model:open="cropOpen" :close-on-escape="!busy" :close-on-interact-outside="!busy" :final-focus-el="pickerButton">
          <QuireDialogContent title="调整头像" description="选好范围后保存，头像会显示在你的评论旁。" size="small" :show-close="!busy" :busy="busy" :error-text="error">
            <QuireImageCropper v-if="source" :key="source" ref="cropper" :src="source" alt="待裁剪的头像" :height="280" :aspect-ratio="1" :toolbar="false" :disabled="busy" @ready="ready = true" @error="ready = false; error = '这张图片无法打开，请重新选择。'" />
            <template #footer><QuireButton variant="ghost" size="md" :disabled="busy" @click="upload.openFilePicker">重新选择</QuireButton><QuireButton variant="text" size="md" :disabled="busy" @click="cropOpen = false">取消</QuireButton><QuireButton variant="solid" size="md" :disabled="!ready" :busy="busy" @click="save()">保存头像</QuireButton></template>
          </QuireDialogContent>
        </QuireDialogRoot>
      </template>
    </QuireFileUpload>
    <p class="profile-hint">PNG、JPEG 或 WebP，最大 5 MB。选择后可以裁剪。</p>
    <p v-if="error && !source" class="comment-error" role="alert">{{ error }}</p><p v-if="status" class="profile-hint" role="status">{{ status }}</p>
  </section>
</template>
