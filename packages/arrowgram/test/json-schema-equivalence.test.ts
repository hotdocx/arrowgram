import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { computedArrowKey, createDiagramSpecJsonSchema, parseDiagramSpec } from '../src/schema';
import { ARROWGRAM_LIMITS } from '../src/schema/limits';
import { readFixture } from './helpers';

const schemaPath = fileURLToPath(new URL('../arrowgram.schema.json', import.meta.url));
const jsonSchema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateJsonSchema = ajv.compile(jsonSchema);

const structuralInvalidFixtures = [
  'invalid/root-unknown.json',
  'invalid/nested-unknown.json',
  'invalid/version-2.json',
  'invalid/level-4.json',
  'invalid/negative-shorten.json',
];

const semanticInvalidFixtures = [
  'invalid/duplicate-node.json',
  'invalid/duplicate-arrow.json',
  'invalid/namespace-collision.json',
  'invalid/dangling-endpoint.json',
  'invalid/dependency-cycle.json',
  'invalid/unnamed-arrow-reference.json',
  'invalid/zero-loop-radius.json',
];

describe('published JSON Schema equivalence', () => {
  it.each(['valid/basic.json', 'valid/higher-order.json'])(
    'accepts valid structural fixture %s in both validators',
    (fixture) => {
      const input = readFixture(fixture);

      expect(validateJsonSchema(input), JSON.stringify(validateJsonSchema.errors)).toBe(true);
      expect(parseDiagramSpec(input).ok).toBe(true);
    },
  );

  it('accepts omitted default fields structurally while runtime canonicalizes them', () => {
    const input = { nodes: [] };

    expect(validateJsonSchema(input), JSON.stringify(validateJsonSchema.errors)).toBe(true);
    expect(parseDiagramSpec(input)).toEqual({
      ok: true,
      value: { version: 1, nodes: [], arrows: [] },
      diagnostics: [],
    });
  });

  it.each(structuralInvalidFixtures)(
    'rejects structural fixture %s in both validators',
    (fixture) => {
      const input = readFixture(fixture);

      expect(validateJsonSchema(input)).toBe(false);
      expect(parseDiagramSpec(input).ok).toBe(false);
    },
  );

  it.each(semanticInvalidFixtures)(
    'documents semantic-only rejection for %s',
    (fixture) => {
      const input = readFixture(fixture);

      expect(validateJsonSchema(input), JSON.stringify(validateJsonSchema.errors)).toBe(true);
      expect(parseDiagramSpec(input).ok).toBe(false);
    },
  );

  it('matches code-point string limits for astral Unicode IDs', () => {
    const accepted = {
      nodes: [{
        name: '😀'.repeat(ARROWGRAM_LIMITS.logicalIdCodePoints),
        left: 0,
        top: 0,
      }],
    };
    const rejected = {
      nodes: [{
        name: '😀'.repeat(ARROWGRAM_LIMITS.logicalIdCodePoints + 1),
        left: 0,
        top: 0,
      }],
    };

    expect(validateJsonSchema(accepted), JSON.stringify(validateJsonSchema.errors)).toBe(true);
    expect(parseDiagramSpec(accepted).ok).toBe(true);
    expect(validateJsonSchema(rejected)).toBe(false);
    expect(parseDiagramSpec(rejected).ok).toBe(false);
  });

  it('rejects URL-bearing paint values in both validators', () => {
    const input = {
      nodes: [{
        name: 'A',
        left: 0,
        top: 0,
        color: 'URL(https://example.test/paint)',
      }],
    };

    expect(validateJsonSchema(input)).toBe(false);
    expect(parseDiagramSpec(input).ok).toBe(false);
  });

  it('rejects the reserved computed identity namespace in both validators', () => {
    const input = {
      nodes: [{ name: computedArrowKey(0), left: 0, top: 0 }],
    };

    expect(validateJsonSchema(input)).toBe(false);
    expect(parseDiagramSpec(input).ok).toBe(false);
  });

  it('publishes the semantic-validation boundary explicitly', () => {
    expect(jsonSchema).toMatchObject({
      '$schema': 'https://json-schema.org/draft/2020-12/schema',
      'x-arrowgram-format-version': 1,
      'x-arrowgram-semantic-validator': '@hotdocx/arrowgram.parseDiagramSpec',
    });
  });

  it('keeps the published artifact equal to the public schema generator', () => {
    expect(jsonSchema).toEqual(createDiagramSpecJsonSchema());
  });
});
