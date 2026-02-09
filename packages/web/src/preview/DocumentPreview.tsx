import React from "react";
import type { PaperContent } from "../utils/projectRepository";
import PreviewController from "./PreviewController";
import { RevealPreviewController } from "../components/PaperEditor/RevealPreviewController";

export default function DocumentPreview(props: {
  paper: PaperContent;
  isTwoColumn: boolean;
  revealMode?: "screen" | "print-pdf";
  onRevealReady?: (deck: any) => void;
}) {
  const { paper, isTwoColumn } = props;

  if (paper.renderTemplate === "reveal") {
    return (
      <div style={{ width: "100%", height: "100vh", minHeight: "600px" }}>
        <RevealPreviewController
          markdown={paper.markdown}
          customCss={paper.customCss}
          editable={false}
          mode={props.revealMode ?? "screen"}
          onReady={props.onRevealReady}
        />
      </div>
    );
  }

  return (
    <PreviewController
      markdown={paper.markdown}
      isTwoColumn={isTwoColumn}
      customCss={paper.customCss}
    />
  );
}
