import { createDiagramSpecJsonSchema } from "../dist/schema.js";

export function createArrowgramJsonSchema() {
  return createDiagramSpecJsonSchema();
}

export function serializeArrowgramJsonSchema() {
  return `${JSON.stringify(createArrowgramJsonSchema(), null, 2)}\n`;
}
