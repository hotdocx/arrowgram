import React, { useState } from 'react';
import PreviewController from './PreviewController';

export type PaperPreviewProps = {
    markdown: string;
    initialIsTwoColumn?: boolean;
    showCloseButton?: boolean;
    onClose?: () => void;
};

export default function PaperPreview({
    markdown,
    initialIsTwoColumn = false,
    showCloseButton = false,
    onClose,
}: PaperPreviewProps) {
    const [isTwoColumn, setIsTwoColumn] = useState(initialIsTwoColumn);

    return (
        <div className="preview-container">
            <div className="preview-controls">
                {showCloseButton && (
                    <button
                        className="control-button"
                        onClick={() => (onClose ? onClose() : window.close())}
                    >
                        Close
                    </button>
                )}
                <button
                    className={`control-button ${isTwoColumn ? 'active' : ''}`}
                    onClick={() => setIsTwoColumn(!isTwoColumn)}
                >
                    {isTwoColumn ? 'Single Column' : 'Two Column'}
                </button>
                <button className="control-button" onClick={() => window.print()}>
                    Print / Save PDF
                </button>
            </div>
            <PreviewController markdown={markdown} isTwoColumn={isTwoColumn} />
        </div>
    );
}

