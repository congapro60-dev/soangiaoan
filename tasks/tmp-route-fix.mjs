// Đổi route học lại sang /adaptive-library/:lessonId (tránh xung đột /adaptive-portal/:id)
import { readFileSync, writeFileSync } from 'node:fs';

let m = readFileSync('src/main.tsx', 'utf8');
m = m.split('path="/adaptive-portal/library/:lessonId"').join('path="/adaptive-library/:lessonId"');
writeFileSync('src/main.tsx', m, 'utf8');
console.log('route:', m.includes('/adaptive-library/:lessonId'));

let p = readFileSync('src/pages/AdaptiveLibraryPage.tsx', 'utf8');
p = p.split('/adaptive-portal/library/').join('/adaptive-library/');
writeFileSync('src/pages/AdaptiveLibraryPage.tsx', p, 'utf8');
console.log('link:', p.includes('/adaptive-library/'));
