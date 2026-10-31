/** Stored publishing credential; queries project metadata explicitly. */
export interface PublishingTokenRow {
  /** Revocation identity. */
  id: string;
  /** Client display name. */
  name: string;
  /** Non-secret suffix. */
  suffix: string;
  /** Space-separated operation scopes. */
  scopes: string;
  /** Creation timestamp. */
  created_at: number;
  /** Hard expiry timestamp. */
  expires_at: number;
  /** Throttled last-use timestamp. */
  last_used_at: number | null;
  /** Revocation timestamp. */
  revoked_at: number | null;
}
