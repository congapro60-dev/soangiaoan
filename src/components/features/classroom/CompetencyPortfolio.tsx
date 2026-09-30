import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { Award, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, Save, Sparkles } from 'lucide-react';
import type { AppData } from '../../../types';
import type { AssignmentDoc, SubmissionDoc } from '../../../lib/classroom/types';
import {
  buildStudentCompetencyPortfolio,
  portfolioProgress,
  type PortfolioAssignment,
  type PortfolioSubmission,
} from '../../../lib/classroom/competency/portfolioModel';
import { downloadPortfolioXlsx, exportPortfolioToDrive, type PortfolioMark } from '../../../lib/classroom/competency/portfolioExport';
import { applyPortfolioDraft, buildPortfolioDraftPrompt, parsePortfolioDraft, type DraftRow } from '../../../lib/classroom/competency/portfolioDraftPrompt';
import { TEACHER_INTRO } from '../../../lib/classroom/competency/portfolioGuide';
import { schoolYearMonths, upcomingMonths, type PortfolioEntry } from '../../../lib/classroom/competency/studentPortfolio';
import { loadTeacherPortfolio, saveTeacherPortfolio } from '../../../lib/classroom/teacherService';
import { callAI } from '../../../lib/aiProviders';
import { DriveAuthError } from '../../../lib/googleDrive';
import type { CompetencyGrade, CompetencyLevel } from '../../../lib/classroom/competency/framework';
import { PortfolioEntryEditor } from './PortfolioEntryEditor';

interface Props {
  classId: string;
  studentId: string;
  grade: CompetencyGrade;
  submissions: readonly SubmissionDoc[];
  assignments: readonly AssignmentDoc[];
  studentName: string;
  studentCode: string;
  /** Cài đặt AI của GV — có thì bật nút "AI soạn nháp". */
  settings?: AppData['settings'];
}

const ngay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');
const errorText = (e: unknown, fallback: string): string => (e instanceof Error ? e.message : fallback);

/** Màu nhãn mức — cùng thang với template trường, đủ tương phản để đọc nhanh. */
const levelStyle: Record<CompetencyLevel, string> = {
  'Xuất sắc': 'bg-emerald-100 text-emerald-800',
  'Tốt': 'bg-blue-100 text-blue-800',
  'Đạt yêu cầu': 'bg-amber-100 text-amber-800',
  'Chưa đạt yêu cầu': 'bg-rose-100 text-rose-800',
};

/**
 * Hồ sơ năng lực của một học sinh (bản GV).
 *
 * Mức đề xuất do `aggregateCompetencies` tính từ bài GIÁO VIÊN ĐÃ DUYỆT. HS tự đánh giá + lập kế hoạch
 * trên trang của em; GV xem, sửa mọi ô, chốt mức, ghi ý kiến (AI soạn nháp được), rồi xuất ra file trường.
 */
