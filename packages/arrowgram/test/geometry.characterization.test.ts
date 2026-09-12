import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ArrowGramDiagram } from '../src/react/ArrowGramDiagram';
import { Curve, RoundedRectangle } from '../src/core/curve';
import { computeDiagram, selectConnected } from '../src/core/diagramModel';
import { Path, Point, Dimensions } from '../src/core/ds';
import { computedArrowKey } from '../src/schema/identity';
import type { DiagramSpec } from '../src/types';
import { dashNumbers, readFixture } from './helpers';

describe('geometry regression characterization', () => {
  it('draws an absolute line to x=0 without retaining the current x coordinate', () => {
    const path = new Path()
      .move_to(new Point(10, 10))
      .line_to(new Point(0, 5))
      .toString();

    expect(path).toContain('L 0 5');
  });

  it('does not classify points beyond a rounded polygon as inside', () => {
    const rectangle = new RoundedRectangle(
      new Point(0, 0),
      new Dimensions(50, 50),
      25,
    );

    expect(Curve.point_inside_polygon(new Point(30, 0), rectangle.points())).toBe(false);
  });

  it('clips shifted arrow endpoints against the shifted curve', () => {
    const result = computeDiagram(readFixture('geometry/shifted.json') as DiagramSpec);
    const source = result.arrows[0].sourcePoint;

    expect(Math.hypot(source.x, source.y)).toBeCloseTo(25, 5);
  });

  it('clips the interaction path to the visible arrow span', () => {
    const result = computeDiagram(readFixture('valid/basic.json') as DiagramSpec);
    const arrow = result.arrows[0];

    const firstCommand = arrow.interactionPath.split('\n')[0];
    expect(firstCommand).toBe(
      `M ${arrow.visibleSourcePoint.x} ${arrow.visibleSourcePoint.y}`,
    );
    expect(firstCommand).not.toBe(`M ${result.nodes[0].left} ${result.nodes[0].top}`);
  });

  it('reports overlapping endpoint shapes without a visible span', () => {
    const result = computeDiagram({
      nodes: [
        { name: 'A', left: 0, top: 0 },
        { name: 'B', left: 40, top: 0 },
      ],
      arrows: [{ from: 'A', to: 'B' }],
    });

    expect(result.error).not.toBeNull();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'geometry.no_visible_span',
      phase: 'geometry',
      path: ['arrows', 0],
    }));
  });

  it('never emits a negative dash component after over-shortening', () => {
    const result = computeDiagram(readFixture('geometry/over-shorten.json') as DiagramSpec);
    const numbers = dashNumbers(result.arrows[0].paths[0].strokeDasharray);

    expect(result.error).toBeNull();
    expect(numbers.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'geometry.shorten_clamped',
      severity: 'warning',
      path: ['arrows', 0, 'shorten'],
    }));
    expect(result.arrows[0].visibleSourcePoint.x)
      .toBeCloseTo(result.arrows[0].visibleTargetPoint.x, 5);
  });

  it('does not throw the whole diagram away for dashed over-shortening', () => {
    const result = computeDiagram(readFixture('geometry/dashed-over-shorten.json') as DiagramSpec);

    expect(result.error).toBeNull();
    expect(result.arrows).toHaveLength(1);
    expect(dashNumbers(result.arrows[0].paths[0].strokeDasharray))
      .toEqual(expect.arrayContaining([expect.any(Number)]));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code))
      .toContain('geometry.shorten_clamped');
  });

  it('includes the full large-loop height in the viewBox', () => {
    const result = computeDiagram(readFixture('geometry/large-loop.json') as DiagramSpec);
    const [, , , height] = result.viewBox.split(/\s+/).map(Number);

    expect(height).toBeGreaterThanOrEqual(200);
  });

  it('applies computed over-label rotation to rendered markup', () => {
    const result = computeDiagram(readFixture('geometry/vertical-over-label.json') as DiagramSpec);
    const markup = renderToStaticMarkup(
      React.createElement('svg', null, React.createElement(ArrowGramDiagram, { diagram: result })),
    );

    expect(result.arrows[0].label.rotation).toBeCloseTo(90, 5);
    expect(markup).toMatch(/<foreignObject[^>]+transform="rotate\(90/);
  });

  it('scopes low-level mask IDs per React rendering instance', () => {
    const result = computeDiagram(readFixture('valid/basic.json') as DiagramSpec);
    const markup = renderToStaticMarkup(
      React.createElement(
        'div',
        null,
        React.createElement('svg', null, React.createElement(ArrowGramDiagram, { diagram: result })),
        React.createElement('svg', null, React.createElement(ArrowGramDiagram, { diagram: result })),
      ),
    );
    const ids = [...markup.matchAll(/<mask[^>]+id="([^"]+)"/g)].map((match) => match[1]);

    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not repeat a global style that hides accessible KaTeX MathML', () => {
    const result = computeDiagram(readFixture('valid/basic.json') as DiagramSpec);
    const markup = renderToStaticMarkup(
      React.createElement('svg', null, React.createElement(ArrowGramDiagram, { diagram: result })),
    );
    const styleCount = (markup.match(/<style>/g) ?? []).length;

    expect(styleCount).toBeLessThanOrEqual(1);
    expect(markup).not.toContain('.katex-mathml{display:none;}');
  });

  it('expands connected selection when seeded with an arrow', () => {
    const selected = selectConnected(
      [{ name: 'f', from: 'A', to: 'B' }],
      new Set([computedArrowKey(0)]),
    );

    expect(selected).toEqual(new Set([computedArrowKey(0), 'A', 'B']));
  });
});
