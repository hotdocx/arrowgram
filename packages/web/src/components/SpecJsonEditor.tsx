import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDiagramStore } from '../store/diagramStore';
import { Button } from './ui/Button';
import { X, Copy, Check, BookOpen } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { EXAMPLES } from '../utils/examples';

interface SpecJsonEditorProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SpecJsonEditor({ isOpen, onClose }: SpecJsonEditorProps) {
    const spec = useDiagramStore(state => state.spec);
    const setSpec = useDiagramStore(state => state.setSpec);
    const [localSpec, setLocalSpec] = useState(spec);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [showExamples, setShowExamples] = useState(false);

    useEffect(() => {
        setLocalSpec(spec);
        setError(null);
    }, [spec, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalSpec(e.target.value);
        setError(null);
    };

    const handleApply = () => {
        try {
            JSON.parse(localSpec); // Validate JSON
            setSpec(localSpec);
            addToast("Specification updated", "success");
            onClose();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(localSpec);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        addToast("Copied to clipboard", "info");
    };
    
    const handleLoadExample = (exampleKey: string) => {
        setLocalSpec(EXAMPLES[exampleKey]);
        setShowExamples(false);
        addToast(`Loaded example: ${exampleKey}`, "info");
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-[800px] h-[80vh] flex flex-col ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 relative">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        JSON Specification
                        {error && <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-1 rounded">Invalid JSON</span>}
                    </h3>
                    <div className="flex gap-2">
                         <div className="relative">
                            <button 
                                onClick={() => setShowExamples(!showExamples)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                                title="Load Example"
                            >
                                <BookOpen size={20}/>
                            </button>
                            {showExamples && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                                    <div className="p-2 text-xs font-semibold text-gray-400 bg-gray-50 border-b border-gray-100">Load Example</div>
                                    {Object.keys(EXAMPLES).map(key => (
                                        <button 
                                            key={key}
                                            onClick={() => handleLoadExample(key)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>
                            )}
                         </div>

                         <button 
                            onClick={handleCopy}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy to Clipboard"
                        >
                            {copied ? <Check size={20} className="text-green-500"/> : <Copy size={20}/>}
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={20}/></button>
                    </div>
                </div>
                
                <div className="flex-1 p-0 relative">
                    <textarea 
                        value={localSpec}
                        onChange={handleChange}
                        className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none text-gray-700 bg-gray-50"
                        spellCheck={false}
                    />
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                        Edit the raw JSON to modify the diagram directly.
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleApply} disabled={!!error}>Apply Changes</Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
