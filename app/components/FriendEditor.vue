<script setup lang="ts">
import { QuireButton, QuireDialogRoot, QuireDialogContent, QuireField, QuireInput, QuireInputNumber, QuireSwitch, QuireTextarea } from '@quirekit/ui/vue';
import type { FriendInput, ManagedFriend } from '~~/shared/friends';
const props = defineProps<{ friend: ManagedFriend | null; returnFocus: () => HTMLElement | null }>();
const open = defineModel<boolean>('open', { default: false });
const emit = defineEmits<{ saved: []; conflict: [] }>();
const { t, locale } = useBlogLocale();
const { mutate } = useBlogSession();
const urlPlaceholder = 'https://example.com';
const formId = useId(), busy = ref(false), error = ref(''), position = ref('0');
const draft = ref<FriendInput>({ name: '', url: '', description: '', descriptionEn: '', iconUrl: '', visible: true, position: 0 });
watch(open, value => {
  if (!value) return;
  const item = props.friend;
  draft.value = item ? { name: item.name, url: item.url, description: item.description, descriptionEn: item.descriptionEn, iconUrl: item.iconUrl, position: item.position, visible: item.visible } : { name: '', url: '', description: '', descriptionEn: '', iconUrl: '', position: 0, visible: true };
  position.value = String(draft.value.position); error.value = '';
});
/** @returns The first field when the dialog opens. */
function initialFocus(): HTMLElement | null { return document.getElementById(formId)?.querySelector('input') ?? null; }
/** Saves a version-checked edit, keeping the form available after failures. */
async function save(): Promise<void> {
  if (busy.value) return;
  const rank = Number(position.value);
  if (!Number.isInteger(rank) || rank < 0 || rank > 9999) { error.value = t('排序请填写 0 到 9999 的整数。', 'Order must be a whole number from 0 to 9999.'); return; }
  busy.value = true; error.value = '';
  try {
    const input = { ...draft.value, iconUrl: draft.value.iconUrl.trim(), position: rank };
    await mutate(props.friend ? `/api/owner/friends/${props.friend.id}` : '/api/owner/friends', props.friend ? 'PUT' : 'POST', props.friend ? { ...input, version: props.friend.version } : input);
    open.value = false; emit('saved');
  } catch (cause: any) {
    error.value = locale.value === 'zh' ? cause.data?.message || '保存失败，请重试。' : cause.statusCode === 409 ? 'This site already exists or was updated elsewhere. Reopen it from the refreshed list.' : 'Could not save. Check the name and public HTTPS addresses, then retry.';
    if (cause.statusCode === 409) emit('conflict');
  } finally { busy.value = false; }
}
</script>
<template>
  <QuireDialogRoot v-model:open="open" :final-focus-el="returnFocus" :initial-focus-el="initialFocus" :close-on-escape="!busy" :close-on-interact-outside="false">
    <QuireDialogContent :title="friend ? t('编辑友链', 'Edit a friend link') : t('添加友链', 'Add a friend link')" :description="t('留下一处值得再去读的地方。', 'A place worth returning to.')" size="medium" :busy="busy" :error-text="error" :show-close="!busy">
      <form :id="formId" class="friend-form" @submit.prevent="save">
        <fieldset :disabled="busy">
          <div class="friend-form-pair">
            <QuireField :label="t('站点名称', 'Site name')" required>
              <template #default="{ controlProps }">
                <QuireInput v-bind="controlProps" v-model="draft.name" width="100%" :maxlength="80" required autocomplete="off" />
              </template>
            </QuireField>
            <QuireField :label="t('站点地址', 'Site URL')" required>
              <template #default="siteField">
                <QuireInput v-bind="siteField.controlProps" v-model="draft.url" width="100%" type="url" :placeholder="urlPlaceholder" :maxlength="1000" required autocomplete="off" />
              </template>
            </QuireField>
          </div>
          <QuireField :label="t('简介', 'Introduction')">
              <template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="draft.description" width="100%" :rows="3" :maxlength="400" :placeholder="t('这里写些什么，为什么值得读。', 'What they write about and why it is worth reading.')" />
              </template>
            </QuireField>
          <QuireField :label="t('英文简介（选填）', 'English introduction (optional)')" :description="t('英文页面优先显示；留空沿用上面的简介。', 'Used on the English page. Leave blank to use the introduction above.')">
              <template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="draft.descriptionEn" width="100%" :rows="2" :maxlength="600" />
              </template>
            </QuireField>
          <QuireField :label="t('图标地址（选填）', 'Icon URL (optional)')" :description="t('HTTPS 图片地址。留空或加载失败时显示名称首字。', 'An HTTPS image URL. The first letter is shown if empty or unavailable.')">
              <template #default="iconField">
                <QuireInput v-bind="iconField.controlProps" v-model="draft.iconUrl" width="100%" type="url" :placeholder="urlPlaceholder" :maxlength="1000" autocomplete="off" />
              </template>
            </QuireField>
          <div class="friend-form-options"><QuireField :label="t('排序', 'Order')" :description="t('数字小的在前', 'Lower numbers first')" width="144px">
              <template #default="{ controlProps }"><QuireInputNumber v-bind="controlProps" v-model="position" :label="t('排序', 'Order')" :min="0" :max="9999" :step="1" width="100%" />
              </template>
            </QuireField><QuireSwitch v-model:checked="draft.visible" :label="t('公开展示', 'Show publicly')" :description="t('关闭后仅在管理页保留', 'Keep privately when off')" /></div>
        </fieldset>
      </form>
      <template #footer><QuireButton variant="text" size="md" :disabled="busy" @click="open = false">{{ t('取消', 'Cancel') }}</QuireButton><QuireButton variant="solid" size="md" type="submit" :form="formId" :disabled="busy">{{ busy ? t('保存中…', 'Saving…') : t('保存友链', 'Save link') }}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
<style scoped>
.friend-form fieldset { display: grid; gap: 20px; min-width: 0; border: 0; padding: 0; margin: 0; }
.friend-form-pair { display: grid; grid-template-columns: 1fr 1.3fr; gap: 16px; }
.friend-form-options { display: flex; gap: 32px; flex-wrap: wrap; align-items: center; }
@media(max-width:480px) { .friend-form-pair { grid-template-columns: 1fr; gap: 20px; } .friend-form-options { gap: 20px; } }
</style>
