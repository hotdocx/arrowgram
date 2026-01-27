import React, { useEffect, useState } from 'react';
import PaperPreview from './preview/PaperPreview';

export default function PrintPreview() {
    const [markdown, setMarkdown] = useState<string | null>(null);
    const [isTwoColumn, setIsTwoColumn] = useState(false);

    useEffect(() => {
        const storedMarkdown = localStorage.getItem('print_content');
        const storedLayout = localStorage.getItem('print_layout');

        if (storedMarkdown) {
            setMarkdown(storedMarkdown);
        } else {
            setMarkdown("# Error: No content found\n\nPlease close this window and try printing again.");
        }

        if (storedLayout) {
            setIsTwoColumn(storedLayout === 'true');
        }
    }, []);

    if (!markdown) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    return (
        <PaperPreview
            markdown={markdown}
            initialIsTwoColumn={isTwoColumn}
            showCloseButton
        />
    );
}

