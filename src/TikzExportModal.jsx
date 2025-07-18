import React, { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    content: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '80%',
        maxWidth: '700px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pre: {
        backgroundColor: '#f5f5f5',
        padding: '10px',
        borderRadius: '4px',
        overflow: 'auto',
        flexGrow: 1,
    },
    textarea: {
        backgroundColor: '#f5f5f5',
        padding: '10px',
        borderRadius: '4px',
        overflow: 'auto',
        flexGrow: 1,
        width: '100%',
        height: '40vh',
        border: '1px solid #ccc',
        fontFamily: 'monospace'
    },
    buttons: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
    },
    button: {
        padding: '8px 16px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        cursor: 'pointer'
    },
    closeButton: {
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        fontSize: '1.5rem',
        lineHeight: '1rem'
    }
};

export function TikzExportModal({ tikzCode, onClose }) {
    const [copyButtonText, setCopyButtonText] = useState('Copy to Clipboard');

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(tikzCode).then(() => {
            setCopyButtonText('Copied!');
            setTimeout(() => setCopyButtonText('Copy to Clipboard'), 2000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy text.');
        });
    }, [tikzCode]);

    const handleDownload = () => {
        const blob = new Blob([tikzCode], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'diagram.tex');
    };

    if (!tikzCode) {
        return null;
    }

    return (
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.content} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.header}>
                    <h3>TikZ Export</h3>
                    <button style={modalStyles.closeButton} onClick={onClose}>&times;</button>
                </div>
                <textarea
                    style={modalStyles.textarea}
                    readOnly
                    value={tikzCode}
                />
                <div style={modalStyles.buttons}>
                    <button style={modalStyles.button} onClick={handleCopy}>
                        {copyButtonText}
                    </button>
                    <button style={modalStyles.button} onClick={handleDownload}>
                        Download .tex
                    </button>
                    <button style={modalStyles.button} onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
} 