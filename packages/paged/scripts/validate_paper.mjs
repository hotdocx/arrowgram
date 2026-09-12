import fs from 'fs';
import { computeDiagramResult } from '@hotdocx/arrowgram';

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
    const result = computeDiagramResult(raw, '', { normalizeLegacy: true });
    result.diagnostics.forEach((diagnostic) => {
      const location = diagnostic.path.length > 0 ? ` at ${diagnostic.path.join('.')}` : '';
      const message = `${file}: Arrowgram #${i + 1}: ${diagnostic.code}${location}: ${diagnostic.message}`;
      if (diagnostic.severity === 'warning') console.warn(message);
      else console.error(message);
    });
    if (!result.ok) {
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
