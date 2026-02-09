import React from "react";
import type { PaperContent } from "../../utils/projectRepository";
import { PreviewController as PagedPreviewController } from "./PreviewController";
import { RevealPreviewController } from "./RevealPreviewController";

export function DocumentPreview(props: {
  paper: PaperContent;
  isTwoColumn: boolean;
  onEditDiagram: (id: string, spec: string) => void;
}) {
  const { paper } = props;

  if (paper.renderTemplate === "reveal") {
    return (
      <RevealPreviewController
        markdown={paper.markdown}
        customCss={paper.customCss}
        editable
        onEditDiagram={props.onEditDiagram}
      />
    );
  }

  return (
    <PagedPreviewController
      markdown={paper.markdown}
      isTwoColumn={props.isTwoColumn}
      customCss={paper.customCss}
      onEditDiagram={props.onEditDiagram}
    />
  );
}

