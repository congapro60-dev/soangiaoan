// One-shot splice of the arena UI block into public/app.js at a stable anchor.
import {readFile, writeFile} from 'node:fs/promises';
const appPath = 'public/app.js';
let app = await readFile(appPath, 'utf8');
if (app.includes('function arenaPanel')) {
  console.log('already applied');
  process.exit(0);
}
const block = await readFile('scripts/arena-ui-block.js', 'utf8');
const anchor = '    function campaignSetup() {';
const at = app.indexOf(anchor);
if (at < 0) throw new Error('anchor not found');
app = app.slice(0, at) + block + app.slice(at);
await writeFile(appPath, app);
console.log('inserted', block.length, 'chars at', at);
