import { describe, it, expect } from 'vitest';
import { computeDiagram } from './diagramModel';
import type { DiagramSpec } from '../types';

describe('Arrow Shortening', () => {
    it('renders only the visible shortened subcurve', () => {
        const spec: DiagramSpec = {
            nodes: [
                { name: 'A', left: 0, top: 0 },
                { name: 'B', left: 100, top: 0 }
            ],
            arrows: [
                {
                    from: 'A',
                    to: 'B',
                    shorten: { source: 10, target: 20 }
                }
            ]
        };

        const result = computeDiagram(spec);
        const arrow = result.arrows[0];
        
        expect(arrow.paths.length).toBeGreaterThan(0);
        const path = arrow.paths[0];
        expect(result.error).toBeNull();
        expect(result.diagnostics).toEqual([]);
        expect(arrow.visibleSourcePoint.x).toBeCloseTo(35, 3);
        expect(arrow.visibleTargetPoint.x).toBeCloseTo(55, 3);
        expect(arrow.visibleTargetPoint.x - arrow.visibleSourcePoint.x).toBeCloseTo(20, 3);
        expect(path.d).toMatch(/^M 35(?:\.\d+)? 0\nq /);
        expect(path.strokeDasharray).toBeUndefined();
    });

    it('handles one-sided shortening with the same subcurve contract', () => {
        const spec: DiagramSpec = {
            nodes: [
                { name: 'A', left: 0, top: 0 },
                { name: 'B', left: 100, top: 0 }
            ],
            arrows: [
                {
                    from: 'A',
                    to: 'B',
                    shorten: { source: 15 }
                }
            ]
        };

        const result = computeDiagram(spec);
        const arrow = result.arrows[0];
        
        expect(result.error).toBeNull();
        expect(result.diagnostics).toEqual([]);
        expect(arrow.visibleSourcePoint.x).toBeCloseTo(40, 3);
        expect(arrow.visibleTargetPoint.x).toBeCloseTo(75, 3);
        expect(arrow.visibleTargetPoint.x - arrow.visibleSourcePoint.x).toBeCloseTo(35, 3);
        expect(arrow.paths[0].strokeDasharray).toBeUndefined();
    });
});
