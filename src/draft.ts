import type { Draft } from './types';

const storageKey = 'yishuai-blog-design-draft';

/** Restores only the browser-local design draft.
 * @returns Validated previous source, or a readable first-use example.
 */
export function readDraft(): Draft {
  const fallback: Draft = { kind: 'article', title: '给自己留一小块互联网', markdown: '有些想法适合发在时间线上，有些则值得有一个长久的地址。\n\n## 从一段文字开始\n\n想写点什么，就从这里开始。', tags: '随笔, 个人网站', savedAt: '' };
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<Draft> | null;
    if (parsed && ['kind', 'title', 'markdown', 'tags', 'savedAt'].every(key => typeof parsed[key as keyof Draft] === 'string')) return parsed as Draft;
  } catch { /* Unavailable browser storage leaves the editable source in memory. */ }
  return fallback;
}

/** Writes a local draft without making any publication request.
 * @param draft - Exact source snapshot to keep.
 * @returns Whether browser storage accepted the snapshot.
 */
export function storeDraft(draft: Draft): boolean {
  try { localStorage.setItem(storageKey, JSON.stringify(draft)); return true; }
  catch { return false; }
}
