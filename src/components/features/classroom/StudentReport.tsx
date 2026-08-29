import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Download, Printer, Target, TrendingUp } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { STUDENT_PROFILES_COL, type AssignmentDoc, type StudentProfileDoc, type SubmissionDoc } from '../../../lib/classroom/types';
import { listAssignmentsForClass, listSubmissionsForStudent } from '../../../lib/classroom/submissionService';
import { NhanXetMarkdown } from './NhanXetMarkdown';
import { QuestionResultsList } from './QuestionResultsList';
import { buildStudentReportModel } from '../../../lib/classroom/reportModel';
import { buildParentSafeReport, type ParentSafeAssignmentStatus } from '../../../lib/classroom/parentSafeReport';

interface Props {
  classId: string;
  studentId: string;
  teacherId: string;
  studentName: string;
  className: string;
  studentCode: string;
  /** true = bản cho người lớn đọc (giáo viên, phụ huynh). false = bản học sinh tự đọc. */
  forAdult?: boolean;
}

const ngay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

const parentStatusLabel: Record<ParentSafeAssignmentStatus, string> = {
  official: 'Đã có kết quả chính thức',
  pending: 'Chờ thầy cô duyệt',
  grading: 'Đang được chấm',
  error: 'Cần được xử lý lại',
  not_submitted: 'Chưa nộp',
};

const parentScore = (score: number | null, maxScore: number | null): string => (
  score === null || maxScore === null ? '—' : `${score}/${maxScore}`
);

/**
 * Báo cáo học tập của một học sinh.
 *
 * CÙNG một dữ liệu, HAI cách viết: bản cho người lớn nêu mức độ và ghi chú của máy chấm,
 * bản cho học sinh chỉ nói việc cần làm tiếp. Đưa nguyên văn bản người lớn cho trẻ đọc là
 * biến một nhận xét kỹ thuật thành lời phán về chính nó.
 */
