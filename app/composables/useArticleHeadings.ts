import type { QuireKitAnchorItem } from '@quirekit/ui/vue';
/** @returns The actual rendered article outline, excluding fenced code and comment headings. */
export function useArticleHeadings() {
  const content = useTemplateRef<HTMLElement>('articleContent');
  const headings = shallowRef<QuireKitAnchorItem[]>([]);
  let observer: MutationObserver | undefined;
  /** Assigns stable section targets after the Markdown renderer has mounted its semantic headings. */
  function collect(): void {
    if (!content.value) return;
    const items: QuireKitAnchorItem[] = [];
    content.value.querySelectorAll<HTMLElement>('h2, h3').forEach((element, index) => {
      if (!element.id) element.id = `section-${index + 1}`;
      const item = { id: element.id, label: element.textContent || '' };
      const parent = items.at(-1);
      if (element.tagName === 'H3' && parent) (parent.children as QuireKitAnchorItem[]).push(item);
      else items.push({ ...item, children: [] });
    });
    if (JSON.stringify(items) !== JSON.stringify(headings.value)) headings.value = items;
  }
  onMounted(() => {
    collect();
    observer = new MutationObserver(collect);
    if (content.value) observer.observe(content.value, { childList: true, characterData: true, subtree: true });
  });
  onBeforeUnmount(() => observer?.disconnect());
  return { headings };
}
