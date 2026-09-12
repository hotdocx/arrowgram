import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(packageRoot, '..', '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tarCommand = process.platform === 'win32' ? 'tar.exe' : 'tar';
const typescriptBin = require.resolve('typescript/bin/tsc');
const esbuildBin = require.resolve('esbuild/bin/esbuild');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 25 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join('\n'));
  }
  return result.stdout.trim();
}

function runResult(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    maxBuffer: 25 * 1024 * 1024,
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function moduleSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

async function resolveLocalModule(importer, specifier, declaration = false) {
  let candidate = resolve(dirname(importer), specifier);
  if (declaration && /\.[cm]?js$/.test(candidate)) {
    candidate = candidate.replace(/\.[cm]?js$/, '.d.ts');
  }
  const candidates = declaration
    ? [candidate, `${candidate}.d.ts`, join(candidate, 'index.d.ts')]
    : [candidate, `${candidate}.js`, `${candidate}.cjs`, join(candidate, 'index.js')];
  for (const path of candidates) {
    if (await isFile(path)) return path;
  }
  throw new Error(`Unable to resolve local module ${specifier} from ${importer}.`);
}

async function moduleGraph(entry, declaration = false) {
  const files = new Set();
  const bare = new Set();
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop();
    if (files.has(file)) continue;
    files.add(file);
    const source = await readFile(file, 'utf8');
    for (const specifier of moduleSpecifiers(source)) {
      if (specifier.startsWith('.')) {
        queue.push(await resolveLocalModule(file, specifier, declaration));
      } else if (!specifier.startsWith('node:')) {
        bare.add(specifier);
      }
    }
  }

  return { files, bare };
}

async function gzipGraphSize(graph) {
  let bytes = 0;
  for (const file of graph.files) bytes += gzipSync(await readFile(file)).byteLength;
  return bytes;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function install(directory, tarball, packages = [], omitPeers = true) {
  await mkdir(directory, { recursive: true });
  await writeJson(join(directory, 'package.json'), {
    name: `arrowgram-consumer-${directory.split('/').pop()}`,
    private: true,
    type: 'module',
    version: '0.0.0',
  });
  const args = [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    tarball,
    ...packages,
  ];
  if (omitPeers) args.splice(4, 0, '--omit=peer');
  run(npmCommand, args, { cwd: directory });
}

function installDevFixtures(directory, packages) {
  run(npmCommand, [
    'install',
    '--save-dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    ...packages,
  ], { cwd: directory });
}

function productionAudit(directory) {
  const result = runResult(npmCommand, ['audit', '--omit=dev', '--json'], { cwd: directory });
  const audit = JSON.parse(result.stdout);
  const counts = audit.metadata?.vulnerabilities ?? {};
  assert((counts.critical ?? 0) === 0, 'Production audit contains a critical vulnerability.');
  assert((counts.high ?? 0) === 0, 'Production audit contains a high vulnerability.');
  return counts;
}

function createSbom(directory) {
  const sbom = JSON.parse(run(npmCommand, [
    'sbom',
    '--omit=dev',
    '--sbom-format=cyclonedx',
  ], { cwd: directory }));
  assert(sbom.bomFormat === 'CycloneDX', 'npm did not produce a CycloneDX SBOM.');
  assert(Array.isArray(sbom.components) && sbom.components.length > 0, 'SBOM has no components.');
  return sbom;
}

async function verifyHeadlessConsumer(directory, tarball) {
  await install(directory, tarball);
  assert(!await exists(join(directory, 'node_modules', 'react')), 'Headless install unexpectedly contains React.');
  assert(!await exists(join(directory, 'node_modules', 'katex')), 'Headless install unexpectedly contains KaTeX.');

  await writeFile(join(directory, 'headless.mjs'), `
import { parseDiagramSpec } from '@hotdocx/arrowgram/schema';
import { computeDiagramResult } from '@hotdocx/arrowgram/core';
const input = { nodes: [{ name: 'A', left: 0, top: 0 }] };
if (!parseDiagramSpec(input).ok) throw new Error('ESM schema parse failed');
if (!computeDiagramResult(input).ok) throw new Error('ESM core compute failed');
`, 'utf8');
  await writeFile(join(directory, 'headless.cjs'), `
const { parseDiagramSpec } = require('@hotdocx/arrowgram/schema');
const { computeDiagramResult } = require('@hotdocx/arrowgram/core');
const input = { nodes: [{ name: 'A', left: 0, top: 0 }] };
if (!parseDiagramSpec(input).ok) throw new Error('CJS schema parse failed');
if (!computeDiagramResult(input).ok) throw new Error('CJS core compute failed');
`, 'utf8');
  run(process.execPath, ['headless.mjs'], { cwd: directory });
  run(process.execPath, ['headless.cjs'], { cwd: directory });

  await writeFile(join(directory, 'headless.ts'), `
import { parseDiagramSpec, type DiagramSpec } from '@hotdocx/arrowgram/schema';
import { computeDiagramResult } from '@hotdocx/arrowgram/core';
const input: DiagramSpec = { nodes: [{ name: 'A', left: 0, top: 0 }] };
const parsed = parseDiagramSpec(input);
if (parsed.ok) computeDiagramResult(parsed.value);
`, 'utf8');
  await writeJson(join(directory, 'tsconfig.json'), {
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      noEmit: true,
      strict: true,
      target: 'ES2022',
    },
    include: ['headless.ts'],
  });
  run(process.execPath, [typescriptBin, '-p', 'tsconfig.json'], { cwd: directory });
  return {
    audit: productionAudit(directory),
    sbom: createSbom(directory),
  };
}

