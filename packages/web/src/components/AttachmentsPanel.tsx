import React from "react";
import { Paperclip, Trash2, Download, RefreshCw, Upload } from "lucide-react";
import { useAttachmentRepository } from "../context/AttachmentRepositoryContext";
import { useToast } from "../context/ToastContext";
import type { Attachment } from "../utils/attachmentRepository";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function AttachmentsPanel(props: { projectId: string }) {
  const repo = useAttachmentRepository();
  const { addToast } = useToast();

  const [items, setItems] = React.useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await repo.list(props.projectId);
      setItems(next);
    } catch (e: any) {
      console.error(e);
      addToast(e?.message ?? "Failed to load files", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast, props.projectId, repo]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!repo.capabilities.canUpload) {
      addToast("Uploads are not supported in this host.", "error");
      return;
    }
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await repo.upload(props.projectId, file);
      }
      addToast("Uploaded.", "success");
      await refresh();
    } catch (e: any) {
      console.error(e);
      addToast(e?.message ?? "Upload failed", "error");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (attachmentId: string, fileName: string) => {
    try {
      const blob = await repo.getBlob(props.projectId, attachmentId);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || "download.bin";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error(e);
      addToast(e?.message ?? "Download failed", "error");
    }
  };

  const remove = async (attachmentId: string) => {
    if (!repo.capabilities.canDelete) {
      addToast("Delete is not supported in this host.", "error");
      return;
    }
    try {
      await repo.remove(props.projectId, attachmentId);
      addToast("Deleted.", "success");
      await refresh();
    } catch (e: any) {
      console.error(e);
      addToast(e?.message ?? "Delete failed", "error");
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="attachments-panel">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-gray-800 font-semibold">
          <Paperclip size={16} />
          <span>Files</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void refresh()}
            className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50"
            disabled={isLoading || isUploading}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50"
            disabled={!repo.capabilities.canUpload || isUploading}
            title="Upload"
          >
            <Upload size={14} />
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            data-testid="attachments-file-input"
            onChange={(e) => void uploadFiles(e.target.files)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {isLoading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">
            No files yet. Upload attachments to reference them in your work (and optionally in AI).
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {a.fileName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {a.contentType} · {formatBytes(a.sizeBytes)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => void download(a.id, a.fileName)}
                    className="p-2 rounded hover:bg-gray-100 text-gray-600"
                    title="Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => void remove(a.id)}
                    className="p-2 rounded hover:bg-red-50 text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isUploading ? (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-600 bg-gray-50">
          Uploading…
        </div>
      ) : null}
    </div>
  );
}
