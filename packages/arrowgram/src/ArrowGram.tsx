import { useMemo, useId } from "react";
import { computeDiagramResult } from './core/diagramModel';
import { diagramTextSummary } from './core/label';
import { ArrowGramDiagram } from './react/ArrowGramDiagram';
import { firstErrorMessage, type ArrowgramDiagnostic } from './schema/diagnostics';

export interface ArrowGramProps {
  spec: string;
  id?: string;
  title?: string;
  description?: string;
  decorative?: boolean;
  onDiagnostic?: (diagnostic: ArrowgramDiagnostic) => void;
}

export function ArrowGram({
  spec: specString,
  id,
  title,
  description,
  decorative = false,
  onDiagnostic,
}: ArrowGramProps) {
  const generatedId = useId();
  // Ensure the ID is safe for SVG url references (strip colons from React's useId)
  const finalId = id || generatedId.replace(/:/g, "");
  const result = useMemo(
    () => computeDiagramResult(specString, finalId, { normalizeLegacy: true }),
    [specString, finalId],
  );

  if (!result.ok) {
    return <div role="alert" style={{ color: "red" }}>Error: {firstErrorMessage(result.diagnostics)}</div>;
  }

  const diagram = result.value;
  const accessibleName = title ?? diagramTextSummary(diagram);

  return (
    <svg
      id={finalId}
      width="100%"
      viewBox={diagram.viewBox}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleName}
      aria-hidden={decorative ? true : undefined}
      style={{ fontFamily: "sans-serif", overflow: "visible" }}
    >
      {!decorative && <title>{accessibleName}</title>}
      {!decorative && description && <desc>{description}</desc>}
      <ArrowGramDiagram
        diagram={diagram}
        instanceId={finalId}
        decorative={decorative}
        announce={false}
        onDiagnostic={onDiagnostic}
      />
    </svg>
  );
}
