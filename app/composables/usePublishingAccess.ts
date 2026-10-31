import type { Ref } from 'vue';
import type { CreatedPublishingToken, PublishingAccess } from '~~/shared/publishing';

/** @param open - Dialog visibility. @returns Ephemeral credentials and author-only management actions. */
export function usePublishingAccess(open: Ref<boolean>) {
  const { t } = useBlogLocale();
  const { mutate } = useBlogSession();
  const access = ref<PublishingAccess>(), created = shallowRef<CreatedPublishingToken>();
  const loading = ref(false), busy = ref(false), error = ref(''), notice = ref('');
  let controller: AbortController | undefined;
  /** Loads current token metadata without ever retrieving existing credentials. */
  async function load(): Promise<void> {
    controller?.abort(); const request = new AbortController(); controller = request;
    loading.value = true; error.value = '';
    try {
      const value = await $fetch<PublishingAccess>('/api/owner/publishing', { signal: request.signal });
      if (!request.signal.aborted && open.value) access.value = value;
    } catch {
      if (!request.signal.aborted) error.value = t('发布接入暂时无法载入，请重试。', 'Publishing access could not be loaded. Please retry.');
    } finally { if (controller === request) loading.value = false; }
  }
  /** Clears credentials after the closing animation, without changing the visible dialog mid-exit. */
  function clear(): void { access.value = undefined; created.value = undefined; error.value = ''; notice.value = ''; }
  watch(open, value => {
    controller?.abort();
    if (value) { clear(); void load(); }
  }, { immediate: true });
  onBeforeUnmount(() => { controller?.abort(); created.value = undefined; });
  /** @param name - Trusted client's display name. @param days - User-selected expiry. */
  async function generate(name: string, days: string): Promise<void> {
    if (busy.value || !access.value) return;
    busy.value = true; error.value = ''; notice.value = '';
    try {
      const result = await mutate<CreatedPublishingToken>('/api/owner/publishing', 'POST', { name, expiresInDays: Number(days) });
      if (open.value && access.value) { created.value = result; access.value.tokens.unshift(result.item); }
    } catch (cause: any) { error.value = cause.data?.message || t('令牌未能生成，请重试。', 'Could not create a token. Please retry.'); }
    finally { busy.value = false; }
  }
  /** @param id - Metadata identity, never the credential itself. */
  async function revoke(id: string): Promise<void> {
    if (busy.value) return;
    busy.value = true; error.value = ''; notice.value = '';
    try {
      await mutate('/api/owner/publishing/' + id, 'DELETE');
      const item = access.value?.tokens.find(token => token.id === id);
      if (item) item.revokedAt = Date.now();
      if (created.value?.item.id === id) created.value = undefined;
      notice.value = t('令牌已撤销，客户端不能再用它发布。', 'Token revoked. The client can no longer publish with it.');
    } catch { error.value = t('撤销失败，请重试。', 'Revocation failed. Please retry.'); }
    finally { busy.value = false; }
  }
  return { access, created, loading, busy, error, notice, load, generate, revoke, clear };
}
