import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const TEACHER_A = 'teacher-A';
const TEACHER_B = 'teacher-B';
const STUDENT_A = 'student-A';
const CLASS_A = 'class-A';
const CLASS_B = 'class-B';
const LESSON_PRIVATE = 'lesson-private';
const LESSON_PORTAL = 'lesson-portal';

let testEnv: RulesTestEnvironment;

const dbFor = (uid: string | null) =>
  testEnv.authenticatedContext(uid ?? '').firestore();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'discover-adaptive-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, `classes/${CLASS_A}`), { id: CLASS_A, teacherId: TEACHER_A, name: 'Lớp A' });
    await setDoc(doc(db, `classes/${CLASS_B}`), { id: CLASS_B, teacherId: TEACHER_B, name: 'Lớp B' });
    await setDoc(doc(db, `adaptiveLessons/${LESSON_PRIVATE}`), {
      lesson: { id: LESSON_PRIVATE, title: 'Bài kín' }, teacherId: TEACHER_A, portalEnabled: false,
    });
    await setDoc(doc(db, `adaptiveLessons/${LESSON_PORTAL}`), {
      lesson: { id: LESSON_PORTAL, title: 'Bài mở cổng' }, teacherId: TEACHER_A, portalEnabled: true,
    });
    await setDoc(doc(db, `adaptiveAssignments/assignment-1`), {
      classId: CLASS_A, teacherId: TEACHER_A, lessonId: LESSON_PRIVATE, isOpen: true,
    });
    await setDoc(doc(db, `adaptiveAssignmentProgress/assignment-1__student-1`), {
      classId: CLASS_A, teacherId: TEACHER_A, studentId: 'student-1', assignmentId: 'assignment-1',
    });
    await setDoc(doc(db, `adaptiveEvents/event-1`), {
      classId: CLASS_A, teacherId: TEACHER_A, studentId: 'student-1', kind: 'attempt',
    });
  });
});

describe('rules · Discover phân hoá: bài học, bài giao lớp, tiến trình, sự kiện', () => {
  it('CHỦ bài học đọc được bài của mình; người khác đã đăng nhập thì KHÔNG', async () => {
    await assertSucceeds(getDoc(doc(dbFor(TEACHER_A), `adaptiveLessons/${LESSON_PRIVATE}`)));
    await assertFails(getDoc(doc(dbFor(TEACHER_B), `adaptiveLessons/${LESSON_PRIVATE}`)));
    await assertFails(getDoc(doc(dbFor(STUDENT_A), `adaptiveLessons/${LESSON_PRIVATE}`)));
  });

  it('bài đã mở cổng công khai thì ai cũng đọc được (link demo của GV)', async () => {
    await assertSucceeds(getDoc(doc(dbFor(TEACHER_A), `adaptiveLessons/${LESSON_PORTAL}`)));
    await assertSucceeds(getDoc(doc(dbFor(STUDENT_A), `adaptiveLessons/${LESSON_PORTAL}`)));
  });

  it('GV chủ lớp đọc được bài giao / tiến trình / sự kiện của lớp mình; GV lớp khác thì không', async () => {
    for (const path of [`adaptiveAssignments/assignment-1`, `adaptiveAssignmentProgress/assignment-1__student-1`, `adaptiveEvents/event-1`]) {
      await assertSucceeds(getDoc(doc(dbFor(TEACHER_A), path)));
      await assertFails(getDoc(doc(dbFor(TEACHER_B), path)));
      await assertFails(getDoc(doc(dbFor(STUDENT_A), path)));
    }
  });

  it('client KHÔNG ghi được bài giao / tiến trình / sự kiện (chỉ máy chủ Admin SDK ghi)', async () => {
    for (const path of [`adaptiveAssignments/assignment-1`, `adaptiveAssignmentProgress/assignment-1__student-1`, `adaptiveEvents/event-1`]) {
      await assertFails(setDoc(doc(dbFor(TEACHER_A), path), { classId: CLASS_A, note: 'giả' }));
      await assertFails(updateDoc(doc(dbFor(TEACHER_A), path), { note: 'giả' }));
    }
  });
});
