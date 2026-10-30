import type { AiSummary } from './ai';
/** Supported content languages; missing historical values mean Chinese. */
export type ContentLanguage = 'zh' | 'en';
/** A public language version, emitted only after it has been published. */
export type Translation = { language: ContentLanguage; url: string };
/** Authoritative source retained for editing and Micropub round trips. */
export type Content = {
  kind: 'article' | 'note'; language: ContentLanguage; title: string; summary: string; coverUrl: string; markdown: string;
  category: string; tags: string[]; sourceFormat: 'markdown' | 'text' | 'html';
  source: string; properties: Record<string, unknown[]>;
};
/** Only the current published snapshot may enter public responses. */
export type PublicPost = Content & {
  id: string; slug: string; url: string; publishedAt: string; updatedAt: string;
  date: string; html: string; headings: { id: string; title: string }[]; translations: Translation[]; aiSummary?: AiSummary | null;
};
/** Lightweight index entry; lists never carry complete article bodies. */
export type PublicPostSummary = Pick<PublicPost, 'id' | 'slug' | 'kind' | 'language' | 'title' | 'summary' | 'coverUrl' | 'category' | 'tags' | 'url' | 'publishedAt' | 'updatedAt' | 'date'>;
/** Owner-only draft response with an optimistic concurrency version. */
export type DraftPost = Content & { id: string; slug: string; status: 'draft' | 'published' | 'deleted'; version: number; updatedAt: string; publishedAt: string | null };
/** Owner list fields omit complete drafts until an editor opens an entry. */
export type ManagedPost = Pick<DraftPost, 'id' | 'slug' | 'kind' | 'language' | 'title' | 'summary' | 'coverUrl' | 'status' | 'version' | 'updatedAt'>;
/** A bounded management list with access to older records. */
export type ManagementPage<T> = { items: T[]; page: number; pages: number; total: number };
/** Sanitized moderation projection, without private contact details. */
export type ManagedComment = { id: string; postId: string; author: string; html: string; status: 'pending' | 'approved' | 'hidden'; createdAt: string; postTitle: string };
/** A session exposes identity and a request-bound CSRF token, never provider tokens. */
export type Session = { user: { id: string; name: string; login: string; owner: boolean; avatarUrl: string | null }; csrf: string };
/** Public avatar reference, without private account information. */
export type Profile = { avatarUrl: string | null };
/** Owner-only vocabulary, with no article bodies or publication metadata. */
export type ContentOptions = { categories: string[]; tags: string[] };
/** Public discussion deliberately omits email, network identity and moderation notes. */
export type PublicComment = { id: string; parentId: string | null; author: string; owner: boolean; avatarUrl: string | null; html: string; createdAt: string };
/** Shared pagination result, rendered as ordinary HTML links. */
export type PostPage = { items: PublicPostSummary[]; page: number; pages: number; total: number };
