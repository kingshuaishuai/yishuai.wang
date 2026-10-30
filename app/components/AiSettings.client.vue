<script setup lang="ts">
import { QuireButton, QuireCheckbox, QuireDialogRoot, QuireDialogContent, QuireDialogTrigger, QuireField, QuireIcon, QuireInput } from '@quirekit/ui/vue';
import { summaryModels, type AiSettings } from '~~/shared/ai';
const { t } = useBlogLocale();
const { mutate } = useBlogSession();
const open = ref(false), loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), apiKey = ref('');
const config = ref<AiSettings>();
const formId = useId();
watch(open, async value => {
  apiKey.value = ''; error.value = ''; notice.value = '';
  if (!value) return;
  loading.value = true;
  try { config.value = await $fetch<AiSettings>('/api/owner/ai/settings'); }
  catch { error.value = t('设置暂时无法载入。', 'Settings could not be loaded.'); }
  finally { loading.value = false; }
});
/** @param clearKey - Remove the stored credential and disable generation. */
async function save(clearKey = false): Promise<void> {
  if (!config.value || busy.value) return;
  busy.value = true; error.value = ''; notice.value = '';
  try {
    config.value = await mutate<AiSettings>('/api/owner/ai/settings', 'PUT', { enabled: clearKey ? false : config.value.enabled, model: config.value.model, revision: config.value.revision, apiKey: clearKey ? '' : apiKey.value, clearKey });
    apiKey.value = '';
    notice.value = clearKey ? t('Key 已移除，自动总结已关闭。', 'Key removed. Automatic summaries are off.') : t('设置已保存。', 'Settings saved.');
  } catch (cause: any) { error.value = cause.data?.message || t('设置未能保存。', 'Settings could not be saved.'); }
  finally { busy.value = false; }
}
</script>
<template>
  <QuireDialogRoot v-model:open="open">
    <QuireDialogTrigger as-child><QuireButton variant="text" size="md"><template #leading><QuireIcon name="bot" /></template>{{ t('智能总结', 'AI summaries') }}</QuireButton></QuireDialogTrigger>
    <QuireDialogContent :title="t('智能总结', 'AI summaries')" :description="t('让读者先了解重点，再慢慢读正文。', 'Give readers the essentials before they settle into the article.')" size="small" :busy="busy" :error-text="error" :show-close="!busy">
      <p v-if="loading" role="status">{{ t('正在载入…', 'Loading…') }}</p>
      <form v-else-if="config" :id="formId" class="ai-settings-form" @submit.prevent="save()">
        <div class="ai-provider"><span class="ai-provider-icon"><QuireIcon name="bot" :size="24" /></span><div><strong>DeepSeek</strong><span>api.deepseek.com</span></div><a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer">{{ t('获取 Key', 'Get a key') }} <QuireIcon name="arrowUpRight" :size="12" /></a></div>
        <p v-if="!config.encryptionReady" class="comment-error">{{ t('服务端尚未配置密钥加密，请先完成部署设置。', 'Configure server-side key encryption before saving a credential.') }}</p>
        <QuireField label="API Key" :description="config.hasKey ? t('已安全保存。留空沿用原 Key，填写后替换。', 'Saved securely. Leave blank to keep it, or enter a replacement.') : t('仅在服务端使用，保存后不再显示。', 'Used only on the server and never shown after saving.')"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="apiKey" type="password" autocomplete="new-password" width="100%" :maxlength="256" :disabled="busy || !config.encryptionReady" :placeholder="config.hasKey ? t('已配置，填写以更换', 'Configured · enter to replace') : 'sk-…'" /></template></QuireField>
        <div class="ai-model-setting">
          <QuireField :label="t('模型 ID', 'Model ID')" :description="t('按 DeepSeek 提供的名称填写，新模型无需更新网站。', 'Use the model ID from DeepSeek. New models need no site update.')"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="config.model" width="100%" :maxlength="128" :spellcheck="false" autocomplete="off" placeholder="deepseek-flash" :disabled="busy" /></template></QuireField>
          <div class="ai-model-suggestions"><span>{{ t('快速填写', 'Quick fill') }}</span><QuireButton v-for="model in summaryModels" :key="model" variant="text" size="sm" :disabled="busy" @click="config.model = model">{{ model }}</QuireButton></div>
        </div>
        <QuireCheckbox v-model:checked="config.enabled" :label="t('发布后自动总结', 'Summarize automatically after publishing')" :description="t('保存后生效。也会在正文重新发布时更新总结。', 'Takes effect after saving. Republished text gets a fresh summary.')" :disabled="busy || !config.encryptionReady" />
        <p class="ai-settings-note">{{ t('只发送已发布文章，按文章语言生成。结果保存一次，读者访问不会重复调用。模型费用由你的 DeepSeek 账户承担。', 'Only published articles are sent, in their own language. Results are saved and reused for every reader. Model usage is billed to your DeepSeek account.') }}</p>
        <p v-if="notice" class="ai-settings-notice" role="status">{{ notice }}</p>
      </form>
      <template #footer><QuireButton v-if="config?.hasKey" variant="text" size="md" :disabled="busy" @click="save(true)">{{ t('移除 Key', 'Remove key') }}</QuireButton><QuireButton variant="text" size="md" :disabled="busy" @click="open = false">{{ t('关闭', 'Close') }}</QuireButton><QuireButton variant="solid" size="md" type="submit" :form="formId" :disabled="busy || loading || !config?.encryptionReady">{{ busy ? t('正在保存…', 'Saving…') : t('保存设置', 'Save settings') }}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
<style scoped>
.ai-settings-form { display: grid; gap: 20px; }
.ai-provider { display: flex; align-items: center; gap: 12px; padding-bottom: 18px; border-bottom: 1px solid var(--qk-color-border-subtle); }
.ai-provider-icon { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-group); }
.ai-provider > div { display: grid; gap: 4px; }
.ai-provider strong { font-size: 14px; font-weight: 500; }
.ai-provider > div > span { font-size: 11px; color: var(--qk-color-text-tertiary); }
.ai-provider a { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
.ai-settings-note { font-size: 12px; line-height: 1.8; color: var(--qk-color-text-tertiary); }
.ai-settings-notice { font-size: 13px; color: var(--qk-color-text-primary); }
.ai-model-setting { display: grid; gap: 6px; }
.ai-model-suggestions { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; }
.ai-model-suggestions > span { font-size: 11px; color: var(--qk-color-text-tertiary); }
</style>
