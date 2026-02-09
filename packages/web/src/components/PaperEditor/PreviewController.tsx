import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowGramStatic } from '../ArrowGramStatic';
import './styles.css';
import { cleanupEmptyPagedPages } from '../../preview/pagedCleanup';
import { cssToDataUri, renderMarkdownToHtml } from '../../pipeline/commonMarkdownPipeline';

// --- CONFIGURATION ---
const generatePageStyles = (metadata: any) => {
    const pageMargins: { [key: string]: string } = {
        'header-left': '@top-left', 'header-center': '@top-center', 'header-right': '@top-right',
        'footer-left': '@bottom-left', 'footer-center': '@bottom-center', 'footer-right': '@bottom-right',
    };

    const generateContentValue = (text: string) => {
        const replacements: { [key: string]: string } = {
            '[pageNumber]': 'counter(page)',
            '[totalPages]': 'counter(pages)',
            '[title]': `"${metadata.title || ''}"`,
            '[authors]': `"${metadata.authors || ''}"`,
        };
        // @ts-ignore
        const parts = text.split(/(\[pageNumber\]|\[totalPages\]|\[title\]|\[authors\])/g).filter(p => p);
        if (parts.length === 0) return '""';
        // @ts-ignore
        return parts.map(part => replacements[part] || `"${part.replace(/"/g, '\\"')}"`).join(' ');
    };

    let pageContentCss = '';
    for (const [key, selector] of Object.entries(pageMargins)) {
        if (metadata[key]) {
            const content = generateContentValue(metadata[key]);
            pageContentCss += `${selector} { content: ${content}; } `;
        }
    }

    return pageContentCss ? `@page { ${pageContentCss} }` : '';
};

interface PreviewControllerProps {
    markdown: string;
    isTwoColumn: boolean;
    onEditDiagram: (id: string, spec: string) => void;
    customCss?: string;
}

export const PreviewController = ({ markdown, isTwoColumn, onEditDiagram, customCss }: PreviewControllerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pagedInstance = useRef<any>(null);

    useEffect(() => {
        if (import.meta.env.SSR) return;

        let isMounted = true;
        // Use a simple ID to track the latest render request
        const renderId = Date.now();
        // @ts-ignore
        containerRef.current._latestRenderId = renderId;

        const roots: any[] = [];

        const processAndRender = async () => {
            if (!containerRef.current) return;

            const pagedjs = await import('pagedjs');
            const Previewer = (pagedjs as any).Previewer ?? (pagedjs as any).default?.Previewer;

            const model = await renderMarkdownToHtml(markdown, {
                idPrefix: `paper-editor-${renderId}`,
                arrowgrams: { mode: "static+hydrate" },
            });

            // Check staleness after async work
            // @ts-ignore
            if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

            const pageStylesCss = generatePageStyles(model.metadata);

            const escapeHtml = (input: unknown) =>
                String(input ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');

            const titleBlockHtml = `<div class="title-block">${model.metadata.title ? `<div class="title">${escapeHtml(model.metadata.title)}</div>` : ''}${model.metadata.authors ? `<div class="authors">${escapeHtml(model.metadata.authors)}</div>` : ''}</div>`;
            const layoutClass = isTwoColumn ? 'layout-two-column' : 'layout-single-column';
            // `model.html` is already sanitized by the pipeline; don't re-sanitize here or we risk
            // stripping Arrowgram's KaTeX label HTML inside SVG <foreignObject>.
            const finalHtml = `<div class="${layoutClass}">${titleBlockHtml}<div class="paper-body">${model.html}</div></div>`;

            // 7. Render with Paged.js
            if (containerRef.current) {
                // Check staleness before starting Paged.js
                // @ts-ignore
                if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

                containerRef.current.innerHTML = '';

                const stylesheets = [];
                if (pageStylesCss) {
                    stylesheets.push(cssToDataUri(pageStylesCss));
                }
                const katexCss = document.querySelector('link[href*="katex"]')?.getAttribute('href') || "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
                stylesheets.push(katexCss);
                if (customCss && customCss.trim()) {
                    stylesheets.push(cssToDataUri(customCss));
                }

                const paged = new (Previewer as any)();
                pagedInstance.current = paged;

                paged.preview(finalHtml, stylesheets, containerRef.current).then(() => {
                    // Final check before hydration
                    // @ts-ignore
                    if (!isMounted || containerRef.current._latestRenderId !== renderId) return;

                    if (containerRef.current) {
                        cleanupEmptyPagedPages(containerRef.current);
                    }

                    // 8. Hydrate ArrowGram Components
                    model.arrowgrams.forEach(({ id, spec }) => {
                        const el = containerRef.current?.querySelector(`#${id}`);
                        if (el) {
                            const root = createRoot(el);
                            roots.push(root);
                            root.render(
                                <ArrowGramStatic
                                    spec={spec}
                                    onEdit={() => onEditDiagram(id, spec)}
                                />
                            );
                        }
                    });
                });
            }
        };

        processAndRender();

        return () => {
            isMounted = false;
            roots.forEach(r => r.unmount());
        };
    }, [markdown, isTwoColumn, onEditDiagram]);

    return (
        <div ref={containerRef} className="preview-content-area" />
    );
};
