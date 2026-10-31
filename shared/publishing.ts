/** Operations granted to an author's publishing client. */
export const publishingScopes = ['create', 'update', 'delete', 'undelete', 'media'] as const;

/** Safe token metadata; the credential and its digest are never included. */
export interface PublishingToken {
  /** Public identity used for revocation. */
  id: string;
  /** Author-chosen client name. */
  name: string;
  /** Last six characters for recognizing a credential. */
  suffix: string;
  /** Granted Micropub operations. */
  scopes: string[];
  /** Creation timestamp in milliseconds. */
  createdAt: number;
  /** Expiry timestamp in milliseconds. */
  expiresAt: number;
  /** Most recent use, recorded at most once every five minutes. */
  lastUsedAt: number | null;
  /** Revocation timestamp, or null while not revoked. */
  revokedAt: number | null;
}

/** Author-only publishing configuration returned by the server. */
export interface PublishingAccess {
  /** Canonical site URL, including the profile's trailing slash. */
  siteUrl: string;
  /** Endpoint to enter into a Micropub client. */
  endpoint: string;
  /** Upload endpoint, also discoverable through q=config. */
  mediaEndpoint: string;
  /** Active tokens followed by recent inactive tokens. */
  tokens: PublishingToken[];
}

/** A newly issued token, returned only by its creation request. */
export interface CreatedPublishingToken {
  /** Credential to copy into one trusted client. */
  token: string;
  /** Metadata for subsequent display and revocation. */
  item: PublishingToken;
}
