import { TeacherClass } from '../../types';
import { createJoinCode } from './joinCode';
import { ClassDoc, StudentDoc } from './types';

/**
 * Chuyển lớp học từ chỗ cũ (`userSettings/{uid}.classes` — một mảng) sang các
 * document Firestore thật.
 *
 * CỐ Ý giữ nguyên id cũ của lớp và của học sinh: nhờ vậy phép chuyển chạy lại
 * nhiều lần vẫn ra cùng kết quả, và mảng cũ không bị xoá nên còn đường lùi.
 */

export interface MigrationPlan {
  classes: ClassDoc[];
  /** Học sinh gom theo lớp, khoá là classId. */
  studentsByClass: Record<string, StudentDoc[]>;
  skipped: string[];
}

interface MigrateOptions {
  /** Id các lớp đã có trên Firestore — sẽ bỏ qua để không ghi đè. */
  existingClassIds?: string[];
  /** Cho phép test bơm mã cố định. */
  joinCodeFactory?: () => string;
  now?: () => string;
}

export const planLegacyClassMigration = (
  legacy: TeacherClass[],
  teacherId: string,
  options: MigrateOptions = {},
): MigrationPlan => {
  const existing = new Set(options.existingClassIds || []);
  const makeJoinCode = options.joinCodeFactory || createJoinCode;
  const nowIso = options.now || (() => new Date().toISOString());

  const classes: ClassDoc[] = [];
  const studentsByClass: Record<string, StudentDoc[]> = {};
  const skipped: string[] = [];

  for (const item of legacy) {
    if (!item?.id || !item.name) continue;
    if (existing.has(item.id)) {
      skipped.push(item.id);
      continue;
    }

    const at = nowIso();
    const students = (item.students || [])
      .filter(s => s?.name)
      .map<StudentDoc>((s, index) => ({
        id: s.id || `student-${item.id}-${index}`,
        classId: item.id,
        teacherId,
        name: s.name,
        code: (s.code || `${item.name.replace(/\s+/g, '')}-${index + 1}`).toUpperCase(),
        status: s.status || 'active',
        progress: typeof s.progress === 'number' ? s.progress : 0,
        createdAt: at,
      }));

    classes.push({
      id: item.id,
      teacherId,
      name: item.name,
      track: item.track || '',
      grade: item.grade || item.name.match(/\d+/)?.[0] || '',
      joinCode: makeJoinCode(),
      // Đếm lại từ danh sách thật, không tin `studentCount` cũ — trường đó từng lệch
      // vì mọi phép thêm/xoá học sinh đều phải nhớ cập nhật nó bằng tay.
      studentCount: students.length,
      createdAt: at,
      updatedAt: at,
    });
    studentsByClass[item.id] = students;
  }

  return { classes, studentsByClass, skipped };
};
