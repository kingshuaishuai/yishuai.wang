import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
/** Infrastructure bindings stay at the edge of the application. */
export type Bindings = { BLOG_DB: D1Database; BLOG_MEDIA: R2Bucket };
/** Database row; draft_json must never be serialized by a public handler. */
export type PostRow = {
  id: string; slug: string; kind: 'article' | 'note'; status: 'draft' | 'published' | 'deleted';
  deleted_from: string | null; version: number; draft_json: string; published_json: string | null;
  author_id: string; created_at: string; updated_at: string;
  published_at: string | null; published_updated_at: string | null;
};
/** Public list projection avoids loading private drafts and rendering article bodies. */
export type PublicSummaryRow = Pick<PostRow, 'id' | 'slug' | 'kind' | 'published_at' | 'published_updated_at'> & {
  title: string; summary: string; category: string; tags: string;
};
