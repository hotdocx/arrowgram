import { del, get, set } from "idb-keyval";

export type Attachment = {
  id: string;
  projectId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  storageKey?: string;
};

export type AttachmentRepositoryCapabilities = {
  canUpload: boolean;
  canDelete: boolean;
  canReadText: boolean;
};

export interface AttachmentRepository {
  capabilities: AttachmentRepositoryCapabilities;
  list(projectId: string): Promise<Attachment[]>;
  upload(projectId: string, file: File): Promise<Attachment>;
  remove(projectId: string, attachmentId: string): Promise<void>;
  getBlob(projectId: string, attachmentId: string): Promise<Blob>;
  getText(
    projectId: string,
    attachmentId: string,
    opts?: { maxBytes?: number; maxChars?: number }
  ): Promise<string>;
}

const META_PREFIX = "arrowgram_v2_attachment_meta_";
const BLOB_PREFIX = "arrowgram_v2_attachment_blob_";
const INDEX_PREFIX = "arrowgram_v2_attachment_index_";

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function isTextLike(contentType: string) {
  const ct = contentType.toLowerCase();
  if (ct.startsWith("text/")) return true;
  if (ct === "application/json") return true;
  if (ct === "application/xml" || ct === "text/xml") return true;
  if (ct === "application/x-yaml" || ct === "text/yaml") return true;
  if (ct === "text/markdown") return true;
  return false;
}

async function readIndex(projectId: string): Promise<string[]> {
  const existing = (await get(INDEX_PREFIX + projectId)) as unknown;
  if (Array.isArray(existing) && existing.every((x) => typeof x === "string")) {
    return existing;
  }
  return [];
}

async function writeIndex(projectId: string, ids: string[]) {
  await set(INDEX_PREFIX + projectId, ids);
}

export function createLocalAttachmentRepository(): AttachmentRepository {
  const list = async (projectId: string): Promise<Attachment[]> => {
    const ids = await readIndex(projectId);
    const metas = await Promise.all(
      ids.map(async (id) => (await get(META_PREFIX + id)) as Attachment | undefined)
    );
    return metas
      .filter(Boolean)
      .map((m) => ({ ...m! }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const repo: AttachmentRepository = {
    capabilities: { canUpload: true, canDelete: true, canReadText: true },

    list,

    async upload(projectId: string, file: File): Promise<Attachment> {
      const id = createId();
      const meta: Attachment = {
        id,
        projectId,
        fileName: file.name || "upload.bin",
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        createdAt: nowIso(),
      };
      await set(META_PREFIX + id, meta);
      await set(BLOB_PREFIX + id, file);
      const ids = await readIndex(projectId);
      ids.push(id);
      await writeIndex(projectId, Array.from(new Set(ids)));
      return { ...meta };
    },

    async remove(projectId: string, attachmentId: string): Promise<void> {
      await del(META_PREFIX + attachmentId);
      await del(BLOB_PREFIX + attachmentId);
      const ids = (await readIndex(projectId)).filter((x) => x !== attachmentId);
      await writeIndex(projectId, ids);
    },

    async getBlob(_projectId: string, attachmentId: string): Promise<Blob> {
      const blob = (await get(BLOB_PREFIX + attachmentId)) as Blob | undefined;
      if (!blob) throw new Error("Attachment not found");
      return blob;
    },

    async getText(projectId: string, attachmentId: string, opts) {
      const maxBytes = opts?.maxBytes ?? 200_000;
      const maxChars = opts?.maxChars ?? 200_000;
      const meta = (await get(META_PREFIX + attachmentId)) as Attachment | undefined;
      if (!meta || meta.projectId !== projectId) throw new Error("Attachment not found");
      if (!isTextLike(meta.contentType)) {
        throw new Error(`Attachment is not text (${meta.contentType})`);
      }
      if (meta.sizeBytes > maxBytes) {
        throw new Error(`Attachment too large (${meta.sizeBytes} bytes)`);
      }
      const blob = await repo.getBlob(projectId, attachmentId);
      const text = await blob.text();
      if (text.length > maxChars) {
        return text.slice(0, maxChars) + "\n\n[TRUNCATED]\n";
      }
      return text;
    },
  };

  return repo;
}

