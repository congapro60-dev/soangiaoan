import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Run after npm run build: RSC preload lists must match the final client output.
const root = resolve(import.meta.dirname, '..');
const client = resolve(root, 'dist/client');
const refs = new Set();
for (const name of ['dist/server/__vite_rsc_assets_manifest.js', 'dist/server/ssr/__vite_rsc_assets_manifest.js']) {
  const source = readFileSync(resolve(root, name), 'utf8');
  for (const [url] of source.matchAll(/\/_next\/static\/[^"'\\]+/g)) refs.add(url.slice(1));
}
const manifest = JSON.parse(readFileSync(resolve(client, '.vite/manifest.json'), 'utf8'));
for (const [key, entry] of Object.entries(manifest)) {
  refs.add(entry.file);
  for (const file of [...entry.css || [], ...entry.assets || []]) refs.add(file);
  for (const imported of [...entry.imports || [], ...entry.dynamicImports || []]) {
    assert.ok(manifest[imported], `Missing client manifest entry ${imported} (from ${key})`);
  }
}
const missing = [...refs].filter(file => !existsSync(resolve(client, file)));
assert.deepEqual(missing, [], `Missing client assets: ${missing.join(', ')}`);
console.log(`Client asset graph: ${refs.size} files, 0 missing`);
