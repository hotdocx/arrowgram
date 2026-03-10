import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toJSONSchema } from "zod";
import { DiagramSpecSchema } from "../dist/arrowgram.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "..", "arrowgram.schema.json");

const schema = toJSONSchema(DiagramSpecSchema);
schema.title = "Arrowgram Specification";
schema.description = "Schema for describing commutative diagrams in Arrowgram.";

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
