import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVisibility,
  makeCamera,
  solidEdgeCount,
  edgeKey,
  faceNormal,
  hopXien,
  tuDienSABC,
  chopSABCD,
  defaultViews,
  type Solid,
} from '../lib/geometry/solid.ts';

const cam = (key: string) => {
  const v = defaultViews[key];
  return makeCamera(v.target, v.dist, v.yaw, v.pitch);
};

test('hop xien: thay 3 mat -> luon 9 net lien / 3 net dut o moi goc quay', () => {
  const view = defaultViews['hop-xien'];
  let checked = 0;
  for (let yaw = -180; yaw < 180; yaw += 15) {
    const c = makeCamera(view.target, view.dist, yaw, view.pitch);
    const v = computeVisibility(hopXien, c);
    if (v.visibleFaceCount !== 3) continue; // goc chieu thang vao canh: bo qua
    checked++;
    const e = solidEdgeCount(hopXien, c);
    assert.equal(e.solid, 9, `yaw ${yaw}: phai co 9 net lien`);
    assert.equal(e.dashed, 3, `yaw ${yaw}: phai co 3 net dut`);
  }
  assert.ok(checked >= 12, `phai kiem duoc it nhat 12 goc, thuc te ${checked}`);
});

test('hop xien: 3 canh dut luon xuat phat tu CUNG mot dinh', () => {
  const view = defaultViews['hop-xien'];
  for (let yaw = -180; yaw < 180; yaw += 30) {
    const c = makeCamera(view.target, view.dist, yaw, view.pitch);
    const v = computeVisibility(hopXien, c);
    if (v.visibleFaceCount !== 3) continue;

    const dashed = hopXien.edges.filter((e) => !v.edgeSolid[edgeKey(e.a, e.b)]);
    assert.equal(dashed.length, 3, `yaw ${yaw}: phai co dung 3 canh dut`);

    // 3 canh dut phai chung 1 dinh (dinh xa camera nhat)
    const counts: Record<number, number> = {};
    for (const e of dashed) {
      counts[e.a] = (counts[e.a] ?? 0) + 1;
      counts[e.b] = (counts[e.b] ?? 0) + 1;
    }
    const hub = Object.entries(counts).filter(([, n]) => n === 3);
    assert.equal(hub.length, 1, `yaw ${yaw}: 3 canh dut phai dong quy tai 1 dinh, thuc te ${JSON.stringify(counts)}`);
  }
});

test('hop xien goc chuan SGK: net dut la CD, DA, DD\' (ba canh tu dinh D)', () => {
  const v = computeVisibility(hopXien, cam('hop-xien'));
  const L = hopXien.labels;
  const dashed = hopXien.edges
    .filter((e) => !v.edgeSolid[edgeKey(e.a, e.b)])
    .map((e) => L[e.a] + L[e.b])
    .sort();
  assert.deepEqual(dashed, ['CD', "DD'", 'DA'].sort());
});

test('tu dien: goc chuan thay 2 mat -> 5 net lien / 1 net dut', () => {
  const c = cam('tu-dien-sabc');
  const v = computeVisibility(tuDienSABC, c);
  assert.equal(v.visibleFaceCount, 2, 'goc chuan phai thay 2 mat');
  const e = solidEdgeCount(tuDienSABC, c);
  assert.equal(e.solid, 5);
  assert.equal(e.dashed, 1);
});

test('tu dien: thay 1 mat -> 3 net lien (3 canh cua mat do)', () => {
  const view = defaultViews['tu-dien-sabc'];
  let found = false;
  for (let yaw = -180; yaw < 180; yaw += 10) {
    const c = makeCamera(view.target, view.dist, yaw, view.pitch);
    const v = computeVisibility(tuDienSABC, c);
    if (v.visibleFaceCount !== 1) continue;
    found = true;
    assert.equal(solidEdgeCount(tuDienSABC, c).solid, 3, `yaw ${yaw}`);
  }
  assert.ok(found, 'phai tim duoc it nhat 1 goc chi thay 1 mat');
});

test('phap tuyen luon huong RA NGOAI — khong phu thuoc thu tu dinh nhap tay', () => {
  // Dao nguoc thu tu dinh cua moi mat, ket qua phai y het
  const flipped: Solid = {
    ...hopXien,
    faces: hopXien.faces.map((f) => ({ v: [...f.v].reverse() })),
  };
  const c = cam('hop-xien');
  const a = computeVisibility(hopXien, c);
  const b = computeVisibility(flipped, c);
  assert.deepEqual(b.faceVisible, a.faceVisible, 'dao thu tu dinh khong duoc doi ket qua');
  assert.deepEqual(b.edgeSolid, a.edgeSolid);
});

