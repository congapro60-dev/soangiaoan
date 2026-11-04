import { describe, expect, it } from 'vitest';
import { loadStudentRecordsForClass } from '../_classroom-teacher';

type Doc = Record<string, unknown>;

const whereOnlyDb = (store: Record<string, Record<string, Doc>>) => ({
  collection: (name: string) => ({
    where: (field: string, _operator: string, value: unknown) => ({
      get: async () => ({
        docs: Object.entries(store[name] || {})
          .filter(([, row]) => row[field] === value)
          .map(([id, row]) => ({ id, data: () => row })),
      }),
    }),
  }),
});

// Lỗi thật 04/11/2026: bảng chấm của giáo viên in "9.999999999999998/10". Điểm tổng lưu nguyên Σ số
// thực nhị phân của các dòng câu, nên bản chiếu giáo viên (dùng chung cho báo cáo phụ huynh) phải
// làm tròn 2 chữ số — sửa ở giao diện thì dữ liệu vẫn bẩn ở mọi chỗ khác.
describe('bản chiếu bài nộp cho giáo viên', () => {
  it('làm tròn điểm tổng dính lỗi số thực về 2 chữ số', async () => {
    const store: Record<string, Record<string, Doc>> = {
      assignments: {
        'asg-1': { classId: 'class-1', teacherId: 'teacher-1', title: 'Kiểm tra 15 phút', type: 'homework', isOpen: true, maxScore: 10 },
      },
      submissions: {
        'sub-float': {
          classId: 'class-1', teacherId: 'teacher-1', studentId: 'student-1', assignmentId: 'asg-1',
          status: 'graded', fileUrls: [],
          grade: { score: 9.999999999999998, maxScore: 10, questionResults: [], teacherApproved: true, gradedAt: '2026-11-04T08:21:00.000Z' },
          createdAt: '2026-11-04T08:00:00.000Z', updatedAt: '2026-11-04T08:21:00.000Z',
        },
        'sub-float-2': {
          classId: 'class-1', teacherId: 'teacher-1', studentId: 'student-1', assignmentId: 'asg-1',
          status: 'graded', fileUrls: [],
          grade: { score: 9.169999999999998, maxScore: 10, questionResults: [], teacherApproved: true, gradedAt: '2026-11-04T08:21:00.000Z' },
          createdAt: '2026-11-04T08:00:00.000Z', updatedAt: '2026-11-04T08:21:00.000Z',
        },
      },
      examSubmissions: {},
    };

    const { submissions } = await loadStudentRecordsForClass(
      whereOnlyDb(store) as never,
      'class-1',
      { teacherId: 'teacher-1' },
      'student-1',
    );

    const diem = submissions.map(submission => submission.grade?.score);
    expect(diem).toContain(10);
    expect(diem).toContain(9.17);
  });
});
