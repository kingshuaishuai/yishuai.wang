/** Public information about a site personally recommended by the author. */
export interface FriendLink {
  /** Stable link identity. */
  id: string;
  /** Site name. */
  name: string;
  /** Absolute HTTPS destination. */
  url: string;
  /** Introduction in Chinese, or the site's original language. */
  description: string;
  /** Optional English introduction; falls back to the original. */
  descriptionEn: string;
  /** Optional absolute HTTPS icon URL. */
  iconUrl: string;
}

/** Owner-editable fields, separate from generated identity and revision. */
export interface FriendInput extends Omit<FriendLink, 'id'> {
  /** Lower numbers appear first; equal values keep creation order. */
  position: number;
  /** Whether the link is included on the public page. */
  visible: boolean;
}

/** Private management data, including optimistic concurrency revision. */
export interface ManagedFriend extends FriendInput {
  /** Stable link identity. */
  id: string;
  /** Incremented after every successful edit. */
  version: number;
}

/** @param url - Validated site address. @returns A short host label for display. */
export function friendDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}
