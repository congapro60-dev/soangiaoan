import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-xoaytua2.cjs';
let t = readFileSync(p, 'utf8');
const oldS = '  const gvEval = async (fn) => { try { return await gv2.evaluate(fn); } catch (e) { console.log(\'[gv detached]\', e.message); return null; } };';
const newS = '  const gvEval = async (fn, arg) => { try { return await gv2.evaluate(fn, arg); } catch (e) { console.log(\'[gv detached]\', e.message); return null; } };';
if (!t.includes(oldS)) throw new Error('gvEval not found');
t = t.split(oldS).join(newS);
writeFileSync(p, t, 'utf8');
console.log('fixed gvEval');
