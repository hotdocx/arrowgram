import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { computeDiagram, computeDiagramResult } from '../src/core/diagramModel';
import { createLabelLayout, diagramTextSummary } from '../src/core/label';
import { ArrowGram } from '../src/ArrowGram';
import { ArrowGramDiagram } from '../src/react/ArrowGramDiagram';

describe('shared label layout', () => {
  it('tokenizes plain, math, mixed, and escaped-dollar spans', () => {
    const result = createLabelLayout('Cost $x$ and \\$5');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.segments).toEqual([
      { kind: 'text', value: 'Cost ' },
      { kind: 'math', value: 'x' },
      { kind: 'text', value: ' and $5' },
    ]);
    expect(result.value.accessibleText).toBe('Cost x and $5');
    expect(result.value.hasMath).toBe(true);
    expect(result.value.width).toBeGreaterThan(0);
  });

  it('preserves escaped dollars inside math for KaTeX', () => {
    const result = createLabelLayout('$\\$$');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.segments).toEqual([{ kind: 'math', value: '\\$' }]);
  });

  it.each([
    ['unterminated $x', 'label.unterminated_math'],
    ['empty $$ math', 'label.empty_math'],
  ])('reports malformed label %s', (source, code) => {
    const result = createLabelLayout(source, { path: ['label'] });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code,
      phase: 'label',
      path: ['label'],
    }));
  });

  it('fails computation with entity-scoped label diagnostics', () => {
    const result = computeDiagramResult({
      nodes: [{ name: 'A', left: 0, top: 0, label: 'unterminated $x' }],
    });

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'label.unterminated_math',
      entityId: 'A',
      path: ['nodes', 0, 'label'],
    }));
  });

  it('includes node label layout in computed bounds', () => {
    const diagram = computeDiagram({
      nodes: [{ name: 'A', left: 0, top: 0, label: 'A very long object label' }],
    });
    const layout = diagram.nodeLabels[0].layout;

    expect(diagram.error).toBeNull();
    expect(diagram.bounds.minX).toBeLessThanOrEqual(-layout.width / 2);
    expect(diagram.bounds.maxX).toBeGreaterThanOrEqual(layout.width / 2);
  });
});

describe('React label and accessibility rendering', () => {
  it('renders mixed math with accessible MathML and no repeated style block', () => {
    const diagram = computeDiagram({
      nodes: [
        { name: 'A', left: 0, top: 0, label: 'Object $A$' },
        { name: 'B', left: 200, top: 0, label: '$B$' },
      ],
      arrows: [{ name: 'f', from: 'A', to: 'B', label: 'map $f$' }],
    });
    const markup = renderToStaticMarkup(
      <svg><ArrowGramDiagram diagram={diagram} title="A mapped diagram" /></svg>,
    );

    expect(markup).toContain('katex-mathml');
    expect(markup).not.toContain('<style>');
    expect(markup).toContain('aria-label="A mapped diagram"');
    expect(markup).toContain('<title>A mapped diagram</title>');
    expect(markup).toContain('xmlns="http://www.w3.org/1999/xhtml"');
  });

  it('renders a visible, labelled fallback for invalid KaTeX', () => {
    const diagram = computeDiagram({
      nodes: [{ name: 'A', left: 0, top: 0, label: '$\\notacommand$' }],
    });
    const markup = renderToStaticMarkup(
      <svg><ArrowGramDiagram diagram={diagram} /></svg>,
    );

    expect(markup).toContain('data-arrowgram-label-error="true"');
    expect(markup).toContain('$\\notacommand$');
    expect(markup).toContain('title="KaTeX parse error:');
  });

  it('supports decorative rendering without an announced image role', () => {
    const diagram = computeDiagram({
      nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }],
    });
    const markup = renderToStaticMarkup(
      <svg><ArrowGramDiagram diagram={diagram} decorative /></svg>,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
  });

  it('gives the top-level SVG exactly one accessible image contract', () => {
    const markup = renderToStaticMarkup(
      <ArrowGram
        spec={JSON.stringify({ nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }] })}
        title="Single object diagram"
        description="One object labelled A"
      />,
    );

    expect(markup.match(/role="img"/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Single object diagram"');
    expect(markup).toContain('<title>Single object diagram</title>');
    expect(markup).toContain('<desc>One object labelled A</desc>');
  });

  it('produces a deterministic textual graph summary', () => {
    const diagram = computeDiagram({
      nodes: [
        { name: 'A', left: 0, top: 0, label: '$X$' },
        { name: 'B', left: 200, top: 0 },
      ],
      arrows: [{ name: 'f', from: 'A', to: 'B', label: '$g$' }],
    });

    expect(diagramTextSummary(diagram)).toBe(
      'Nodes: A (X), B. Arrows: f (g): A to B.',
    );
  });
});
