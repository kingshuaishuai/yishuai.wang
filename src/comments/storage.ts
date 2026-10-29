import type { CommentDraft, PendingComment } from './types';

/** Reads untrusted local JSON without making storage a requirement.
 * @param key - Local preview key.
 * @returns Parsed value or undefined.
 */
function read(key: string): unknown {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null'); } catch { return undefined; }
}

/** Validates the recoverable portion of one comment draft.
 * @param slug - Article identity.
 * @returns Draft source and public labels.
 */
export function readCommentDraft(slug: string): CommentDraft {
  const value = read(`comment-draft:${slug}`) as Partial<CommentDraft> | null;
  return { nickname: typeof value?.nickname === 'string' ? value.nickname : '',
    markdown: typeof value?.markdown === 'string' ? value.markdown : '',
    replyTo: typeof value?.replyTo === 'string' ? value.replyTo : '' };
}

/** Reads only valid local pending previews.
 * @param slug - Article identity.
 * @returns Local comments, excluding contact information.
 */
export function readPendingComments(slug: string): PendingComment[] {
  const value = read(`comment-pending:${slug}`);
  return Array.isArray(value) ? value.filter((item): item is PendingComment => item &&
    ['id', 'author', 'markdown', 'replyTo', 'createdAt'].every(key => typeof item[key] === 'string')).slice(0, 30) : [];
}

/** Writes preview state and reports storage failure.
 * @param key - Draft or pending-preview key.
 * @param value - Non-sensitive data to retain in this tab.
 * @returns Whether persistence succeeded.
 */
export function saveCommentState(key: string, value: CommentDraft | PendingComment[]): boolean {
  try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