export const CompetencyPortfolio = ({ classId, studentId, grade, submissions, assignments, studentName, studentCode, settings }: Props) => {
  const [dangXuat, setDangXuat] = useState(false);
  const [entries, setEntries] = useState<Record<string, PortfolioEntry>>({});
  const [saved, setSaved] = useState<Record<string, PortfolioEntry>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const months = useMemo(() => schoolYearMonths(new Date().toISOString().slice(0, 10)), []);

  useEffect(() => {
    let alive = true;
    loadTeacherPortfolio(classId, studentId)
      .then(doc => { if (alive) { setEntries(doc.entries); setSaved(doc.entries); } })
      .catch(e => { if (alive) setError(errorText(e, 'Không tải được phần HS đã điền.')); });
    return () => { alive = false; };
  }, [classId, studentId]);

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

  const rows = useMemo(() => areas.flatMap(area => area.rows), [areas]);
  const { assessed, total } = portfolioProgress(areas);
  const selfDone = rows.filter(row => entries[row.competency.id]?.selfLevel).length;
  const dirtyIds = rows.map(r => r.competency.id).filter(id => JSON.stringify(entries[id] ?? {}) !== JSON.stringify(saved[id] ?? {}));

  const marks = useMemo<PortfolioMark[]>(() => rows.map(({ competency, result }) => {
    const entry = entries[competency.id] ?? {};
    return { topic: competency.topic, ...entry, teacherLevel: entry.teacherLevel ?? result?.level ?? null };
  }).filter(mark => mark.selfLevel || mark.teacherLevel || mark.goal || mark.plan || mark.teacherComment), [rows, entries]);

  const draftWithAi = async () => {
    if (!settings) return;
    setBusy('AI đang soạn nháp hồ sơ…');
    setError('');
    setNotice('');
    try {
      const draftRows: DraftRow[] = rows.map(({ competency, result }) => ({
        competency,
        suggestedLevel: result?.level ?? null,
        ...(result ? { scoreOutOf10: result.scoreOutOf10 } : {}),
        evidence: (result?.evidence ?? []).map(item => `${titleById.get(item.assignmentId) || 'Bài giao'} ${item.score}/${item.maxScore}`),
        entry: entries[competency.id] ?? {},
      }));
      const draft = parsePortfolioDraft(await callAI(buildPortfolioDraftPrompt({ grade, studentName, rows: draftRows, months: upcomingMonths(new Date().toISOString().slice(0, 10)) }), settings), grade);
      const count = Object.keys(draft).length;
      if (count === 0) throw new Error('AI chưa trả được nháp hợp lệ — thử lại.');
      setEntries(prev => applyPortfolioDraft(prev, draft));
      setNotice(`AI đã soạn nháp ${count} năng lực (không đè chữ HS đã viết). Thầy cô soát, sửa rồi bấm "Lưu hồ sơ".`);
    } catch (e) {
      setError(errorText(e, 'AI chưa soạn được nháp.'));
    } finally {
      setBusy('');
    }
  };

  const saveAll = async () => {
    if (dirtyIds.length === 0) return;
    setBusy('Đang lưu…');
    setError('');
    try {
      const doc = await saveTeacherPortfolio(classId, studentId, Object.fromEntries(dirtyIds.map(id => [id, entries[id] ?? {}])));
      setEntries(doc.entries);
      setSaved(doc.entries);
      setNotice('Đã lưu — học sinh thấy ngay mức chốt và ý kiến của thầy cô.');
    } catch (e) {
      setError(errorText(e, 'Không lưu được.'));
    } finally {
      setBusy('');
    }
  };

  const xuatHoSo = async () => {
    setDangXuat(true);
    try {
      const { url, spreadsheetId, fileName, matched, unmatched, added } = await exportPortfolioToDrive({ grade, studentCode, studentName, marks, months });
      const choice = await Swal.fire({
        icon: 'success',
        title: 'Đã xuất hồ sơ ra Drive',
        html: `Điền <b>${matched}</b> năng lực vào bản sao file mẫu (nền vàng: HS tự đánh giá · nền xanh: GV chốt).`
          + `${added.length ? `<br/><span style="font-size:12px;color:#4338ca">Bổ sung ${added.length} năng lực file mẫu chưa có: ${added.join(', ')}</span>` : ''}`
          + `${unmatched.length ? `<br/><span style="font-size:12px;color:#b45309">Chưa khớp: ${unmatched.join(', ')}</span>` : ''}`
          + `<br/><a href="${url}" target="_blank" rel="noreferrer" style="color:#4f46e5;font-weight:800">Mở file trên Google Sheets →</a>`,
        confirmButtonText: 'Xong',
        showDenyButton: true,
        denyButtonText: 'Tải file .xlsx về máy',
        denyButtonColor: '#059669',
      });
      if (choice.isDenied) await downloadPortfolioXlsx(spreadsheetId, fileName);
    } catch (e) {
      const message = e instanceof DriveAuthError ? e.message : errorText(e, 'Không xuất được hồ sơ.');
      await Swal.fire({ icon: 'error', title: 'Xuất hồ sơ thất bại', text: message });
    } finally {
      setDangXuat(false);
    }
  };

  const btn = 'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition disabled:opacity-40';

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black text-indigo-950"><Award className="h-4 w-4" /> Hồ sơ năng lực (Lớp {grade})</p>
        <span className="text-xs font-bold text-indigo-700">Có mức từ bài: {assessed}/{total} · HS tự đánh giá: {selfDone}/{total}</span>
      </div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[11px] font-semibold leading-5 text-indigo-900/70">
        {TEACHER_INTRO.map(line => <li key={line}>{line}</li>)}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        {settings && (
          <button type="button" onClick={() => void draftWithAi()} disabled={!!busy} className={`${btn} bg-amber-500 text-white hover:bg-amber-600`}>
            <Sparkles className="h-3.5 w-3.5" /> AI soạn nháp
          </button>
        )}
        <button type="button" onClick={() => void saveAll()} disabled={!!busy || dirtyIds.length === 0} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
          <Save className="h-3.5 w-3.5" /> {dirtyIds.length ? `Lưu hồ sơ (${dirtyIds.length})` : 'Đã lưu'}
        </button>
        <button type="button" onClick={() => void xuatHoSo()} disabled={dangXuat || marks.length === 0 || dirtyIds.length > 0}
          className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}
          title={dirtyIds.length > 0 ? 'Lưu hồ sơ trước khi xuất' : marks.length === 0 ? 'Chưa có nội dung để xuất' : 'Tạo bản sao file mẫu trường, điền mức + kế hoạch'}>
          {dangXuat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
          {dangXuat ? 'Đang xuất...' : 'Xuất hồ sơ ra file trường'}
        </button>
      </div>
      {busy && <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}</p>}
      {notice && !error && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{notice}</p>}
      {error && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}

      <div className="mt-3 space-y-3">
        {areas.map(area => (
          <div key={area.area} className="rounded-xl border border-indigo-100 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-500">{area.area}</p>
            <div className="mt-2 space-y-2">
              {area.rows.map(({ competency, result }) => {
                const entry = entries[competency.id] ?? {};
                const isOpen = open === competency.id;
                const shownLevel = entry.teacherLevel ?? result?.level;
                return (
                  <div key={competency.id} className="rounded-lg bg-slate-50 px-3 py-2">
                    <button type="button" onClick={() => setOpen(isOpen ? null : competency.id)} className="flex w-full items-start justify-between gap-3 text-left">
                      <div className="flex min-w-0 gap-1.5">
                        {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800">{competency.topic}</p>
                          <p className="text-xs font-semibold leading-5 text-slate-500">{competency.competency}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {shownLevel ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${levelStyle[shownLevel]}`}>{entry.teacherLevel ? 'GV: ' : ''}{shownLevel}</span>
                        ) : (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black text-slate-500">chưa có bài</span>
                        )}
                        {entry.selfLevel && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900">HS: {entry.selfLevel}</span>}
                      </div>
                    </button>
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
                    {isOpen && (
                      <div className="mt-2 border-t border-slate-200 pt-2">
                        <PortfolioEntryEditor competency={competency} entry={entry} role="teacher" suggestedLevel={result?.level ?? null} months={months}
                          onChange={next => setEntries(prev => ({ ...prev, [competency.id]: next }))} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
