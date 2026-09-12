import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeArrowgramJsonSchema } from "./schema.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, "..", "arrowgram.schema.json");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serializeArrowgramJsonSchema(), "utf8");
