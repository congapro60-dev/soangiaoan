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

// CoordinatePlane vẽ vùng 304×184 px (360×240, lề 28). Góc đo trên hình đã vẽ phải khớp đề, không chỉ dữ liệu tọa độ.
const PLOT_W = 304, PLOT_H = 184, PAD = 28, SVG_W = 360, SVG_H = 240;
const toSvg = (v, [mn, mx], size, inverted) => {
  const u = (v - mn) / (mx - mn);
  return inverted ? SVG_H - PAD - u * (size - 2 * PAD) : PAD + u * (size - 2 * PAD);
};
const drawnPoint = (visual, p) => [toSvg(p.x, visual.xDomain, SVG_W, false), toSvg(p.y, visual.yDomain, SVG_H, true)];
const drawnAngles = (visual) => {
  const P = Object.fromEntries(visual.points.map(p => [p.label, drawnPoint(visual, p)]));
  return { A: angleAt({ x: P['Trạm A'][0], y: P['Trạm A'][1] }, { x: P['Trạm B'][0], y: P['Trạm B'][1] }, { x: P['Mục tiêu C'][0], y: P['Mục tiêu C'][1] }),
           B: angleAt({ x: P['Trạm B'][0], y: P['Trạm B'][1] }, { x: P['Trạm A'][0], y: P['Trạm A'][1] }, { x: P['Mục tiêu C'][0], y: P['Mục tiêu C'][1] }) };
};
const bankVisuals = [];
for (const entry of grade.entries) for (const item of entry.cumulativeBank || []) {
  const q = item.question || {};
  if (q.visual && Array.isArray(q.visual.points) && q.visual.points.some(p => p.label === 'Trạm A')) bankVisuals.push({ lesson: entry.pkg.id, prompt: q.prompt, visual: q.visual });
}

test('Hải trình: trục X và Y cùng tỷ lệ (hình không méo) cho cả 70 câu và 27 bản sao', () => {
  const bad = [];
  for (const { lesson, task } of [...cases.map(c => ({ lesson: c.lesson, task: { id: c.task.id, visual: c.task.visual } })), ...bankVisuals.map(b => ({ lesson: b.lesson, task: { id: 'bank', visual: b.visual } }))]) {
    const [x0, x1] = task.visual.xDomain, [y0, y1] = task.visual.yDomain;
    const ratio = (PLOT_W / (x1 - x0)) / (PLOT_H / (y1 - y0));
    if (Math.abs(ratio - 1) > 0.002) bad.push(`${lesson}/${task.id}: tỷ lệ ${ratio.toFixed(4)}`);
  }
  assert.deepEqual(bad, []);
});

test('Hải trình: góc đo trên hình đã vẽ khớp đề (sai số ≤ 0,1°), cả 70 câu và 27 bản sao', () => {
  const bad = [];
  const check = (lesson, id, visual, prompt) => {
    const g = drawnAngles(visual);
    const cab = Number(String(prompt).match(/CAB[}]=(-?[0-9]+)/)[1]);
    const cba = Number(String(prompt).match(/CBA[}]=(-?[0-9]+)/)[1]);
    if (Math.abs(g.A - cab) > 0.1 || Math.abs(g.B - cba) > 0.1) bad.push(`${lesson}/${id}: vẽ A=${g.A.toFixed(3)} B=${g.B.toFixed(3)} (đề ${cab}/${cba})`);
  };
  for (const { lesson, task } of cases) check(lesson, task.id, task.visual, task.prompt);
  for (const b of bankVisuals) check(b.lesson, 'bank', b.visual, b.prompt);
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
