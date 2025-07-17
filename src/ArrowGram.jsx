import React, { useMemo } from "react";
import { computeDiagram } from './diagramModel.js';
import { ArrowGramDiagram } from './ArrowGramDiagram.jsx';

export function ArrowGram({ spec: specString, id }) {
  const diagram = useMemo(() => computeDiagram(specString), [specString]);

  if (diagram.error) {
    return <div style={{ color: "red" }}>Error: {diagram.error}</div>;
  }

  return (
    <svg
      id={id}
      width="100%"
      viewBox={diagram.viewBox}
      style={{ fontFamily: "sans-serif", overflow: "visible" }}
    >
      <ArrowGramDiagram diagram={diagram} />
    </svg>
  );
}