import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8'));
console.log('LESSON SPECS KEYS:', Object.keys(snapshot.lessonSpecs));
const sample = snapshot.lessonSpecs['10-11-80'];
console.log('SAMPLE 10-11-80 KEYS:', Object.keys(sample));
console.log('SAMPLE SCREENS COUNT:', sample.screens?.length);
console.log('SAMPLE TIMELINE BLOCKS:', sample.timeline?.length);
