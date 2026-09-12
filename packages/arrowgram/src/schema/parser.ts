import type { CanonicalDiagramSpec } from '../types';
import { DiagramSpecSchema } from '../types';
import {
  diagnosticsFromZodError,
  makeDiagnostic,
  type ArrowgramDiagnostic,
  type ArrowgramResult,
} from './diagnostics';
import { normalizeLegacyDiagramSpec } from './normalize';

export interface ParseDiagramSpecOptions {
  normalizeLegacy?: boolean;
}

export function parseDiagramSpec(
  input: unknown,
  options: ParseDiagramSpecOptions = {},
): ArrowgramResult<CanonicalDiagramSpec> {
  let raw = input;
  const diagnostics: ArrowgramDiagnostic[] = [];

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (error) {
      return {
        ok: false,
        diagnostics: [makeDiagnostic({
          code: 'json.syntax',
          severity: 'error',
          phase: 'json',
          message: error instanceof Error ? error.message : 'Invalid JSON.',
          path: [],
        })],
      };
    }
  }

  if (options.normalizeLegacy) {
    const normalized = normalizeLegacyDiagramSpec(raw);
    raw = normalized.value;
    diagnostics.push(...normalized.diagnostics);
  }

  const parsed = DiagramSpecSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      diagnostics: [...diagnostics, ...diagnosticsFromZodError(parsed.error)],
    };
  }

  return {
    ok: true,
    value: parsed.data,
    diagnostics,
  };
}

export function validateDiagramSpec(
  input: unknown,
): ArrowgramResult<CanonicalDiagramSpec> {
  return parseDiagramSpec(input);
}
