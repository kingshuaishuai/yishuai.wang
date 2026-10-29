import { Extension } from '@quirekit/msfe-core';
import { Prec } from '@quirekit/cm-state';
import { EditorView, placeholder } from '@quirekit/cm-view';
import { themeVariableReferences as token } from '@quirekit/ui';

/** Public CodeMirror theme extension keeps MSFE's input and scroll ownership intact. */
export const commentAppearance = Extension.create({
  name: 'blog-comment-appearance',
  /** @returns Host typography and bounded native scrolling, using QuireKit tokens. */
  addCodeMirrorExtensions() {
    return Prec.high([
      EditorView.theme({
        '&': { color: 'var(--qk-color-text-primary)', backgroundColor: 'transparent', fontSize: '14px', minHeight: '112px' },
        '&.cm-focused': { outline: 'none' },
        '.cm-scroller': { fontFamily: 'var(--qk-type-body-font-family)', lineHeight: '1.9', maxHeight: '300px', overflow: 'auto' },
        '.cm-content': { minHeight: '112px', padding: '14px 16px', caretColor: 'var(--qk-color-text-accent)' },
        '.cm-line': { padding: '0' },
        '.cm-placeholder': { color: 'var(--qk-color-text-placeholder)' },
        '.cm-cursor': { borderLeftColor: 'var(--qk-color-text-accent)' },
        '.cm-activeLine': { backgroundColor: 'transparent' },
        '.msfe-link': { color: token.color.text.accent },
        '.msfe-code-line, .msfe-inline-code': { ...token.typography.code },
        '.msfe-inline-code': { padding: '1px 3px', backgroundColor: token.color.surface.subtle, borderRadius: token.radius.control },
        '.msfe-code-line': { paddingInline: '8px', backgroundColor: token.color.surface.subtle },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: token.color.selection.document },
      }),
      placeholder('写下你的想法，让讨论从这里开始…'),
    ]);
  },
});
