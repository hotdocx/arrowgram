import React, { useState } from 'react';
import { PreviewController } from './PreviewController';
import { PanelLeft, PanelRight, Printer, Save, Image as ImageIcon, X } from 'lucide-react';
import { ArrowGramEditor } from '../../ArrowGramEditor';
import { useToast } from '../../context/ToastContext';
import { saveProject } from '../../utils/storage';

interface PaperEditorProps {
    initialMarkdown: string;
    filename: string;
    onSave?: (content: string) => void;
}

export function PaperEditor({ initialMarkdown, filename, onSave }: PaperEditorProps) {
    const [markdown, setMarkdown] = useState(initialMarkdown);
    const [isTwoColumn, setIsTwoColumn] = useState(false);
    const [filesView, setFilesView] = useState('split'); // 'split', 'code', 'preview'
    const [editingDiagram, setEditingDiagram] = useState<{ id: string, spec: string } | null>(null);
    const { addToast } = useToast();

    // Sync state with prop if updated (e.g. by AI)
    React.useEffect(() => {
        setMarkdown(initialMarkdown);
    }, [initialMarkdown]);

    // -- File Operations --
    const handleSave = async () => {
        try {
            await saveProject(filename, markdown, 'paper');
            addToast("Paper saved successfully!", "success");
            onSave?.(markdown);
        } catch (e) {
            console.error(e);
            addToast("Failed to save paper.", "error");
        }
    };

    const handlePrint = () => {
        localStorage.setItem('print_content', markdown);
        localStorage.setItem('print_layout', String(isTwoColumn));
        window.open('/print-preview', '_blank');
    };

    // -- Diagram Editing --
    const handleDiagramEdit = (id: string, spec: string) => {
        setEditingDiagram({ id, spec });
    };

    const handleDiagramSave = (newSpec: string) => {
        if (!editingDiagram) return;

        const oldBlock = editingDiagram.spec;
        if (markdown.includes(oldBlock)) {
            const newMarkdown = markdown.replace(oldBlock, newSpec);
            setMarkdown(newMarkdown);
            addToast("Diagram updated in document", "success");
        } else {
            addToast("Could not find the original diagram code to replace.", "error");
        }

        setEditingDiagram(null);
    };

    return (
        <div className="paper-editor-root flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* -- Toolbar -- */}
            <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-20 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                        <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">P</div>
                        {filename}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg mr-4">
                        <button
                            onClick={() => setFilesView('code')}
                            className={`p-1.5 rounded ${filesView === 'code' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Editor Only"
                        >
                            <PanelLeft size={16} />
                        </button>
                        <button
                            onClick={() => setFilesView('split')}
                            className={`p-1.5 rounded ${filesView === 'split' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Split View"
                        >
                            <div className="flex"><PanelLeft size={16} className="-mr-1" /><PanelRight size={16} className="-ml-1" /></div>
                        </button>
                        <button
                            onClick={() => setFilesView('preview')}
                            className={`p-1.5 rounded ${filesView === 'preview' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Preview Only"
                        >
                            <PanelRight size={16} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsTwoColumn(!isTwoColumn)}
                        className={`text-sm px-3 py-1.5 rounded border transition-colors ${isTwoColumn ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {isTwoColumn ? 'Two Column' : 'Single Column'}
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                    >
                        <Printer size={16} />
                        Print PDF
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                    >
                        <Save size={16} />
                        Save
                    </button>
                </div>
            </div>

            {/* -- Main Content -- */}
            <div className="flex-1 flex overflow-hidden paper-editor-main">
                {/* Editor Pane */}
                <div className={`${filesView === 'preview' ? 'hidden' : filesView === 'code' ? 'w-full' : 'w-1/2'} flex flex-col border-r border-gray-200 transition-all duration-300 print:hidden`}>
                    <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        Markdown Source
                    </div>
                    <textarea
                        className="flex-1 w-full h-full p-6 resize-none outline-none font-mono text-sm bg-white text-gray-800 leading-relaxed"
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        placeholder="# Start writing your paper..."
                        spellCheck={false}
                    />
                </div>

                {/* Preview Pane */}
                <div className={`${filesView === 'code' ? 'hidden' : filesView === 'preview' ? 'w-full' : 'w-1/2'} bg-gray-100 flex flex-col relative overflow-hidden transition-all duration-300 paper-preview-pane`}>
                    <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 flex justify-between print:hidden">
                        <span>Live Preview</span>
                        <span className="text-[10px] text-gray-400">Paged.js Rendering</span>
                    </div>
                    <div className="flex-1 overflow-auto p-8 relative paper-scroll-container">
                        {/* Paged.js manages its own paper look and shadows */}
                        <div className="mx-auto w-fit paper-content-wrapper">
                            <PreviewController
                                markdown={markdown}
                                isTwoColumn={isTwoColumn}
                                onEditDiagram={handleDiagramEdit}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* -- Modal for Diagram Editing -- */}
            {editingDiagram && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-gray-50">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <ImageIcon size={20} className="text-indigo-600" />
                                Edit Diagram
                            </h3>
                            <button
                                onClick={() => setEditingDiagram(null)}
                                className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <ArrowGramModalWrapper
                                initialSpec={editingDiagram.spec}
                                onSave={(spec) => handleDiagramSave(spec)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Wrapper to handle Store interactions or Props to ArrowGramEditor
// Ideally we should refactor ArrowGramEditor to be purely presentational or support override
import { useDiagramStore } from '../../store/diagramStore';
import { PropertyEditor } from '../../PropertyEditor';

function ArrowGramModalWrapper({ initialSpec, onSave }: { initialSpec: string, onSave: (s: string) => void }) {
    const setSpec = useDiagramStore(state => state.setSpec);
    const spec = useDiagramStore(state => state.spec);
    const selection = useDiagramStore(state => state.selection);

    // On mount, load the spec into the store
    React.useEffect(() => {
        setSpec(initialSpec);
    }, []); // eslint-disable-line

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 relative">
                    <ArrowGramEditor />
                </div>
                <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
                    <div className="p-4 border-b border-gray-100 font-semibold text-gray-700 bg-gray-50/50">
                        Properties
                    </div>
                    <div className="p-4">
                        <PropertyEditor
                            selection={selection}
                            spec={spec}
                            onSpecChange={setSpec}
                        />
                    </div>
                </div>
            </div>

            <div className="h-16 border-t border-gray-200 flex items-center justify-end px-6 gap-3 bg-white z-10">
                <button
                    onClick={() => onSave(spec)} // Save the CURRENT store state
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
}
