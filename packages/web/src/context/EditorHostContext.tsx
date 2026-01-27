import React from "react";

export interface EditorHostConfig {
  enablePrintPreview: boolean;
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

