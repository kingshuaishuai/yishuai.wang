import { parseDocument, DomUtils } from 'htmlparser2';
import { isTag, isText, type ChildNode } from 'domhandler';
import { h, type Component, type VNodeChild } from 'vue';

/**
 * Composes sanitized publication HTML with the same code component as Markdown.
 * @param html - The server's safeHtml result, never raw third-party source.
 * @param codeComponent - Reading component owning highlighting, overflow and copying.
 * @returns Semantic Vue nodes for identical server and browser rendering.
 */
export function renderReadingHtml(html: string, codeComponent: Component): VNodeChild[] {
  /** @param node - A node from the sanitized tree. @returns Native content or an enhanced code block. */
  function renderNode(node: ChildNode): VNodeChild {
    if (isText(node)) return node.data;
    if (!isTag(node)) return null;
    if (node.name === 'pre') {
      const code = node.children.find(child => isTag(child) && child.name === 'code');
      const className = code && isTag(code) ? code.attribs.class || '' : '';
      const language = /(?:^|\s)(?:language|lang)-([^\s]+)/i.exec(className)?.[1] || '';
      return h(codeComponent, { code: DomUtils.getText(node), language });
    }
    return h(node.name, node.attribs, node.children.map(renderNode));
  }
  return parseDocument(html).children.map(renderNode);
}
