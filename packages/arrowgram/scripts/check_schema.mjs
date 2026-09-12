import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeArrowgramJsonSchema } from "./schema.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "..", "arrowgram.schema.json");
const expected = serializeArrowgramJsonSchema();
const actual = await readFile(outputPath, "utf8");

if (actual !== expected) {
  process.stderr.write(
    "arrowgram.schema.json is stale. Run `npm run schema:generate -w packages/arrowgram`.\n",
  );
  process.exitCode = 1;
}
