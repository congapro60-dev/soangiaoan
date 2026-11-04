import type { Student, TeacherClass } from '../../types';
import type { AccessibleClassDoc } from './classroomService';

export const teacherClassFromServer = (remote: AccessibleClassDoc, local?: TeacherClass): TeacherClass => {
  const onlineAssignments = remote.assignments
    .filter(assignment => assignment.type === 'exam' && Boolean(assignment.examId))
    .map(assignment => ({
      examId: assignment.examId as string,
      examCode: '',
      examTitle: assignment.title,
      assignedAt: assignment.createdAt,
    }));
  const students: Student[] = remote.students.map(student => ({
    id: student.id,
    name: student.name,
    code: student.code,
    progress: Number.isFinite(student.progress) ? student.progress : 0,
    status: student.status,
  }));
  return {
    id: remote.id,
    name: remote.name,
    previousNames: remote.previousNames,
    track: remote.track,
    grade: remote.grade,
    // Đếm theo roster THẬT vừa tải, không tin `studentCount` denormalized — trường đó từng lệch
    // (xem migrateLegacyClasses) nên card báo sĩ số cũ dù danh sách đã có em mới.
    studentCount: students.length,
    activeAssignments: remote.assignments.filter(assignment => assignment.isOpen !== false).length,
    progress: local?.progress ?? 0,
    tone: local?.tone ?? 'primary',
    students,
    assignments: onlineAssignments,
    sheetSync: remote.sheetSync ?? null,
    examSheet: remote.examSheet ?? null,
  };
};
