import React, { useEffect, useState } from 'react';
import { listProjects, ProjectMeta, deleteProject, saveProject } from '../utils/storage';
import { useDiagramStore } from '../store/diagramStore';
import { Plus, Trash2, FileText, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardProps {
    onOpenProject: (type?: 'diagram' | 'paper', project?: ProjectMeta) => void;
}

export function Dashboard({ onOpenProject }: DashboardProps) {
    const [projects, setProjects] = useState<ProjectMeta[]>([]);
    const { setSpec, setFilename, createNew } = useDiagramStore();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const list = await listProjects();
        setProjects(list);
    };

    const handleCreateNewDiagram = () => {
        createNew();
        // Diagram is default type in store, no extra meta needed yet until save, 
        // but App needs to know the type.
        // We will pass the type to onOpenProject or set it in a global state?
        // Let's modify onOpenProject to accept the project meta or type.
        // For now, prompt name? OR just generate default. 
        // Let's modify onOpenProject interface in App.tsx step.
        // Here we just persist immediate "Untitled" project? 
        // No, standard flow is: Open empty -> user saves. 
        // App needs to know MODE.
        // We'll assume onOpenProject accepts (type).
        onOpenProject('diagram', { name: `Untitled-${Date.now()}`, spec: '', updatedAt: '', type: 'diagram' });
    };

    const handleCreateNewPaper = () => {
        const defaultPaper = `---
title: My New Paper
authors: Author Name
---

# Introduction

Start writing here...
`;
        onOpenProject('paper', { name: `Paper-${Date.now()}`, spec: defaultPaper, updatedAt: '', type: 'paper' });
    };

    const handleOpen = (project: ProjectMeta) => {
        // We don't set store spec here if it's a paper.
        // If diagram, we do.
        if (project.type === 'diagram' || !project.type) {
            setSpec(project.spec);
            setFilename(project.name);
        }
        onOpenProject(project.type || 'diagram', project);
    };

    const handleDelete = async (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            await deleteProject(name);
            loadProjects();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Workspace</h1>
                        <p className="text-gray-500 mt-2">Manage your Diagrams and Papers</p>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleCreateNewPaper} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <FileText className="w-4 h-4" /> New Paper
                        </Button>
                        <Button onClick={handleCreateNewDiagram} className="gap-2 bg-white text-gray-700 border hover:bg-gray-50">
                            <Plus className="w-4 h-4" /> New Diagram
                        </Button>
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
                        <p className="text-gray-500 mb-6">Create your first project to get started.</p>
                        <div className="flex justify-center gap-4">
                            <Button onClick={handleCreateNewPaper}>Create Paper</Button>
                            <Button onClick={handleCreateNewDiagram} variant="outline">Create Diagram</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.name}
                                onClick={() => handleOpen(project)}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-lg transition-colors ${project.type === 'paper' ? 'bg-indigo-50 group-hover:bg-indigo-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}>
                                        {project.type === 'paper' ? (
                                            <FileText className={`w-6 h-6 ${project.type === 'paper' ? 'text-indigo-600' : 'text-blue-600'}`} />
                                        ) : (
                                            <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="6" cy="6" r="3" />
                                                <circle cx="18" cy="18" r="3" />
                                                <path d="M8.5 8.5l7 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider py-1 px-2 rounded-full ${project.type === 'paper' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {project.type || 'Diagram'}
                                        </span>
                                        <button
                                            onClick={(e) => handleDelete(e, project.name)}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Edited {new Date(project.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
