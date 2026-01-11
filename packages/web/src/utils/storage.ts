import { get, set, del, keys } from 'idb-keyval';
import { DiagramSpec } from 'arrowgram';

const STORE_PREFIX = 'arrowgram_project_';

export interface ProjectMeta {
    name: string;
    updatedAt: string;
    spec: string;
}

export async function saveProject(name: string, spec: string): Promise<ProjectMeta> {
    const meta: ProjectMeta = {
        name,
        updatedAt: new Date().toISOString(),
        spec
    };
    await set(STORE_PREFIX + name, meta);
    return meta;
}

export async function loadProject(name: string): Promise<ProjectMeta | undefined> {
    return await get(STORE_PREFIX + name);
}

export async function deleteProject(name: string): Promise<void> {
    await del(STORE_PREFIX + name);
}

export async function listProjects(): Promise<ProjectMeta[]> {
    const allKeys = await keys();
    const projectKeys = allKeys.filter(k => k.toString().startsWith(STORE_PREFIX));

    const projects = await Promise.all(projectKeys.map(k => get(k) as Promise<ProjectMeta>));
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}