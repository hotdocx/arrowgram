import React, { useEffect, useState } from 'react';
import { listProjects, ProjectMeta, deleteProject, saveProject } from '../utils/storage';
import { useDiagramStore } from '../store/diagramStore';
import { Plus, Trash2, FileText, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface DashboardProps {
    onOpenProject: () => void;
}

export function Dashboard({ onOpenProject }: DashboardProps) {
    const [projects, setProjects] = useState<ProjectMeta[]>([]);
    const { setSpec, setFilename } = useDiagramStore();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const list = await listProjects();
        setProjects(list);
    };

    const handleCreateNew = () => {
        setSpec(JSON.stringify({
            version: 1,
            nodes: [
                { name: "A", left: 300, top: 300, label: "A" }
            ],
            arrows: []
        }, null, 2));
        setFilename("Untitled Diagram");
        onOpenProject();
    };

    const handleOpen = (project: ProjectMeta) => {
        setSpec(project.spec);
        setFilename(project.name);
        onOpenProject();
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
                        <h1 className="text-3xl font-bold text-gray-900">My Diagrams</h1>
                        <p className="text-gray-500 mt-2">Manage your Arrowgram projects</p>
                    </div>
                    <Button onClick={handleCreateNew} className="gap-2">
                        <Plus className="w-4 h-4" /> New Diagram
                    </Button>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
                        <p className="text-gray-500 mb-6">Create your first diagram to get started.</p>
                        <Button onClick={handleCreateNew} variant="outline">Create Now</Button>
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
                                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <button 
                                        onClick={(e) => handleDelete(e, project.name)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Edited {new Date(project.updatedAt).toLocaleDateString()}
                                </p>
                                <div className="mt-4 flex items-center text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Project <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
