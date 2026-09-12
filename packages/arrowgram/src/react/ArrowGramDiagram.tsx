import React, { useEffect, useId, useMemo, useRef } from 'react';
import katex from 'katex';
import type {
  ArrowgramDiagnostic,
  ArrowgramJsonPath,
} from '../schema/diagnostics';
import { makeDiagnostic } from '../schema/diagnostics';
import type { ComputedDiagram, ComputedLabelLayout } from '../types';
import { createLabelLayout, diagramTextSummary } from '../core/label';

const FONT_SIZE = 16;
const ARROW_COLOR = '#333333';

function canonicalizeDomId(value: string): string {
  const canonical = value
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return canonical || 'arrowgram';
}

interface LabelContentProps {
  layout: ComputedLabelLayout;
  color?: string;
  textProps: React.SVGProps<SVGTextElement>;
  rotationDegrees?: number;
  isNodeLabel?: boolean;
  diagnosticPath: ArrowgramJsonPath;
  entityId?: string;
  sourceIndex?: number;
  onDiagnostic?: (diagnostic: ArrowgramDiagnostic) => void;
}

interface RenderedSegment {
  kind: 'text' | 'math' | 'error';
  value: string;
  html?: string;
  error?: string;
}

function renderSegments(layout: ComputedLabelLayout): RenderedSegment[] {
  return layout.segments.map((segment) => {
    if (segment.kind === 'text') return segment;
    try {
      return {
        kind: 'math',
        value: segment.value,
        html: katex.renderToString(segment.value, {
          throwOnError: true,
          displayMode: false,
          output: 'htmlAndMathml',
          strict: 'ignore',
          trust: false,
        }),
      };
    } catch (error) {
      return {
        kind: 'error',
        value: `$${segment.value}$`,
        error: error instanceof Error ? error.message : 'Invalid KaTeX expression.',
      };
    }
  });
}

function LabelContent({
  layout,
  color,
  textProps,
  rotationDegrees = 0,
  isNodeLabel = false,
  diagnosticPath,
  entityId,
  sourceIndex,
  onDiagnostic,
}: LabelContentProps) {
  const rendered = useMemo(() => renderSegments(layout), [layout]);
  const errors = useMemo(
    () => rendered.filter((segment) => segment.kind === 'error'),
    [rendered],
  );
  const diagnosticPathKey = diagnosticPath.join('\u0000');
  const diagnosticPathRef = useRef(diagnosticPath);
  diagnosticPathRef.current = diagnosticPath;

  useEffect(() => {
    if (!onDiagnostic) return;
    errors.forEach((segment) => {
      onDiagnostic(makeDiagnostic({
        code: 'label.katex_parse',
        severity: 'error',
        phase: 'label',
        message: segment.error ?? 'Invalid KaTeX expression.',
        path: diagnosticPathRef.current,
        entityId,
        sourceIndex,
      }));
    });
  }, [diagnosticPathKey, entityId, errors, onDiagnostic, sourceIndex]);

  if (layout.segments.length === 0) return null;

  const x = typeof textProps.x === 'number' ? textProps.x : 0;
  const y = typeof textProps.y === 'number' ? textProps.y : 0;
  const transform = rotationDegrees
    ? `rotate(${rotationDegrees} ${x} ${y})`
    : undefined;
  const finalProps: React.SVGProps<SVGTextElement> = {
    ...textProps,
    transform,
    fontWeight: isNodeLabel ? 'bold' : 'normal',
    fontSize: FONT_SIZE,
    fill: color || ARROW_COLOR,
    'aria-label': layout.accessibleText,
  };

  if (!layout.hasMath) {
    return <text {...finalProps}>{rendered.map((segment) => segment.value).join('')}</text>;
  }

  const xhtmlNamespace = {
    xmlns: 'http://www.w3.org/1999/xhtml',
  } as unknown as React.HTMLAttributes<HTMLDivElement>;

  return (
    <foreignObject
      x={x - layout.width / 2}
      y={y - layout.height / 2}
      width={layout.width}
      height={layout.height}
      transform={transform}
      aria-label={layout.accessibleText}
      data-arrowgram-label-error={errors.length > 0 ? 'true' : undefined}
      style={{ overflow: 'visible' }}
    >
      <div
        {...xhtmlNamespace}
        style={{
          alignItems: 'center',
          color: color || ARROW_COLOR,
          display: 'flex',
          fontSize: `${FONT_SIZE}px`,
          fontWeight: isNodeLabel ? 'bold' : 'normal',
          height: '100%',
          justifyContent: 'center',
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'pre',
          width: '100%',
        }}
      >
        {rendered.map((segment, index) => {
          if (segment.kind === 'math') {
            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: segment.html ?? '' }}
              />
            );
          }
          return (
            <span key={index} title={segment.error}>
              {segment.value}
            </span>
          );
        })}
      </div>
    </foreignObject>
  );
}

