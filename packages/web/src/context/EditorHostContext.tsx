import React from "react";

export interface EditorHostConfig {
  enablePrintPreview: boolean;
  /**
   * Optional absolute path (same-origin) for the print preview route in the host app.
   * If unset, Arrowgram falls back to `${import.meta.env.BASE_URL}/print-preview`.
   */
  printPreviewPath?: string;
  /**
   * Optional host exit action for embedded/inlined use (e.g. "Back to Dashboard").
   */
  exit?: {
    href: string;
    label?: string;
  };

  /**
   * If set, host wants Arrowgram to open this project immediately (no dashboard).
   * For LastRevision remote IDs, this is typically `paper:<uuid>` or `diagram:<uuid>`.
   */
  initialProjectId?: string;
  /**
   * If true, Arrowgram should avoid showing its internal dashboard navigation.
   * Intended for “share view” and embedded single-project modes.
   */
  disableDashboard?: boolean;
  /**
   * Host-controlled permissions for the current viewer.
   */
  permissions?: {
    /**
     * Whether the viewer may persist changes to the backing project.
     * When false, UI should hide/disable save + rename + other persistence mutations.
     */
    canPersist: boolean;
  };
  /**
   * Host default view for PaperEditor.
   */
  paperInitialFilesView?: "split" | "code" | "preview" | "styles";
  /**
   * Host toggles for optionally removing surfaces from embedded/share modes.
   */
  disableAI?: boolean;
  disableAttachments?: boolean;
}

const defaultHostConfig: EditorHostConfig = {
  enablePrintPreview: true,
};

const EditorHostContext = React.createContext<EditorHostConfig>(defaultHostConfig);

export function EditorHostProvider(props: {
  children: React.ReactNode;
  value?: Partial<EditorHostConfig>;
}) {
  return (
    <EditorHostContext.Provider
      value={{ ...defaultHostConfig, ...(props.value ?? {}) }}
    >
      {props.children}
    </EditorHostContext.Provider>
  );
}

export function useEditorHostConfig(): EditorHostConfig {
  return React.useContext(EditorHostContext);
}
