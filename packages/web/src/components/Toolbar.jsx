import React, { useState, useEffect } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useStore } from 'zustand';
import {
    Undo, Redo, Save, FolderOpen, Plus, Download, Share2, FileCode, Bot, MoreHorizontal, Settings
} from 'lucide-react';
import { saveProject, listProjects, loadProject } from '../utils/storage';

export function Toolbar({ onExport, onShare, onToggleChat, isChatOpen }) {
    const { spec, setSpec, filename, setFilename, reset } = useDiagramStore();
    const { undo, redo, pastStates, futureStates } = useStore(useDiagramStore.temporal);

    const [isProjectsOpen, setIsProjectsOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [showSaveName, setShowSaveName] = useState(false);
    const [newProjectName, setNewProjectName] = useState(filename);

    const canUndo = pastStates.length > 0;
    const canRedo = futureStates.length > 0;

    const refreshProjects = async () => {
        const list = await listProjects();
        setProjects(list);
    };

    const handleSave = async () => {
        await saveProject(newProjectName, spec);
        setFilename(newProjectName);
        setShowSaveName(false);
        // Maybe replace alert with a toast later
        console.log('Project Saved');
    };

    const handleLoad = (p) => {
        setSpec(p.spec);
        setFilename(p.name);
        setIsProjectsOpen(false);
    };

    useEffect(() => {
        if (isProjectsOpen) refreshProjects();
    }, [isProjectsOpen]);

    const btnClass = "p-2 rounded-lg text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95";
    const divider = <div className="h-5 w-px bg-gray-200 mx-1"></div>;

    return (
        <div className="flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-lg rounded-xl ring-1 ring-black/5">
            <button className={btnClass} onClick={() => { reset(); setFilename('Untitled'); }} title="New Project">
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

            {divider}

            <button className={btnClass} onClick={() => onExport('svg')} title="Export SVG"><Download size={18} /></button>
            <button className={btnClass} onClick={() => onExport('tikz')} title="Export TikZ"><FileCode size={18} /></button>
            <button className={btnClass} onClick={onShare} title="Share Link"><Share2 size={18} /></button>

            {divider}

            <div className="px-3 py-1 font-medium text-sm text-gray-500 max-w-[150px] truncate select-none" title={filename}>
                {filename}
            </div>

            {/* Projects Modal - Simplified for now, could be its own component */}
            {isProjectsOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Your Projects</h3>
                            <button onClick={() => setIsProjectsOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
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
                        <input
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Project Name"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setShowSaveName(false)}>Cancel</button>
                            <button className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg shadow-sm transition-colors" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
