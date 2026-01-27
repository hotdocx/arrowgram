import fs from 'fs';
import { z } from 'zod';

const NodeSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  left: z.number(),
  top: z.number(),
});

const ArrowStyleSchema = z.object({
  mode: z.enum(['arrow', 'adjunction', 'corner', 'corner_inverse']).optional(),
  head: z.object({
    name: z.enum(['normal', 'none', 'epi', 'hook', 'maps_to', 'harpoon']).optional(),
    side: z.enum(['top', 'bottom']).optional(),
  }).optional(),
  tail: z.object({
    name: z.enum(['normal', 'none', 'mono', 'hook', 'maps_to']).optional(),
    side: z.enum(['top', 'bottom']).optional(),
  }).optional(),
  body: z.object({
    name: z.enum(['solid', 'dashed', 'dotted', 'squiggly', 'wavy', 'barred', 'double_barred', 'bullet_solid', 'bullet_hollow']).optional(),
  }).optional(),
  level: z.number().int().optional(),
});

const ArrowSchema = z.object({
  from: z.string(),
  to: z.string(),
  name: z.string().optional(),
  label: z.string().optional(),
  curve: z.number().optional(),
  shift: z.number().optional(),
  radius: z.number().optional(),
  angle: z.number().optional(),
  label_alignment: z.enum(['over', 'left', 'right']).optional(),
  style: ArrowStyleSchema.optional(),
});

const DiagramSpecSchema = z.object({
  version: z.number().int().optional(),
  nodes: z.array(NodeSchema),
  arrows: z.array(ArrowSchema).optional(),
});

function extractBlocks(markdown, klass) {
  const re = new RegExp(`<div class=\\"${klass}\\"[^>]*>([\\s\\S]*?)<\\/div>`, 'g');
  return [...markdown.matchAll(re)].map(m => m[1].trim()).filter(Boolean);
}

const publicDir = new URL('../public/', import.meta.url);
const publicPath = new URL('.', publicDir);
const mdFiles = fs
  .readdirSync(publicPath, { withFileTypes: true })
  .filter((d) => d.isFile() && /^index(?:_[0-9]+)?\.md$/.test(d.name))
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b));

if (mdFiles.length === 0) {
  console.error('validate_paper: no public/index*.md found');
  process.exit(1);
}

let okAll = true;

for (const file of mdFiles) {
  const mdPath = new URL(`../public/${file}`, import.meta.url);
  const md = fs.readFileSync(mdPath, 'utf8');

  let ok = true;
  const arrowgrams = extractBlocks(md, 'arrowgram');
  arrowgrams.forEach((raw, i) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error(`${file}: Arrowgram #${i + 1}: JSON parse error: ${e.message}`);
      ok = false;
      return;
    }

    const res = DiagramSpecSchema.safeParse(parsed);
    if (!res.success) {
      console.error(`${file}: Arrowgram #${i + 1}: schema error`);
      console.error(res.error.issues);
      ok = false;
    }
  });

  const vegas = extractBlocks(md, 'vega-lite');
  vegas.forEach((raw, i) => {
    try {
      JSON.parse(raw);
    } catch (e) {
      console.error(`${file}: Vega-Lite #${i + 1}: JSON parse error: ${e.message}`);
      ok = false;
    }
  });

  console.log(`validate_paper: file=${file}, arrowgram blocks=${arrowgrams.length}, vega-lite blocks=${vegas.length}, status=${ok ? 'OK' : 'FAIL'}`);
  okAll = okAll && ok;
}

process.exit(okAll ? 0 : 1);
