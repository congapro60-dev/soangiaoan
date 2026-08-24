import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Printer, Target, TrendingUp } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { STUDENT_PROFILES_COL, type StudentProfileDoc, type SubmissionDoc } from '../../../lib/classroom/types';
import { listSubmissionsForStudent } from '../../../lib/classroom/submissionService';
import { NhanXetMarkdown } from './NhanXetMarkdown';

interface Props {
  studentId: string;
  teacherId: string;
  studentName: string;
  className: string;
  studentCode: string;
  /** true = bản cho người lớn đọc (giáo viên, phụ huynh). false = bản học sinh tự đọc. */
  forAdult?: boolean;
}

const ngay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

/**
 * Báo cáo học tập của một học sinh.
 *
 * CÙNG một dữ liệu, HAI cách viết: bản cho người lớn nêu mức độ và ghi chú của máy chấm,
 * bản cho học sinh chỉ nói việc cần làm tiếp. Đưa nguyên văn bản người lớn cho trẻ đọc là
 * biến một nhận xét kỹ thuật thành lời phán về chính nó.
 */
export const StudentReport = ({ studentId, teacherId, studentName, className, studentCode, forAdult = true }: Props) => {
  const [submissions, setSubmissions] = useState<SubmissionDoc[]>([]);
  const [profile, setProfile] = useState<StudentProfileDoc | null>(null);
  const [dangTai, setDangTai] = useState(true);

  useEffect(() => {
    let huy = false;
    const tai = async () => {
      setDangTai(true);
      const [nop, hoSo] = await Promise.all([
        listSubmissionsForStudent(studentId, teacherId).catch(() => null),
        getDoc(doc(db, STUDENT_PROFILES_COL, studentId)).catch(() => null),
      ]);
      if (huy) return;
      setSubmissions(nop || []);
      setProfile(hoSo?.exists() ? (hoSo.data() as StudentProfileDoc) : null);
      setDangTai(false);
    };
    void tai();
    return () => { huy = true; };
  }, [studentId, teacherId]);

  const daCham = submissions.filter(s => s.status === 'graded' && s.grade);
  const daDuyet = daCham.filter(s => s.grade?.teacherApproved);
  const diemTB = daCham.length > 0
    ? (daCham.reduce((sum, s) => sum + (s.grade?.score ?? 0), 0) / daCham.length).toFixed(1)
    : '—';
  const yeu = (profile?.topics || []).filter(t => t.level === 'weak');
  const dangLen = (profile?.topics || []).filter(t => t.level === 'developing');

  if (dangTai) {
    return <p className="py-8 text-center text-sm font-semibold text-slate-400">Đang tải dữ liệu học tập...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Bài đã nộp', value: String(submissions.length) },
          { label: 'Điểm trung bình', value: diemTB },
          { label: 'Đã duyệt', value: `${daDuyet.length}/${daCham.length}` },
        ].map(item => (
          <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Bài đã chấm</p>
        <div className="mt-2 space-y-2">
          {daCham.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">
              Chưa có bài nào được chấm.
            </p>
          ) : daCham.slice(0, 8).map(s => (
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
              const ten = `Bao cao ${studentName} - ${className}`;
              const cu = document.title;
              document.title = ten;
              window.print();
              document.title = cu;
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" /> In báo cáo
          </button>
          <p className="text-[11px] font-semibold text-slate-400">Mã học sinh: {studentCode}</p>
        </>
      )}
    </div>
  );
};
