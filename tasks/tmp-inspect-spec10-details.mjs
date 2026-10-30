import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8'));
const spec10 = snapshot.lessonSpecs[0];
const err10 = snapshot.aiErrors[spec10.key];

console.log('SPEC 10-11-80:');
console.log(JSON.stringify(spec10, null, 2));

console.log('AI ERROR 10-11-80:');
console.log(JSON.stringify(err10, null, 2));
