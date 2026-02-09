import React, { useState } from 'react';
import { DocumentPreview } from './DocumentPreview';
import {
    PanelLeft,
    PanelRight,
    Printer,
    Save,
    Image as ImageIcon,
    Settings,
    CircleHelp,
    X,
    Upload,
    Paperclip,
    Sparkles,
    Brush,
} from 'lucide-react';
import { ArrowGramEditor } from '../../ArrowGramEditor';
import { useToast } from '../../context/ToastContext';
import { SettingsDialog } from '../SettingsDialog';
import { HelpDialog } from '../HelpDialog';
import { useEditorHostConfig } from '../../context/EditorHostContext';
import type { PaperContent, PaperRenderTemplate } from '../../utils/projectRepository';

const CSS_PLACEHOLDER_PAGED = `/* Custom CSS (Paged.js papers)

This CSS is applied to your paper preview + print output.

Common tweaks:

1) Base typography
   .paper-body {
     font-size: 12pt;
     line-height: 1.5;
   }

2) Headings
   .paper-body h1 { font-size: 20pt; }
   .paper-body h2 { font-size: 16pt; }

3) Two-column layout (when enabled)
   .layout-two-column .paper-body {
     column-gap: 0.30in;
   }

4) Make diagrams pop
   .arrowgram-container {
     background: white;
     padding: 12px;
     border-radius: 12px;
   }

Tip: frontmatter can also control page headers/footers (see Paged.js preview settings).
*/\n`;

const CSS_PLACEHOLDER_REVEAL = `/* Custom CSS (Reveal.js slides)

This CSS is scoped to your slide deck preview.

Common tweaks:

1) Base font size (scales slide text)
   .reveal {
     font-size: 36px;
   }

2) Headings
   h1 { font-size: 2.0em; }
   h2 { font-size: 1.5em; }

3) Colors / background
   .reveal {
     color: white;
   }

4) Arrowgram readability on dark themes
   .arrowgram-container {
     background: white;
     padding: 16px;
     border-radius: 12px;
   }

Slides are separated by a line containing only:
---
*/\n`;

interface PaperEditorProps {
    initialPaper: PaperContent;
    filename: string;
    onRename?: (nextTitle: string) => Promise<void> | void;
    onPersist?: (paper: PaperContent) => Promise<void> | void;
    onChange?: (paper: PaperContent) => void;
    onPrint?: (paper: PaperContent, opts: { isTwoColumn: boolean }) => void;
    showSaveButton?: boolean;
    showPrintButton?: boolean;
    panelControls?: {
        files?: { isOpen: boolean; onToggle: () => void; label?: string };
        chat?: { isOpen: boolean; isBusy?: boolean; onToggle: () => void; label?: string };
    };
    initialFilesView?: 'split' | 'code' | 'preview' | 'styles';
    sharing?: {
        isPublic: boolean;
        publicUrl?: string;
        onTogglePublic: (next: boolean) => Promise<void> | void;
        onCopyShareLink: () => Promise<void> | void;
        onPublishToGallery?: () => Promise<void> | void;
    };
}

