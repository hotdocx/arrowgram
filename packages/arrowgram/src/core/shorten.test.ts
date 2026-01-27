import { describe, it, expect } from 'vitest';
import { computeDiagram } from './diagramModel';
import { DiagramSpec } from '../types';

describe('Arrow Shortening', () => {
    it('should apply shorten properties to arrow style via strokeDasharray', () => {
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
        
        // Ensure there is a path
        expect(arrow.paths.length).toBeGreaterThan(0);
        const path = arrow.paths[0];
        
        // Expected dasharray format: "0 start_gap visible_len end_gap"
        // Node radius is 25.
        // Start gap = 25 (node) + 10 (shorten) = 35.
        // End gap (last param) = 25 (node) + 20 (shorten) = 45.
        // Visible len = 100 (total) - 35 - 45 = 20.
        // Dasharray: "0 35 20 45"
        
        const dashArray = path.strokeDasharray;
        expect(dashArray).toBeDefined();
        
        const parts = dashArray!.split(' ').map(parseFloat);
        expect(parts.length).toBeGreaterThanOrEqual(4);
        
        const startGap = parts[1];
        const visibleLen = parts[2];
        const endGap = parts[3];
        
        expect(startGap).toBeCloseTo(35, 0);
        expect(endGap).toBeCloseTo(45, 0);
        expect(visibleLen).toBeCloseTo(20, 0);
    });

    it('should handle partial shorten properties via strokeDasharray', () => {
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
        
        const path = arrow.paths[0];
        const dashArray = path.strokeDasharray;
        expect(dashArray).toBeDefined();
        
        const parts = dashArray!.split(' ').map(parseFloat);
        
        // Start gap = 25 + 15 = 40
        // End gap = 25 + 0 = 25
        // Visible = 100 - 40 - 25 = 35
        
        expect(parts[1]).toBeCloseTo(40, 0);
        expect(parts[3]).toBeCloseTo(25, 0);
        expect(parts[2]).toBeCloseTo(35, 0);
    });
});