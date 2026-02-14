import type {
  PaperContent,
  Project,
  ProjectRepository,
  ProjectSummary,
  ProjectType,
} from "../utils/projectRepository";

type PaperDto = {
  id: string;
  title: string;
  markdown: string;
  renderTemplate: "paged" | "reveal";
  themeId?: string | null;
  customCss?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

type DiagramDto = {
  id: string;
  title: string;
  spec: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
};

type RemoteId = { type: ProjectType; remoteId: string };

function encodeId(type: ProjectType, remoteId: string) {
  return `${type}:${remoteId}`;
}

function decodeId(id: string): RemoteId {
  const [type, remoteId] = id.split(":", 2);
  if ((type !== "paper" && type !== "diagram") || !remoteId) {
    throw new Error("Invalid project id");
  }
  return { type, remoteId };
}

export function createLastRevisionProjectRepository(params: {
  apiBaseUrl: string;
  getToken: () => string;
  onUnauthorized?: () => void;
}): ProjectRepository {
  const base = params.apiBaseUrl.replace(/\/+$/, "");

  const toApiError = (message: string, status: number) => {
    const err = new Error(`${message} (${status})`) as Error & { status?: number };
    err.status = status;
    return err;
  };

  const authedFetch = async (path: string, init?: RequestInit) => {
    const token = params.getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "omit",
    });
    if (res.status === 401) params.onUnauthorized?.();
    return res;
  };

  const listPapers = async (): Promise<PaperDto[]> => {
    const res = await authedFetch("/api/my/papers", { method: "GET" });
    if (!res.ok) throw toApiError("Failed to list papers", res.status);
    return (await res.json()) as PaperDto[];
  };

  const listDiagrams = async (): Promise<DiagramDto[]> => {
    const res = await authedFetch("/api/my/diagrams", { method: "GET" });
    if (!res.ok) throw toApiError("Failed to list diagrams", res.status);
    return (await res.json()) as DiagramDto[];
  };

  const getPaper = async (paperId: string): Promise<PaperDto> => {
    const res = await authedFetch(`/api/my/papers/${paperId}`, { method: "GET" });
    if (!res.ok) throw toApiError("Failed to load paper", res.status);
    return (await res.json()) as PaperDto;
  };

  const getDiagram = async (diagramId: string): Promise<DiagramDto> => {
    const res = await authedFetch(`/api/my/diagrams/${diagramId}`, { method: "GET" });
    if (!res.ok) throw toApiError("Failed to load diagram", res.status);
    return (await res.json()) as DiagramDto;
  };

  const getPublicUrl = async (id: string) => {
    const { type, remoteId } = decodeId(id);
    const origin = window.location.origin.replace(/\/+$/, "");
    if (type === "paper") return `${origin}/papers/${remoteId}`;
    return `${origin}/diagrams/${remoteId}`;
  };

  const toSummary = (type: ProjectType, item: PaperDto | DiagramDto): ProjectSummary => {
    if (type === "paper") {
      const p = item as PaperDto;
      return {
        id: encodeId("paper", p.id),
        type: "paper",
        title: p.title,
        updatedAt: p.updatedAt,
        isPublic: p.isPublic,
        paper: {
          renderTemplate: p.renderTemplate ?? "paged",
          themeId: p.themeId ?? undefined,
        },
      };
    }
    const d = item as DiagramDto;
    return {
      id: encodeId("diagram", d.id),
      type: "diagram",
      title: d.title,
      updatedAt: d.updatedAt,
      isPublic: d.isPublic,
    };
  };

  const toProject = (type: ProjectType, item: PaperDto | DiagramDto): Project => {
    if (type === "paper") {
      const p = item as PaperDto;
      const content: PaperContent = {
        markdown: p.markdown ?? "",
        renderTemplate: p.renderTemplate ?? "paged",
        themeId: p.themeId ?? undefined,
        customCss: p.customCss ?? "",
      };
      return {
        id: encodeId("paper", p.id),
        type: "paper",
        title: p.title,
        updatedAt: p.updatedAt,
        isPublic: p.isPublic,
        paper: { renderTemplate: content.renderTemplate, themeId: content.themeId },
        content,
      };
    }
    const d = item as DiagramDto;
    return {
      id: encodeId("diagram", d.id),
      type: "diagram",
      title: d.title,
      updatedAt: d.updatedAt,
      isPublic: d.isPublic,
      content: d.spec,
    };
  };

  const repo: ProjectRepository = {
    capabilities: {
      sharing: { canTogglePublic: true, canGetPublicUrl: true, canPublishToGallery: true },
      attachments: { canUpload: true },
      ai: { mode: "server-proxy" },
    },

    async list(): Promise<ProjectSummary[]> {
      const [papers, diagrams] = await Promise.all([listPapers(), listDiagrams()]);
      const mapped: ProjectSummary[] = [
        ...papers.map((p) => toSummary("paper", p)),
        ...diagrams.map((d) => toSummary("diagram", d)),
      ];
      return mapped.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    },

    async create(input): Promise<Project> {
      if (input.type === "paper") {
        const res = await authedFetch(`/api/my/papers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title ?? "Untitled Paper",
            markdown: input.paper?.markdown ?? input.content ?? "",
            renderTemplate: input.paper?.renderTemplate ?? "paged",
            themeId: input.paper?.themeId ?? null,
            customCss: input.paper?.customCss ?? "",
            isPublic: false,
          }),
        });
        if (!res.ok) throw toApiError("Failed to create paper", res.status);
        const created = (await res.json()) as PaperDto;
        return toProject("paper", created);
      }

      const res = await authedFetch(`/api/my/diagrams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title ?? "Untitled Diagram",
          spec: input.content ?? JSON.stringify({ nodes: [], arrows: [] }, null, 2),
          isPublic: false,
        }),
      });
      if (!res.ok) throw toApiError("Failed to create diagram", res.status);
      const created = (await res.json()) as DiagramDto;
      return toProject("diagram", created);
    },

    async get(id): Promise<Project> {
      const { type, remoteId } = decodeId(id);
      if (type === "paper") return toProject("paper", await getPaper(remoteId));
      return toProject("diagram", await getDiagram(remoteId));
    },

    async update(input): Promise<Project> {
      const { type, remoteId } = decodeId(input.id);
      if (type === "paper") {
        const res = await authedFetch(`/api/my/papers/${remoteId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            markdown: input.paper?.markdown ?? input.content,
            renderTemplate: input.paper?.renderTemplate,
            themeId: input.paper?.themeId,
            customCss: input.paper?.customCss,
            isPublic: input.isPublic,
          }),
        });
        if (!res.ok) throw toApiError("Failed to update paper", res.status);
        const updated = (await res.json()) as PaperDto;
        return toProject("paper", updated);
      }

      const res = await authedFetch(`/api/my/diagrams/${remoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          spec: input.content,
          isPublic: input.isPublic,
        }),
      });
      if (!res.ok) throw toApiError("Failed to update diagram", res.status);
      const updated = (await res.json()) as DiagramDto;
      return toProject("diagram", updated);
    },

    async remove(id): Promise<void> {
      const { type, remoteId } = decodeId(id);
      const path =
        type === "paper" ? `/api/my/papers/${remoteId}` : `/api/my/diagrams/${remoteId}`;
      const res = await authedFetch(path, { method: "DELETE" });
      if (!res.ok) throw toApiError("Failed to delete project", res.status);
    },

    getPublicUrl,

    async publishToGallery(id, metadata) {
      const { type, remoteId } = decodeId(id);
      const screenshotFileName = `snapshot-${Date.now()}.png`;
      
      // 0. Ensure project is public (required for gallery access)
      // We perform a partial update to set isPublic=true without overwriting content
      const projectPath = type === "paper" ? `/api/my/papers/${remoteId}` : `/api/my/diagrams/${remoteId}`;
      try {
          await authedFetch(projectPath, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isPublic: true })
          });
      } catch (e) {
          console.error("Failed to auto-set public visibility:", e);
          // We proceed, but the user might need to manually set it public if this failed
      }

      // 1. Get presigned URL for screenshot
      const presignRes = await authedFetch("/api/my/publications/presign-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: screenshotFileName,
          contentType: "image/png",
        }),
      });
      
      if (!presignRes.ok) throw toApiError("Failed to get upload URL", presignRes.status);
      const { uploadUrl, storageKey } = await presignRes.json();

      // 2. Upload screenshot
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: metadata.screenshotBlob,
        headers: { "Content-Type": "image/png" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload screenshot");

      // 3. Publish (create/update publication + community post)
      const entryRes = await authedFetch("/api/my/publications/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: remoteId,
          projectType: type,
          title: metadata.title,
          description: metadata.description,
          eventDate: metadata.eventDate ? metadata.eventDate.toISOString() : null,
          tags: metadata.tags,
          screenshotKey: storageKey,
          mimeType: "image/png",
          fileName: screenshotFileName,
          fileSize: metadata.screenshotBlob.size,
        }),
      });

      if (!entryRes.ok) throw toApiError("Failed to publish", entryRes.status);
      return (await entryRes.json()) as {
        publicationId: string;
        postId: string;
        postUrl: string;
        projectUrl: string;
      };
    },
  };

  return repo;
}
