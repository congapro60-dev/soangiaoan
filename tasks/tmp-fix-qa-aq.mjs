import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-aq.cjs';
let t = readFileSync(p, 'utf8');
const anchor = `  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  await hp.evaluate(() => {
    const sel = document.querySelector('select');`;
if (!t.includes(anchor)) throw new Error('anchor missing');
const fixed = `  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(10000);
  for (let i = 0; i < 10; i++) { if (await hp.evaluate(() => Boolean(document.querySelector('select')))) break; await sleep(2500); }
  await hp.evaluate(() => {
    const sel = document.querySelector('select');`;
t = t.split(anchor).join(fixed);
writeFileSync(p, t, 'utf8');
console.log('patched');
