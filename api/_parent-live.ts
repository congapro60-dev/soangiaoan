/**
 * Dữ liệu hiện tại của MỘT học sinh để dựng lại báo cáo: bài giao + bài nộp, sổ điểm, hồ sơ năng lực.
 * Dùng chung cho báo cáo tự chọn khoảng ngày và cho báo cáo đã công bố (luôn theo dữ liệu mới nhất).
 */
import { STUDENT_PROFILES_COL, type StudentProfileDoc } from '../src/lib/classroom/types.js';
import { buildPeriodParentReport, type PeriodParentReport } from '../src/lib/classroom/parentReportBuilder.js';
import type { ReportPeriod } from '../src/lib/classroom/reportPeriod.js';
import type { Program } from '../src/lib/classroom/reportStage.js';
import { studentScoreView } from '../src/lib/classroom/scoreBook.js';
import { loadStudentRecordsForClass } from './_classroom-teacher.js';
import { readBookWithAuto } from './_score-book.js';

type Db = FirebaseFirestore.Firestore;

type Records = Awaited<ReturnType<typeof loadStudentRecordsForClass>>;
type Book = Awaited<ReturnType<typeof readBookWithAuto>>;

export interface LiveSource {
  classData: FirebaseFirestore.DocumentData;
  student: FirebaseFirestore.DocumentData;
  studentId: string;
  records: Records;
  book: Book;
  profile: StudentProfileDoc | null;
}

/** Đọc dữ liệu của em một lần (nhiều báo cáo dùng chung). `extra` chạy song song (vd. đọc nhận diện trường). */
export const loadLiveSource = async <T>(
  db: Db, classDoc: FirebaseFirestore.DocumentSnapshot, studentId: string, studentData: FirebaseFirestore.DocumentData | undefined, extra: Promise<T>,
): Promise<{ source: LiveSource; extra: T }> => {
  const classData = classDoc.data() ?? {};
  const [records, book, profileSnap, extraValue] = await Promise.all([
    loadStudentRecordsForClass(db, classDoc.id, classData, studentId),
    readBookWithAuto(db, classDoc.id, { studentIds: [studentId], onlyStudent: studentId }),
    db.collection(STUDENT_PROFILES_COL).doc(studentId).get(),
    extra,
  ]);
  return {
    source: { classData, student: studentData ?? {}, studentId, records, book, profile: profileSnap.exists ? (profileSnap.data() as StudentProfileDoc) : null },
    extra: extraValue,
  };
};

export const buildLiveReport = (source: LiveSource, period: ReportPeriod, program: Program | null): PeriodParentReport => buildPeriodParentReport({
  studentId: source.studentId,
  studentName: String(source.student.name || ''),
  className: String(source.classData.name || ''),
  studentCode: typeof source.student.code === 'string' ? source.student.code : undefined,
  classGrade: typeof source.classData.grade === 'string' ? source.classData.grade : undefined,
  program,
  assignments: source.records.assignments,
  submissions: source.records.submissions,
  profile: source.profile,
  scoreView: studentScoreView(source.book, source.studentId),
}, period);
