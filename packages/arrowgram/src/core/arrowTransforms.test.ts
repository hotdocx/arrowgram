import { describe, it, expect } from 'vitest';
import { reverseArrow, flipArrow } from './diagramModel';
import { ArrowSpec } from '../types';

describe('Arrow Transforms', () => {
    describe('reverseArrow', () => {
        it('should swap from and to for non-loops', () => {
            const spec: ArrowSpec = { from: 'A', to: 'B', label: 'f' };
            const reversed = reverseArrow(spec);
            expect(reversed.from).toBe('B');
            expect(reversed.to).toBe('A');
            expect(reversed.radius).toBeUndefined();
        });

        it('should reverse direction for loops (negate radius, swap alignment, rotate 180)', () => {
            const spec: ArrowSpec = { 
                from: 'A', to: 'A', 
                label: 'loop', 
                radius: 40, 
                angle: 90,
                label_alignment: 'left'
            };
            const reversed = reverseArrow(spec);
            expect(reversed.from).toBe('A');
            expect(reversed.to).toBe('A');
            expect(reversed.radius).toBe(-40);
            expect(reversed.angle).toBe(-90); // 90 + 180 = 270 -> -90
            expect(reversed.label_alignment).toBe('right');
        });

        it('should handle defaults for loops', () => {
            const spec: ArrowSpec = { from: 'A', to: 'A' };
            const reversed = reverseArrow(spec);
            expect(reversed.radius).toBe(-40); // Default 40 negated
            expect(reversed.angle).toBe(180); // Default 0 + 180 = 180
        });
    });

    describe('flipArrow', () => {
        it('should negate curve and shift for non-loops', () => {
            const spec: ArrowSpec = { 
                from: 'A', to: 'B', 
                curve: 20, 
                shift: 10,
                label_alignment: 'left'
            };
            const flipped = flipArrow(spec);
            expect(flipped.curve).toBe(-20);
            expect(flipped.shift).toBe(-10);
            expect(flipped.label_alignment).toBe('right');
        });

        it('should rotate 180 for loops (move to other side) and swap alignment', () => {
            const spec: ArrowSpec = { 
                from: 'A', to: 'A', 
                radius: 40, 
                angle: 90,
                label_alignment: 'left'
            };
            const flipped = flipArrow(spec);
            expect(flipped.angle).toBe(-90); // 90 + 180 = 270 -> -90
            expect((flipped as any).radius).toBe(40); // Radius unchanged
            expect(flipped.label_alignment).toBe('right'); // Alignment swapped
        });
    });
});
