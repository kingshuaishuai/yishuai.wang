import type { Session } from '~~/shared/types';

/** @returns Request-scoped identity and authenticated write helpers. */
export function useBlogSession() {
  const identity = useState<Session | null>('blog-session', () => null);
  const request = useRequestFetch();
  /** Refreshes the server-owned session. @returns Current identity, or a guest. */
  async function refresh(): Promise<Session | null> {
    identity.value = await request<Session | null>('/api/auth/session');
    return identity.value;
  }
  /** @param path - Same-origin API path. @param method - Write method. @param data - Validated server input. @returns API response. */
  async function mutate<T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', data?: unknown): Promise<T> {
    return await $fetch<T>(path, { method, body: data as Record<string, unknown>, headers: identity.value ? { 'x-csrf-token': identity.value.csrf } : {} }) as T;
  }
  /** Revokes the current session before clearing local identity. */
  async function logout(): Promise<void> {
    await mutate('/api/auth/logout', 'POST');
    identity.value = null;
    await navigateTo('/');
  }
  return { identity, refresh, mutate, logout };
}
