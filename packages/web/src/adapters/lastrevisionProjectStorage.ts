import type { ProjectMeta } from "../utils/storage";
import type { ProjectStorage } from "../context/ProjectStorageContext";

type PaperDto = {
  id: string;
  title: string;
  markdown: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

type DiagramDto = {
  id: string;
  title: string;
  spec: string;
  createdAt: string;
  updatedAt: string;
};

export function createLastRevisionProjectStorage(params: {
  apiBaseUrl: string;
  getToken: () => string;
}): ProjectStorage {
  const base = params.apiBaseUrl.replace(/\/+$/, "");

  const authedFetch = async (path: string, init?: RequestInit) => {
    const token = params.getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return await fetch(`${base}${path}`, { ...init, headers });
  };

  const listPapers = async (): Promise<PaperDto[]> => {
    const res = await authedFetch("/api/my/papers", { method: "GET" });
    if (!res.ok) throw new Error(`Failed to list papers (${res.status})`);
    return (await res.json()) as PaperDto[];
  };

  const listDiagrams = async (): Promise<DiagramDto[]> => {
    const res = await authedFetch("/api/my/diagrams", { method: "GET" });
    if (!res.ok) throw new Error(`Failed to list diagrams (${res.status})`);
    return (await res.json()) as DiagramDto[];
  };

  const findByTitle = async (
    type: "paper" | "diagram",
    title: string
  ): Promise<{ type: "paper"; item: PaperDto } | { type: "diagram"; item: DiagramDto } | null> => {
    if (type === "paper") {
      const papers = await listPapers();
      const found = papers.find((p) => p.title === title);
      return found ? { type: "paper", item: found } : null;
    }
    const diagrams = await listDiagrams();
    const found = diagrams.find((d) => d.title === title);
    return found ? { type: "diagram", item: found } : null;
  };

  return {
    async listProjects(): Promise<ProjectMeta[]> {
      const [papers, diagrams] = await Promise.all([listPapers(), listDiagrams()]);
      const mapped: ProjectMeta[] = [
        ...diagrams.map((d) => ({
          name: d.title,
          updatedAt: d.updatedAt,
          type: "diagram" as const,
          spec: d.spec,
        })),
        ...papers.map((p) => ({
          name: p.title,
          updatedAt: p.updatedAt,
          type: "paper" as const,
          spec: p.markdown,
        })),
      ];
      return mapped.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async loadProject(name: string): Promise<ProjectMeta | undefined> {
      // Remote storage is keyed by server IDs; we look up by title for now.
      // (This will be replaced with proper id-based projects later.)
      const [papers, diagrams] = await Promise.all([listPapers(), listDiagrams()]);
      const p = papers.find((x) => x.title === name);
      if (p) {
        return {
          name: p.title,
          updatedAt: p.updatedAt,
          type: "paper",
          spec: p.markdown,
        };
      }
      const d = diagrams.find((x) => x.title === name);
      if (d) {
        return {
          name: d.title,
          updatedAt: d.updatedAt,
          type: "diagram",
          spec: d.spec,
        };
      }
      return undefined;
    },

    async deleteProject(name: string): Promise<void> {
      const paper = await findByTitle("paper", name);
      if (paper?.type === "paper") {
        const res = await authedFetch(`/api/my/papers/${paper.item.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`Failed to delete paper (${res.status})`);
        return;
      }
      const diagram = await findByTitle("diagram", name);
      if (diagram?.type === "diagram") {
        const res = await authedFetch(`/api/my/diagrams/${diagram.item.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(`Failed to delete diagram (${res.status})`);
        return;
      }
    },

    async saveProject(
      name: string,
      spec: string,
      type: "diagram" | "paper" = "diagram"
    ): Promise<ProjectMeta> {
      if (type === "paper") {
        const existing = await findByTitle("paper", name);
        if (existing?.type === "paper") {
          const res = await authedFetch(`/api/my/papers/${existing.item.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: name, markdown: spec }),
          });
          if (!res.ok) throw new Error(`Failed to update paper (${res.status})`);
          const updated = (await res.json()) as PaperDto;
          return {
            name: updated.title,
            updatedAt: updated.updatedAt,
            type: "paper",
            spec: updated.markdown,
          };
        }

        const res = await authedFetch(`/api/my/papers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: name, markdown: spec }),
        });
        if (!res.ok) throw new Error(`Failed to create paper (${res.status})`);
        const created = (await res.json()) as PaperDto;
        return {
          name: created.title,
          updatedAt: created.updatedAt,
          type: "paper",
          spec: created.markdown,
        };
      }

      const existing = await findByTitle("diagram", name);
      if (existing?.type === "diagram") {
        const res = await authedFetch(`/api/my/diagrams/${existing.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: name, spec }),
        });
        if (!res.ok) throw new Error(`Failed to update diagram (${res.status})`);
        const updated = (await res.json()) as DiagramDto;
        return {
          name: updated.title,
          updatedAt: updated.updatedAt,
          type: "diagram",
          spec: updated.spec,
        };
      }

      const res = await authedFetch(`/api/my/diagrams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name, spec }),
      });
      if (!res.ok) throw new Error(`Failed to create diagram (${res.status})`);
      const created = (await res.json()) as DiagramDto;
      return {
        name: created.title,
        updatedAt: created.updatedAt,
        type: "diagram",
        spec: created.spec,
      };
    },
  };
}

