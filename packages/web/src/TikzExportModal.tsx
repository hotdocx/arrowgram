import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './components/ui/Button';
import { useToast } from './context/ToastContext';
import { Copy, X } from 'lucide-react';

interface TikzExportModalProps {
    tikzCode: string;
    onClose: () => void;
    isOpen: boolean;
}

export function TikzExportModal({ tikzCode, onClose, isOpen }: TikzExportModalProps) {
    const { addToast } = useToast();

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(tikzCode);
        addToast("TikZ code copied to clipboard", "success");
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-3/4 max-w-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Export to TikZ-CD</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="relative mb-6">
                    <textarea
                        readOnly
                        value={tikzCode || ''}
                        className="w-full h-64 p-4 font-mono text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                    />
                    <div className="absolute top-2 right-2">
                         <Button size="sm" variant="secondary" onClick={handleCopy} title="Copy">
                            <Copy size={14} className="mr-1.5"/> Copy
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button onClick={handleCopy}>Copy to Clipboard</Button>
                </div>
            </div>
        </div>,
        document.body
    );
}