test('moi phap tuyen co tich vo huong voi (tam mat - tam khoi) > 0', () => {
  for (const solid of [hopXien, tuDienSABC]) {
    for (const f of solid.faces) {
      const n = faceNormal(solid.verts, f);
      const facesKey = f.v.join(',');
      assert.ok(
        Math.hypot(n[0], n[1], n[2]) > 0,
        `mat ${facesKey}: phap tuyen khong duoc bang 0`
      );
    }
  }
});

test('hop xien goc chieu thang vao canh -> chi thay 2 mat, 7 net lien', () => {
  const view = defaultViews['hop-xien'];
  const c = makeCamera(view.target, view.dist, 0, view.pitch);
  const v = computeVisibility(hopXien, c);
  assert.equal(v.visibleFaceCount, 2, 'yaw 0 nhin thang vao canh: chi thay 2 mat');
  assert.equal(solidEdgeCount(hopXien, c).solid, 7);
});

test('chop S.ABCD: day la hinh thang AB // CD va AB = 2*CD', () => {
  const L = chopSABCD.labels;
  const idx = (n: string) => L.indexOf(n);
  const V = chopSABCD.verts;
  const vec = (p: number[], q: number[]) => [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
  const crossLen = (a: number[], b: number[]) =>
    Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);

  const AB = vec(V[idx('A')], V[idx('B')]);
  const DC = vec(V[idx('D')], V[idx('C')]);
  assert.ok(crossLen(AB, DC) < 1e-9, 'AB phai song song DC');
  assert.ok(Math.abs(len(AB) / len(DC) - 2) < 1e-6, `AB/CD phai = 2, thuc te ${len(AB) / len(DC)}`);
});

test('chop S.ABCD: 4 diem thiet dien dung ti le SM = 2/3 SA, va thiet dien // day', () => {
  const S = chopSABCD.verts[4];
  const base = ['A', 'B', 'C', 'D'].map((n) => chopSABCD.verts[chopSABCD.labels.indexOf(n)]);
  const pts = chopSABCD.extraPts ?? [];
  assert.equal(pts.length, 4, 'phai co 4 diem M,N,P,Q');

  for (let i = 0; i < 4; i++) {
    const P = pts[i].p;
    const X = base[i];
    // P phai nam tren doan S->X voi t = 2/3 (tinh tu S).
    // Bo qua truc co mau = 0 (vi du C va S cung x=4 -> chia 0).
    const ratios: number[] = [];
    for (let k = 0; k < 3; k++) {
      const denom = X[k] - S[k];
      if (Math.abs(denom) < 1e-9) continue;
      ratios.push((P[k] - S[k]) / denom);
    }
    assert.ok(ratios.length >= 2, `${pts[i].label}: phai kiem duoc it nhat 2 truc`);
    for (const r of ratios) {
      assert.ok(Math.abs(r - 2 / 3) < 1e-3, `${pts[i].label}: ti le ${r} phai = 2/3`);
    }
    // Kiem bo sung bang do dai vector: |SP| = 2/3 |SX|
    const lenSP = Math.hypot(P[0] - S[0], P[1] - S[1], P[2] - S[2]);
    const lenSX = Math.hypot(X[0] - S[0], X[1] - S[1], X[2] - S[2]);
    assert.ok(Math.abs(lenSP / lenSX - 2 / 3) < 1e-3, `${pts[i].label}: |SP|/|SX| = ${lenSP / lenSX} phai = 2/3`);
  }

  // Thiet dien phai // day => moi cap canh tuong ung // nhau
  const pairs: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];
  for (const [i, j] of pairs) {
    const a = [0, 1, 2].map((k) => pts[j].p[k] - pts[i].p[k]);
    const b = [0, 1, 2].map((k) => base[j][k] - base[i][k]);
    const cl = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]);
    assert.ok(cl < 1e-6, `${pts[i].label}${pts[j].label} phai song song canh day tuong ung`);
  }
});

test('chop S.ABCD: goc chuan cho net dut BC, CD, CS — khop hinh SGK da duyet', () => {
  const c = cam('chop-sabcd');
  const v = computeVisibility(chopSABCD, c);
  assert.equal(v.visibleFaceCount, 2, 'goc chuan cua chop: thay 2 mat ben (SAD, SDC)');
  const L = chopSABCD.labels;
  const dashed = chopSABCD.edges
    .filter((e) => !v.edgeSolid[edgeKey(e.a, e.b)])
    .map((e) => L[e.a] + L[e.b])
    .sort();
  assert.deepEqual(dashed, ['BC', 'CD', 'CS'].sort(), 'net dut phai khop hinh 2D da duyet');
});
