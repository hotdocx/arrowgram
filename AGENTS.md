# Arrowgram API Documentation for AI Agents

## Overview
`@arrowgram/core` is a library for defining and rendering commutative diagrams. As an AI agent, you can generate diagrams by producing JSON objects that conform to the `DiagramSpec` interface.

## Documentation Index

Before proceeding, ensure you have read the relevant documentation:
*   **[JSON API Specification](./docs/ARROWGRAM_SPEC.md):** The authoritative reference for the JSON schema. **READ THIS for field definitions.**
*   **[Development Flow](./docs/sop/DEVELOPMENT_FLOW.md):** How to build and test the project.
*   **[Architecture](./docs/sop/ARCHITECTURE.md):** Understanding the codebase structure.
*   **[Testing](./docs/sop/TESTING.md):** How to run verification tests.

## Core Schema

See **[docs/ARROWGRAM_SPEC.md](./docs/ARROWGRAM_SPEC.md)** for the complete definition.

## Best Practices for Agents

1.  **Layout Logic:** When asked for "Category A", arrange nodes logically.
    *   **Triangles:** (100,100), (300,100), (200, 300).
    *   **Squares:** (100,100), (300,100), (100,300), (300,300).
    *   **Limits/Colimits:** Central object should be offset from the diagram it limits.
2.  **Naming:** Use descriptive IDs if possible (`node_A`, `node_AxB`) but simple ones (`n1`, `n2`) are fine if internal.
3.  **Labels:** Always use LaTeX. No plain text unless it's a variable name.
4.  **Curvature:** If two arrows go between the same nodes (e.g., adjunction), use `curve: 20` and `curve: -20`.

## Common Examples

**Disclaimer:** Extensive examples are maintained in **[docs/ARROWGRAM_SPEC.md](./docs/ARROWGRAM_SPEC.md#6-examples)**. Refer to that document for authoritative usage patterns. If the schema in `packages/arrowgram/src/types.ts` changes, ensure both this document and the spec document are updated.

### Quick Reference

*   **Pullback Square:** See Spec Example 6.1.
*   **Adjunction:** See Spec Example 6.2.
*   **Isomorphism:** See Spec Example 6.3.

## Paper Format
The application supports "Paper" projects which mix Markdown with embedded diagrams.

### Structure
```markdown
---
title: My Paper
authors: Me
---

# Section 1
Text...

<div class="arrowgram">
{
  "nodes": [...],
  "arrows": [...] 
}
</div>
```

### Tips for Generating Papers
1. **Always** wrap arrowgram JSON in `<div class="arrowgram">...</div>`.
2. **Use Markdown** for text content (headers, bold, lists).
3. **Use Paginating**: The app uses `pagedjs`. Content will flow into pages automatically.
