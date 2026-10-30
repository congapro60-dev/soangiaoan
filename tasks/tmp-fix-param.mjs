import { readFileSync, writeFileSync } from 'node:fs';
let m = readFileSync('src/main.tsx', 'utf8');
m = m.split('path="/adaptive-library/:lessonId"').join('path="/adaptive-library/:libraryLessonId"');
writeFileSync('src/main.tsx', m, 'utf8');
console.log('route param ok:', m.includes(':libraryLessonId'));
