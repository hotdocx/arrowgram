export function cleanupEmptyPagedPages(containerEl: HTMLElement) {
  const pages = Array.from(containerEl.querySelectorAll<HTMLElement>(".pagedjs_page"));
  for (const page of pages) {
    const content = page.querySelector<HTMLElement>(".pagedjs_page_content");
    if (!content) continue;

    const hasMedia = Boolean(
      content.querySelector(
        "img,svg,canvas,video,iframe,object,embed,.katex,.katex-display,.mermaid-container,.vega-container,.arrowgram-container"
      )
    );

    const text = (content.textContent ?? "").replace(/\s+/g, "");
    const hasText = text.length > 0;

    if (!hasMedia && !hasText) {
      page.remove();
    }
  }
}

