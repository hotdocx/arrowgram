import { describe, it, expect } from 'vitest';
import { estimateLabelVisualLength } from './diagramModel';

describe('estimateLabelVisualLength', () => {
  it('should return length for normal text', () => {
    expect(estimateLabelVisualLength('hello')).toBe(5);
    expect(estimateLabelVisualLength('a')).toBe(1);
    expect(estimateLabelVisualLength('')).toBe(0);
  });

  it('should estimate LaTeX label length correctly', () => {
    // $\epsilon_{(f)}$ -> epsilon (1) + ( (1) + f (1) + ) (1) = 4
    expect(estimateLabelVisualLength('$\\epsilon_{(f)}$')).toBe(4);
    
    // $F(X)$ -> F (1) + ( (1) + X (1) + ) (1) = 4
    expect(estimateLabelVisualLength('$F(X)$')).toBe(4);

    // $\to$ -> 1
    expect(estimateLabelVisualLength('$\\to$')).toBe(1);

    // $\xrightarrow$ -> 1
    expect(estimateLabelVisualLength('$\\xrightarrow$')).toBe(1);
    
    // $\alpha \to \beta$ -> alpha(1) + space(1) + to(1) + space(1) + beta(1) = 5
    // Actually spaces are preserved? 
    // content = "alpha to beta" -> "C C C" -> length 5.
    expect(estimateLabelVisualLength('$\\alpha \\to \\beta$')).toBe(5);
  });

  it('should fallback to length if not fully enclosed in $', () => {
    expect(estimateLabelVisualLength('Prefix $\\epsilon$')).toBe(17); // "Prefix $\epsilon$".length
  });
});