async function verifyReactConsumer(directory, tarball, versions) {
  await install(directory, tarball, [
    `react@${versions.react}`,
    `react-dom@${versions.reactDom}`,
    `@types/react@${versions.reactTypes}`,
    `@types/react-dom@${versions.reactDomTypes}`,
    'katex@0.16.47',
  ], false);
  installDevFixtures(directory, ['jsdom@26.1.0']);
  const renderSource = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ArrowGram } from '@hotdocx/arrowgram/react';
const spec = JSON.stringify({ nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }] });
const html = renderToStaticMarkup(React.createElement(ArrowGram, { spec, title: 'Packed diagram' }));
if (!html.includes('<svg') || !html.includes('katex-mathml')) throw new Error('Packed SSR failed');
`;
  await writeFile(join(directory, 'render.mjs'), renderSource, 'utf8');
  await writeFile(join(directory, 'render.cjs'), `
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { ArrowGram } = require('@hotdocx/arrowgram/react');
const spec = JSON.stringify({ nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }] });
const html = renderToStaticMarkup(React.createElement(ArrowGram, { spec, title: 'Packed diagram' }));
if (!html.includes('<svg') || !html.includes('katex-mathml')) throw new Error('Packed CJS SSR failed');
`, 'utf8');
  run(process.execPath, ['render.mjs'], { cwd: directory });
  run(process.execPath, ['render.cjs'], { cwd: directory });

  await writeFile(join(directory, 'hydrate.mjs'), `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { ArrowGram } from '@hotdocx/arrowgram/react';
