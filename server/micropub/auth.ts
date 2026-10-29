import { getHeader, type H3Event } from 'h3';
import { mpError } from './errors';
/** @param value - Introspection response from the configured server. @param origin - Exact author profile origin. @returns Validated granted scopes. */
export function verifiedScopes(value: unknown, origin: string): Set<string> {
  const data = value as { active?: unknown; me?: unknown; scope?: unknown; exp?: unknown };
  if (!data || !(data.active === true || data.active === 'true') || typeof data.me !== 'string') throw mpError(401, 'Invalid token.');
  let me: URL;
  try { me = new URL(data.me); } catch { throw mpError(401, 'Invalid identity.'); }
  if (me.href !== origin + '/') throw mpError(403, 'This token does not belong to the author.');
  if (data.exp !== undefined && (!Number.isFinite(Number(data.exp)) || Number(data.exp) <= Date.now() / 1000)) throw mpError(401, 'Expired token.');
  return new Set(typeof data.scope === 'string' ? data.scope.split(/\s+/).filter(Boolean) : []);
}
/** @param event - Client request. @param formToken - Optional form-encoded bearer credential. @returns Current scopes; no tokens are cached or persisted. */
export async function authorize(event: H3Event, formToken?: string): Promise<Set<string>> {
  const header = getHeader(event, 'authorization');
  const bearer = header?.match(/^Bearer ([A-Za-z0-9._~+\/=-]+)$/i)?.[1];
  if (header && !bearer) throw mpError(401, 'Invalid Authorization header.');
  if (bearer && formToken) throw mpError(400, 'Use only one authentication method.');
  const token = bearer || formToken;
  if (!token || token.length > 4096) throw mpError(401, 'Bearer token required.');
  const config = useRuntimeConfig(event);
  if (!config.indieauthIntrospectionEndpoint) throw mpError(503, 'IndieAuth introspection is not configured.');
  const endpoint = new URL(config.indieauthIntrospectionEndpoint);
  if (endpoint.protocol !== 'https:') throw mpError(503, 'Introspection requires HTTPS.');
  let response: unknown;
  try {
    response = await $fetch(endpoint.href, { method: 'POST', timeout: 10000, retry: 0, redirect: 'error',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', Authorization: config.indieauthIntrospectionAuthorization || `Bearer ${token}` },
      body: new URLSearchParams({ token }).toString(),
    });
  } catch { throw mpError(401, 'Token verification failed.'); }
  return verifiedScopes(response, siteOrigin(event));
}
/** @param scopes - Verified permission set. @param required - Operation-specific authority. */
export function requireScope(scopes: Set<string>, required: string): void {
  if (!scopes.has(required)) throw mpError(403, `The ${required} scope is required.`);
}
