import { readFileSync } from 'node:fs';
const css = readFileSync('src/components/liveLesson/liveClassroom.css', 'utf8');
const m600 = css.slice(css.indexOf('@media (max-width: 600px)'), css.indexOf('@media (max-width: 900px)'));
console.log('600px: student-ask?', m600.includes('student-ask'), '| student-pulse?', m600.includes('student-pulse'), '| student-published?', m600.includes('student-published'));
console.log('dvh:', css.includes('dvh'), '| safe-area env:', css.includes('env(safe-area'));