const spec = JSON.stringify({ nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }] });
const element = React.createElement(ArrowGram, { spec, title: 'Packed hydration diagram' });
const serverMarkup = renderToString(element);
const dom = new JSDOM(\`<!doctype html><div id="root">\${serverMarkup}</div>\`, {
  pretendToBeVisual: true,
});
for (const [name, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
  SVGElement: dom.window.SVGElement,
  MutationObserver: dom.window.MutationObserver,
})) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
const recoverable = [];
const { hydrateRoot } = await import('react-dom/client');
hydrateRoot(dom.window.document.getElementById('root'), element, {
  onRecoverableError(error) {
    recoverable.push(error instanceof Error ? error.message : String(error));
  },
});
await new Promise((resolve) => setTimeout(resolve, 25));
if (!dom.window.document.querySelector('svg') || !dom.window.document.querySelector('.katex-mathml')) {
  throw new Error('Packed hydration did not retain the rendered diagram');
}
if (recoverable.length > 0) {
  throw new Error(\`Packed hydration recovered from errors: \${recoverable.join('; ')}\`);
}
dom.window.close();
`, 'utf8');
  run(process.execPath, ['hydrate.mjs'], { cwd: directory });

  await writeFile(join(directory, 'render.tsx'), `
import { ArrowGram } from '@hotdocx/arrowgram/react';
const spec = JSON.stringify({ nodes: [{ name: 'A', left: 0, top: 0, label: '$A$' }] });
export const diagram = <ArrowGram spec={spec} title="Packed diagram" />;
`, 'utf8');
  await writeJson(join(directory, 'tsconfig.json'), {
    compilerOptions: {
      jsx: 'react-jsx',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      noEmit: true,
      strict: true,
      target: 'ES2022',
    },
    include: ['render.tsx'],
  });
  run(process.execPath, [typescriptBin, '-p', 'tsconfig.json'], { cwd: directory });
  run(esbuildBin, [
    'render.tsx',
    '--bundle',
    '--format=esm',
    '--minify',
    '--outfile=bundle.js',
    '--platform=browser',
  ], { cwd: directory });
  const bundleBytes = (await stat(join(directory, 'bundle.js'))).size;
  assert(bundleBytes < 750 * 1024, `Packed browser bundle is too large: ${bundleBytes} bytes.`);
  return {
    bundleBytes,
    hydration: true,
    audit: productionAudit(directory),
    sbom: createSbom(directory),
  };
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'arrowgram-package-'));
let keepTemporary = process.env.ARROWGRAM_KEEP_PACKAGE_FIXTURE === '1';

