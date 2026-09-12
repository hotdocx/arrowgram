import { toJSONSchema } from 'zod';
import { DiagramSpecSchema } from '../types';
import { ARROWGRAM_INTERNAL_ID_PREFIX } from './identity';
import { ARROWGRAM_LIMITS } from './limits';

export const ARROWGRAM_JSON_SCHEMA_ID =
  'https://raw.githubusercontent.com/hotdocx/arrowgram/main/packages/arrowgram/arrowgram.schema.json';

interface MutableJsonSchema {
  [key: string]: unknown;
  properties?: Record<string, MutableJsonSchema>;
  items?: MutableJsonSchema;
  minLength?: number;
  maxLength?: number;
  not?: MutableJsonSchema;
}

function applyStringBounds(
  property: MutableJsonSchema | undefined,
  options: {
    minimum?: number;
    maximum: number;
    rejectUrlPaint?: boolean;
    rejectReservedId?: boolean;
  },
): void {
  if (!property) return;
  if ((options.minimum ?? 0) > 0) property.minLength = options.minimum;
  property.maxLength = options.maximum;
  if (options.rejectUrlPaint) {
    property.not = { pattern: '[uU][rR][lL]\\s*\\(' };
  }
  if (options.rejectReservedId) {
    property.not = { pattern: `^${ARROWGRAM_INTERNAL_ID_PREFIX}` };
  }
}

export function createDiagramSpecJsonSchema(): Record<string, unknown> {
  const schema = toJSONSchema(DiagramSpecSchema, { io: 'input' }) as MutableJsonSchema;
  schema.$id = ARROWGRAM_JSON_SCHEMA_ID;
  schema.title = 'Arrowgram Format v1';
  schema.description = 'Structural schema for Arrowgram format v1 commutative diagrams.';
  schema.$comment = 'Graph identity, endpoint, cycle, dependency-depth, and loop semantics require @hotdocx/arrowgram parseDiagramSpec/validateDiagramSpec after structural JSON Schema validation.';
  schema['x-arrowgram-format-version'] = 1;
  schema['x-arrowgram-semantic-validator'] = '@hotdocx/arrowgram.parseDiagramSpec';

  const nodeProperties = schema.properties?.nodes?.items?.properties;
  const arrowProperties = schema.properties?.arrows?.items?.properties;

  applyStringBounds(nodeProperties?.name, {
    minimum: 1,
    maximum: ARROWGRAM_LIMITS.logicalIdCodePoints,
    rejectReservedId: true,
  });
  applyStringBounds(nodeProperties?.label, { maximum: ARROWGRAM_LIMITS.labelCodePoints });
  applyStringBounds(nodeProperties?.color, {
    minimum: 1,
    maximum: ARROWGRAM_LIMITS.colorCodePoints,
    rejectUrlPaint: true,
  });

  for (const endpoint of ['from', 'to', 'name']) {
    applyStringBounds(arrowProperties?.[endpoint], {
      minimum: 1,
      maximum: ARROWGRAM_LIMITS.logicalIdCodePoints,
      rejectReservedId: true,
    });
  }
  applyStringBounds(arrowProperties?.label, { maximum: ARROWGRAM_LIMITS.labelCodePoints });
  applyStringBounds(arrowProperties?.color, {
    minimum: 1,
    maximum: ARROWGRAM_LIMITS.colorCodePoints,
    rejectUrlPaint: true,
  });
  applyStringBounds(arrowProperties?.label_color, {
    minimum: 1,
    maximum: ARROWGRAM_LIMITS.colorCodePoints,
    rejectUrlPaint: true,
  });

  return schema;
}
