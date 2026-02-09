import React, { useEffect, useRef } from 'react';
import '../print-styles.css';
import { cleanupEmptyPagedPages } from './pagedCleanup';
import { renderMarkdownToHtml } from '../pipeline/commonMarkdownPipeline';

export interface PreviewControllerProps {
    markdown: string;
    isTwoColumn: boolean;
    customCss?: string;
}

export default function PreviewController({ markdown, isTwoColumn, customCss }: PreviewControllerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (import.meta.env.SSR) return;

        let isMounted = true;

        const processAndRender = async () => {
            const pagedjs = await import('pagedjs');
            const Previewer = (pagedjs as any).Previewer ?? (pagedjs as any).default?.Previewer;

            const model = await renderMarkdownToHtml(markdown, {
                idPrefix: `print-${Date.now()}`,
                arrowgrams: { mode: "static-only" },
            });

            const escapeHtml = (input: unknown) =>
              String(input ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");

            const titleBlockHtml = `<div class="title-block">${model.metadata.title ? `<div class="title">${escapeHtml(model.metadata.title)}</div>` : ''}${model.metadata.authors ? `<div class="authors">${escapeHtml(model.metadata.authors)}</div>` : ''}</div>`;
            const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
            // `model.html` is already sanitized by the pipeline; don't re-sanitize here or we risk
            // stripping Arrowgram's KaTeX label HTML inside SVG <foreignObject>.
            const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${model.html}</div></div>`;

            if (isMounted && containerRef.current) {
                containerRef.current.innerHTML = '';
                const paged = new (Previewer as any)();
                // @ts-ignore
                await (paged as any).preview(
                    finalHtml,
                    [
                      "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
                      ...(customCss && customCss.trim()
                        ? [`data:text/css;base64,${btoa(unescape(encodeURIComponent(customCss)))}`]
                        : []),
                    ],
                    containerRef.current
                );
                cleanupEmptyPagedPages(containerRef.current);
            }
        };

        processAndRender();
        return () => { isMounted = false; };
    }, [markdown, isTwoColumn]);

    return (
        <div ref={containerRef} className="preview-content-area">
            <p className="loading-indicator">Processing Document...</p>
        </div>
    );
}
