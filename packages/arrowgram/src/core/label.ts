import type { ComputedDiagram, ComputedLabelLayout, LabelSegment } from '../types';
import {
  makeDiagnostic,
  type ArrowgramResult,
  type ArrowgramJsonPath,
} from '../schema/diagnostics';

export interface LabelLayoutOptions {
  path?: ArrowgramJsonPath;
  entityId?: string;
  sourceIndex?: number;
  isNode?: boolean;
}

function appendSegment(segments: LabelSegment[], segment: LabelSegment): void {
  if (segment.value.length === 0) return;
  const previous = segments[segments.length - 1];
  if (previous?.kind === segment.kind) previous.value += segment.value;
  else segments.push(segment);
}

export function estimateMathVisualUnits(math: string): number {
  const commandsAsAtoms = math.replace(/\\[a-zA-Z]+/g, 'M');
  const withoutSyntax = commandsAsAtoms.replace(/[_^{}]/g, '');
  return [...withoutSyntax].reduce(
    (total, character) => total + (/\s/.test(character) ? 0.5 : 1),
    0,
  );
}

function layoutWidth(segments: LabelSegment[], isNode: boolean): number {
  const rawWidth = segments.reduce((width, segment) => {
    if (segment.kind === 'math') {
      return width + Math.max(8, estimateMathVisualUnits(segment.value) * 9 + 6);
    }
    return width + [...segment.value].length * 8;
  }, 0);
  return Math.max(16, rawWidth * (isNode ? 1.05 : 1) + 8);
}

export function createLabelLayout(
  source = '',
  options: LabelLayoutOptions = {},
): ArrowgramResult<ComputedLabelLayout> {
  if (source.length === 0) {
    return {
      ok: true,
      value: {
        source,
        segments: [],
        accessibleText: '',
        width: 0,
        height: 0,
        hasMath: false,
      },
      diagnostics: [],
    };
  }

  const segments: LabelSegment[] = [];
  let buffer = '';
  let kind: LabelSegment['kind'] = 'text';
  let hasEmptyMath = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\' && source[index + 1] === '$') {
      buffer += kind === 'math' ? '\\$' : '$';
      index += 1;
      continue;
    }
    if (character === '$') {
      if (kind === 'math' && buffer.trim() === '') hasEmptyMath = true;
      appendSegment(segments, { kind, value: buffer });
      buffer = '';
      kind = kind === 'text' ? 'math' : 'text';
      continue;
    }
    buffer += character;
  }

  if (kind === 'math') {
    return {
      ok: false,
      diagnostics: [makeDiagnostic({
        code: 'label.unterminated_math',
        severity: 'error',
        phase: 'label',
        message: 'Inline math label has an unterminated `$` delimiter.',
        path: options.path ?? [],
        entityId: options.entityId,
        sourceIndex: options.sourceIndex,
      })],
    };
  }

  appendSegment(segments, { kind: 'text', value: buffer });
  if (hasEmptyMath) {
    return {
      ok: false,
      diagnostics: [makeDiagnostic({
        code: 'label.empty_math',
        severity: 'error',
        phase: 'label',
        message: 'Inline math label contains an empty `$...$` segment.',
        path: options.path ?? [],
        entityId: options.entityId,
        sourceIndex: options.sourceIndex,
      })],
    };
  }

  const hasMath = segments.some((segment) => segment.kind === 'math');
  return {
    ok: true,
    value: {
      source,
      segments,
      accessibleText: segments.map((segment) => segment.value).join(''),
      width: layoutWidth(segments, options.isNode ?? false),
      height: hasMath ? 28 : 24,
      hasMath,
    },
    diagnostics: [],
  };
}

export function diagramTextSummary(diagram: ComputedDiagram): string {
  const nodes = diagram.nodes.map((node, sourceIndex) => {
    const label = diagram.nodeLabels?.[sourceIndex]?.layout.accessibleText;
    return label && label !== node.name ? `${node.name} (${label})` : node.name;
  });
  const arrows = [...diagram.arrows]
    .sort((left, right) => left.sourceIndex - right.sourceIndex)
    .map((arrow) => {
      const identity = arrow.logicalId ?? `arrow ${arrow.sourceIndex + 1}`;
      const label = arrow.label.layout?.accessibleText ?? arrow.label.text ?? '';
      const prefix = label && label !== identity ? `${identity} (${label})` : identity;
      return `${prefix}: ${arrow.spec.from} to ${arrow.spec.to}`;
    });

  const nodeSummary = nodes.length > 0 ? `Nodes: ${nodes.join(', ')}.` : 'No nodes.';
  const arrowSummary = arrows.length > 0 ? ` Arrows: ${arrows.join('; ')}.` : ' No arrows.';
  return `${nodeSummary}${arrowSummary}`;
}
