import type {
  Attachment,
  AttachmentRepository,
} from "../utils/attachmentRepository";
import type { ProjectType } from "../utils/projectRepository";

type RemoteId = { type: ProjectType; remoteId: string };

function decodeProjectId(id: string): RemoteId {
  const [type, remoteId] = id.split(":", 2);
  if ((type !== "paper" && type !== "diagram") || !remoteId) {
    throw new Error("Invalid project id");
  }
  return { type, remoteId };
}

type AttachmentDto = {
  id: string;
  projectType: ProjectType;
  projectId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  storageKey: string;
};

function toAttachment(projectId: string, dto: AttachmentDto): Attachment {
  return {
    id: dto.id,
    projectId,
    fileName: dto.fileName,
    contentType: dto.contentType,
    sizeBytes: dto.sizeBytes,
    createdAt: dto.createdAt,
    storageKey: dto.storageKey,
  };
}

export function createLastRevisionAttachmentRepository(params: {
  apiBaseUrl: string;
  getToken: () => string;
}): AttachmentRepository {
  const base = params.apiBaseUrl.replace(/\/+$/, "");
  const cache = new Map<string, Attachment>();

  const authedFetch = async (path: string, init?: RequestInit) => {
    const token = params.getToken();
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return await fetch(`${base}${path}`, { ...init, headers });
  };

  const repo: AttachmentRepository = {
    capabilities: { canUpload: true, canDelete: true, canReadText: true },

    async list(projectId: string): Promise<Attachment[]> {
      const { type, remoteId } = decodeProjectId(projectId);
      const res = await authedFetch(
        `/api/my/attachments?projectType=${encodeURIComponent(type)}&projectId=${encodeURIComponent(
          remoteId
        )}`,
        { method: "GET" }
      );
      if (!res.ok) throw new Error(`Failed to list attachments (${res.status})`);
      const items = (await res.json()) as AttachmentDto[];
      const attachments = items.map((dto) => toAttachment(projectId, dto));
      for (const a of attachments) cache.set(a.id, a);
      return attachments.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    async upload(projectId: string, file: File): Promise<Attachment> {
      const { type, remoteId } = decodeProjectId(projectId);
      const res = await authedFetch(`/api/my/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType: type,
          projectId: remoteId,
          fileName: file.name || "upload.bin",
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      if (!res.ok) throw new Error(`Failed to presign attachment (${res.status})`);
      const json = (await res.json()) as { uploadUrl: string; attachment: AttachmentDto };
      const attachment = toAttachment(projectId, json.attachment);
      cache.set(attachment.id, attachment);

      try {
        try {
          const putRes = await fetch(json.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": attachment.contentType },
            body: file,
          });
          if (putRes.ok) return attachment;
        } catch {
          // fall through to proxy upload below
        }

        // Fallback: proxy upload through the API (works when object storage CORS is not configured
        // for the current origin, e.g. local dev against R2).
        const proxyRes = await authedFetch(
          `/api/my/attachments/upload?attachmentId=${encodeURIComponent(attachment.id)}`,
          {
            method: "POST",
            headers: { "Content-Type": attachment.contentType },
            body: file,
          }
        );
        if (!proxyRes.ok) {
          throw new Error(`Upload failed (${proxyRes.status})`);
        }
        return attachment;
      } catch (e) {
        try {
          await repo.remove(projectId, attachment.id);
        } catch {
          // ignore cleanup failure
        }
        throw e;
      }
    },

    async remove(_projectId: string, attachmentId: string): Promise<void> {
      const res = await authedFetch(`/api/my/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Failed to delete attachment (${res.status})`);
      cache.delete(attachmentId);
    },

    async getBlob(projectId: string, attachmentId: string): Promise<Blob> {
      let meta = cache.get(attachmentId);
      if (!meta) {
        const items = await repo.list(projectId);
        meta = items.find((x) => x.id === attachmentId);
      }
      if (!meta?.storageKey) throw new Error("Attachment not found");

      // Prefer proxy download through the API to avoid object storage CORS issues (especially in local dev).
      try {
        const proxyRes = await authedFetch(
          `/api/my/attachments/download?attachmentId=${encodeURIComponent(attachmentId)}`,
          { method: "GET" }
        );
        if (proxyRes.ok) {
          return await proxyRes.blob();
        }
      } catch {
        // fall back to signed URL fetch below
      }

      const urlRes = await authedFetch(
        `/api/my/uploads/url?key=${encodeURIComponent(meta.storageKey)}`,
        { method: "GET" }
      );
      if (!urlRes.ok) throw new Error(`Failed to get attachment URL (${urlRes.status})`);
      const { url } = (await urlRes.json()) as { url: string };
      const blobRes = await fetch(url);
      if (!blobRes.ok) throw new Error(`Failed to download attachment (${blobRes.status})`);
      return await blobRes.blob();
    },

    async getText(projectId: string, attachmentId: string, opts) {
      const maxBytes = opts?.maxBytes ?? 200_000;
      const maxChars = opts?.maxChars ?? 200_000;
      let meta = cache.get(attachmentId);
      if (!meta) {
        const items = await repo.list(projectId);
        meta = items.find((x) => x.id === attachmentId);
      }
      if (!meta) throw new Error("Attachment not found");
      if (meta.sizeBytes > maxBytes) {
        throw new Error(`Attachment too large (${meta.sizeBytes} bytes)`);
      }
      const ct = meta.contentType.toLowerCase();
      const isText =
        ct.startsWith("text/") ||
        ct === "application/json" ||
        ct === "application/xml" ||
        ct === "text/xml" ||
        ct === "application/x-yaml" ||
        ct === "text/yaml" ||
        ct === "text/markdown";
      if (!isText) {
        throw new Error(`Attachment is not text (${meta.contentType})`);
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
