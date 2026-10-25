import test from 'node:test';
import assert from 'node:assert/strict';
import {
  gradeDrawing,
  mapVertices,
  DEFAULT_VERTEX_TOLERANCE,
  type DrawnEdge,
  type DrawnVertex,
  type ExpectedEdge,
} from '../lib/geometry/grade.ts';

// Hình hộp: 4 dinh day, vi tri goi y tren man hinh 440x300
const labels = ['A', 'B', 'C', 'D'];
const hints: DrawnVertex[] = [
  { x: 60, y: 230 }, // A
  { x: 300, y: 230 }, // B
  { x: 380, y: 170 }, // C
  { x: 140, y: 170 }, // D
];

// Day ABCD: AB, BC lien; CD, DA dut
const expected: ExpectedEdge[] = [
  { from: 'A', to: 'B', solid: true },
  { from: 'B', to: 'C', solid: true },
  { from: 'C', to: 'D', solid: false },
  { from: 'D', to: 'A', solid: false },
];

const perfectVerts = hints.map((h) => ({ ...h }));
const perfectEdges: DrawnEdge[] = [
  { a: 0, b: 1, solid: true }, // A-B
  { a: 1, b: 2, solid: true }, // B-C
  { a: 2, b: 3, solid: false }, // C-D
  { a: 3, b: 0, solid: false }, // D-A
];

test('ca 1: ve dung hoan toan -> ok, khong loi nao', () => {
  const r = gradeDrawing({ drawnVerts: perfectVerts, hintVerts: hints, labels, drawnEdges: perfectEdges, expectedEdges: expected });
  assert.equal(r.ok, true);
  assert.equal(r.missing.length, 0);
  assert.equal(r.extra.length, 0);
  assert.equal(r.wrongDash.length, 0);
});

test('ca 2: thieu 1 canh -> missing, khong bao nham la extra', () => {
  const r = gradeDrawing({
    drawnVerts: perfectVerts, hintVerts: hints, labels,
    drawnEdges: perfectEdges.slice(0, 3), // thieu D-A
    expectedEdges: expected,
  });
  assert.equal(r.ok, false);
  assert.equal(r.missing.length, 1);
  assert.equal(r.missing[0].edge.includes('D') && r.missing[0].edge.includes('A'), true);
  assert.equal(r.extra.length, 0);
  assert.equal(r.wrongDash.length, 0);
});

test('ca 3: thua 1 canh -> extra, khong bao nham la missing', () => {
  const r = gradeDrawing({
    drawnVerts: perfectVerts, hintVerts: hints, labels,
    drawnEdges: [...perfectEdges, { a: 0, b: 2, solid: true }], // them A-C
    expectedEdges: expected,
  });
  assert.equal(r.ok, false);
  assert.equal(r.extra.length, 1);
  assert.equal(r.missing.length, 0);
  assert.equal(r.wrongDash.length, 0);
});

test('ca 4: sai net 1 canh -> wrongDash, KHONG bao missing/extra', () => {
  const wrong = perfectEdges.map((e) => (e.a === 2 && e.b === 3 ? { ...e, solid: true } : e)); // CD dut -> lien
  const r = gradeDrawing({ drawnVerts: perfectVerts, hintVerts: hints, labels, drawnEdges: wrong, expectedEdges: expected });
  assert.equal(r.ok, false);
  assert.equal(r.wrongDash.length, 1, 'phai bao dung 1 canh sai net');
  assert.equal(r.missing.length, 0);
  assert.equal(r.extra.length, 0);
  assert.match(r.wrongDash[0].detail, /nét đứt/);
});

test('ca 5: dinh lech trong dung sai -> van dung', () => {
  const shifted = hints.map((h) => ({ x: h.x + 10, y: h.y + 10 }));
  const r = gradeDrawing({ drawnVerts: shifted, hintVerts: hints, labels, drawnEdges: perfectEdges, expectedEdges: expected });
  assert.equal(r.ok, true, 'lech 14.1px < nguong 18 phai van dung');
});

test('ca 6: dinh lech NGOAI dung sai -> canh bi coi la thieu', () => {
  const far = hints.map((h, i) => (i === 0 ? { x: h.x + 40, y: h.y + 40 } : { ...h }));
  const r = gradeDrawing({ drawnVerts: far, hintVerts: hints, labels, drawnEdges: perfectEdges, expectedEdges: expected });
  assert.equal(r.ok, false, 'dinh A lech 56px phai bi coi la sai');
  // A o (40,40) khong map duoc -> 2 canh co dinh A bi bo qua -> bao thieu
  assert.equal(r.missing.length, 2, 'AB va DA deu thieu');
});

test('ca 7: dao thu tu ve canh -> van dung (A-B = B-A)', () => {
  const reversed = perfectEdges.map((e) => ({ a: e.b, b: e.a, solid: e.solid }));
  const r = gradeDrawing({ drawnVerts: perfectVerts, hintVerts: hints, labels, drawnEdges: reversed, expectedEdges: expected });
  assert.equal(r.ok, true, 'HS ve B->A phai tuong duong A->B');
});

test('ca 8: hinh rong -> bao thieu het', () => {
  const r = gradeDrawing({ drawnVerts: perfectVerts, hintVerts: hints, labels, drawnEdges: [], expectedEdges: expected });
  assert.equal(r.ok, false);
  assert.equal(r.missing.length, 4);
  assert.equal(r.extra.length, 0);
});

test('mapVertices: gan dung nhan theo khoang cach gan nhat, moi nhan dung 1 lan', () => {
  const drawn = [
    { x: 62, y: 232 }, // gan A
    { x: 298, y: 228 }, // gan B
    { x: 379, y: 172 }, // gan C
    { x: 142, y: 168 }, // gan D
  ];
  const map = mapVertices(drawn, hints, labels, DEFAULT_VERTEX_TOLERANCE);
  assert.deepEqual(map, ['A', 'B', 'C', 'D']);
});

test('mapVertices: dinh lac ra ngoai -> null, khong gan bua', () => {
  const drawn = [{ x: 62, y: 232 }, { x: 900, y: 900 }];
  const map = mapVertices(drawn, hints, labels, DEFAULT_VERTEX_TOLERANCE);
  assert.equal(map[0], 'A');
  assert.equal(map[1], null);
});

test('mapVertices: two drawn verts gan cung mot hint -> khong duoc cung nhan', () => {
  const drawn = [
    { x: 60, y: 230 },
    { x: 62, y: 231 },
  ];
  const map = mapVertices(drawn, hints, labels, DEFAULT_VERTEX_TOLERANCE);
  // mot nhan duoc 'A', cai con lai phai null (hoac nhan khac neu gan)
  const assigned = map.filter((x) => x !== null);
  assert.equal(new Set(assigned).size, assigned.length, 'khong duoc 2 dinh cung 1 nhan');
});
