import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Award, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import {
  buildStudentCompetencyPortfolio,
  portfolioProgress,
  type PortfolioAssignment,
  type PortfolioSubmission,
} from '../../../lib/classroom/competency/portfolioModel';
import { exportPortfolioToDrive, type PortfolioMark } from '../../../lib/classroom/competency/portfolioExport';
import { DriveAuthError } from '../../../lib/googleDrive';
import type { CompetencyGrade, CompetencyLevel } from '../../../lib/classroom/competency/framework';

interface Props {
  grade: CompetencyGrade;
  submissions: readonly SubmissionDoc[];
  assignments: readonly AssignmentDoc[];
  studentName: string;
  studentCode: string;
}

const ngay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');

/** Màu nhãn mức — cùng thang với template trường, đủ tương phản để đọc nhanh. */
const levelStyle: Record<CompetencyLevel, string> = {
  'Xuất sắc': 'bg-emerald-100 text-emerald-800',
  'Tốt': 'bg-blue-100 text-blue-800',
  'Đạt yêu cầu': 'bg-amber-100 text-amber-800',
  'Chưa đạt yêu cầu': 'bg-rose-100 text-rose-800',
};

/**
 * Hồ sơ năng lực của một học sinh (bản xem trên app — GĐ3).
 *
 * Chỉ NỐI dữ liệu đã có ở màn báo cáo (bài nộp đã chấm + nhãn năng lực của bài giao) rồi bày theo
 * khung trường. Mức do `aggregateCompetencies` tính, chỉ dựa trên bài GIÁO VIÊN ĐÃ DUYỆT — giống
 * hệt phần "chủ đề còn yếu". Năng lực chưa có minh chứng vẫn hiện để thấy còn thiếu gì đến khi ra trường.
 */
export const CompetencyPortfolio = ({ grade, submissions, assignments, studentName, studentCode }: Props) => {
  const [dangXuat, setDangXuat] = useState(false);
  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const assignment of assignments) map.set(assignment.id, assignment.title || 'Bài giao');
    return map;
  }, [assignments]);

  const areas = useMemo(() => {
    const subs: PortfolioSubmission[] = submissions
      .filter(submission => submission.grade)
      .map(submission => ({
        assignmentId: submission.assignmentId ?? '',
        score: submission.grade!.score,
        maxScore: submission.grade!.maxScore,
        approved: Boolean(submission.grade!.teacherApproved),
        submittedAt: submission.createdAt,
        ...(submission.grade!.feedback ? { feedback: submission.grade!.feedback } : {}),
      }));
    const asgs: PortfolioAssignment[] = assignments.map(assignment => ({
      id: assignment.id,
      competencyTags: assignment.competencyTags,
    }));
    return buildStudentCompetencyPortfolio(grade, subs, asgs);
  }, [grade, submissions, assignments]);

  const { assessed, total } = portfolioProgress(areas);

  const marks = useMemo<PortfolioMark[]>(() => areas.flatMap(area => area.rows)
    .filter(row => row.result?.level)
    .map(row => ({ topic: row.competency.topic, level: row.result!.level! })), [areas]);

  const xuatHoSo = async () => {
    setDangXuat(true);
    try {
      const { url, matched, unmatched } = await exportPortfolioToDrive({ grade, studentCode, studentName, marks });
      await Swal.fire({
        icon: 'success',
        title: 'Đã xuất hồ sơ ra Drive',
        html: `Bôi vàng <b>${matched}</b> năng lực vào bản sao file mẫu.${unmatched.length ? `<br/><span style="font-size:12px;color:#b45309">Chưa khớp: ${unmatched.join(', ')}</span>` : ''}<br/><a href="${url}" target="_blank" rel="noreferrer" style="color:#4f46e5;font-weight:800">Mở file trên Google Sheets →</a>`,
        confirmButtonText: 'Xong',
      });
    } catch (error) {
      const message = error instanceof DriveAuthError
        ? error.message
        : (error instanceof Error ? error.message : 'Không xuất được hồ sơ.');
      await Swal.fire({ icon: 'error', title: 'Xuất hồ sơ thất bại', text: message });
    } finally {
      setDangXuat(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black text-indigo-950"><Award className="h-4 w-4" /> Hồ sơ năng lực (Lớp {grade})</p>
        <span className="text-xs font-bold text-indigo-700">Đã có mức: {assessed}/{total} năng lực</span>
      </div>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-indigo-900/70">
        Mức đề xuất tính từ bài đã duyệt; nhãn năng lực do AI gắn theo đề, thầy cô soát lại. Năng lực chưa có bài để trống.
      </p>

      <button type="button" onClick={xuatHoSo} disabled={dangXuat || assessed === 0}
        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-700 disabled:opacity-40"
        title={assessed === 0 ? 'Chưa có năng lực nào có mức để xuất' : 'Tạo bản sao file mẫu trường, bôi vàng mức đạt'}>
        {dangXuat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        {dangXuat ? 'Đang xuất...' : 'Xuất hồ sơ ra file trường'}
      </button>

      <div className="mt-3 space-y-3">
        {areas.map(area => (
          <div key={area.area} className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-500">{area.area}</p>
            <div className="mt-2 space-y-2">
              {area.rows.map(({ competency, result }) => (
                <div key={competency.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800">{competency.topic}</p>
                      <p className="text-xs font-semibold leading-5 text-slate-500">{competency.competency}</p>
                    </div>
                    {result?.level ? (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${levelStyle[result.level]}`}>{result.level}</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-500">chưa có bài</span>
                    )}
                  </div>
                  {result && (
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <p className="text-[11px] font-bold text-slate-500">Điểm đại diện {result.scoreOutOf10}/10 · {result.evidence.length} bài minh chứng</p>
                      <ul className="mt-1 space-y-0.5">
                        {result.evidence.map(item => (
                          <li key={`${item.assignmentId}-${item.submittedAt}`} className="text-[11px] font-semibold text-slate-600">
                            {titleById.get(item.assignmentId) || 'Bài giao'} — {item.score}/{item.maxScore} <span className="text-slate-400">({ngay(item.submittedAt)})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
