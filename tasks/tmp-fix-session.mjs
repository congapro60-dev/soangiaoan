import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-xoaytua6.mjs', 'utf8');
t = t.split('EyrNANoC3IE3gZ5Yv7Xo').join('sY4gRJSMS1h6v9eTy7A5');
writeFileSync('tasks/tmp-qa-xoaytua6.mjs', t, 'utf8');
console.log('session updated:', t.includes('sY4gRJSMS1h6v9eTy7A5'));