try {
  const packDirectory = join(temporaryRoot, 'pack');
  const extractDirectory = join(temporaryRoot, 'extract');
  await mkdir(packDirectory, { recursive: true });
  await mkdir(extractDirectory, { recursive: true });
  const packOutput = run(npmCommand, [
    'pack',
    '--json',
    '--pack-destination',
    packDirectory,
  ], { cwd: packageRoot });
  const [packResult] = JSON.parse(packOutput);
  const tarball = join(packDirectory, packResult.filename);
  run(tarCommand, ['-xzf', tarball, '-C', extractDirectory]);
  const packedRoot = join(extractDirectory, 'package');
  const manifest = JSON.parse(await readFile(join(packedRoot, 'package.json'), 'utf8'));
  const fileNames = new Set(packResult.files.map((file) => file.path));

  for (const required of [
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'THIRD_PARTY_NOTICES.md',
    'arrowgram.schema.json',
    'dist/index.js',
    'dist/index.cjs',
    'dist/index.d.ts',
    'dist/schema.js',
    'dist/schema.cjs',
    'dist/schema.d.ts',
    'dist/core.js',
    'dist/core.cjs',
    'dist/core.d.ts',
    'dist/react.js',
    'dist/react.cjs',
    'dist/react.d.ts',
  ]) {
    assert(fileNames.has(required), `Packed artifact is missing ${required}.`);
  }
  assert(
    [...fileNames].every((file) => !file.startsWith('src/') && !file.startsWith('test/')),
    'Packed artifact contains source or test files.',
  );
  assert(packResult.size <= 80 * 1024, `Tarball exceeds 80 KiB: ${packResult.size}.`);
  assert(packResult.unpackedSize <= 250 * 1024, `Tarball exceeds 250 KiB unpacked: ${packResult.unpackedSize}.`);
  assert(manifest.sideEffects === false, 'Package must declare sideEffects=false.');

  const exportEntries = {
    root: manifest.exports['.'],
    schema: manifest.exports['./schema'],
    core: manifest.exports['./core'],
    react: manifest.exports['./react'],
  };
  const declaredPackages = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const graphReport = {};
  for (const [name, conditions] of Object.entries(exportEntries)) {
    for (const condition of ['types', 'import', 'require']) {
      const target = join(packedRoot, conditions[condition]);
      assert(await exists(target), `Export ${name}.${condition} points to missing ${conditions[condition]}.`);
    }
    const esmGraph = await moduleGraph(join(packedRoot, conditions.import));
    const cjsGraph = await moduleGraph(join(packedRoot, conditions.require));
    const typesGraph = await moduleGraph(join(packedRoot, conditions.types), true);
    const bare = new Set([...esmGraph.bare, ...cjsGraph.bare, ...typesGraph.bare]);
    for (const specifier of bare) {
      assert(
        declaredPackages.has(packageName(specifier)),
        `Export ${name} imports undeclared package ${specifier}.`,
      );
    }
    if (name === 'schema' || name === 'core') {
      for (const forbidden of ['react', 'react/jsx-runtime', 'react-dom', 'katex']) {
        assert(!bare.has(forbidden), `Headless export ${name} imports ${forbidden}.`);
      }
      for (const file of esmGraph.files) {
        const source = await readFile(file, 'utf8');
        assert(!/\b(?:document|window|navigator)\b/.test(source), `${name} references a DOM global in ${file}.`);
      }
    }
    graphReport[name] = {
      bareImports: [...bare].sort(),
      esmGzipBytes: await gzipGraphSize(esmGraph),
      esmModules: esmGraph.files.size,
    };
  }

  assert(graphReport.schema.esmGzipBytes <= 10 * 1024, 'Schema entry exceeds its 10 KiB gzip budget.');
  assert(graphReport.core.esmGzipBytes <= 25 * 1024, 'Core entry exceeds its 25 KiB gzip budget.');
  assert(graphReport.react.esmGzipBytes <= 35 * 1024, 'React entry exceeds its 35 KiB gzip budget.');
  assert(graphReport.root.esmGzipBytes <= 40 * 1024, 'Root entry exceeds its 40 KiB gzip budget.');

  const headless = await verifyHeadlessConsumer(join(temporaryRoot, 'headless'), tarball);
  const react18 = await verifyReactConsumer(join(temporaryRoot, 'react18'), tarball, {
    react: '18.3.1',
    reactDom: '18.3.1',
    reactTypes: '18.3.31',
    reactDomTypes: '18.3.7',
  });
  const react19 = await verifyReactConsumer(join(temporaryRoot, 'react19'), tarball, {
    react: '19.2.8',
    reactDom: '19.2.8',
    reactTypes: '19.2.18',
    reactDomTypes: '19.2.5',
  });

  const digest = createHash('sha256').update(await readFile(tarball)).digest('hex');
  const evidence = {
    package: `${manifest.name}@${manifest.version}`,
    sha256: digest,
    tarballBytes: packResult.size,
    unpackedBytes: packResult.unpackedSize,
    entries: graphReport,
    consumers: {
      headless: {
        audit: headless.audit,
        sbomComponents: headless.sbom.components.length,
      },
      react18: {
        bundleBytes: react18.bundleBytes,
        hydration: react18.hydration,
        audit: react18.audit,
        sbomComponents: react18.sbom.components.length,
      },
      react19: {
        bundleBytes: react19.bundleBytes,
        hydration: react19.hydration,
        audit: react19.audit,
        sbomComponents: react19.sbom.components.length,
      },
    },
  };

  const outputDirectory = process.env.ARROWGRAM_PACKAGE_OUTPUT_DIR;
  if (outputDirectory) {
    const resolvedOutput = resolve(repositoryRoot, outputDirectory);
    await mkdir(resolvedOutput, { recursive: true });
    await copyFile(tarball, join(resolvedOutput, packResult.filename));
    await writeJson(join(resolvedOutput, 'verification.json'), evidence);
    await writeJson(join(resolvedOutput, 'sbom-headless.cdx.json'), headless.sbom);
    await writeJson(join(resolvedOutput, 'sbom-react19.cdx.json'), react19.sbom);
  }

  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} catch (error) {
  keepTemporary = true;
  process.stderr.write(`Package verification fixture retained at ${temporaryRoot}\n`);
  throw error;
} finally {
  if (!keepTemporary) await rm(temporaryRoot, { recursive: true, force: true });
}
