import fs from 'fs';

const snapshot = JSON.parse(fs.readFileSync('src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json', 'utf8'));
console.log('TYPE OF LESSON SPECS:', Array.isArray(snapshot.lessonSpecs) ? 'Array' : typeof snapshot.lessonSpecs);
if (Array.isArray(snapshot.lessonSpecs)) {
  console.log('ITEMS COUNT:', snapshot.lessonSpecs.length);
  snapshot.lessonSpecs.forEach((item, idx) => {
    console.log(`[${idx}] key: ${item.definitionKey || item.key || item.id} | title: ${item.title} | grade: ${item.grade}`);
  });
  console.log('KEYS OF FIRST ITEM:', Object.keys(snapshot.lessonSpecs[0]));
}
