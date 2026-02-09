import React, { useEffect, useState } from 'react';
import PaperPreview from './preview/PaperPreview';
import type { PaperContent } from './utils/projectRepository';

export default function PrintPreview() {
    const [paper, setPaper] = useState<PaperContent | null>(null);
    const [isTwoColumn, setIsTwoColumn] = useState(false);
    const [autoPrint, setAutoPrint] = useState(false);
    const [revealMode, setRevealMode] = useState<"screen" | "print-pdf">("screen");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const wantsPrintPdf = params.get("print-pdf") === "1";
        const wantsAutoPrint = params.get("autoPrint") === "1";
        if (wantsPrintPdf) setRevealMode("print-pdf");
        if (wantsAutoPrint) setAutoPrint(true);

        const storedPaper = localStorage.getItem('print_paper');
        const storedMarkdown = localStorage.getItem('print_content');
        const storedLayout = localStorage.getItem('print_layout');

        if (storedPaper) {
            try {
                const parsed = JSON.parse(storedPaper) as PaperContent;
                if (parsed && typeof parsed === "object" && typeof (parsed as any).markdown === "string") {
                    setPaper({
                        markdown: parsed.markdown,
                        renderTemplate: (parsed as any).renderTemplate === "reveal" ? "reveal" : "paged",
                        themeId: (parsed as any).themeId,
                        customCss: typeof (parsed as any).customCss === "string" ? (parsed as any).customCss : "",
                    });
                } else {
                    setPaper({
                        markdown: "# Error: Invalid print payload\n\nPlease close this window and try printing again.\n",
                        renderTemplate: "paged",
                        customCss: "",
                    });
                }
            } catch {
                setPaper({
                    markdown: "# Error: Invalid print payload\n\nPlease close this window and try printing again.\n",
                    renderTemplate: "paged",
                    customCss: "",
                });
            }
        } else if (storedMarkdown) {
            // Back-compat with older key.
            setPaper({ markdown: storedMarkdown, renderTemplate: "paged", customCss: "" });
        } else {
            setPaper({ markdown: "# Error: No content found\n\nPlease close this window and try printing again.\n", renderTemplate: "paged", customCss: "" });
        }

        if (storedLayout) {
            setIsTwoColumn(storedLayout === 'true');
        }
    }, []);

    if (!paper) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <PaperPreview
            paper={paper}
            initialIsTwoColumn={isTwoColumn}
            showCloseButton={!autoPrint}
            showControls={paper.renderTemplate === "reveal" && revealMode === "print-pdf" ? false : true}
            revealMode={paper.renderTemplate === "reveal" ? revealMode : undefined}
            onRevealReady={
              autoPrint && paper.renderTemplate === "reveal" && revealMode === "print-pdf"
                ? (deck) => {
                    let printed = false;
                    const doPrint = () => {
                      if (printed) return;
                      printed = true;
                      setTimeout(() => window.print(), 50);
                    };

                    // Prefer printing once Reveal has finished building the PDF layout.
                    deck?.on?.("pdf-ready", doPrint);

                    // Safety fallback: print anyway after a short delay.
                    setTimeout(doPrint, 1500);
                  }
                : undefined
            }
        />
    );
}
