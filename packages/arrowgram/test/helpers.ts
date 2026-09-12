import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function readFixture(relativePath: string): unknown {
  const url = new URL(`./fixtures/${relativePath}`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));
}

export function dashNumbers(value: string | undefined): number[] {
  if (!value) return [];
  return value.trim().split(/\s+/).map(Number);
}
