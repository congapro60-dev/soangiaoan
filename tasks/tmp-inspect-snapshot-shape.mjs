import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8'));
console.log('KEYS IN SNAPSHOT:', Object.keys(snapshot));
console.log('SAMPLE LESSON KEY:', Object.keys(snapshot.packages || snapshot)[0]);
console.log('DATA SHAPE:', Array.isArray(snapshot) ? 'Array' : typeof snapshot);
