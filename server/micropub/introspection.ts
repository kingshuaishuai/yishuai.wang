import { mpError } from './errors';

/** @param endpoint - Configured HTTPS provider URL. @param token - Foreign bearer token. @param authorization - Optional provider client credential. @returns Provider JSON, with redirects rejected before any credential forwarding. */
export async function introspectToken(endpoint: string, token: string, authorization: string): Promise<unknown> {
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), redirect: 'manual',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authorization || `Bearer ${token}` },
      body: new URLSearchParams({ token }).toString(),
    });
    if (!response.ok) throw new Error('Introspection failed.');
    return await response.json();
  } catch { throw mpError(401, 'Token verification failed.'); }
}
