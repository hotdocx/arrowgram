import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { computeDiagram } from '../src/core/diagramModel';
import { DiagramSpecSchema } from '../src/types';
import type { DiagramSpec } from '../src/types';

describe('documented Arrowgram JSON examples', () => {
  const specPath = fileURLToPath(new URL('../../../docs/ARROWGRAM_SPEC.md', import.meta.url));
  const markdown = readFileSync(specPath, 'utf8');
  const examples = [...markdown.matchAll(/```json\s*([\s\S]*?)```/g)].map((match) => match[1]);

  it('keeps the expected executable example corpus', () => {
    expect(examples).toHaveLength(7);
  });

  examples.forEach((json, index) => {
    it(`parses, validates, and computes example ${index + 1}`, () => {
      const raw = JSON.parse(json) as DiagramSpec;
      const parsed = DiagramSpecSchema.safeParse(raw);

      expect(parsed.success).toBe(true);
      if (!parsed.success) return;

      const result = computeDiagram(parsed.data);
      expect(result.error).toBeNull();
      expect(result.nodes).toHaveLength(raw.nodes.length);
      expect(result.arrows).toHaveLength(raw.arrows?.length ?? 0);
    });
  });
});
