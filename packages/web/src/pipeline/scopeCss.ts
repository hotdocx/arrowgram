function splitTopLevelBlocks(input: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);

    if (depth === 0 && ch === "}") {
      blocks.push(input.slice(start, i + 1));
      start = i + 1;
    }
  }

  const tail = input.slice(start).trim();
  if (tail) blocks.push(tail);
  return blocks.map((b) => b.trim()).filter(Boolean);
}

function isAtRuleBlock(block: string): boolean {
  return block.trimStart().startsWith("@");
}

function scopeSelectors(selectorText: string, scope: string): string {
  const selectors = selectorText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return selectors.map((sel) => `${scope} ${sel}`).join(", ");
}

function scopeCssBlock(block: string, scope: string): string {
  const trimmed = block.trim();
  if (!trimmed.includes("{")) return trimmed;

  const firstBrace = trimmed.indexOf("{");
  const header = trimmed.slice(0, firstBrace).trim();
  const body = trimmed.slice(firstBrace + 1, trimmed.lastIndexOf("}"));

  if (isAtRuleBlock(trimmed)) {
    // For @media / @supports, recursively scope inside.
    const inner = splitTopLevelBlocks(body)
      .map((b) => scopeCssBlock(b, scope))
      .join("\n");
    return `${header} {\n${inner}\n}`;
  }

  const scopedHeader = scopeSelectors(header, scope);
  return `${scopedHeader} {${body}}`;
}

/**
 * Best-effort scoping for user CSS to avoid leaking styles into the editor UI.
 * Supports simple rules and recursively scopes inside @media/@supports blocks.
 */
export function scopeCss(css: string, scopeSelector: string): string {
  const blocks = splitTopLevelBlocks(css);
  return blocks.map((b) => scopeCssBlock(b, scopeSelector)).join("\n");
}

