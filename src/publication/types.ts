/** One public, read-only representation generated from the article collection. */
export interface PublicResource {
  /** Absolute site path without an origin. */
  path: string;
  /** UTF-8 response content. */
  body: string;
  /** Media type used by the development and preview server. */
  contentType: string;
  /** Canonical reading page, where this resource represents one article. */
  canonical?: string;
}
