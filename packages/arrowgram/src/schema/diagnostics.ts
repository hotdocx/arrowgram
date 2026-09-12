import type { ZodError } from 'zod';

export type ArrowgramDiagnosticSeverity = 'error' | 'warning';

export type ArrowgramDiagnosticPhase =
  | 'json'
  | 'structural'
  | 'semantic'
  | 'geometry'
  | 'label'
  | 'render'
  | 'legacy';

export type ArrowgramJsonPath = Array<string | number>;

export interface ArrowgramDiagnostic {
  code: string;
  severity: ArrowgramDiagnosticSeverity;
  phase: ArrowgramDiagnosticPhase;
  message: string;
  path: ArrowgramJsonPath;
  entityId?: string;
  sourceIndex?: number;
  details?: Record<string, unknown>;
}

export type ArrowgramResult<T> =
  | {
      ok: true;
      value: T;
      diagnostics: ArrowgramDiagnostic[];
    }
  | {
      ok: false;
      diagnostics: ArrowgramDiagnostic[];
    };

export function makeDiagnostic(
  diagnostic: ArrowgramDiagnostic,
): ArrowgramDiagnostic {
  return diagnostic;
}

function normalisePath(path: PropertyKey[]): ArrowgramJsonPath {
  return path.map((segment) => typeof segment === 'symbol' ? String(segment) : segment);
}

export function diagnosticsFromZodError(
  error: ZodError,
): ArrowgramDiagnostic[] {
  return error.issues.flatMap((issue) => {
    const custom = issue as typeof issue & {
      params?: {
        arrowgramCode?: string;
        arrowgramPhase?: ArrowgramDiagnosticPhase;
        entityId?: string;
        sourceIndex?: number;
      };
      keys?: string[];
    };
    const phase = custom.params?.arrowgramPhase ?? 'structural';
    const basePath = normalisePath(issue.path);

    if (issue.code === 'unrecognized_keys' && custom.keys?.length) {
      return custom.keys.map((key) => makeDiagnostic({
        code: 'structural.unknown_key',
        severity: 'error',
        phase: 'structural',
        message: `Unknown key: ${key}`,
        path: [...basePath, key],
        details: { key },
      }));
    }

    const structuralCode = (() => {
      switch (issue.code) {
        case 'invalid_type': return 'structural.invalid_type';
        case 'invalid_value': return 'structural.invalid_value';
        case 'too_big': return 'structural.too_big';
        case 'too_small': return 'structural.too_small';
        default: return 'structural.invalid';
      }
    })();

    return [makeDiagnostic({
      code: custom.params?.arrowgramCode ?? structuralCode,
      severity: 'error',
      phase,
      message: issue.message,
      path: basePath,
      entityId: custom.params?.entityId,
      sourceIndex: custom.params?.sourceIndex,
    })];
  });
}

export function firstErrorMessage(
  diagnostics: ArrowgramDiagnostic[],
  fallback = 'Arrowgram computation failed.',
): string {
  return diagnostics.find((diagnostic) => diagnostic.severity === 'error')?.message
    ?? diagnostics[0]?.message
    ?? fallback;
}
