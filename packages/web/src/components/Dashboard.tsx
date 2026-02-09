import React, { useEffect, useState } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Button } from './ui/Button';
import { useProjectRepository } from '../context/ProjectRepositoryContext';
import type { ProjectSummary } from '../utils/projectRepository';
import { useEditorHostConfig } from '../context/EditorHostContext';

interface DashboardProps {
    onOpenProject: (projectId: string) => void;
}

export function Dashboard({ onOpenProject }: DashboardProps) {
    const [projects, setProjects] = useState<ProjectSummary[]>([]);
    const { createNew } = useDiagramStore();
    const repo = useProjectRepository();
    const host = useEditorHostConfig();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const list = await repo.list();
        setProjects(list);
    };

    const handleCreateNewDiagram = async () => {
        createNew();
        const created = await repo.create({
            type: 'diagram',
            title: 'Untitled Diagram',
            content: JSON.stringify({ version: 1, nodes: [], arrows: [] }, null, 2),
        });
        onOpenProject(created.id);
    };

    const createPaper = async (opts: { title: string; markdown: string; renderTemplate: "paged" | "reveal" }) => {
        const created = await repo.create({
            type: 'paper',
            title: opts.title,
            content: opts.markdown,
            paper: { renderTemplate: opts.renderTemplate, customCss: "" },
        });
        onOpenProject(created.id);
    };

    const handleCreateNewPagedPaper = async () => {
        const markdown = `---
title: My New Paper
authors: Author Name
---

# Introduction

Start writing here...
`;
        await createPaper({ title: "My New Paper", markdown, renderTemplate: "paged" });
    };

    const handleCreateNewSlidesPaper = async () => {
        const markdown = `---
title: My New Slides
authors: Author Name
---

# Introduction

Start writing here...

---

# Next Slide

Add more slides using a line containing only:
---
`;
        await createPaper({ title: "My New Slides", markdown, renderTemplate: "reveal" });
    };

    const handleOpen = (project: ProjectSummary) => {
        onOpenProject(project.id);
    };

    const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            await repo.remove(id);
            loadProjects();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Workspace</h1>
                        <p className="text-gray-500 mt-2">Diagrams, papers, and slides — all in one workspace</p>
                    </div>
                    <div className="flex gap-3">
                        {host.exit?.href ? (
                            <a
                                href={host.exit.href}
                                className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
                                title={host.exit.label ?? "Back"}
                            >
                                {host.exit.label ?? "Back"}
                            </a>
                        ) : null}
                        <Button onClick={handleCreateNewPagedPaper} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <FileText className="w-4 h-4" /> New Paged Paper
                        </Button>
                        <Button onClick={handleCreateNewSlidesPaper} className="gap-2 bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100">
                            <FileText className="w-4 h-4" /> New Slides
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
                            <Button onClick={handleCreateNewPagedPaper}>Create Paged Paper</Button>
                            <Button onClick={handleCreateNewSlidesPaper} variant="outline">Create Slides</Button>
                            <Button onClick={handleCreateNewDiagram} variant="outline">Create Diagram</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div
                                key={project.id}
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
                                            onClick={(e) => handleDelete(e, project.id, project.title)}
                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
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
