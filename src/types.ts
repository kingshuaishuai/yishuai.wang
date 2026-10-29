/** A self-contained article used to evaluate the reading design. */
export interface Article {
  /** Stable preview route. */
  slug: string;
  /** Display title. */
  title: string;
  /** Short editorial introduction. */
  summary: string;
  /** Visible topic. */
  category: string;
  /** Example publication date. */
  date: string;
  /** Markdown source shared with the reader. */
  content: string;
}

/** Browser-local writing state; it never represents a published entry. */
export interface Draft {
  /** Article, short note, or photo entry. */
  kind: string;
  /** Optional title for an article. */
  title: string;
  /** Authoritative Markdown. */
  markdown: string;
  /** Comma-separated topics. */
  tags: string;
  /** Browser timestamp of the last local save. */
  savedAt: string;
}
