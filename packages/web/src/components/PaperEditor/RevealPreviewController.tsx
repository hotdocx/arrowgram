import React from "react";
import { createRoot, type Root } from "react-dom/client";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/black.css";
import { renderMarkdownToHtml } from "../../pipeline/commonMarkdownPipeline";
import { splitMarkdownIntoSlides } from "../../pipeline/splitSlides";
import { scopeCss } from "../../pipeline/scopeCss";
import { ArrowGramStatic } from "../ArrowGramStatic";

const REVEAL_BASE_CSS = `
/* Improve diagram readability on dark themes */
.arrowgram-container,
.mermaid-container,
.vega-container {
  background: white;
  padding: 16px;
  border-radius: 12px;
}
`;

type RevealPreviewControllerProps = {
  markdown: string;
  customCss?: string;
  editable?: boolean;
  onEditDiagram?: (id: string, spec: string) => void;
  mode?: "screen" | "print-pdf";
  onReady?: (deck: any) => void;
};

export function RevealPreviewController({
  markdown,
  customCss,
  editable = false,
  onEditDiagram,
  mode = "screen",
  onReady,
}: RevealPreviewControllerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const deckRef = React.useRef<any>(null);
  const rootsRef = React.useRef<Root[]>([]);
  const styleElRef = React.useRef<HTMLStyleElement | null>(null);
  const instanceIdRef = React.useRef<string>(`ag-reveal-${crypto.randomUUID()}`);

  React.useEffect(() => {
    if (import.meta.env.SSR) return;
    const scope = `.${instanceIdRef.current}`;

    if (!styleElRef.current) {
      const el = document.createElement("style");
      el.setAttribute("data-arrowgram-reveal-custom-css", instanceIdRef.current);
      document.head.appendChild(el);
      styleElRef.current = el;
    }

    const css = (customCss ?? "").trim();
    const baseCss = scopeCss(REVEAL_BASE_CSS, scope);
    const printFixCss = `html.reveal-print ${scope} section[hidden]{display:block !important;}\n`;
    styleElRef.current.textContent = `${baseCss}\n${printFixCss}\n${css ? scopeCss(css, scope) : ""}`;
  }, [customCss]);

  React.useEffect(() => {
    if (import.meta.env.SSR) return;
    let cancelled = false;
    const renderId = Date.now();
    let observer: MutationObserver | null = null;
    let pdfReadyHandler: (() => void) | null = null;
    let unhideTimeout: number | null = null;

    const cleanup = async () => {
      if (unhideTimeout != null) {
        clearTimeout(unhideTimeout);
        unhideTimeout = null;
      }
      try {
        observer?.disconnect();
      } catch {
        // ignore
      }
      observer = null;

      if (deckRef.current && pdfReadyHandler) {
        try {
          deckRef.current.off?.("pdf-ready", pdfReadyHandler);
        } catch {
          // ignore
        }
      }
      pdfReadyHandler = null;

      for (const root of rootsRef.current) root.unmount();
      rootsRef.current = [];

      if (deckRef.current && typeof deckRef.current.destroy === "function") {
        try {
          deckRef.current.destroy();
        } catch {
          // ignore
        }
      }
      deckRef.current = null;
    };

    const render = async () => {
      if (!containerRef.current) return;
      await cleanup();
      if (cancelled) return;

      const RevealMod: any = await import("reveal.js");
      const RevealCtor = RevealMod?.default ?? RevealMod;

      const { slides } = splitMarkdownIntoSlides(markdown);
      const models = await Promise.all(
        slides.map((slideMd, idx) =>
          renderMarkdownToHtml(slideMd, {
            idPrefix: `reveal-${renderId}-${idx}`,
            arrowgrams: { mode: editable ? "static+hydrate" : "static-only" },
          })
        )
      );
      if (cancelled) return;

      const deckHtml = models.map((m) => `<section>${m.html}</section>`).join("\n");

      const slidesEl = containerRef.current.querySelector(".slides");
      if (!slidesEl) return;
      slidesEl.innerHTML = deckHtml;

      const deck = new RevealCtor(containerRef.current, {
        embedded: mode === "screen",
        keyboard: { 32: null },
        hash: false,
        progress: mode === "screen",
        controls: mode === "screen",
      });
      deckRef.current = deck;
      await deck.initialize();
      deck.layout?.();
      if (cancelled) return;
      onReady?.(deck);

      if (mode === "print-pdf") {
        const slidesRoot = containerRef.current?.querySelector(".slides");
        const unhideAllSlides = () => {
          slidesRoot
            ?.querySelectorAll<HTMLElement>("section[hidden], section[aria-hidden]")
            .forEach((el) => {
              el.removeAttribute("hidden");
              el.removeAttribute("aria-hidden");
            });
        };

        // Our original "unhide once after init" fix can race with Reveal's async print layout.
        // Make it robust by unhiding after Reveal signals layout completion and by observing
        // for late-added `hidden` attributes.
        pdfReadyHandler = () => unhideAllSlides();
        deck.on?.("pdf-ready", pdfReadyHandler);

        if (slidesRoot) {
          observer = new MutationObserver(() => unhideAllSlides());
          observer.observe(slidesRoot, {
            subtree: true,
            attributes: true,
            attributeFilter: ["hidden", "aria-hidden"],
          });
        }

        // Kick once immediately and once after a short tick to catch any immediate re-hiding.
        unhideAllSlides();
        unhideTimeout = window.setTimeout(unhideAllSlides, 0);
      }

      const hydrate = () => {
        for (const root of rootsRef.current) root.unmount();
        rootsRef.current = [];

        for (const model of models) {
          for (const { id, spec } of model.arrowgrams) {
            const el = containerRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
            if (!el) continue;
            const root = createRoot(el);
            rootsRef.current.push(root);
            root.render(
              <ArrowGramStatic
                spec={spec}
                onEdit={
                  editable && onEditDiagram
                    ? () => {
                        onEditDiagram(id, spec);
                      }
                    : undefined
                }
              />
            );
          }
        }
      };

      if (editable) {
        hydrate();
        deck.on?.("slidechanged", hydrate);
      }
    };

    void render();

    return () => {
      cancelled = true;
      void cleanup();
    };
  }, [markdown, editable, onEditDiagram, mode, onReady]);

  React.useEffect(() => {
    return () => {
      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
    };
  }, []);

  return (
    <div className={instanceIdRef.current} style={{ width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        className="reveal overflow-hidden"
        style={{ width: "100%", height: "100%", minHeight: "600px" }}
      >
        <div className="slides" />
      </div>
    </div>
  );
}
