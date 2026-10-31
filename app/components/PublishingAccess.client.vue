<script setup lang="ts">
import { QuireButton, QuireClipboard, QuireDialogRoot, QuireDialogContent, QuireField, QuireIcon, QuireInput, QuireSelect } from '@quirekit/ui/vue';
defineProps<{ returnFocus: () => HTMLElement | null }>();
const open = defineModel<boolean>('open', { required: true });
const { t } = useBlogLocale();
const { access, created, loading, busy, error, notice, load, generate, revoke, clear } = usePublishingAccess(open);
const createdHeading = useTemplateRef<HTMLElement>('createdHeading');
const name = ref('QuirePub'), days = ref<string | undefined>('365');
const expiryOptions = computed(() => [{ value: '30', label: t('30 天', '30 days') }, { value: '90', label: t('90 天', '90 days') }, { value: '365', label: t('1 年', '1 year') }]);
const activeCount = computed(() => access.value?.tokens.filter(item => !item.revokedAt && item.expiresAt > Date.now()).length || 0);
const formId = useId();
watch(created, async value => {
  await nextTick();
  if (!open.value) return;
  if (value) createdHeading.value?.focus();
  else document.getElementById(formId)?.querySelector('input')?.focus();
});
</script>
<template>
  <QuireDialogRoot v-model:open="open" content-id="publishing-access-dialog" :final-focus-el="returnFocus" :close-on-escape="!busy" :close-on-interact-outside="!busy && !created" @exit-complete="clear">
    <QuireDialogContent :title="t('发布接入', 'Publishing access')" :description="t('连接 QuirePub 或其他 Micropub 客户端。', 'Connect QuirePub or another Micropub client.')" size="medium" :busy="busy" :error-text="error" :show-close="!busy">
      <p v-if="loading" role="status">{{ t('正在载入…', 'Loading…') }}</p>
      <div v-else-if="access" class="publishing-access">
        <div class="publishing-addresses">
          <QuireClipboard :value="access.siteUrl" :label="t('站点地址', 'Site URL')" size="md" />
          <QuireClipboard :value="access.endpoint" :label="t('Micropub 接口', 'Micropub endpoint')" size="md" />
        </div>
        <p class="publishing-help">{{ t('把接口地址与令牌填入客户端，即可发布文章、修改内容和上传图片。', 'Enter the endpoint and token in your client to publish, edit and upload images.') }}</p>
        <section class="publishing-credentials" :aria-label="t('访问令牌', 'Access tokens')">
          <div v-if="created" class="publishing-new-token">
            <strong ref="createdHeading" tabindex="-1"><QuireIcon name="check" :size="16" />{{ t('令牌已生成', 'Token created') }}</strong>
            <p>{{ t('完整令牌仅显示这一次。请复制到客户端并妥善保存，关闭后无法再次查看。', 'This is the only time the full token is shown. Copy it to your client before closing.') }}</p>
            <QuireClipboard :value="created.token" :label="t('访问令牌', 'Access token')" size="md" />
            <QuireButton size="sm" variant="text" @click="created = undefined">{{ t('我已保存，隐藏令牌', 'Saved — hide token') }}</QuireButton>
          </div>
          <form v-else :id="formId" class="publishing-create" @submit.prevent="generate(name, days || '365')">
            <div class="publishing-section-title"><h3>{{ t('生成访问令牌', 'Create an access token') }}</h3><span>Micropub</span></div>
            <div class="publishing-create-fields">
              <QuireField :label="t('客户端名称', 'Client name')"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="name" width="100%" size="md" :maxlength="60" required :disabled="busy" autocomplete="off" placeholder="QuirePub" /></template></QuireField>
              <QuireField :label="t('有效期', 'Expires in')"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="days" :items="expiryOptions" :label="t('有效期', 'Expires in')" size="md" width="100%" :disabled="busy" /></template></QuireField>
              <QuireButton type="submit" size="md" variant="solid" :disabled="busy || !name.trim() || activeCount >= 10">{{ busy ? t('正在生成…', 'Creating…') : t('生成令牌', 'Create token') }}</QuireButton>
            </div>
            <p class="publishing-help">{{ t('权限：创建、修改、删除、恢复内容及上传媒体。不包含账户或后台设置权限。', 'Permissions: create, update, delete, restore and upload media. No access to account or site settings.') }}</p>
            <p v-if="activeCount >= 10" class="publishing-help">{{ t('已达到 10 个有效令牌，请先撤销不用的令牌。', 'You have 10 active tokens. Revoke an unused token to create another.') }}</p>
          </form>
        </section>
        <section v-if="access.tokens.length" :aria-label="t('已生成的令牌', 'Existing tokens')">
          <div class="publishing-section-title"><h3>{{ t('已生成的令牌', 'Existing tokens') }}</h3><span>{{ activeCount }} {{ t('个有效', 'active') }}</span></div>
          <ul class="publishing-tokens"><PublishingTokenRow v-for="item in access.tokens" :key="item.id" :token="item" :busy="busy" @revoke="revoke" /></ul>
        </section>
        <p v-if="notice" class="publishing-help" role="status">{{ notice }}</p>
      </div>
      <template #footer><QuireButton v-if="!loading && !access" variant="outline" size="md" @click="load">{{ t('重试', 'Retry') }}</QuireButton><QuireButton variant="text" size="md" :disabled="busy" @click="open = false">{{ t('关闭', 'Close') }}</QuireButton></template>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
<style scoped>
.publishing-access { display: grid; gap: 20px; }
.publishing-addresses { display: grid; gap: 12px; min-width: 0; }
.publishing-help { font-size: 12px; line-height: 1.8; color: var(--qk-color-text-secondary); }
.publishing-credentials { padding-block: 20px; border-block: 1px solid var(--qk-color-border-subtle); }
.publishing-section-title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.publishing-section-title h3 { font-size: 14px; font-weight: 500; }
.publishing-section-title > span { font-size: 11px; color: var(--qk-color-text-tertiary); }
.publishing-create { display: grid; gap: 14px; }
.publishing-create-fields { display: grid; grid-template-columns: minmax(0, 1fr) 110px auto; align-items: end; gap: 12px; }
.publishing-new-token { display: grid; justify-items: stretch; gap: 12px; }
.publishing-new-token > strong { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.publishing-new-token > p { font-size: 12px; line-height: 1.8; color: var(--qk-color-text-secondary); }
.publishing-new-token > button { justify-self: start; }
.publishing-tokens { list-style: none; padding: 0; margin: 12px 0 0; }
@media (max-width: 480px) { .publishing-create-fields { grid-template-columns: minmax(0, 1fr) 100px; } .publishing-create-fields > button { grid-column: 1 / -1; } }
</style>
