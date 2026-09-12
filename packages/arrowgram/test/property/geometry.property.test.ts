import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeDiagram } from '../../src/core/diagramModel';
import type { DiagramSpec } from '../../src/types';
import { dashNumbers } from '../helpers';

const safeBody = fc.constantFrom('solid', 'dashed', 'dotted');

describe('deterministic geometry properties', () => {
  it('keeps ordinary separated direct arrows finite', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -20, max: 20 }),
        safeBody,
        (distance, curve, shift, body) => {
          const spec: DiagramSpec = {
            version: 1,
            nodes: [
              { name: 'A', left: 0, top: 0 },
              { name: 'B', left: distance, top: 0 },
            ],
            arrows: [{
              from: 'A',
              to: 'B',
              curve,
              shift,
              style: { body: { name: body } },
            }],
          };
          const result = computeDiagram(spec);
          const serialized = JSON.stringify(result);

          expect(result.error).toBeNull();
          expect(result.arrows).toHaveLength(1);
          expect(serialized).not.toMatch(/NaN|Infinity/);
          const arrow = result.arrows[0];
          expect(Math.hypot(arrow.sourcePoint.x, arrow.sourcePoint.y)).toBeCloseTo(25, 3);
          expect(Math.hypot(arrow.targetPoint.x - distance, arrow.targetPoint.y)).toBeCloseTo(25, 3);
        },
      ),
      { seed: 123456789, numRuns: 200 },
    );
  });

  it('keeps all accepted shortening finite and nonnegative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 60, max: 300 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 0, max: 200 }),
        safeBody,
        (distance, curve, source, target, body) => {
          const spec: DiagramSpec = {
            version: 1,
            nodes: [
              { name: 'A', left: 0, top: 0 },
              { name: 'B', left: distance, top: 0 },
            ],
            arrows: [{
              from: 'A',
              to: 'B',
              curve,
              shorten: { source, target },
              style: { body: { name: body } },
            }],
          };
          const result = computeDiagram(spec);

          expect(result.error).toBeNull();
          expect(result.arrows).toHaveLength(1);
          expect([
            result.arrows[0].visibleSourcePoint.x,
            result.arrows[0].visibleSourcePoint.y,
            result.arrows[0].visibleTargetPoint.x,
            result.arrows[0].visibleTargetPoint.y,
          ].every(Number.isFinite)).toBe(true);
          expect(
            dashNumbers(result.arrows[0].paths[0].strokeDasharray)
              .every((value) => Number.isFinite(value) && value >= 0),
          ).toBe(true);
        },
      ),
      { seed: 123456789, numRuns: 500 },
    );
  });
});
