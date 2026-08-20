import { describe, it, expect } from 'vitest';
import { TeacherClass } from '../../types';
import { planLegacyClassMigration } from './migrateLegacyClasses';
import { createJoinCode, isValidJoinCode, normalizeJoinCode } from './joinCode';

const TEACHER = 'uid-gv';
const OPTS = { joinCodeFactory: () => 'ACDEFG', now: () => '2026-08-20T00:00:00.000Z' };

const lopCu = (ghiDe: Partial<TeacherClass> = {}): TeacherClass => ({
  id: 'class-1',
  name: '11 Columbus',
  track: 'Lớp chủ nhiệm',
  grade: '11',
  studentCount: 2,
  activeAssignments: 0,
  progress: 0,
  tone: 'primary',
  students: [
    { id: 'student-a', name: 'Đặng Tuệ Minh', code: '86773040', progress: 0, status: 'active' },
    { id: 'student-b', name: 'Hoàng Lâm', code: 's21080186', progress: 40, status: 'needs_support' },
  ],
  ...ghiDe,
});

describe('planLegacyClassMigration', () => {
  it('chuyển lớp và học sinh, giữ nguyên id cũ', () => {
    const plan = planLegacyClassMigration([lopCu()], TEACHER, OPTS);

    expect(plan.classes).toHaveLength(1);
    expect(plan.classes[0]).toMatchObject({
      id: 'class-1',
      teacherId: TEACHER,
      name: '11 Columbus',
      grade: '11',
      joinCode: 'ACDEFG',
      studentCount: 2,
    });
    expect(plan.studentsByClass['class-1'].map(s => s.id)).toEqual(['student-a', 'student-b']);
    expect(plan.studentsByClass['class-1'][0].classId).toBe('class-1');
    expect(plan.studentsByClass['class-1'][0].teacherId).toBe(TEACHER);
  });

  it('viết hoa mã học sinh và giữ tiến độ, trạng thái cũ', () => {
    const plan = planLegacyClassMigration([lopCu()], TEACHER, OPTS);
    const students = plan.studentsByClass['class-1'];

    expect(students[1].code).toBe('S21080186');
    expect(students[1].progress).toBe(40);
    expect(students[1].status).toBe('needs_support');
  });

  it('đếm lại sĩ số từ danh sách thật, không tin studentCount cũ', () => {
    const plan = planLegacyClassMigration([lopCu({ studentCount: 99 })], TEACHER, OPTS);

    expect(plan.classes[0].studentCount).toBe(2);
  });

  it('chạy lại lần hai thì bỏ qua lớp đã có, không ghi đè', () => {
    const plan = planLegacyClassMigration([lopCu()], TEACHER, { ...OPTS, existingClassIds: ['class-1'] });

    expect(plan.classes).toHaveLength(0);
    expect(plan.skipped).toEqual(['class-1']);
  });

  it('suy ra khối từ tên lớp khi dữ liệu cũ thiếu', () => {
    const plan = planLegacyClassMigration([lopCu({ grade: '' })], TEACHER, OPTS);

    expect(plan.classes[0].grade).toBe('11');
  });

  it('bỏ qua lớp không có tên và học sinh không có tên', () => {
    const plan = planLegacyClassMigration(
      [
        lopCu({ id: 'class-2', name: '', students: [] }),
        lopCu({
          id: 'class-3',
          students: [
            { id: 'x', name: '', code: 'A', progress: 0, status: 'active' },
            { id: 'y', name: 'Vũ Bảo An', code: 'B', progress: 0, status: 'active' },
          ],
        }),
      ],
      TEACHER,
      OPTS,
    );

    expect(plan.classes.map(c => c.id)).toEqual(['class-3']);
    expect(plan.studentsByClass['class-3'].map(s => s.name)).toEqual(['Vũ Bảo An']);
    expect(plan.classes[0].studentCount).toBe(1);
  });
});

describe('joinCode', () => {
  it('sinh mã 6 ký tự, không chứa ký tự dễ nhìn nhầm', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = createJoinCode();
      expect(code).toHaveLength(6);
      expect(code).not.toMatch(/[01OILSB]/);
      expect(isValidJoinCode(code)).toBe(true);
    }
  });

  it('chuẩn hoá mã người dùng gõ có khoảng trắng và chữ thường', () => {
    expect(normalizeJoinCode(' ac defg ')).toBe('ACDEFG');
    expect(isValidJoinCode('ac defg')).toBe(true);
  });

  it('từ chối mã sai độ dài hoặc chứa ký tự đã loại bỏ', () => {
    expect(isValidJoinCode('ACDEF')).toBe(false);
    expect(isValidJoinCode('ACDEF0')).toBe(false);
    expect(isValidJoinCode('ACDEFI')).toBe(false);
  });
});
