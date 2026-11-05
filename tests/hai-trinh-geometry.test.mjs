import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grade = JSON.parse(readFileSync(new URL('../content/lessons/hki-2026-g10.json', import.meta.url), 'utf8'));

function angleAt(p, q, r) {
  const ux = q.x - p.x, uy = q.y - p.y, vx = r.x - p.x, vy = r.y - p.y;
  return Math.acos((ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy))) * 180 / Math.PI;
}

const cases = [];
for (const entry of grade.entries) {
  for (const task of entry.pkg.tasks) {
    if (task.visual && String(task.visual.title).includes('Hải trình')) cases.push({ lesson: entry.pkg.id, task });
  }
}

test('Hải trình: đúng 70 câu trong 10 bài G10 HKI', () => {
  assert.equal(cases.length, 70);
  assert.equal(new Set(cases.map(c => c.lesson)).size, 10);
});

test('Hải trình: hình đo từ tọa độ khớp góc trong đề (sai số ≤ 0,5°)', () => {
  const bad = [];
  for (const { lesson, task } of cases) {
    const P = Object.fromEntries(task.visual.points.map(p => [p.label, p]));
    const cab = Number(String(task.prompt).match(/CAB[}]=(-?[0-9]+)/)[1]);
    const cba = Number(String(task.prompt).match(/CBA[}]=(-?[0-9]+)/)[1]);
    const gA = angleAt(P['Trạm A'], P['Trạm B'], P['Mục tiêu C']);
    const gB = angleAt(P['Trạm B'], P['Trạm A'], P['Mục tiêu C']);
    if (Math.abs(gA - cab) > 0.5 || Math.abs(gB - cba) > 0.5) bad.push(`${lesson}/${task.id}: góc A=${gA.toFixed(2)} (đề ${cab}), góc B=${gB.toFixed(2)} (đề ${cba})`);
  }
  assert.deepEqual(bad, []);
});

test('Hải trình: 27 hình trong ngân hàng ôn tập tích lũy khớp góc trong đề (sai số ≤ 0,5°)', () => {
  const bank = [];
  for (const entry of grade.entries) {
    for (const item of entry.cumulativeBank || []) {
      const q = item.question || {};
      if (q.visual && Array.isArray(q.visual.points) && q.visual.points.some(p => p.label === 'Trạm A')) bank.push({ lesson: entry.pkg.id, q });
    }
  }
  assert.equal(bank.length, 27);
  const bad = [];
  for (const { lesson, q } of bank) {
    const P = Object.fromEntries(q.visual.points.map(p => [p.label, p]));
    const cab = Number(String(q.prompt).match(/CAB[}]=(-?[0-9]+)/)[1]);
    const cba = Number(String(q.prompt).match(/CBA[}]=(-?[0-9]+)/)[1]);
    const gA = angleAt(P['Trạm A'], P['Trạm B'], P['Mục tiêu C']);
    const gB = angleAt(P['Trạm B'], P['Trạm A'], P['Mục tiêu C']);
    if (Math.abs(gA - cab) > 0.5 || Math.abs(gB - cba) > 0.5) bad.push(`${lesson}: góc A=${gA.toFixed(2)} (đề ${cab}), góc B=${gB.toFixed(2)} (đề ${cba})`);
  }
  assert.deepEqual(bad, []);
});

test('Hải trình: nhãn AB khớp khoảng cách A–B', () => {
  const bad = [];
  for (const { lesson, task } of cases) {
    const P = Object.fromEntries(task.visual.points.map(p => [p.label, p]));
    const d = Math.hypot(P['Trạm B'].x - P['Trạm A'].x, P['Trạm B'].y - P['Trạm A'].y);
    const label = Number(String(task.visual.segments.find(s => /^AB/.test(s.label)).label).match(/AB = ([0-9.]+)m/)[1]);
    if (Math.abs(d - label) > 0.01) bad.push(`${lesson}/${task.id}: AB=${d} nhãn ${label}`);
  }
  assert.deepEqual(bad, []);
});
