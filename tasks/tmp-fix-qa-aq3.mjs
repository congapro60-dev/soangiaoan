import { readFileSync, writeFileSync } from 'node:fs';
const p = 'tasks/tmp-qa-aq.cjs';
let t = readFileSync(p, 'utf8');
// Nút có emoji prefix → dùng match chứa (exact=false)
t = t.split(`const raised = await click(hp, 'Giơ tay', true);`).join(`const raised = await click(hp, 'Giơ tay', false);`);
t = t.split(`const lowered = await click(hp, 'Hạ tay', true);`).join(`const lowered = await click(hp, 'Hạ tay', false);`);
t = t.split(`await click(hp, 'Giơ tay', true); // giơ lại để test panel`).join(`await click(hp, 'Giơ tay', false); // giơ lại để test panel`);
t = t.split(`const askOpen = await click(hp, 'Đặt câu hỏi ẩn danh', true);`).join(`const askOpen = await click(hp, 'Đặt câu hỏi ẩn danh', false);`);
t = t.split(`const sent = await click(hp, 'Gửi câu hỏi', true);`).join(`const sent = await click(hp, 'Gửi câu hỏi', false);`);
writeFileSync(p, t, 'utf8');
console.log('patched');
