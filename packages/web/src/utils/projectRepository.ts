import { del, get, keys, set } from "idb-keyval";

export type ProjectType = "diagram" | "paper";

export type PaperRenderTemplate = "paged" | "reveal";

export type PaperContent = {
  markdown: string;
  renderTemplate: PaperRenderTemplate;
  themeId?: string;
  customCss: string;
};

export type ProjectSummary = {
  id: string;
  type: ProjectType;
  title: string;
  updatedAt: string;
  isPublic?: boolean;
  paper?: {
    renderTemplate: PaperRenderTemplate;
    themeId?: string;
  };
};

export type Project =
  | (ProjectSummary & { type: "diagram"; content: string })
  | (ProjectSummary & { type: "paper"; content: PaperContent });

export type ProjectRepositoryCapabilities = {
  sharing?: {
    canTogglePublic: boolean;
    canGetPublicUrl: boolean;
    canPublishToGallery?: boolean;
  };
  attachments?: {
    canUpload: boolean;
  };
  ai?: {
    mode: "byok-client" | "server-proxy";
  };
};

export interface ProjectRepository {
  capabilities: ProjectRepositoryCapabilities;
  list(): Promise<ProjectSummary[]>;
  create(input: {
    type: ProjectType;
    title?: string;
    content?: string;
    paper?: Partial<PaperContent>;
  }): Promise<Project>;
  get(id: string): Promise<Project>;
  update(input: {
    id: string;
    title?: string;
    content?: string;
    paper?: Partial<PaperContent>;
    isPublic?: boolean;
  }): Promise<Project>;
  remove(id: string): Promise<void>;
  getPublicUrl?(id: string): Promise<string>;
  publishToGallery?(
    id: string,
    metadata: {
      title: string;
      description?: string;
      eventDate?: Date;
      tags: string[];
      screenshotBlob: Blob;
    }
  ): Promise<{ postUrl: string; projectUrl: string; publicationId: string; postId: string }>;
}

const LEGACY_PREFIX = "arrowgram_project_";
const PROJECT_PREFIX = "arrowgram_v2_project_";
const INDEX_KEY = "arrowgram_v2_project_index";
const MIGRATED_KEY = "arrowgram_v2_migrated_from_v1";

type StoredProject = {
  id: string;
  type: ProjectType;
  title: string;
  content: string | PaperContent;
  updatedAt: string;
  isPublic?: boolean;
};

type LegacyProjectMeta = {
  name: string;
  updatedAt: string;
  type?: ProjectType;
  spec: string;
};

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

async function readIndex(): Promise<string[]> {
  const existing = (await get(INDEX_KEY)) as unknown;
  if (Array.isArray(existing) && existing.every((x) => typeof x === "string")) {
    return existing;
  }
  return [];
}

async function writeIndex(ids: string[]) {
  await set(INDEX_KEY, ids);
}

async function migrateLegacyIfNeeded() {
  const migrated = await get(MIGRATED_KEY);
  if (migrated === true) return;

  const allKeys = await keys();
  const legacyKeys = allKeys.filter((k) => String(k).startsWith(LEGACY_PREFIX));
  if (legacyKeys.length === 0) {
    await set(MIGRATED_KEY, true);
    return;
  }

  const ids = await readIndex();

  for (const key of legacyKeys) {
    const legacy = (await get(key)) as LegacyProjectMeta | undefined;
    if (!legacy || typeof legacy.name !== "string" || typeof legacy.spec !== "string") {
      continue;
    }
    const id = createId();
    const type: ProjectType = legacy.type === "paper" ? "paper" : "diagram";
    const stored: StoredProject = {
      id,
      type,
      title: legacy.name,
      content: legacy.spec,
      updatedAt: legacy.updatedAt || nowIso(),
    };
    await set(PROJECT_PREFIX + id, stored);
    ids.push(id);
    await del(key);
  }

  await writeIndex(Array.from(new Set(ids)));
  await set(MIGRATED_KEY, true);
}

