<script setup lang="ts">
import { QuireButton, QuireIcon } from '@quirekit/ui/vue';
import type { SummaryEvent, SummaryStatus } from '~~/shared/ai';
import { readSse } from '~~/shared/sse';
import { summaryErrors } from '~/lib/ai-messages';
const props = defineProps<{ postId: string; version: number; published: boolean }>();
const { t, localePath } = useBlogLocale();
const { identity } = useBlogSession();
const state = ref<SummaryStatus>(), busy = ref(false), preview = ref(''), error = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let disposed = false;
/** Refresh published summary state; polling is bounded by the server's short generation lease. */
async function refresh(): Promise<void> {
  clearTimeout(timer);
  try {
    state.value = await $fetch<SummaryStatus>(`/api/owner/posts/${props.postId}/summary`);
    if (!disposed && state.value.status === 'generating' && !busy.value) timer = setTimeout(refresh, 2500);
  } catch { error.value = t('无法读取总结状态。', 'Could not load summary status.'); }
}
watch(() => props.version, async (_value, before) => {
  await refresh();
  // A publishing response may arrive just before its background lease is claimed.
  if (!disposed && before !== undefined && props.published && ['missing', 'stale'].includes(state.value?.status || '')) timer = setTimeout(refresh, 2500);
}, { immediate: true });
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); controller?.abort(); });
const failure = computed(() => state.value?.error ? t(...summaryErrors[state.value.error]) : '');
const generating = computed(() => busy.value || state.value?.status === 'generating');
/** Stream a manual regeneration without sending the editor's unsaved content. */
async function generate(): Promise<void> {
  if (generating.value) return;
  busy.value = true; error.value = ''; preview.value = ''; clearTimeout(timer);
  controller = new AbortController();
  let complete = false;
  try {
    const response = await fetch(`/api/owner/posts/${props.postId}/summary`, { method: 'POST', headers: { 'x-csrf-token': identity.value?.csrf || '', 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal });
    if (!response.ok || !response.body) throw new Error(t('生成未能开始，请刷新状态后重试。', 'Generation could not start. Refresh the status and retry.'));
    for await (const frame of readSse(response.body)) {
      const event = JSON.parse(frame.data) as SummaryEvent;
      if (event.type === 'delta') preview.value += event.text;
      if (event.type === 'complete') { complete = true; state.value = { status: 'ready', summary: event.summary, error: null }; }
      if (event.type === 'error') throw new Error(t(...summaryErrors[event.code]));
    }
    if (!complete) throw new Error(t('连接中断，请刷新状态。已完成的结果仍会保存。', 'Connection interrupted. Refresh the status; completed results are still saved.'));
  } catch (cause: any) { if (!disposed) error.value = cause.message || t('生成失败，请重试。', 'Generation failed. Please retry.'); }
  finally { busy.value = false; controller = undefined; if (!disposed) await refresh(); }
}
</script>
<template>
  <section class="writer-ai-summary" :aria-label="t('智能总结', 'AI summary')">
    <div class="writer-ai-heading"><span><QuireIcon name="bot" :size="16" />{{ t('智能总结', 'AI summary') }}</span><QuireButton v-if="state && !['disabled', 'unpublished'].includes(state.status)" variant="text" size="sm" :disabled="generating" @click="generate">{{ generating ? t('生成中…', 'Generating…') : state.summary ? t('重新生成', 'Regenerate') : t('生成', 'Generate') }}</QuireButton></div>
    <p v-if="state?.status === 'disabled'" class="profile-hint"><NuxtLink :to="localePath('/manage')">{{ t('在创作管理中配置 DeepSeek', 'Configure DeepSeek in Manage') }} <QuireIcon name="arrowUpRight" :size="12" /></NuxtLink></p>
    <p v-else-if="!published || state?.status === 'unpublished'" class="profile-hint">{{ t('发布文章后自动生成。', 'Generated automatically after publishing.') }}</p>
    <p v-else class="profile-hint" role="status">{{ generating ? t('正在总结已发布的正文…', 'Summarizing the published article…') : state?.status === 'ready' ? t('已显示在文章标题下方。', 'Visible below the article title.') : t('只处理已发布版本，保存草稿不会改变总结。', 'Uses the published version. Saving a draft leaves the summary unchanged.') }}</p>
    <p v-if="error || failure" class="comment-error" role="alert">{{ error || failure }}</p>
    <div v-if="busy && preview" class="writer-ai-preview">{{ preview }}</div>
    <details v-else-if="state?.summary" class="writer-ai-result"><summary>{{ t('查看总结', 'View summary') }}</summary><p>{{ state.summary.text }}</p></details>
  </section>
</template>
<style scoped>
.writer-ai-summary { padding-top: 16px; border-top: 1px solid var(--qk-color-border-subtle); }
.writer-ai-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 32px; }
.writer-ai-heading > span { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; }
.writer-ai-summary .comment-error, .writer-ai-result, .writer-ai-preview { font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.writer-ai-result { margin-top: 12px; }
.writer-ai-result summary { cursor: pointer; color: var(--qk-color-text-secondary); }
.writer-ai-result p, .writer-ai-preview { padding-block: 8px; color: var(--qk-color-text-secondary); max-height: 220px; overflow-y: auto; }
</style>
