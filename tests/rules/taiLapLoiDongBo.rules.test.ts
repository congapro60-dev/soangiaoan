/**
 * Tái lập lỗi "Đồng bộ thất bại — Missing or insufficient permissions" người dùng báo
 * ngày 2026-08-20 khi bấm "Đồng bộ ngay" trên production.
 *
 * Giả thuyết: `migrateLegacyClasses` ghi lớp VÀ học sinh trong CÙNG một batch. Luật của
 * subcollection students là `laChuLop(classId)`, tức `get(/classes/{classId}).data.teacherId`.
 * Firestore chấm từng phép ghi trong batch trên trạng thái database TRƯỚC batch, nên lúc chấm
 * phép ghi học sinh thì document lớp CHƯA tồn tại → get() trả null → deny cả batch.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const UID_GV = 'uid-gv';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'dongbo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await testEnv?.cleanup(); });
beforeEach(async () => { await testEnv.clearFirestore(); });

const dbGV = () => testEnv.authenticatedContext(UID_GV, { email: 'gv@gmail.com' }).firestore();

const lopMau = { id: 'c1', teacherId: UID_GV, name: '10 Olinda', track: '', grade: '10', joinCode: 'ACDEFG', studentCount: 1, createdAt: 'x', updatedAt: 'x' };
const hsMau = { id: 's1', classId: 'c1', teacherId: UID_GV, name: 'Vũ Bảo An', code: 'S1', status: 'active', progress: 0, createdAt: 'x' };

describe('phép chuyển lớp cũ lên máy chủ', () => {
  it('1. Ghi RIÊNG lớp trước → ALLOW', async () => {
    await assertSucceeds(setDoc(doc(dbGV(), 'classes/c1'), lopMau));
  });

  it('2. Lớp đã tồn tại rồi mới ghi học sinh → ALLOW', async () => {
    await setDoc(doc(dbGV(), 'classes/c1'), lopMau);
    await assertSucceeds(setDoc(doc(dbGV(), 'classes/c1/students/s1'), hsMau));
  });

  it('4. CÁCH SỬA: ghi lớp ở batch 1, học sinh ở batch 2 → ALLOW', async () => {
    const db = dbGV();
    const b1 = writeBatch(db);
    b1.set(doc(db, 'classes/c1'), lopMau);
    await b1.commit();

    const b2 = writeBatch(db);
    b2.set(doc(db, 'classes/c1/students/s1'), hsMau);
    await assertSucceeds(b2.commit());
  });

  it('3. TÁI LẬP LỖI: ghi lớp và học sinh trong CÙNG một batch → DENY', async () => {
    const db = dbGV();
    const batch = writeBatch(db);
    batch.set(doc(db, 'classes/c1'), lopMau);
    batch.set(doc(db, 'classes/c1/students/s1'), hsMau);
    await assertFails(batch.commit());
  });
});
