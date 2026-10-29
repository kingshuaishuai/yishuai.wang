/** Recoverable local comment draft; contact details are deliberately excluded. */
export interface CommentDraft {
  /** Commenter's display name. */
  nickname: string;
  /** MSFE's canonical Markdown. */
  markdown: string;
  /** Optional visible comment being answered. */
  replyTo: string;
}

/** Local pending preview, never a publicly submitted comment. */
export interface PendingComment {
  /** Stable local identity. */
  id: string;
  /** Display name only; no contact details. */
  author: string;
  /** Source rendered with the same safe Markdown reader as articles. */
  markdown: string;
  /** Optional reply label. */
  replyTo: string;
  /** ISO submission-preview timestamp. */
  createdAt: string;
}
