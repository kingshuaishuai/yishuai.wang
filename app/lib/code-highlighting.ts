import { classHighlighter, highlightTree } from '@lezer/highlight';
import { mdCodeLanguages } from '@quirekit/md-editor';
import type { MdCodeLanguage } from '@quirekit/md-editor';
import type { CodeToken } from './code-types';

const parsers = new Map<string, ReturnType<MdCodeLanguage['load']>>();

/**
 * Uses the same lazy language catalog as the writing editor, without an editor view.
 * @param code - Original source, preserved byte for byte for display and copying.
 * @param language - Fence language or an alias from QuireKit's public catalog.
 * @returns Plain text tokens with semantic CSS classes; never executable HTML.
 */
export async function highlightCode(code: string, language = ''): Promise<CodeToken[]> {
  const plain = [{ text: code, className: '' }];
  const name = language.trim().toLowerCase();
  const entry = mdCodeLanguages.find(item => item.name === name || item.aliases?.includes(name));
  // Large pasted logs remain readable without blocking the page on parsing.
  if (!entry || code.length > 50_000 || !code) return plain;
  try {
    let loading = parsers.get(entry.name);
    if (!loading) {
      loading = entry.load(new AbortController().signal);
      parsers.set(entry.name, loading);
    }
    const support = await loading;
    const tokens: CodeToken[] = [];
    let cursor = 0;
    highlightTree(support.language.parser.parse(code), classHighlighter, (from, to, className) => {
      if (from > cursor) tokens.push({ text: code.slice(cursor, from), className: '' });
      tokens.push({ text: code.slice(from, to), className });
      cursor = to;
    });
    if (cursor < code.length) tokens.push({ text: code.slice(cursor), className: '' });
    return tokens;
  } catch (error) {
    console.warn('Code highlighting unavailable:', entry.name, error);
    parsers.delete(entry.name);
    return plain;
  }
}
