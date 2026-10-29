import { TOPICS, mathQuestion } from '../../lib/campaign.js';
import { contextQuestion, CATEGORIES, FORMATS } from '../../lib/context-questions.js';
let bad = [];
for (const topic of TOPICS) for (let level = 0; level < 5; level++) for (const category of CATEGORIES) for (const format of FORMATS) {
    const q = contextQuestion({ topic: topic.id, level, category: category.id, format: format.id }, 991);
    if (q.question.includes('undefined') || (q.steps || []).some(x => x.includes('undefined')))
        bad.push(`${topic.id} L${level} ${category.id}/${format.id}: ${q.question.slice(0, 80)}`);
}
console.log(bad.length ? bad.slice(0, 6).join('\n') : 'sạch');
console.log('tổng:', bad.length);