export function PaperEditor({
    initialPaper,
    filename,
    onRename,
    onPersist,
    onChange,
    onPrint,
    showSaveButton = true,
    showPrintButton = true,
    panelControls,
    initialFilesView = 'split',
    sharing,
}: PaperEditorProps) {
    const [paper, setPaper] = useState<PaperContent>(initialPaper);
    const [isTwoColumn, setIsTwoColumn] = useState(false);
    const [filesView, setFilesView] = useState(initialFilesView); // 'split', 'code', 'preview'
    const [previewReloadNonce, setPreviewReloadNonce] = useState(0);
    const [editingDiagram, setEditingDiagram] = useState<{ id: string, spec: string } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(filename);
    const { addToast } = useToast();
    const hostConfig = useEditorHostConfig();
    const isReveal = paper.renderTemplate === "reveal";

    // Sync state with prop if updated (e.g. by AI)
    React.useEffect(() => {
        setPaper(initialPaper);
    }, [initialPaper]);
    React.useEffect(() => {
        setTitleDraft(filename);
    }, [filename]);

    const commitTitle = async () => {
        if (!onRename) {
            setIsEditingTitle(false);
            setTitleDraft(filename);
            return;
        }
        const next = titleDraft.trim();
        if (!next || next === filename) {
            setIsEditingTitle(false);
            setTitleDraft(filename);
            return;
        }
        try {
            await onRename(next);
            addToast("Renamed.", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to rename.", "error");
            setTitleDraft(filename);
        } finally {
            setIsEditingTitle(false);
        }
    };

    // -- File Operations --
    const handleSave = async () => {
        if (!onPersist) {
            addToast("Save is not configured in this host app.", "error");
            return;
        }

        try {
            await onPersist(paper);
            addToast("Paper saved successfully!", "success");
        } catch (e) {
            console.error(e);
            addToast("Failed to save paper.", "error");
        }
    };

	    const handlePrint = () => {
	        if (onPrint) {
	            onPrint(paper, { isTwoColumn });
	            return;
	        }

	        localStorage.setItem('print_paper', JSON.stringify(paper));
	        localStorage.setItem('print_layout', String(isTwoColumn));
	        const href = hostConfig.printPreviewPath
	            ? new URL(hostConfig.printPreviewPath, window.location.origin).toString()
	            : (() => {
	                const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
	                return new URL('print-preview', baseUrl).toString();
	            })();
	        const url = new URL(href);
	        if (paper.renderTemplate === "reveal") {
	            url.searchParams.set("print-pdf", "1");
	            url.searchParams.set("autoPrint", "1");
	        }
	        window.open(url.toString(), '_blank');
	    };

    // -- Diagram Editing --
    const handleDiagramEdit = (id: string, spec: string) => {
        setEditingDiagram({ id, spec });
    };

    const handleDiagramSave = (newSpec: string) => {
        if (!editingDiagram) return;

        const oldBlock = editingDiagram.spec;
        if (paper.markdown.includes(oldBlock)) {
            const newMarkdown = paper.markdown.replace(oldBlock, newSpec);
            const next = { ...paper, markdown: newMarkdown };
            setPaper(next);
            onChange?.(next);
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
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="flex items-center gap-2 text-gray-700 font-medium min-w-0">
                            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold shrink-0">P</div>
                            {isEditingTitle ? (
                                <input
                                    className="min-w-0 max-w-[380px] w-[28ch] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                    value={titleDraft}
                                    onChange={(e) => setTitleDraft(e.target.value)}
                                    onBlur={() => void commitTitle()}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void commitTitle();
                                        if (e.key === "Escape") {
                                            setIsEditingTitle(false);
                                            setTitleDraft(filename);
                                        }
                                    }}
                                    autoFocus
                                />
                            ) : (
                                <button
                                    type="button"
                                    className={`min-w-0 truncate text-left ${onRename ? "hover:underline" : ""}`}
                                    title={onRename ? "Click to rename" : filename}
                                    onClick={() => {
                                        if (!onRename) return;
                                        setIsEditingTitle(true);
                                    }}
                                >
                                    {filename}
                                </button>
                            )}
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
                            onClick={() => setFilesView('styles')}
                            className={`p-1.5 rounded ${filesView === 'styles' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Styles (CSS)"
                        >
                            <Brush size={16} />
                        </button>
                        <button
                            onClick={() => setFilesView('preview')}
                            className={`p-1.5 rounded ${filesView === 'preview' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Preview Only"
                        >
                            <PanelRight size={16} />
                        </button>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
                        <button
                            type="button"
                            onClick={() => {
                                const next: PaperRenderTemplate = "paged";
                                const updated = { ...paper, renderTemplate: next };
                                setPaper(updated);
                                onChange?.(updated);
                            }}
                            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                                paper.renderTemplate === "paged"
                                    ? "bg-white shadow text-gray-800 border-gray-200"
                                    : "bg-gray-100 text-gray-500 border-transparent hover:text-gray-700"
                            }`}
                            title="Paged.js (article/book)"
                        >
                            Paged
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const next: PaperRenderTemplate = "reveal";
                                const updated = { ...paper, renderTemplate: next };
                                setPaper(updated);
                                onChange?.(updated);
                            }}
                            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                                paper.renderTemplate === "reveal"
                                    ? "bg-white shadow text-gray-800 border-gray-200"
                                    : "bg-gray-100 text-gray-500 border-transparent hover:text-gray-700"
                            }`}
                            title="Reveal.js (slides)"
                        >
                            Slides
                        </button>
                    </div>

                    <button
                        onClick={() => setIsTwoColumn(!isTwoColumn)}
                        className={`text-sm px-3 py-1.5 rounded border transition-colors ${isTwoColumn ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        style={{ display: paper.renderTemplate === "paged" ? undefined : "none" }}
                    >
                        {isTwoColumn ? 'Two Column' : 'Single Column'}
                    </button>

                    {panelControls?.files && (
                        <button
                            onClick={() => panelControls.files?.onToggle()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                panelControls.files.isOpen
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={panelControls.files.label ?? (panelControls.files.isOpen ? 'Close Attachments' : 'Attachments')}
                        >
                            <Paperclip size={16} />
                            <span className="hidden sm:inline">
                                {panelControls.files.label ?? 'Attachments'}
                            </span>
                        </button>
                    )}

                    {panelControls?.chat && (
                        <button
                            onClick={() => panelControls.chat?.onToggle()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                panelControls.chat.isOpen
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title={panelControls.chat.label ?? (panelControls.chat.isOpen ? 'Close AI' : 'Ask AI')}
                        >
                            {panelControls.chat.isBusy && !panelControls.chat.isOpen ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                            ) : (
                                <Sparkles size={16} />
                            )}
                            <span className="hidden sm:inline">
                                {panelControls.chat.label ?? (panelControls.chat.isOpen ? 'Close AI' : 'Ask AI')}
                            </span>
                        </button>
                    )}

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                        style={{ display: showPrintButton ? undefined : 'none' }}
                    >
                        <Printer size={16} />
                        Print PDF
                    </button>

                    {sharing && (
                        <>
                            <button
                                onClick={async () => {
                                    const next = !sharing.isPublic;
                                    await sharing.onTogglePublic(next);
                                    if (next) {
                                        await sharing.onCopyShareLink();
                                    }
                                }}
                                className={`text-sm px-3 py-1.5 rounded border transition-colors ${sharing.isPublic ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                title={sharing.isPublic ? "Public (click to make private)" : "Private (click to make public)"}
                            >
                                {sharing.isPublic ? "Public" : "Private"}
                            </button>
                            <button
                                onClick={() => sharing.onCopyShareLink()}
                                className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                                title="Copy share link"
                            >
                                Share
                            </button>
                            {sharing.onPublishToGallery && (
                                <button
                                    onClick={() => sharing.onPublishToGallery?.()}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                    title="Publish to Community Gallery"
                                >
                                    <Upload size={16} />
                                    <span className="hidden sm:inline">Publish</span>
                                </button>
                            )}
                        </>
                    )}

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                        Settings
                    </button>
                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                        title="Help"
                    >
                        <CircleHelp size={16} />
                        Help
                    </button>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                        style={{ display: showSaveButton ? undefined : 'none' }}
                    >
                        <Save size={16} />
                        Save
                    </button>
                </div>
            </div>

            {sharing?.isPublic && sharing.publicUrl ? (
                <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center gap-2 text-sm print:hidden">
                    <span className="text-gray-500">Public link:</span>
                    <input
                        className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-xs font-mono text-gray-700 bg-gray-50"
                        value={sharing.publicUrl}
                        readOnly
                    />
                    <button
                        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
                        onClick={() => sharing.onCopyShareLink()}
                    >
                        Copy
                    </button>
                </div>
            ) : null}

	            {/* -- Main Content -- */}
	            <div className="flex-1 flex overflow-hidden paper-editor-main">
	                {/* Editor Pane */}
	                <div className={`${filesView === 'preview' ? 'hidden' : filesView === 'code' ? 'w-full' : 'w-1/2'} flex flex-col border-r border-gray-200 transition-all duration-300 print:hidden`}>
                    {filesView === 'styles' ? (
                        <>
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Styles (CSS)
                                </div>
                                <button
                                    type="button"
                                    className="px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium"
                                    title="Reload the preview to ensure CSS changes are applied everywhere (especially Paged.js)."
                                    onClick={() => setPreviewReloadNonce((n) => n + 1)}
                                >
                                    Reload Preview
                                </button>
                            </div>
                            <textarea
                                className="flex-1 w-full h-full p-6 resize-none outline-none font-mono text-sm bg-white text-gray-800 leading-relaxed"
                                value={paper.customCss}
                                onChange={(e) => {
	                                    const nextCss = e.target.value;
	                                    const next = { ...paper, customCss: nextCss };
	                                    setPaper(next);
	                                    onChange?.(next);
	                                }}
	                                placeholder={paper.renderTemplate === "reveal" ? CSS_PLACEHOLDER_REVEAL : CSS_PLACEHOLDER_PAGED}
	                                spellCheck={false}
	                            />
	                        </>
	                    ) : (
	                        <>
	                            <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
	                                Markdown Source
	                            </div>
	                            <textarea
	                                className="flex-1 w-full h-full p-6 resize-none outline-none font-mono text-sm bg-white text-gray-800 leading-relaxed"
	                                value={paper.markdown}
	                                onChange={(e) => {
	                                    const nextMd = e.target.value;
	                                    const next = { ...paper, markdown: nextMd };
	                                    setPaper(next);
	                                    onChange?.(next);
	                                }}
	                                placeholder="# Start writing your paper..."
	                                spellCheck={false}
	                            />
	                        </>
	                    )}
	                </div>

		                {/* Preview Pane */}
		                <div className={`${filesView === 'code' ? 'hidden' : filesView === 'preview' ? 'w-full' : 'w-1/2'} bg-gray-100 flex flex-col relative overflow-hidden transition-all duration-300 paper-preview-pane`}>
	                    <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 flex justify-between print:hidden">
	                        <span>Live Preview</span>
	                        <span className="text-[10px] text-gray-400">{paper.renderTemplate === "reveal" ? "Reveal.js Rendering" : "Paged.js Rendering"}</span>
	                    </div>
		                    <div className={`flex-1 relative paper-scroll-container ${isReveal ? 'overflow-hidden p-0' : 'overflow-auto p-8'}`}>
		                        <div className={`${isReveal ? 'w-full h-full min-h-[600px]' : 'mx-auto w-fit'} paper-content-wrapper`}>
		                            <DocumentPreview
		                                key={`${paper.renderTemplate}:${previewReloadNonce}`}
		                                paper={paper}
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

            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <HelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
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
    const selectedIds = useDiagramStore(state => state.selectedIds);
    const setSelection = useDiagramStore(state => state.setSelection);
    const selection = { key: selectedIds.values().next().value };

    // On mount, load the spec into the store
    React.useEffect(() => {
        setSpec(initialSpec);
        setSelection(new Set());
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
