import React, { useState } from 'react';
import type { PaperContent } from '../utils/projectRepository';
import DocumentPreview from './DocumentPreview';

export type PaperPreviewProps = {
    paper: PaperContent;
    initialIsTwoColumn?: boolean;
    showCloseButton?: boolean;
    showControls?: boolean;
    onClose?: () => void;
    revealMode?: "screen" | "print-pdf";
    onRevealReady?: (deck: any) => void;
};

export default function PaperPreview({
    paper,
    initialIsTwoColumn = false,
    showCloseButton = false,
    showControls = true,
    onClose,
    revealMode,
    onRevealReady,
}: PaperPreviewProps) {
    const [isTwoColumn, setIsTwoColumn] = useState(initialIsTwoColumn);

    return (
        <div className={`preview-container ${showControls ? 'has-controls' : 'no-controls'}`}>
            {showControls ? (
                <div className="preview-controls">
                    {showCloseButton && (
                        <button
                            className="control-button"
                            onClick={() => (onClose ? onClose() : window.close())}
                        >
                            Close
                        </button>
                    )}
                    {paper.renderTemplate === "paged" ? (
                        <button
                            className={`control-button ${isTwoColumn ? 'active' : ''}`}
                            onClick={() => setIsTwoColumn(!isTwoColumn)}
                        >
                            {isTwoColumn ? 'Single Column' : 'Two Column'}
                        </button>
                    ) : null}
                    <button className="control-button" onClick={() => window.print()}>
                        Print / Save PDF
                    </button>
                </div>
            ) : null}
            <DocumentPreview
              paper={paper}
              isTwoColumn={isTwoColumn}
              revealMode={revealMode}
              onRevealReady={onRevealReady}
            />
        </div>
    );
}
