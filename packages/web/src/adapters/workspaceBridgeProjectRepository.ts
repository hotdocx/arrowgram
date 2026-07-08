import type {
  PaperContent,
  Project,
  ProjectRepository,
  ProjectRepositoryDiff,
  ProjectRepositoryEvent,
  ProjectRepositoryStatus,
  ProjectSummary,
  ProjectType,
} from "../utils/projectRepository";

type BridgeProject =
  | {
      id: string;
      type: "diagram";
      title: string;
      updatedAt: string;
      sourcePath?: string;
      content: string;
    }
  | {
      id: string;
      type: "paper";
      title: string;
      updatedAt: string;
      sourcePath?: string;
      content: PaperContent;
      paper?: {
        renderTemplate?: PaperContent["renderTemplate"];
        themeId?: string;
      };
    };

type BridgeProjectResponse = {
  ok?: boolean;
  project?: BridgeProject;
  projects?: BridgeProject[];
  error?: string;
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function toApiError(message: string, status: number) {
  const error = new Error(`${message} (${status})`) as Error & { status?: number };
  error.status = status;
  return error;
}

function toProject(project: BridgeProject): Project {
  if (project.type === "paper") {
    const content: PaperContent = {
      markdown: project.content.markdown ?? "",
      renderTemplate: project.content.renderTemplate ?? "paged",
      themeId: project.content.themeId,
      customCss: project.content.customCss ?? "",
    };
    return {
      id: project.id,
      type: "paper",
      title: project.title,
      updatedAt: project.updatedAt,
      paper: { renderTemplate: content.renderTemplate, themeId: content.themeId },
      content,
    };
  }
  return {
    id: project.id,
    type: "diagram",
    title: project.title,
    updatedAt: project.updatedAt,
    content: project.content,
  };
}

function toSummary(project: BridgeProject): ProjectSummary {
  if (project.type === "paper") {
    return {
      id: project.id,
      type: "paper",
      title: project.title,
      updatedAt: project.updatedAt,
      paper: {
        renderTemplate: project.content.renderTemplate ?? "paged",
        themeId: project.content.themeId,
      },
    };
  }
  return {
    id: project.id,
    type: "diagram",
    title: project.title,
    updatedAt: project.updatedAt,
  };
}

export function createWorkspaceBridgeProjectRepository(params: {
  baseUrl: string;
  token?: string;
}): ProjectRepository {
  const base = normalizeBaseUrl(params.baseUrl);

  const headers = (init?: HeadersInit) => {
    const next = new Headers(init);
    if (params.token) next.set("Authorization", `Bearer ${params.token}`);
    return next;
  };

  const request = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${base}/__arrowgram${path}`, {
      ...init,
      headers: headers(init?.headers),
      cache: "no-store",
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw toApiError(payload.error ?? "Arrowgram bridge request failed", res.status);
    }
    return res;
  };

  const getProject = async (id: string) => {
    const res = await request(`/projects/${encodeURIComponent(id)}`);
    const payload = (await res.json()) as BridgeProjectResponse;
    if (!payload.project) throw new Error(payload.error ?? "Project not found");
    return toProject(payload.project);
  };

  return {
    capabilities: {
      sharing: { canTogglePublic: false, canGetPublicUrl: false },
      attachments: { canUpload: false },
      ai: { mode: "byok-client" },
      sync: {
        mode: "file-bridge",
        canSubscribe: true,
        canDiff: true,
        canSnapshot: true,
        canDiagnostics: true,
      },
    },

    async list() {
      const res = await request("/projects");
      const payload = (await res.json()) as BridgeProjectResponse;
      return (payload.projects ?? []).map(toSummary);
    },

    async create(input: {
      type: ProjectType;
      title?: string;
      content?: string;
      paper?: Partial<PaperContent>;
    }) {
      const res = await request("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await res.json()) as BridgeProjectResponse;
      if (!payload.project) throw new Error(payload.error ?? "Failed to create project");
      return toProject(payload.project);
    },

    get: getProject,

    async update(input) {
      const res = await request(`/projects/${encodeURIComponent(input.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = (await res.json()) as BridgeProjectResponse;
      if (!payload.project) throw new Error(payload.error ?? "Failed to update project");
      return toProject(payload.project);
    },

    async remove(id) {
      await request(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    subscribe(listener: (event: ProjectRepositoryEvent) => void) {
      const url = new URL(`${base}/__arrowgram/events`);
      if (params.token) url.searchParams.set("token", params.token);
      const source = new EventSource(url.toString());
      const handle = (event: MessageEvent) => {
        try {
          listener(JSON.parse(event.data) as ProjectRepositoryEvent);
        } catch {
          listener({ type: "workspace.changed" });
        }
      };
      source.addEventListener("change", handle);
      source.addEventListener("ready", () => undefined);
      source.onerror = () => {
        // Browser reconnects EventSource automatically.
      };
      return () => source.close();
    },

    async getStatus(): Promise<ProjectRepositoryStatus> {
      const res = await request("/status");
      const payload = (await res.json()) as ProjectRepositoryStatus & { ok?: boolean };
      return {
        dirty: Boolean(payload.dirty),
        baseline: payload.baseline,
        diagnostics: payload.diagnostics ?? [],
      };
    },

    async getDiff(): Promise<ProjectRepositoryDiff> {
      const res = await request("/diff");
      const payload = (await res.json()) as ProjectRepositoryDiff & { ok?: boolean };
      return {
        baseline: payload.baseline,
        files: payload.files ?? [],
      };
    },

    async saveSnapshot(message?: string) {
      const res = await request("/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      return (await res.json()) as { sha?: string | null; committed?: boolean };
    },
  };
}