export function createLocalProjectRepository(): ProjectRepository {
  const repo: ProjectRepository = {
    capabilities: {
      sharing: { canTogglePublic: false, canGetPublicUrl: false },
      attachments: { canUpload: true },
      ai: { mode: "byok-client" },
    },

    async list() {
      await migrateLegacyIfNeeded();
      const ids = await readIndex();
      const projects = await Promise.all(
        ids.map(async (id) => (await get(PROJECT_PREFIX + id)) as StoredProject | undefined)
      );
      return projects
        .filter(Boolean)
        .map((p) => {
          if (p!.type === "paper") {
            const paperContent =
              typeof p!.content === "string"
                ? ({
                    markdown: p!.content,
                    renderTemplate: "paged",
                    customCss: "",
                  } satisfies PaperContent)
                : (p!.content as PaperContent);
            return {
              id: p!.id,
              type: "paper" as const,
              title: p!.title,
              updatedAt: p!.updatedAt,
              isPublic: p!.isPublic,
              paper: { renderTemplate: paperContent.renderTemplate, themeId: paperContent.themeId },
            };
          }

          return {
            id: p!.id,
            type: "diagram" as const,
            title: p!.title,
            updatedAt: p!.updatedAt,
            isPublic: p!.isPublic,
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },

    async create(input) {
      await migrateLegacyIfNeeded();
      const id = createId();
      const title =
        typeof input.title === "string" && input.title.trim()
          ? input.title.trim()
          : input.type === "paper"
            ? "Untitled Paper"
            : "Untitled Diagram";
      const content =
        input.type === "paper"
          ? ({
              markdown: typeof input.content === "string" ? input.content : "",
              renderTemplate: input.paper?.renderTemplate ?? "paged",
              themeId: input.paper?.themeId,
              customCss: input.paper?.customCss ?? "",
            } satisfies PaperContent)
          : typeof input.content === "string"
            ? input.content
            : "";
      const stored: StoredProject = {
        id,
        type: input.type,
        title,
        content,
        updatedAt: nowIso(),
      };
      await set(PROJECT_PREFIX + id, stored);
      const ids = await readIndex();
      ids.push(id);
      await writeIndex(Array.from(new Set(ids)));
      if (stored.type === "paper") {
        const paperContent =
          typeof stored.content === "string"
            ? ({
                markdown: stored.content,
                renderTemplate: "paged",
                customCss: "",
              } satisfies PaperContent)
            : (stored.content as PaperContent);
        return {
          id: stored.id,
          type: "paper",
          title: stored.title,
          updatedAt: stored.updatedAt,
          isPublic: stored.isPublic,
          paper: { renderTemplate: paperContent.renderTemplate, themeId: paperContent.themeId },
          content: paperContent,
        };
      }
      return { ...(stored as any) } as any;
    },

    async get(id) {
      await migrateLegacyIfNeeded();
      const stored = (await get(PROJECT_PREFIX + id)) as StoredProject | undefined;
      if (!stored) throw new Error("Project not found");
      if (stored.type === "paper") {
        const paperContent =
          typeof stored.content === "string"
            ? ({
                markdown: stored.content,
                renderTemplate: "paged",
                customCss: "",
              } satisfies PaperContent)
            : (stored.content as PaperContent);
        return {
          id: stored.id,
          type: "paper",
          title: stored.title,
          updatedAt: stored.updatedAt,
          isPublic: stored.isPublic,
          paper: { renderTemplate: paperContent.renderTemplate, themeId: paperContent.themeId },
          content: paperContent,
        };
      }
      return { ...(stored as any) } as any;
    },

    async update(input) {
      await migrateLegacyIfNeeded();
      const stored = (await get(PROJECT_PREFIX + input.id)) as StoredProject | undefined;
      if (!stored) throw new Error("Project not found");
      const nextContent =
        stored.type === "paper"
          ? (() => {
              const existing =
                typeof stored.content === "string"
                  ? ({
                      markdown: stored.content,
                      renderTemplate: "paged",
                      customCss: "",
                    } satisfies PaperContent)
                  : (stored.content as PaperContent);
              return {
                ...existing,
                markdown:
                  typeof input.paper?.markdown === "string"
                    ? input.paper.markdown
                    : typeof input.content === "string"
                      ? input.content
                      : existing.markdown,
                renderTemplate: input.paper?.renderTemplate ?? existing.renderTemplate,
                themeId:
                  typeof input.paper?.themeId === "string"
                    ? input.paper.themeId
                    : existing.themeId,
                customCss:
                  typeof input.paper?.customCss === "string"
                    ? input.paper.customCss
                    : existing.customCss,
              } satisfies PaperContent;
            })()
          : typeof input.content === "string"
            ? input.content
            : stored.content;
      const next: StoredProject = {
        ...stored,
        title:
          typeof input.title === "string" && input.title.trim()
            ? input.title.trim()
            : stored.title,
        content: nextContent,
        isPublic: typeof input.isPublic === "boolean" ? input.isPublic : stored.isPublic,
        updatedAt: nowIso(),
      };
      await set(PROJECT_PREFIX + input.id, next);
      if (next.type === "paper") {
        const paperContent =
          typeof next.content === "string"
            ? ({
                markdown: next.content,
                renderTemplate: "paged",
                customCss: "",
              } satisfies PaperContent)
            : (next.content as PaperContent);
        return {
          id: next.id,
          type: "paper",
          title: next.title,
          updatedAt: next.updatedAt,
          isPublic: next.isPublic,
          paper: { renderTemplate: paperContent.renderTemplate, themeId: paperContent.themeId },
          content: paperContent,
        };
      }
      return { ...(next as any) } as any;
    },

    async remove(id) {
      await migrateLegacyIfNeeded();
      await del(PROJECT_PREFIX + id);
      const ids = (await readIndex()).filter((x) => x !== id);
      await writeIndex(ids);
    },
  };

  return repo;
}
