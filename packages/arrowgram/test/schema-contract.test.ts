import { describe, expect, it } from 'vitest';
import {
  buildArrowDependencyPlan,
  computedArrowKey,
  computeDiagramResult,
  normalizeLegacyDiagramSpec,
  parseDiagramSpec,
} from '../src';
import type { DiagramSpec } from '../src/types';
import { ARROWGRAM_LIMITS } from '../src/schema/limits';
import { readFixture } from './helpers';

function diagnosticCodes(result: ReturnType<typeof parseDiagramSpec>): string[] {
  return result.diagnostics.map((diagnostic) => diagnostic.code);
}

describe('canonical Arrowgram schema contract', () => {
  it('canonicalizes omitted defaults explicitly', () => {
    const result = parseDiagramSpec({ nodes: [] });

    expect(result).toEqual({
      ok: true,
      value: { version: 1, nodes: [], arrows: [] },
      diagnostics: [],
    });
  });

  it('returns stable JSON syntax diagnostics', () => {
    const result = parseDiagramSpec('{ invalid');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      code: 'json.syntax',
      phase: 'json',
      severity: 'error',
      path: [],
    });
  });

  it('returns a path-specific unknown-key diagnostic', () => {
    const result = parseDiagramSpec(readFixture('invalid/nested-unknown.json'));

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'structural.unknown_key',
      phase: 'structural',
      path: ['nodes', 0, 'typo'],
    }));
  });

  it.each([
    ['invalid/duplicate-node.json', 'semantic.duplicate_node_id'],
    ['invalid/duplicate-arrow.json', 'semantic.duplicate_arrow_id'],
    ['invalid/namespace-collision.json', 'semantic.endpoint_namespace_collision'],
    ['invalid/dangling-endpoint.json', 'semantic.dangling_endpoint'],
    ['invalid/dependency-cycle.json', 'semantic.dependency_cycle'],
    ['invalid/unnamed-arrow-reference.json', 'semantic.synthetic_endpoint_reference'],
    ['invalid/zero-loop-radius.json', 'semantic.zero_loop_radius'],
  ])('returns semantic code %s -> %s', (fixture, code) => {
    const result = parseDiagramSpec(readFixture(fixture));

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain(code);
    expect(result.diagnostics.find((diagnostic) => diagnostic.code === code)?.phase).toBe('semantic');
  });

  it('rejects URL-bearing paint values', () => {
    const result = parseDiagramSpec({
      nodes: [{ name: 'A', left: 0, top: 0, color: 'url(https://example.test/paint)' }],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'structural.url_paint_unsupported',
      phase: 'structural',
      path: ['nodes', 0, 'color'],
    }));
  });

  it('enforces aggregate node limits before geometry', () => {
    const nodes = Array.from({ length: ARROWGRAM_LIMITS.nodes + 1 }, (_, index) => ({
      name: `node_${index}`,
      left: 0,
      top: 0,
    }));
    const result = parseDiagramSpec({ nodes });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'structural.too_big',
      path: ['nodes'],
    }));
  });

  it('returns a stable code for overlong logical IDs', () => {
    const result = parseDiagramSpec({
      nodes: [{
        name: 'x'.repeat(ARROWGRAM_LIMITS.logicalIdCodePoints + 1),
        left: 0,
        top: 0,
      }],
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('structural.string_too_long');
  });

  it('reserves the computed identity namespace', () => {
    const result = parseDiagramSpec({
      nodes: [{ name: computedArrowKey(0), left: 0, top: 0 }],
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('structural.reserved_logical_id');
  });

  it('enforces the higher-order dependency depth limit', () => {
    const arrows: NonNullable<DiagramSpec['arrows']> = [
      { name: 'arrow_0', from: 'A', to: 'B' },
    ];
    for (let index = 1; index <= ARROWGRAM_LIMITS.dependencyDepth + 1; index += 1) {
      arrows.push({
        name: `arrow_${index}`,
        from: `arrow_${index - 1}`,
        to: 'A',
      });
    }

    const result = parseDiagramSpec({
      nodes: [
        { name: 'A', left: 0, top: 0 },
        { name: 'B', left: 200, top: 0 },
      ],
      arrows,
    });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('semantic.dependency_depth_exceeded');
  });

  it('distinguishes cycle participants from arrows blocked by a cycle', () => {
    const result = parseDiagramSpec({
      nodes: [{ name: 'A', left: 0, top: 0 }],
      arrows: [
        { name: 'f', from: 'g', to: 'A' },
        { name: 'g', from: 'f', to: 'A' },
        { name: 'h', from: 'f', to: 'A' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 'semantic.dependency_cycle'))
      .toHaveLength(2);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === 'semantic.dependency_blocked_by_cycle'))
      .toHaveLength(1);
  });
});

describe('legacy normalization', () => {
  it('removes only catalogued uniqueId residue without mutating input', () => {
    const legacy = readFixture('legacy/unique-id.json') as Record<string, unknown>;
    const snapshot = JSON.stringify(legacy);
    const normalized = normalizeLegacyDiagramSpec(legacy);

    expect(JSON.stringify(legacy)).toBe(snapshot);
    expect(normalized.diagnostics).toEqual([
      expect.objectContaining({
        code: 'legacy.unique_id_removed',
        severity: 'warning',
        phase: 'legacy',
        path: ['arrows', 0, 'uniqueId'],
      }),
    ]);
    expect(normalized.value).toEqual({
      version: 1,
      nodes: [
        { name: 'A', left: 0, top: 0 },
        { name: 'B', left: 160, top: 0 },
      ],
      arrows: [{ name: 'f', from: 'A', to: 'B', label: '$f$' }],
    });
  });

  it('requires explicit normalization for legacy residue', () => {
    const legacy = readFixture('legacy/unique-id.json');
    const strict = parseDiagramSpec(legacy);
    const normalized = parseDiagramSpec(legacy, { normalizeLegacy: true });

    expect(strict.ok).toBe(false);
    expect(diagnosticCodes(strict)).toContain('structural.unknown_key');
    expect(normalized.ok).toBe(true);
    expect(diagnosticCodes(normalized)).toContain('legacy.unique_id_removed');
  });

  it('does not hide unrelated unknown fields during normalization', () => {
    const result = parseDiagramSpec({ nodes: [], other: true }, { normalizeLegacy: true });

    expect(result.ok).toBe(false);
    expect(diagnosticCodes(result)).toContain('structural.unknown_key');
  });
});

describe('dependency planning and computed identity', () => {
  it('propagates explicit legacy normalization diagnostics through computation', () => {
    const result = computeDiagramResult(
      readFixture('legacy/unique-id.json') as DiagramSpec,
      '',
      { normalizeLegacy: true },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'legacy.unique_id_removed',
      severity: 'warning',
    }));
    expect(result.value.diagnostics).toEqual(result.diagnostics);
    expect(result.value.arrows[0].spec).not.toHaveProperty('uniqueId');
  });

  it('plans reverse-ordered higher cells deterministically', () => {
    const parsed = parseDiagramSpec({
      nodes: [
        { name: 'A', left: 0, top: 0 },
        { name: 'B', left: 300, top: 0 },
      ],
      arrows: [
        { name: 'alpha', from: 'F', to: 'G', style: { level: 2 } },
        { name: 'F', from: 'A', to: 'B', curve: -40 },
        { name: 'G', from: 'A', to: 'B', curve: 40 },
      ],
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const plan = buildArrowDependencyPlan(parsed.value);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.value.order).toEqual([1, 2, 0]);
    expect(plan.value.depthBySourceIndex).toEqual([1, 0, 0]);
  });

  it('retains source indices while rendering in dependency order', () => {
    const result = computeDiagramResult({
      nodes: [
        { name: 'A', left: 0, top: 0 },
        { name: 'B', left: 300, top: 0 },
      ],
      arrows: [
        { name: 'alpha', from: 'F', to: 'G', style: { level: 2 } },
        { name: 'F', from: 'A', to: 'B', curve: -40 },
        { name: 'G', from: 'A', to: 'B', curve: 40 },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.arrows.map((arrow) => arrow.sourceIndex)).toEqual([1, 2, 0]);
    expect(result.value.arrows.map((arrow) => arrow.logicalId)).toEqual(['F', 'G', 'alpha']);
    expect(result.value.arrows.map((arrow) => arrow.key)).toEqual([
      computedArrowKey(1),
      computedArrowKey(2),
      computedArrowKey(0),
    ]);
    expect(result.value.arrows.map((arrow) => arrow.spec.name)).toEqual(['F', 'G', 'alpha']);
  });
});
