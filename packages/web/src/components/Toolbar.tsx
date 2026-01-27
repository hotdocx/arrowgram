import React, { useState, useEffect } from 'react';
import { useDiagramStore } from '../store/diagramStore';
// @ts-ignore
import { useStore } from 'zustand';
import {
    Undo, Redo, Save, FolderOpen, Plus, Download, Share2, FileCode, Bot, X, Settings, ChevronDown, Check
} from 'lucide-react';
import { saveProject, listProjects, ProjectMeta } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { SettingsDialog } from './SettingsDialog';
import { SpecJsonEditor } from './SpecJsonEditor';
import { QuiverDialog } from './QuiverDialog';

interface ToolbarProps {
    onExport: (format: 'tikz' | 'svg' | 'png', options?: { fitView?: boolean; showGrid?: boolean }) => void;
    onShare: () => void;
    onToggleChat: () => void;
    isChatOpen: boolean;
}

export function Toolbar({ onExport, onShare, onToggleChat, isChatOpen }: ToolbarProps) {
    const { spec, setSpec, filename, setFilename, reset } = useDiagramStore();
    // @ts-ignore
    const { undo, redo, pastStates, futureStates } = useStore(useDiagramStore.temporal);
    const { addToast } = useToast();

    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSpecOpen, setIsSpecOpen] = useState(false);
    const [isQuiverOpen, setIsQuiverOpen] = useState(false);
    const [projects, setProjects] = useState<ProjectMeta[]>([]);
    const [showSaveName, setShowSaveName] = useState(false);
    const [newProjectName, setNewProjectName] = useState(filename);

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [exportOptions, setExportOptions] = useState({ fitView: true, showGrid: true });

    const canUndo = pastStates.length > 0;
    const canRedo = futureStates.length > 0;

    const refreshProjects = async () => {
        const list = await listProjects();
        setProjects(list);
    };

    const handleSave = async () => {
        try {
            await saveProject(newProjectName, spec);
            setFilename(newProjectName);
            setShowSaveName(false);
            addToast(`Project "${newProjectName}" saved successfully`, 'success');
        } catch (e) {
            addToast('Failed to save project', 'error');
            console.error(e);
        }
    };

    const handleLoad = (p: ProjectMeta) => {
        setSpec(p.spec);
        setFilename(p.name);
        setIsProjectsOpen(false);
        addToast(`Project "${p.name}" loaded`, 'info');
    };

    useEffect(() => {
        if (isProjectsOpen) refreshProjects();
    }, [isProjectsOpen]);

    const btnClass = "p-2 rounded-lg text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95";
    const divider = <div className="h-5 w-px bg-gray-200 mx-1"></div>;

    return (
        <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-xl ring-1 ring-black/5">
            <button className={btnClass} onClick={() => { reset(); setFilename('Untitled'); addToast('New project created', 'info'); }} title="New Project">
                <Plus size={18} />
            </button>
            <button className={btnClass} onClick={() => setIsProjectsOpen(true)} title="Open Project">
                <FolderOpen size={18} />
            </button>
            <button className={btnClass} onClick={() => { setNewProjectName(filename); setShowSaveName(true); }} title="Save Project">
                <Save size={18} />
            </button>

            {divider}

            <button className={btnClass} onClick={() => undo()} disabled={!canUndo} title="Undo">
                <Undo size={18} />
            </button>
            <button className={btnClass} onClick={() => redo()} disabled={!canRedo} title="Redo">
                <Redo size={18} />
            </button>

            {divider}

            <button
                className={`${btnClass} ${isChatOpen ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : ''}`}
                onClick={onToggleChat}
                title="AI Assistant"
            >
                <Bot size={18} />
            </button>

             <button className={btnClass} onClick={() => setIsSettingsOpen(true)} title="Settings">
                <Settings size={18} />
            </button>

            <button className={btnClass} onClick={() => setIsSpecOpen(true)} title="Edit JSON Spec">
                <FileCode size={18} />
            </button>
            
            <button className={btnClass} onClick={() => setIsQuiverOpen(true)} title="Quiver Integration">
                <Share2 size={18} className="rotate-90" /> {/* Using Share2 rotated as a placeholder for exchange/quiver */}
            </button>

            {divider}

            {/* Export Dropdown Group */}
            <div className="relative flex items-center">
                <button 
                    className={`${btnClass} rounded-r-none border-r border-gray-200/50 pr-1`} 
                    onClick={() => onExport('svg', exportOptions)} 
                    title="Export SVG"
                >
                    <Download size={18} />
                </button>
                <button 
                    className={`${btnClass} rounded-l-none px-1`} 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    title="Export Options"
                >
                    <ChevronDown size={14} />
                </button>

                {isExportMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wider">Export Settings</div>
                        
                        <button 
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                            onClick={() => setExportOptions(prev => ({...prev, fitView: !prev.fitView}))}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${exportOptions.fitView ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                                {exportOptions.fitView && <Check size={10} />}
                            </div>
                            Fit View to Content
                        </button>

                        <button 
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                            onClick={() => setExportOptions(prev => ({...prev, showGrid: !prev.showGrid}))}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${exportOptions.showGrid ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                                {exportOptions.showGrid && <Check size={10} />}
                            </div>
                            Include Grid
                        </button>

                        <div className="h-px bg-gray-100 my-2"></div>

                        <button 
                            className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors"
                            onClick={() => { onExport('svg', exportOptions); setIsExportMenuOpen(false); }}
                        >
                            Export SVG
                        </button>
                         <button 
                            className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded-lg text-sm text-gray-700 font-medium transition-colors"
                            onClick={() => { onExport('png', exportOptions); setIsExportMenuOpen(false); }}
                        >
                            Export PNG
                        </button>
                    </div>
                )}
            </div>

            <button className={btnClass} onClick={() => onExport('tikz')} title="Export TikZ"><span className="font-mono font-bold text-xs">TeX</span></button>
            <button className={btnClass} onClick={onShare} title="Share Link"><Share2 size={18} /></button>

            {divider}

            <div className="px-3 py-1 font-medium text-sm text-gray-500 max-w-[150px] truncate select-none" title={filename}>
                {filename}
            </div>

            {/* Dialogs */}
            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SpecJsonEditor isOpen={isSpecOpen} onClose={() => setIsSpecOpen(false)} />
            <QuiverDialog isOpen={isQuiverOpen} onClose={() => setIsQuiverOpen(false)} />

            {/* Projects Modal */}
            {isProjectsOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Your Projects</h3>
                            <button onClick={() => setIsProjectsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="space-y-2">
                            {projects.length === 0 && <p className="text-gray-400 text-center py-8">No saved projects.</p>}
                            {projects.map(p => (
                                <div key={p.name} onClick={() => handleLoad(p)} className="p-3 border border-gray-100 rounded-xl hover:bg-purple-50 hover:border-purple-100 cursor-pointer flex justify-between items-center group transition-colors">
                                    <div className="font-medium text-gray-700 group-hover:text-purple-700">{p.name}</div>
                                    <div className="text-xs text-gray-400">{new Date(p.updatedAt).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveName && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-80 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Save Project</h3>
                        <Input
                            className="mb-4"
                            value={newProjectName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                            placeholder="Project Name"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowSaveName(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}