import { collection, deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, removeUndefinedFields } from '../firebase';
import { TeacherClass } from '../../types';
import { planLegacyClassMigration } from './migrateLegacyClasses';
import { CLASSES_COL, STUDENTS_SUB, type ClassDoc } from './types';

/** Lớp trên máy chủ, hoặc null nếu lớp này chưa được đồng bộ. */
export const getClassDoc = async (classId: string): Promise<ClassDoc | null> => {
  const snap = await getDoc(doc(db, CLASSES_COL, classId));
  return snap.exists() ? (snap.data() as ClassDoc) : null;
};

/**
 * Thêm học sinh vào lớp ĐÃ đồng bộ trên server — em mới đăng nhập được NGAY, không phụ thuộc
 * ai đó nhớ bấm "Đồng bộ ngay". Trả false khi lớp chưa lên server (caller tự cảnh báo sync).
 */
export const themHocSinhLenServer = async (
  classId: string,
  teacherId: string,
  student: { id: string; name: string; code: string },
): Promise<boolean> => {
  const classSnap = await getDoc(doc(db, CLASSES_COL, classId));
  if (!classSnap.exists()) return false;
  await setDoc(doc(db, CLASSES_COL, classId, STUDENTS_SUB, student.id), removeUndefinedFields({
    id: student.id,
    classId,
    teacherId,
    name: student.name,
    code: student.code.toUpperCase(),
    status: 'active',
    progress: 0,
    createdAt: new Date().toISOString(),
  }));
  return true;
};

/** Xoá học sinh khỏi lớp đã đồng bộ trên server. Trả false nếu lớp chưa lên server. */
export const xoaHocSinhKhoiServer = async (classId: string, studentId: string): Promise<boolean> => {
  const ref = doc(db, CLASSES_COL, classId, STUDENTS_SUB, studentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await deleteDoc(ref);
  return true;
};

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

  // HAI GIAI ĐOẠN, KHÔNG GỘP LÀM MỘT.
  //
  // Luật của subcollection `students` là `laChuLop(classId)`, tức phải `get()` được document lớp
  // để so teacherId. Firestore chấm từng phép ghi trong một batch dựa trên trạng thái database
  // TRƯỚC batch, nên nếu ghi lớp và học sinh chung một batch thì lúc chấm phép ghi học sinh,
  // document lớp vẫn chưa tồn tại → get() vào chỗ trống → cả batch bị từ chối.
  //
  // Đây chính là lỗi "Đồng bộ thất bại — Missing or insufficient permissions" người dùng báo
  // ngày 2026-08-20. Ca tái lập nằm ở `tests/rules/taiLapLoiDongBo.rules.test.ts`.
  for (const cls of plan.classes) {
    batch.set(doc(db, CLASSES_COL, cls.id), removeUndefinedFields(cls));
    count += 1;
    if (count >= BATCH_LIMIT) await flush();
  }
  await flush();

  // Giai đoạn 2 ghi học sinh cho MỌI lớp, kể cả lớp đã có sẵn trên máy chủ.
  //
  // Lý do: nếu lần trước giai đoạn 1 xong mà giai đoạn 2 hỏng giữa chừng, sẽ có lớp tồn tại mà
  // không có học sinh nào — và vì phép chuyển bỏ qua lớp đã tồn tại nên bấm lại cũng không cứu
  // được. Id học sinh là cố định nên ghi lại nhiều lần vô hại.
  const toanBo = planLegacyClassMigration(legacy, teacherId, {});
  for (const cls of toanBo.classes) {
    for (const student of toanBo.studentsByClass[cls.id] || []) {
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
  const chuaChuyen = planLegacyClassMigration(legacy, teacherId, { existingClassIds }).classes.length;
  if (chuaChuyen > 0) return chuaChuyen;

  // Lớp đã lên máy chủ nhưng RỖNG học sinh: dấu vết của một lần đồng bộ hỏng giữa chừng.
  // Vẫn phải nhắc, nếu không giáo viên mắc kẹt với lớp trống mà không có nút nào để sửa.
  const lopRong = await Promise.all(existingClassIds.map(async id => {
    const coHocSinh = legacy.find(c => c.id === id)?.students.length ?? 0;
    if (coHocSinh === 0) return 0;
    const snap = await getDocs(query(collection(db, CLASSES_COL, id, STUDENTS_SUB), limit(1)));
    return snap.empty ? 1 : 0;
  }));
  return lopRong.reduce((a: number, b: number) => a + b, 0);
};
