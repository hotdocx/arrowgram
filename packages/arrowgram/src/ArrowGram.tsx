import { useMemo } from "react";
import { computeDiagram } from './core/diagramModel';
import { ArrowGramDiagram } from './react/ArrowGramDiagram';

export interface ArrowGramProps {
  spec: string;
  id?: string;
}

export function ArrowGram({ spec: specString, id }: ArrowGramProps) {
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
