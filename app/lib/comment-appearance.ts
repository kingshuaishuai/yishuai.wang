import { Extension } from '@quirekit/msfe-core';
import { Prec } from '@quirekit/cm-state';
import { EditorView, placeholder } from '@quirekit/cm-view';

/** Public CodeMirror theme extension keeps MSFE's input and scroll ownership intact. */
export const commentAppearance = Extension.create<{ placeholder: string }>({
  name: 'blog-comment-appearance',
  /** @returns Default copy, overridden by the host interface language. */
  addOptions() { return { placeholder: '写下你的想法，让讨论从这里开始…' }; },
  /** @returns Host typography and bounded native scrolling, using QuireKit tokens. */
  addCodeMirrorExtensions() {
    return Prec.highest([
      EditorView.theme({
        '&': { color: 'var(--qk-color-text-primary)', backgroundColor: 'transparent', fontSize: '14px', height: 'var(--comment-editor-height)' },
        '&.cm-focused': { outline: 'none' },
        '.cm-scroller': { fontFamily: 'var(--qk-type-body-font-family)', lineHeight: '1.9', overflow: 'auto', marginLeft: '0', overscrollBehavior: 'contain' },
        '.cm-content': { minHeight: '100%', padding: '14px 16px', caretColor: 'var(--qk-color-text-accent)' },
        '.cm-line': { padding: '0' },
        '.cm-placeholder': { color: 'var(--qk-color-text-placeholder)' },
        '.cm-cursor': { borderLeftColor: 'var(--qk-color-text-accent)' },
        '.cm-activeLine': { backgroundColor: 'transparent' },
      }),
      placeholder(this.options.placeholder),
    ]);
  },
});
