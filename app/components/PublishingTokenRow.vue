<script setup lang="ts">
import { QuireButton } from '@quirekit/ui/vue';
import type { PublishingToken } from '~~/shared/publishing';
defineProps<{ token: PublishingToken; busy: boolean }>();
const emit = defineEmits<{ revoke: [id: string] }>();
const { t, locale } = useBlogLocale();
const confirming = ref(false);
/** @param value - Stored timestamp. @returns Localized calendar date. */
function date(value: number): string { return new Date(value).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en', { year: 'numeric', month: 'short', day: 'numeric' }); }
</script>
<template>
  <li class="publishing-token-row">
    <div class="token-identity"><strong>{{ token.name }}</strong><code>···{{ token.suffix }}</code></div>
    <div class="token-details">
      <span v-if="token.revokedAt">{{ t('已撤销', 'Revoked') }} · {{ date(token.revokedAt) }}</span>
      <span v-else-if="token.expiresAt <= Date.now()">{{ t('已过期', 'Expired') }} · {{ date(token.expiresAt) }}</span>
      <span v-else>{{ t('有效至', 'Expires') }} {{ date(token.expiresAt) }} · {{ token.lastUsedAt ? t('使用于 ', 'Used ') + date(token.lastUsedAt) : t('尚未使用', 'Not used yet') }}</span>
    </div>
    <div v-if="!token.revokedAt && token.expiresAt > Date.now()" class="token-actions">
      <template v-if="confirming"><span>{{ t('撤销后需重新连接', 'The client will need a new token') }}</span><QuireButton size="sm" variant="text" :disabled="busy" @click="confirming = false">{{ t('取消', 'Cancel') }}</QuireButton><QuireButton size="sm" variant="outline" :disabled="busy" @click="emit('revoke', token.id)">{{ t('确认撤销', 'Revoke token') }}</QuireButton></template>
      <QuireButton v-else size="sm" variant="text" :disabled="busy" :aria-label="t('撤销 ', 'Revoke ') + token.name" @click="confirming = true">{{ t('撤销', 'Revoke') }}</QuireButton>
    </div>
  </li>
</template>
<style scoped>
.publishing-token-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; padding-block: 12px; border-top: 1px solid var(--qk-color-border-subtle); }
.token-identity { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; min-width: 0; overflow-wrap: anywhere; }
.token-identity strong { font-weight: 500; font-size: 13px; }
.token-identity code, .token-details { font-size: 11px; color: var(--qk-color-text-tertiary); }
.token-details { grid-column: 1; line-height: 1.7; }
.token-actions { grid-column: 2; grid-row: 1 / 3; display: flex; flex-wrap: wrap; align-items: center; justify-content: end; gap: 4px; }
.token-actions > span { flex-basis: 100%; font-size: 11px; text-align: right; color: var(--qk-color-text-secondary); }
@media (max-width: 480px) { .token-actions:has(> span) { grid-column: 1 / -1; grid-row: auto; } }
</style>
