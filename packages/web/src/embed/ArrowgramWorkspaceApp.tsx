import React from "react";
import "../styles.css";
import App from "../App";
import { ToastProvider } from "../context/ToastContext";
import type { ProjectRepository } from "../utils/projectRepository";
import { ProjectRepositoryProvider } from "../context/ProjectRepositoryContext";
import { EditorHostProvider } from "../context/EditorHostContext";
import type { AttachmentRepository } from "../utils/attachmentRepository";
import { AttachmentRepositoryProvider } from "../context/AttachmentRepositoryContext";

export function ArrowgramWorkspaceApp(props: {
  repository?: ProjectRepository;
  attachmentRepository?: AttachmentRepository;
  enablePrintPreview?: boolean;
  printPreviewPath?: string;
  exitHref?: string;
  exitLabel?: string;
  initialProjectId?: string;
  disableDashboard?: boolean;
  permissions?: { canPersist: boolean };
  paperInitialFilesView?: "split" | "code" | "preview";
  disableAI?: boolean;
  disableAttachments?: boolean;
}) {
  return (
    <ToastProvider>
      <EditorHostProvider
        value={{
          enablePrintPreview: props.enablePrintPreview ?? true,
          printPreviewPath: props.printPreviewPath,
          exit: props.exitHref ? { href: props.exitHref, label: props.exitLabel } : undefined,
          initialProjectId: props.initialProjectId,
          disableDashboard: props.disableDashboard,
          permissions: props.permissions,
          paperInitialFilesView: props.paperInitialFilesView,
          disableAI: props.disableAI,
          disableAttachments: props.disableAttachments,
        }}
      >
        <ProjectRepositoryProvider repository={props.repository}>
          <AttachmentRepositoryProvider repository={props.attachmentRepository}>
            <App />
          </AttachmentRepositoryProvider>
        </ProjectRepositoryProvider>
      </EditorHostProvider>
    </ToastProvider>
  );
}
