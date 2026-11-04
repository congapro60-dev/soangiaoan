import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/services/liveQuestionService.test.ts';
let t = readFileSync(p, 'utf8');
const anchor = "  getDoc: async () => ({ exists: () => false, data: () => null }),";
if (!t.includes(anchor)) throw new Error('anchor missing');
t = t.split(anchor).join(anchor + `
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),`);
writeFileSync(p, t, 'utf8');
console.log('fixed');
