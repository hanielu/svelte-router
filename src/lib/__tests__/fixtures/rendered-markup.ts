/** Preserve DOM structure/attributes/text, excluding Svelte's private anchor nodes. */
export function renderedMarkup(element: Element | null): string | null {
  if (!element) return null;
  const clone = element.cloneNode(true) as Element;
  function clean(parent: Node) {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === Node.COMMENT_NODE) {
        parent.removeChild(node);
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() ?? "";
        if (text) node.textContent = text;
        else parent.removeChild(node);
      } else {
        clean(node);
      }
    }
  }
  clean(clone);
  return clone.outerHTML;
}
