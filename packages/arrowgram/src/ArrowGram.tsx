import { useMemo, useId } from "react";
import { computeDiagram } from './core/diagramModel';
import { ArrowGramDiagram } from './react/ArrowGramDiagram';

export interface ArrowGramProps {
  spec: string;
  id?: string;
}

export function ArrowGram({ spec: specString, id }: ArrowGramProps) {
  const generatedId = useId();
  // Ensure the ID is safe for SVG url references (strip colons from React's useId)
  const finalId = id || generatedId.replace(/:/g, "");
  const diagram = useMemo(() => computeDiagram(specString, finalId), [specString, finalId]);

  if (diagram.error) {
    return <div style={{ color: "red" }}>Error: {diagram.error}</div>;
  }

  return (
    <svg
      id={finalId}
      width="100%"
      viewBox={diagram.viewBox}
      style={{ fontFamily: "sans-serif", overflow: "visible" }}
    >
      <ArrowGramDiagram diagram={diagram} />
    </svg>
  );
}
