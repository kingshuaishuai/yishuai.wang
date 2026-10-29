import { classHighlighter } from '@lezer/highlight';
import { syntaxHighlighting } from '@quirekit/cm-language';
import { Extension } from '@quirekit/msfe-core';

/** Shared semantic token classes keep code legible within the monochrome site theme. */
export const codeAppearance = Extension.create({
  name: 'blog-code-highlighting',
  /** @returns Public language highlighting without changing source, history or selection. */
  addCodeMirrorExtensions() { return syntaxHighlighting(classHighlighter); },
});