export const StudentReport = ({ classId, studentId, teacherId, studentName, className, studentCode, forAdult = true }: Props) => {
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [assignments, setAssignments] = useState<AssignmentDoc[]>([]);
  const [profile, setProfile] = useState<StudentProfileDoc | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [viewMode, setViewMode] = useState<'teacher' | 'parent'>(forAdult ? 'teacher' : 'parent');

  useEffect(() => {
    let huy = false;
    const tai = async () => {
      setDangTai(true);
      const [nop, hoSo, baiGiao] = await Promise.all([
        listSubmissionsForStudent(studentId, teacherId, classId).catch(() => null),
        getDoc(doc(db, STUDENT_PROFILES_COL, studentId)).catch(() => null),
        listAssignmentsForClass(classId, teacherId).catch(() => []),
      ]);
      if (huy) return;
      setSubmissions(nop || []);
      setAssignments(baiGiao || []);
      setProfile(hoSo?.exists() ? (hoSo.data() as StudentProfileDoc) : null);
      setDangTai(false);
    };
    void tai();
    return () => { huy = true; };
  }, [classId, className, studentId, teacherId]);

  useEffect(() => {
    setViewMode(forAdult ? 'teacher' : 'parent');
  }, [forAdult]);

  const model = buildStudentReportModel(submissions);
  const parentReport = buildParentSafeReport({
    studentId,
    studentName,
    className,
    assignments,
    submissions,
    profile,
  });
  const diemTB = model.averagePercent === null ? '—' : `${model.averagePercent.toFixed(1)}%`;
  const yeu = (profile?.topics || []).filter(t => t.level === 'weak');
  const dangLen = (profile?.topics || []).filter(t => t.level === 'developing');

  const taiCsv = () => {
    const rows: string[][] = [[
      'Học sinh', 'Mã học sinh', 'Submission ID', 'Bài giao', 'Ngày nộp', 'Điểm', 'Thang điểm',
      'Đã duyệt', 'Trạng thái câu', 'Câu', 'Bài làm của học sinh', 'Đáp án / mốc cần đạt',
      'Loại lỗi', 'Giải thích', 'Cách sửa', 'Luyện tiếp theo', 'Cần GV xem lại',
    ]];
    for (const submission of model.currentSubmissions) {
      const grade = submission.grade;
      const details = grade?.questionResults || [];
      const base: string[] = [studentName, studentCode, submission.id, submission.assignmentId || 'Bài tự nộp', ngay(submission.createdAt),
        grade?.score ?? '', grade?.maxScore ?? '', grade?.teacherApproved ? 'Có' : 'Chưa', submission.status].map(value => String(value));
      if (details.length === 0) {
        rows.push([...base, '', '', '', '', '', '', '', '', '']);
      } else {
        for (const detail of details) {
          rows.push([...base, detail.status, detail.questionNumber, detail.studentAnswer, detail.expectedAnswer,
            detail.errorType, detail.explanation, detail.correction, detail.nextPractice, detail.needsTeacherReview ? 'Có' : 'Không']);
        }
      }
    }
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bao-cao-${studentCode || studentName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const inBaoCaoPhuHuynh = () => {
    const title = `Bao cao hoc tap ${studentName} - ${className}`;
    const previousTitle = document.title;
    document.title = title;
    window.print();
    document.title = previousTitle;
  };

  if (dangTai) {
    return <p className="py-8 text-center text-sm font-semibold text-slate-400">Đang tải dữ liệu học tập...</p>;
  }

  if (viewMode === 'parent') {
    return (
      <div className="space-y-4" data-report-view="parent-safe">
        {forAdult && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
            <p className="text-sm font-black text-indigo-950">Đang xem bản an toàn để gửi phụ huynh</p>
            <button type="button" onClick={() => setViewMode('teacher')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-100">Về bản giáo viên</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Bài đã có kết quả', value: String(parentReport.officialCount) },
            { label: 'Điểm trung bình', value: parentReport.officialAveragePercent === null ? '—' : `${parentReport.officialAveragePercent.toFixed(1)}%` },
            { label: 'Chờ xử lý', value: String(parentReport.pendingCount) },
            { label: 'Chưa nộp', value: String(parentReport.missingCount) },
          ].map(item => <div key={item.label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p></div>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800"><TrendingUp className="h-4 w-4" /> Điểm mạnh</p>
            {parentReport.strengths.length === 0 ? <p className="text-sm font-semibold text-slate-500">Chưa đủ bằng chứng chính thức.</p> : <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">{parentReport.strengths.map(item => <li key={item}>{item}</li>)}</ul>}
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-800"><Target className="h-4 w-4" /> Cần rèn thêm</p>
            {parentReport.areasToPractice.length === 0 ? <p className="text-sm font-semibold text-slate-500">Chưa có nội dung cần rèn được xác nhận.</p> : <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-slate-700">{parentReport.areasToPractice.map(item => <li key={item}>{item}</li>)}</ul>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-black text-slate-900">Kết quả theo bài</p><span className="text-xs font-semibold text-slate-500">Xu hướng: {parentReport.progress.trend === 'up' ? 'Tiến bộ' : parentReport.progress.trend === 'down' ? 'Cần theo dõi' : parentReport.progress.trend === 'flat' ? 'Ổn định' : 'Chưa đủ dữ liệu'}</span></div>
          <div className="mt-3 space-y-2">
            {parentReport.results.length === 0 ? <p className="text-sm font-semibold text-slate-500">Chưa có bài được ghi nhận.</p> : parentReport.results.map(result => (
              <div key={result.assignmentId} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-black text-slate-800">{result.title}</p><p className="text-xs font-semibold text-slate-500">{parentStatusLabel[result.status]}</p></div>
                <span className="text-sm font-black text-slate-800">{parentScore(result.score, result.maxScore)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="text-sm font-black text-indigo-950">Bước tiếp theo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold leading-6 text-indigo-950">{parentReport.nextSteps.map(step => <li key={step}>{step}</li>)}</ul>
        </div>
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">Bản này chỉ sử dụng kết quả đã được thầy cô xem và duyệt. Bài đang chờ xử lý không hiển thị điểm, đáp án hoặc ghi chú nội bộ.</p>
        <button type="button" onClick={inBaoCaoPhuHuynh} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"><Printer className="h-4 w-4" /> In / lưu PDF bản phụ huynh</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bài hiện hành', value: String(model.currentSubmissions.length) },
          { label: 'Điểm trung bình', value: diemTB },
          { label: 'Đã duyệt', value: `${model.approvedSubmissions.length}/${model.gradedSubmissions.length}` },
        ].map(item => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      {forAdult && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><p className="text-sm font-black text-slate-700">Bản giáo viên: có thể xem đầy đủ chi tiết để rà soát.</p><button type="button" onClick={() => setViewMode('parent')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-indigo-700 shadow-sm hover:bg-indigo-50">Xem trước bản phụ huynh</button></div>}

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Bài đã chấm</p>
        <div className="mt-2 space-y-2">
          {model.gradedSubmissions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
              Chưa có bài nào được chấm.
            </p>
          ) : model.gradedSubmissions.map(s => (
            <div key={s.id} className="rounded-2xl border border-slate-100 px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-black text-slate-900">{s.grade?.score} / {s.grade?.maxScore}</span>
                <span className="text-xs font-semibold text-slate-400">{ngay(s.createdAt)}</span>
                {!s.grade?.teacherApproved && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">chưa duyệt</span>
                )}
                {s.grade?.gradedWithoutAnswerKey && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">không có đáp án chuẩn</span>
                )}
              </div>
              <NhanXetMarkdown>{s.grade?.feedback || ''}</NhanXetMarkdown>
              <QuestionResultsList results={s.grade?.questionResults} />
              {forAdult && s.grade?.noteForTeacher && (
                <p className="mt-1 text-xs font-semibold italic leading-5 text-slate-500">Ghi chú: {s.grade.noteForTeacher}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-700">
            <Target className="h-4 w-4" /> {forAdult ? 'Chủ đề còn yếu' : 'Nên luyện thêm'}
          </p>
          {yeu.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">Chưa có chủ đề nào lặp lại đủ để kết luận.</p>
          ) : (
            <ul className="space-y-1 text-sm font-semibold text-slate-700">
              {yeu.map(t => (
                <li key={t.topic}>
                  {t.topic}
                  {forAdult && <span className="text-xs font-normal text-slate-400"> — {t.evidenceSubmissionIds.length} bài làm chứng</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-blue-700">
            <TrendingUp className="h-4 w-4" /> Đang tiến bộ
          </p>
          {dangLen.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">Chưa đủ dữ liệu.</p>
          ) : (
            <p className="text-sm font-semibold leading-6 text-slate-700">{dangLen.map(t => t.topic).join(' · ')}</p>
          )}
        </div>
      </div>

      {forAdult && (
        <>
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-semibold leading-5 text-slate-500">
            Mọi kết luận trong báo cáo đều dựa trên bài làm cụ thể của em, và chỉ tính những bài thầy cô
            đã duyệt. Bài chưa duyệt hiện ở trên nhưng không vào phần chủ đề còn yếu.
          </p>
          <button
            onClick={() => {
              inBaoCaoPhuHuynh();
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> In / lưu PDF
          </button>
          <button
            onClick={taiCsv}
            className="ml-2 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Tải CSV chi tiết
          </button>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">CSV gồm từng câu; điểm trung bình chỉ tính bài đã duyệt.</p>
          <p className="text-[11px] font-semibold text-slate-400">Mã học sinh: {studentCode}</p>
        </>
      )}
    </div>
  );
};
