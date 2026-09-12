import {
  makeDiagnostic,
  type ArrowgramDiagnostic,
} from './diagnostics';

export interface LegacyNormalizationResult {
  value: unknown;
  diagnostics: ArrowgramDiagnostic[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeLegacyDiagramSpec(
  input: unknown,
): LegacyNormalizationResult {
  if (!isRecord(input)) return { value: input, diagnostics: [] };

  const result: Record<string, unknown> = { ...input };
  const diagnostics: ArrowgramDiagnostic[] = [];

  if (Array.isArray(input.arrows)) {
    result.arrows = input.arrows.map((candidate, sourceIndex) => {
      if (!isRecord(candidate) || !Object.hasOwn(candidate, 'uniqueId')) return candidate;

      const arrow = { ...candidate };
      const removed = arrow.uniqueId;
      delete arrow.uniqueId;
      diagnostics.push(makeDiagnostic({
        code: 'legacy.unique_id_removed',
        severity: 'warning',
        phase: 'legacy',
        message: 'Removed renderer-only legacy field uniqueId from ArrowSpec.',
        path: ['arrows', sourceIndex, 'uniqueId'],
        sourceIndex,
        details: { removedType: typeof removed },
      }));
      return arrow;
    });
  }

  return { value: result, diagnostics };
}
