import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeDiagram } from '../src/core/diagramModel';
import { DiagramSpecSchema } from '../src/types';
import type { DiagramSpec } from '../src/types';
import { readFixture } from './helpers';

describe('vNext contract characterization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the nominal higher-order fixture working', () => {
    const spec = readFixture('valid/higher-order.json') as DiagramSpec;
    const result = computeDiagram(spec);

    expect(result.error).toBeNull();
    expect(result.arrows).toHaveLength(3);
  });

  it('rejects unknown root keys instead of stripping them', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/root-unknown.json')).success).toBe(false);
  });

  it('rejects unknown nested keys instead of stripping them', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/nested-unknown.json')).success).toBe(false);
  });

  it('rejects unsupported document versions', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/version-2.json')).success).toBe(false);
  });

  it('rejects arrow levels outside 1 through 3', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/level-4.json')).success).toBe(false);
  });

  it('rejects negative shortening', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/negative-shorten.json')).success).toBe(false);
  });

  it('rejects a zero loop radius', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/zero-loop-radius.json')).success).toBe(false);
  });

  it('reports duplicate node identities', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/duplicate-node.json')).success).toBe(false);
  });

  it('reports duplicate named-arrow identities', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/duplicate-arrow.json')).success).toBe(false);
  });

  it('reports node and named-arrow namespace collisions', () => {
    expect(DiagramSpecSchema.safeParse(readFixture('invalid/namespace-collision.json')).success).toBe(false);
  });

  it('does not silently omit dangling arrows', () => {
    const result = computeDiagram(readFixture('invalid/dangling-endpoint.json') as DiagramSpec);

    expect(result.error).not.toBeNull();
  });

  it('does not silently omit cyclic arrows', () => {
    const result = computeDiagram(readFixture('invalid/dependency-cycle.json') as DiagramSpec);

    expect(result.error).not.toBeNull();
  });

  it('does not permit unstable synthetic IDs as endpoints', () => {
    const result = computeDiagram(readFixture('invalid/unnamed-arrow-reference.json') as DiagramSpec);

    expect(result.error).not.toBeNull();
  });

  it('renders the documented default loop radius', () => {
    const result = computeDiagram(readFixture('geometry/default-loop.json') as DiagramSpec);

    expect(result.error).toBeNull();
    expect(result.arrows).toHaveLength(1);
  });

  it('reports coincident distinct endpoints', () => {
    const result = computeDiagram(readFixture('geometry/coincident.json') as DiagramSpec);

    expect(result.error).not.toBeNull();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code))
      .toContain('geometry.coincident_endpoints');
  });

  it('keeps renderer identity out of the canonical arrow spec', () => {
    const spec = readFixture('valid/basic.json') as DiagramSpec;
    const result = computeDiagram(spec);

    expect(result.arrows[0].spec).toEqual(spec.arrows?.[0]);
  });

  it('does not log expected parse failures without a caller logger', () => {
    computeDiagram('{ invalid');

    expect(console.error).not.toHaveBeenCalled();
  });
});
