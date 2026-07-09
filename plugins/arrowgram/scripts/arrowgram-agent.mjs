#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const pluginRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(pluginRoot, '..', '..');

const localBin = process.platform === 'win32'
  ? path.join(repoRoot, 'node_modules', '.bin', 'arrowgram-agent.cmd')
  : path.join(repoRoot, 'node_modules', '.bin', 'arrowgram-agent');

const args = process.argv.slice(2);
const command = existsSync(localBin)
  ? { bin: process.execPath, args: [localBin, ...args] }
  : { bin: 'npx', args: ['-y', '@hotdocx/arrowgram-agent', ...args] };

const child = spawn(command.bin, command.args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
