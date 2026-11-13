/* Verifies that every local href/src and every precached file exists.
 * No browser needed, so it runs in CI in a second.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'mixer/index.html', '404.html', 'selftest.html'];
const problems = [];

const strip = (value) => value.split('?')[0].split('#')[0];

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const matches = [...html.matchAll(/(?:href|src)="([^"]+)"/g)];
  for (const [, raw] of matches) {
    if (/^(https?:|mailto:|tel:|data:|#|\/)/.test(raw)) continue;
    const target = strip(raw);
    if (!target) continue;
    const file = resolve(dirname(join(root, page)), target);
    if (!existsSync(file)) problems.push(`${page} → ${raw}`);
  }
}

const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
const precache = [...sw.matchAll(/'(\.\/[^']+)'/g)].map((m) => m[1]);
for (const entry of precache) {
  const file = resolve(root, strip(entry).replace(/^\.\//, ''));
  if (!existsSync(file)) problems.push(`service-worker → ${entry}`);
}

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
for (const icon of manifest.icons || []) {
  if (!existsSync(resolve(root, icon.src))) problems.push(`manifest → ${icon.src}`);
}

if (problems.length) {
  console.error(`Broken local references (${problems.length}):`);
  problems.forEach((problem) => console.error('  ' + problem));
  process.exit(1);
}

console.log(`All local references resolve (${pages.length} pages, ${precache.length} precached files, ${(manifest.icons || []).length} icons).`);
