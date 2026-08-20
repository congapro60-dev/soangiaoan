import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db, removeUndefinedFields } from '../firebase';
import { TeacherClass } from '../../types';
import { planLegacyClassMigration } from './migrateLegacyClasses';
import { CLASSES_COL, STUDENTS_SUB } from './types';

/** Firestore chỉ nhận tối đa 500 phép ghi mỗi batch. Chừa biên cho an toàn. */
const BATCH_LIMIT = 400;

export interface MigrationOutcome {
  createdClasses: number;
  createdStudents: number;
  skippedClasses: number;
}

export const listTeacherClassIds = async (teacherId: string): Promise<string[]> => {
  const snap = await getDocs(query(collection(db, CLASSES_COL), where('teacherId', '==', teacherId)));
  return snap.docs.map(d => d.id);
};

/**
 * Đưa lớp học từ mảng cũ trong `userSettings` sang collection thật.
 *
 * KHÔNG xoá mảng cũ — nó là đường lùi nếu phép chuyển có gì sai. Lớp đã chuyển
 * rồi thì bỏ qua, nên gọi lại nhiều lần vẫn an toàn.
 */
export const migrateLegacyClasses = async (
  teacherId: string,
  legacy: TeacherClass[],
): Promise<MigrationOutcome> => {
  const existingClassIds = await listTeacherClassIds(teacherId);
  const plan = planLegacyClassMigration(legacy, teacherId, { existingClassIds });

  if (plan.classes.length === 0) {
    return { createdClasses: 0, createdStudents: 0, skippedClasses: plan.skipped.length };
  }

  let batch = writeBatch(db);
  let count = 0;
  let createdStudents = 0;

  const flush = async () => {
    if (count > 0) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  for (const cls of plan.classes) {
    batch.set(doc(db, CLASSES_COL, cls.id), removeUndefinedFields(cls));
    count += 1;
    if (count >= BATCH_LIMIT) await flush();

    for (const student of plan.studentsByClass[cls.id] || []) {
      batch.set(doc(db, CLASSES_COL, cls.id, STUDENTS_SUB, student.id), removeUndefinedFields(student));
      count += 1;
      createdStudents += 1;
      if (count >= BATCH_LIMIT) await flush();
    }
  }
  await flush();

  return {
    createdClasses: plan.classes.length,
    createdStudents,
    skippedClasses: plan.skipped.length,
  };
};

/** Số lớp cũ chưa được chuyển — dùng để quyết định có hiện dải nhắc hay không. */
export const countUnmigratedClasses = async (
  teacherId: string,
  legacy: TeacherClass[],
): Promise<number> => {
  if (legacy.length === 0) return 0;
  const existingClassIds = await listTeacherClassIds(teacherId);
  return planLegacyClassMigration(legacy, teacherId, { existingClassIds }).classes.length;
};
