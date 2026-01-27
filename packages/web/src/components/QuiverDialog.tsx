import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDiagramStore } from '../store/diagramStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, Link, Copy, Check, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { decodeQuiverUrl, encodeArrowgram } from '../utils/quiver';
import { DiagramSpec } from '@hotdocx/arrowgram';
import { formatSpec } from '../utils/specFormatter';

interface QuiverDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuiverDialog({ isOpen, onClose }: QuiverDialogProps) {
    const { spec, setSpec } = useDiagramStore();
    const [quiverUrl, setQuiverUrl] = useState('');
    const [generatedUrl, setGeneratedUrl] = useState('');
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleDecode = () => {
        try {
            const specObject = decodeQuiverUrl(quiverUrl);
            setSpec(formatSpec(specObject));
            addToast("Quiver diagram imported successfully!", "success");
            onClose();
        } catch (e: any) {
            addToast(e.message || "Failed to decode Quiver URL", "error");
        }
    };

    const handleEncode = () => {
        try {
            const specObject: DiagramSpec = JSON.parse(spec);
            const dataString = encodeArrowgram(specObject);
            const url = `https://q.uiver.app/#q=${dataString}`;
            setGeneratedUrl(url);
        } catch (e: any) {
            addToast("Failed to encode diagram", "error");
        }
    };

    const handleCopyGenerated = () => {
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        addToast("Quiver URL copied!", "success");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-[500px] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Link size={18} /> Quiver Integration
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Import Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Import from Quiver</h4>
                        <div className="flex gap-2">
                            <Input
                                value={quiverUrl}
                                onChange={(e: any) => setQuiverUrl(e.target.value)}
                                placeholder="Paste https://q.uiver.app/... URL here"
                                className="flex-1"
                            />
                            <Button onClick={handleDecode} disabled={!quiverUrl}>Import</Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Paste a URL from q.uiver.app to load the diagram here.
                        </p>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Export Section */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Export to Quiver</h4>
                        <div className="flex gap-2 items-start">
                            <Button onClick={handleEncode} variant="outline" className="w-full justify-center">
                                Generate Quiver URL <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>

                        {generatedUrl && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-2 mt-2">
                                <div className="flex-1 text-xs text-gray-600 font-mono break-all line-clamp-2">
                                    {generatedUrl}
                                </div>
                                <button
                                    onClick={handleCopyGenerated}
                                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                    title="Copy"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-gray-500">
                            Generate a URL to open this diagram in q.uiver.app.
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
