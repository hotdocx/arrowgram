import React, { useState, useEffect } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { useStore } from 'zustand';
import {
    Undo, Redo, Save, FolderOpen, Plus, Download, Share2, FileCode, Bot
} from 'lucide-react';
import { saveProject, listProjects, loadProject } from '../utils/storage';

export function Toolbar({ onExport, onShare, onToggleChat }) {
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
        alert('Project Saved!');
    };

    const handleLoad = (p) => {
        setSpec(p.spec);
        setFilename(p.name);
        setIsProjectsOpen(false);
    };

    useEffect(() => {
        if (isProjectsOpen) refreshProjects();
    }, [isProjectsOpen]);

    const btnClass = "p-2 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="flex items-center justify-between p-2 border-b bg-white shadow-sm">
            <div className="flex items-center gap-2">
                <div className="font-bold text-lg mr-4 text-purple-600">Arrowgram</div>

                <div className="h-6 w-px bg-gray-300 mx-2"></div>

                <button className={btnClass} onClick={() => { reset(); setFilename('Untitled'); }} title="New Project">
                    <Plus size={20} />
                </button>
                <button className={btnClass} onClick={() => setIsProjectsOpen(true)} title="Open Project">
                    <FolderOpen size={20} />
                </button>
                <button className={btnClass} onClick={() => { setNewProjectName(filename); setShowSaveName(true); }} title="Save Project">
                    <Save size={20} />
                </button>

                <div className="h-6 w-px bg-gray-300 mx-2"></div>

                <button className={btnClass} onClick={() => undo()} disabled={!canUndo} title="Undo">
                    <Undo size={20} />
                </button>
                <button className={btnClass} onClick={() => redo()} disabled={!canRedo} title="Redo">
                    <Redo size={20} />
                </button>
            </div>

            <div className="flex items-center gap-2">
                <button className={`${btnClass} text-purple-600 bg-purple-50`} onClick={onToggleChat} title="AI Assistant"><Bot size={20} /></button>
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <span className="text-sm text-gray-600 mr-4 font-mono">{filename}</span>
                <button className={btnClass} onClick={() => onExport('svg')} title="Export SVG"><Download size={20} /></button>
                <button className={btnClass} onClick={() => onExport('tikz')} title="Export TikZ"><FileCode size={20} /></button>
                <button className={btnClass} onClick={onShare} title="Share Link"><Share2 size={20} /></button>
            </div>

            {/* Projects Modal */}
            {isProjectsOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Open Project</h3>
                        <div className="space-y-2">
                            {projects.length === 0 && <p className="text-gray-500">No projects saved yet.</p>}
                            {projects.map(p => (
                                <div key={p.name} onClick={() => handleLoad(p)} className="p-3 border rounded hover:bg-purple-50 cursor-pointer flex justify-between items-center group">
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-gray-400">{new Date(p.updatedAt).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                        <button className="mt-4 w-full p-2 bg-gray-100 hover:bg-gray-200 rounded" onClick={() => setIsProjectsOpen(false)}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveName && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-80">
                        <h3 className="text-xl font-bold mb-4">Save Project</h3>
                        <input
                            className="w-full p-2 border rounded mb-4"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                            placeholder="Project Name"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" onClick={() => setShowSaveName(false)}>Cancel</button>
                            <button className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded" onClick={handleSave}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
