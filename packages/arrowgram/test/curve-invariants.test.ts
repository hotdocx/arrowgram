import { describe, expect, it } from 'vitest';
import { Arc, Bezier, RoundedRectangle, type Curve } from '../src/core/curve';
import { Dimensions, Path, Point } from '../src/core/ds';

function expectBoundsContainSamples(curve: Curve, start = 0, end = 1): void {
  const bounds = curve.bounds(start, end);
  for (let sample = 0; sample <= 256; sample += 1) {
    const t = start + (end - start) * sample / 256;
    const point = curve.point(t);
    expect(point.x).toBeGreaterThanOrEqual(bounds.minX - 1e-8);
    expect(point.x).toBeLessThanOrEqual(bounds.maxX + 1e-8);
    expect(point.y).toBeGreaterThanOrEqual(bounds.minY - 1e-8);
    expect(point.y).toBeLessThanOrEqual(bounds.maxY + 1e-8);
  }
}

describe('curve invariants', () => {
  it('computes exact quadratic extrema bounds', () => {
    const curve = new Bezier(new Point(0, 0), 100, 50, 0);

    expect(curve.bounds()).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 25 });
    expectBoundsContainSamples(curve);
    expectBoundsContainSamples(curve, 0.2, 0.8);
  });

  it('keeps arc critical points inside analytic bounds', () => {
    const minor = new Arc(new Point(0, 0), 100, false, 100, 0);
    const major = new Arc(new Point(0, 0), 0.01, true, -100, Math.PI / 2);

    expectBoundsContainSamples(minor);
    expectBoundsContainSamples(minor, 0.15, 0.7);
    expectBoundsContainSamples(major);
    expectBoundsContainSamples(major, 0.1, 0.9);
  });

  it('maps increasing arc lengths to monotonic parameters', () => {
    const curve = new Bezier(new Point(10, -20), 250, -80, Math.PI / 5);
    const inverse = curve.t_after_length(true);
    const total = curve.arc_length(1);
    let previous = 0;

    for (let sample = 0; sample <= 100; sample += 1) {
      const t = inverse(total * sample / 100);
      expect(t).toBeGreaterThanOrEqual(previous);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
      previous = t;
    }
  });

  it('renders finite partial quadratic and arc paths', () => {
    const curves: Curve[] = [
      new Bezier(new Point(0, 0), 100, 50, Math.PI / 6),
      new Arc(new Point(0, 0), 100, false, 100, Math.PI / 8),
    ];

    for (const curve of curves) {
      const path = new Path().move_to(curve.point(0.2));
      curve.render_partial(path, 0.2, 0.8);
      expect(path.toString()).not.toMatch(/NaN|Infinity/);
      expect(path.toString()).toMatch(/^[Mm]?[\s\S]*(?:q|a|l) /);
    }
  });

  it('uses exact rounded-rectangle containment at edges and corners', () => {
    const rectangle = new RoundedRectangle(
      new Point(0, 0),
      new Dimensions(100, 60),
      20,
    );

    expect(rectangle.contains(new Point(0, 0))).toBe(true);
    expect(rectangle.contains(new Point(50, 0))).toBe(true);
    expect(rectangle.contains(new Point(40, 20))).toBe(true);
    expect(rectangle.contains(new Point(50, 30))).toBe(false);
    expect(rectangle.contains(new Point(50.01, 0))).toBe(false);
  });
});
