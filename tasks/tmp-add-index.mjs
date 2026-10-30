import { readFileSync, writeFileSync } from 'node:fs';
const p = 'firestore.indexes.json';
const json = JSON.parse(readFileSync(p, 'utf8'));
const exists = json.indexes.some((ix) => ix.collectionGroup === 'questions'
  && ix.fields.some((f) => f.fieldPath === 'clientNonce')
  && ix.fields.some((f) => f.fieldPath === 'serverReceivedAt'));
if (!exists) {
  json.indexes.push({
    collectionGroup: 'questions',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'clientNonce', order: 'ASCENDING' },
      { fieldPath: 'serverReceivedAt', order: 'ASCENDING' },
    ],
  });
  writeFileSync(p, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log('index added');
} else console.log('index đã có');
