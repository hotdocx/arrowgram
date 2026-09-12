import { z } from 'zod';
import type { ArrowgramDiagnostic } from './schema/diagnostics';
import { isReservedLogicalId } from './schema/identity';
import { ARROWGRAM_LIMITS } from './schema/limits';
import { addDiagramSemanticIssues } from './schema/semantic';

function codePointLength(value: string): number {
  return [...value].length;
}

function boundedString(
  maximum: number,
  label: string,
  minimum = 0,
) {
  return z.string().superRefine((value, context) => {
    const length = codePointLength(value);
    if (length < minimum) {
      context.addIssue({
        code: 'custom',
        message: `${label} must contain at least ${minimum} Unicode code point${minimum === 1 ? '' : 's'}.`,
        params: {
          arrowgramCode: 'structural.string_too_short',
          arrowgramPhase: 'structural',
        },
      });
    }
    if (length > maximum) {
      context.addIssue({
        code: 'custom',
        message: `${label} must contain at most ${maximum} Unicode code points.`,
        params: {
          arrowgramCode: 'structural.string_too_long',
          arrowgramPhase: 'structural',
        },
      });
    }
  });
}

const LogicalIdSchema = boundedString(
  ARROWGRAM_LIMITS.logicalIdCodePoints,
  'Logical ID',
  1,
).superRefine((value, context) => {
  if (isReservedLogicalId(value)) {
    context.addIssue({
      code: 'custom',
      message: 'Logical IDs may not use the reserved Arrowgram internal namespace.',
      params: {
        arrowgramCode: 'structural.reserved_logical_id',
        arrowgramPhase: 'structural',
      },
    });
  }
});
const LabelSchema = boundedString(ARROWGRAM_LIMITS.labelCodePoints, 'Label');
const ColorSchema = boundedString(
  ARROWGRAM_LIMITS.colorCodePoints,
  'Color',
  1,
).superRefine((value, context) => {
  if (/url\s*\(/i.test(value)) {
    context.addIssue({
      code: 'custom',
      message: 'URL/resource-bearing SVG paint values are not supported.',
      params: {
        arrowgramCode: 'structural.url_paint_unsupported',
        arrowgramPhase: 'structural',
      },
    });
  }
});
const CoordinateSchema = z.number()
  .min(-ARROWGRAM_LIMITS.absoluteCoordinate)
  .max(ARROWGRAM_LIMITS.absoluteCoordinate);
const GeometrySchema = z.number()
  .min(-ARROWGRAM_LIMITS.absoluteGeometry)
  .max(ARROWGRAM_LIMITS.absoluteGeometry);
const ShortenSchema = z.number()
  .min(0)
  .max(ARROWGRAM_LIMITS.absoluteGeometry);
const AngleSchema = z.number()
  .min(-ARROWGRAM_LIMITS.absoluteAngle)
  .max(ARROWGRAM_LIMITS.absoluteAngle);

export const NodeSchema = z.object({
  name: LogicalIdSchema,
  label: LabelSchema.optional(),
  color: ColorSchema.optional(),
  left: CoordinateSchema,
  top: CoordinateSchema,
}).strict();

export type NodeSpec = z.infer<typeof NodeSchema>;

export const ArrowStyleSchema = z.object({
  mode: z.enum(['arrow', 'adjunction', 'corner', 'corner_inverse']).optional(),
  head: z.object({
    // "maps_to" renders a vertical bar (|).
    name: z.enum(['normal', 'none', 'epi', 'hook', 'maps_to', 'harpoon']).optional(),
    side: z.enum(['top', 'bottom']).optional(),
  }).strict().optional(),
  tail: z.object({
    // "maps_to" renders a vertical bar (|). Combine with head: "normal" for |->.
    name: z.enum(['normal', 'none', 'mono', 'hook', 'maps_to']).optional(),
    side: z.enum(['top', 'bottom']).optional(),
  }).strict().optional(),
  body: z.object({
    name: z.enum(['solid', 'dashed', 'dotted', 'squiggly', 'wavy', 'barred', 'double_barred', 'bullet_solid', 'bullet_hollow', 'none']).optional(),
  }).strict().optional(),
  level: z.number()
    .int()
    .min(ARROWGRAM_LIMITS.styleLevelMin)
    .max(ARROWGRAM_LIMITS.styleLevelMax)
    .optional(),
}).strict();

export type ArrowStyleSpec = z.infer<typeof ArrowStyleSchema>;

export const ArrowSchema = z.object({
  from: LogicalIdSchema,
  to: LogicalIdSchema,
  name: LogicalIdSchema.optional(),
  label: LabelSchema.optional(),
  color: ColorSchema.optional(),
  label_color: ColorSchema.optional(),
  curve: GeometrySchema.optional(),
  shift: GeometrySchema.optional(),
  radius: GeometrySchema.optional(),
  angle: AngleSchema.optional(),
  label_alignment: z.enum(['over', 'left', 'right']).optional(),
  shorten: z.object({
    source: ShortenSchema.optional(),
    target: ShortenSchema.optional(),
  }).strict().optional(),
  style: ArrowStyleSchema.optional(),
}).strict();

export type ArrowSpec = z.infer<typeof ArrowSchema>;

export const DiagramSpecSchema = z.object({
  version: z.literal(1).default(1),
  nodes: z.array(NodeSchema).max(ARROWGRAM_LIMITS.nodes),
  arrows: z.array(ArrowSchema).max(ARROWGRAM_LIMITS.arrows).default([]),
}).strict().superRefine(addDiagramSemanticIssues);

export type DiagramSpec = z.input<typeof DiagramSpecSchema>;
export type CanonicalDiagramSpec = z.output<typeof DiagramSpecSchema>;

export interface ComputedBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LabelTextSegment {
  kind: 'text';
  value: string;
}

export interface LabelMathSegment {
  kind: 'math';
  value: string;
}

export type LabelSegment = LabelTextSegment | LabelMathSegment;

export interface ComputedLabelLayout {
  source: string;
  segments: LabelSegment[];
  accessibleText: string;
  width: number;
  height: number;
  hasMath: boolean;
}

export interface ComputedNodeLabel {
  nodeId: string;
  sourceIndex: number;
  color?: string;
  layout: ComputedLabelLayout;
}

export interface ComputedArrowPath {
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  strokeLinecap?: "round" | "butt" | "square";
  mask?: string;
  maskId?: string;
}

export interface ComputedArrowPart {
  props: {
    d: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    strokeLinecap: "round" | "butt" | "square";
    transform?: string;
    mask?: string;
  }
}

export interface ComputedArrow {
  key: string;
  sourceIndex: number;
  logicalId?: string;
  spec: ArrowSpec;
  paths: ComputedArrowPath[];
  label: {
    text?: string;
    color?: string;
    layout: ComputedLabelLayout;
    props: {
      x: number;
      y: number;
      textAnchor: 'middle';
      dominantBaseline: 'middle';
      fontSize: number;
    };
    bbox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    rotation?: number; // SVG degrees; renamed explicitly in Phase 3.
    rotationDegrees: number;
  };
  heads: ComputedArrowPart[];
  tail: ComputedArrowPart[];
    midpoint: { x: number; y: number };
    sourcePoint: { x: number; y: number };
    targetPoint: { x: number; y: number };
    visibleSourcePoint: { x: number; y: number };
    visibleTargetPoint: { x: number; y: number };
    bounds: ComputedBounds;
    arcLength: number;
    interactionPath: string;
}

export interface ComputedMask {
  id: string;
  bounds: ComputedBounds;
  paths: ComputedMaskPath[];
}

export interface ComputedMaskPath {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transform?: string;
}

export interface ComputedDiagram {
  nodes: NodeSpec[];
  nodeLabels: ComputedNodeLabel[];
  arrows: ComputedArrow[];
  masks: ComputedMask[];
  bounds: ComputedBounds;
  viewBox: string;
  error: string | null;
  diagnostics: ArrowgramDiagnostic[];
}
