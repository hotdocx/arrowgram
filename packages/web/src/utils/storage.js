import { get, set, del, keys } from 'idb-keyval';

const STORE_PREFIX = 'arrowgram_project_';

export async function saveProject(name, spec) {
    const meta = {
        name,
        updatedAt: new Date().toISOString(),
        spec
    };
    await set(STORE_PREFIX + name, meta);
    return meta;
}

export async function loadProject(name) {
    return await get(STORE_PREFIX + name);
}

export async function deleteProject(name) {
    await del(STORE_PREFIX + name);
}

export async function listProjects() {
    const allKeys = await keys();
    const projectKeys = allKeys.filter(k => k.toString().startsWith(STORE_PREFIX));

    const projects = await Promise.all(projectKeys.map(k => get(k)));
    return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
