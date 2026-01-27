import { describe, it, expect } from 'vitest';
import { computeDiagram } from './core/diagramModel';

describe('computeDiagram', () => {
    it('should return empty model for empty input', () => {
        const result = computeDiagram('{}');
        expect(result.nodes).toEqual([]);
        expect(result.arrows).toEqual([]);
        expect(result.viewBox).toBe("0 0 100 100");
    });

    it('should parse basic nodes', () => {
        const spec = JSON.stringify({
            nodes: [
                { name: 'A', left: 0, top: 0, label: 'Node A' }
            ]
        });
        const result = computeDiagram(spec);
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].name).toBe('A');
        expect(result.nodes[0].label).toBe('Node A');
    });

    it('should parse basic arrows', () => {
        const spec = JSON.stringify({
            nodes: [
                { name: 'A', left: 0, top: 0 },
                { name: 'B', left: 100, top: 0 }
            ],
            arrows: [
                { from: 'A', to: 'B', label: 'f' }
            ]
        });
        const result = computeDiagram(spec);
        expect(result.arrows).toHaveLength(1);
        expect(result.arrows[0].spec.from).toBe('A');
        expect(result.arrows[0].spec.to).toBe('B');
    });

    it('should handle invalid JSON gracefully', () => {
        const result = computeDiagram('{ invalid json');
        expect(result.error).toBeDefined();
        expect(result.nodes).toEqual([]);
    });

    it('should calculate arrow midpoint', () => {
        const spec = JSON.stringify({
            nodes: [
                { name: 'A', left: 0, top: 0 },
                { name: 'B', left: 100, top: 0 }
            ],
            arrows: [
                { from: 'A', to: 'B', label: 'f' }
            ]
        });
        const result = computeDiagram(spec);
        const arrow = result.arrows[0];
        // For a straight horizontal line from 0,0 to 100,0, midpoint should include x=50, y=0 roughly
        // (diagramModel shifts endpoints by radius, so exact values depend on NODE_RADIUS logic)
        expect(arrow.midpoint).toBeDefined();
        expect(arrow.midpoint.x).toBeGreaterThan(0);
        expect(arrow.midpoint.x).toBeLessThan(100);
    });

    it('should parse node and arrow colors', () => {
        const spec = JSON.stringify({
            nodes: [
                { name: 'A', left: 0, top: 0, color: 'red' },
                { name: 'B', left: 100, top: 0 }
            ],
            arrows: [
                { from: 'A', to: 'B', color: 'blue', label: 'f', label_color: 'green' }
            ]
        });
        const result = computeDiagram(spec);
        expect(result.nodes[0].color).toBe('red');
        expect(result.arrows[0].paths[0].stroke).toBe('blue');
        expect(result.arrows[0].label.color).toBe('green');
    });
});
