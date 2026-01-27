import React from "react";
import "../styles.css";
import App from "../App";
import { ToastProvider } from "../context/ToastContext";
import type { ProjectStorage } from "../context/ProjectStorageContext";
import { ProjectStorageProvider } from "../context/ProjectStorageContext";
import { EditorHostProvider } from "../context/EditorHostContext";

export function ArrowgramWorkspaceApp(props: {
  storage?: ProjectStorage;
  enablePrintPreview?: boolean;
}) {
  return (
    <ToastProvider>
      <EditorHostProvider
        value={{ enablePrintPreview: props.enablePrintPreview ?? true }}
      >
        <ProjectStorageProvider storage={props.storage}>
          <App />
        </ProjectStorageProvider>
      </EditorHostProvider>
    </ToastProvider>
  );
}