export interface ArrowGramDiagramProps {
  diagram: ComputedDiagram;
  instanceId?: string;
  title?: string;
  description?: string;
  decorative?: boolean;
  announce?: boolean;
  onDiagnostic?: (diagnostic: ArrowgramDiagnostic) => void;
}

export function ArrowGramDiagram({
  diagram,
  instanceId,
  title,
  description,
  decorative = false,
  announce = true,
  onDiagnostic,
}: ArrowGramDiagramProps) {
  const generatedId = useId();
  const instancePrefix = canonicalizeDomId(`${instanceId ?? 'diagram'}-${generatedId}`);
  const maskIds = new Map(
    (diagram.masks ?? []).map((mask) => [
      mask.id,
      canonicalizeDomId(`${instancePrefix}-${mask.id}`),
    ]),
  );
  const summary = diagramTextSummary(diagram);
  const accessibleName = title ?? summary;

  return (
    <g
      role={!decorative && announce ? 'img' : undefined}
      aria-label={!decorative && announce ? accessibleName : undefined}
      aria-hidden={decorative ? true : undefined}
    >
      {!decorative && announce && <title>{accessibleName}</title>}
      {!decorative && announce && description && <desc>{description}</desc>}
      <defs>
        {(diagram.masks ?? []).map((mask) => {
          const bounds = mask.bounds ?? diagram.bounds;
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          return (
            <mask
              key={mask.id}
              id={maskIds.get(mask.id)}
              maskUnits="userSpaceOnUse"
              x={bounds.minX}
              y={bounds.minY}
              width={width}
              height={height}
            >
              {mask.paths.map((path, index) => (
                <path key={index} {...path} />
              ))}
            </mask>
          );
        })}
      </defs>
      {diagram.arrows.map((arrow) => (
        <g key={arrow.key} className="arrow-visual">
          {arrow.paths.map((path, index) => {
            const { maskId, ...pathProps } = path;
            const mask = maskId
              ? `url(#${maskIds.get(maskId)})`
              : path.mask;
            return <path key={index} {...pathProps} mask={mask} />;
          })}
          {(arrow.label.layout?.segments.length ?? 0) > 0 && (
            <LabelContent
              layout={arrow.label.layout}
              color={arrow.label.color}
              textProps={arrow.label.props}
              rotationDegrees={arrow.label.rotationDegrees}
              diagnosticPath={['arrows', arrow.sourceIndex, 'label']}
              entityId={arrow.logicalId}
              sourceIndex={arrow.sourceIndex}
              onDiagnostic={onDiagnostic}
            />
          )}
          {arrow.heads.map((head, index) => (
            <path key={`h-${index}`} {...head.props} />
          ))}
          {arrow.tail.map((tail, index) => (
            <path key={`t-${index}`} {...tail.props} />
          ))}
        </g>
      ))}
      {diagram.nodes.map((node, sourceIndex) => {
        const computed = diagram.nodeLabels?.[sourceIndex];
        const fallback = createLabelLayout(node.label ?? '', { isNode: true });
        const layout = computed?.layout ?? (fallback.ok ? fallback.value : {
          source: node.label ?? '',
          segments: [{ kind: 'text' as const, value: node.label ?? '' }],
          accessibleText: node.label ?? '',
          width: 16,
          height: 24,
          hasMath: false,
        });
        return (
          <g key={node.name} transform={`translate(${node.left}, ${node.top})`}>
            <LabelContent
              layout={layout}
              color={node.color}
              textProps={{
                x: 0,
                y: 0,
                textAnchor: 'middle',
                dominantBaseline: 'middle',
              }}
              isNodeLabel
              diagnosticPath={['nodes', sourceIndex, 'label']}
              entityId={node.name}
              sourceIndex={sourceIndex}
              onDiagnostic={onDiagnostic}
            />
          </g>
        );
      })}
    </g>
  );
}
