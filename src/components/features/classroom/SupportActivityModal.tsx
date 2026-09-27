import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Loader2, Plus, Save, X } from 'lucide-react';
import type { Student } from '../../../types';
import { auth } from '../../../lib/firebase';
import type { ClassAssignmentReport } from '../../../lib/classroom/classReportModel';
import {
  buildSupportActivityDraft,
  getSupportActivityFocusOptions,
  toExamQuestions,
  type SupportActivityFocus,
  type SupportActivityQuestionBlueprint,
} from '../../../lib/classroom/supportActivityModel';
import { createSupportActivity } from '../../../lib/classroom/teacherService';
import { updateActivityExportBundle } from '../../../lib/classroom/teacherService';
import { generateAndUploadActivityExportBundle } from '../../../lib/classroom/activityExportClient';
import { buildActivityExportPlan } from '../../../lib/classroom/activityExport';

interface SupportActivityModalProps {
  classId: string;
  report: ClassAssignmentReport;
  students: readonly Student[];
  showToast: (message: string, type?: string) => void;
  onClose: () => void;
  onCreated?: () => void;
}

const PURPOSE_OPTIONS = [
  { value: 'remediation', label: 'Củng cố điểm yếu' },
  { value: 'practice', label: 'Luyện theo mục tiêu' },
  { value: 'assignment', label: 'Bài tập giao về nhà' },
  { value: 'assessment', label: 'Đánh giá lại' },
] as const;

const initialFocus = (options: readonly SupportActivityFocus[]): SupportActivityFocus | undefined => options[0];

export const SupportActivityModal = ({
  classId,
  report,
  students,
  showToast,
  onClose,
  onCreated,
}: SupportActivityModalProps) => {
  const focusOptions = useMemo(() => getSupportActivityFocusOptions(report), [report]);
  const [focusId, setFocusId] = useState(() => initialFocus(focusOptions)?.id || '');
  const focus = focusOptions.find(option => option.id === focusId) || initialFocus(focusOptions);
  const [purpose, setPurpose] = useState<'practice' | 'remediation' | 'assignment' | 'assessment'>('remediation');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<SupportActivityQuestionBlueprint[]>([]);
  const [saving, setSaving] = useState(false);

  const baseDraft = useMemo(() => focus
    ? buildSupportActivityDraft(report, focus, { purpose, durationMinutes, targetStudentIds: selectedStudentIds, title })
    : null, [report, focus, purpose, durationMinutes, selectedStudentIds, title]);

  useEffect(() => {
    if (!focus) return;
    const suggested = buildSupportActivityDraft(report, focus, { purpose, durationMinutes });
    setTitle(suggested.title);
    setObjective(suggested.objective);
    setSelectedStudentIds(suggested.targetStudentIds);
    setQuestions(suggested.questionBlueprints);
  }, [focusId]); // Chỉ reset khi giáo viên đổi điểm nghẽn; không ghi đè khi sửa nội dung.

  useEffect(() => {
    if (!focus || title || objective || questions.length > 0) return;
    const suggested = buildSupportActivityDraft(report, focus, { purpose, durationMinutes });
    setTitle(suggested.title);
    setObjective(suggested.objective);
    setSelectedStudentIds(suggested.targetStudentIds);
    setQuestions(suggested.questionBlueprints);
  }, [focus, report, purpose, durationMinutes, title, objective, questions.length]);

  const draft = baseDraft && focus ? {
    ...baseDraft,
    title: title.trim() || baseDraft.title,
    objective: objective.trim() || baseDraft.objective,
    questionBlueprints: questions,
  } : null;
  const names = new Map(students.map(student => [student.id, student.name]));
  const canSave = Boolean(draft && draft.canPublish && draft.title.trim() && draft.objective.trim()
    && questions.length > 0 && questions.every(question => question.content.trim() && question.points > 0) && !saving);

  const updateQuestion = (id: string, patch: Partial<SupportActivityQuestionBlueprint>) => {
    setQuestions(current => current.map(question => question.id === id ? { ...question, ...patch } : question));
  };

  const handleCreate = async () => {
    if (!draft || !canSave) return;
    setSaving(true);
    try {
      const result = await createSupportActivity({
        classId,
        sourceReportId: draft.sourceReportId,
        purpose: draft.purpose,
        title: draft.title,
        objective: draft.objective,
        durationMinutes: draft.durationMinutes,
        targetStudentIds: draft.targetStudentIds,
        questions: toExamQuestions(draft),
      });
      const teacherUid = auth.currentUser?.uid;
      if (!teacherUid) throw new Error('Phiên giáo viên đã hết hạn sau khi tạo hoạt động. Hãy đăng nhập lại để hoàn tất backup.');
      try {
        const exported = await generateAndUploadActivityExportBundle(result.exam, teacherUid);
        await updateActivityExportBundle(result.assignment.id, result.exam.id, exported.bundle, classId);
        showToast(`Đã tạo, giao online và lưu đủ 4 file backup cho “${result.assignment.title}”.`, 'success');
      } catch (exportError) {
        const plan = buildActivityExportPlan(result.exam, 'both');
        await updateActivityExportBundle(result.assignment.id, result.exam.id, {
          status: 'error',
          contentVersion: plan.contentVersion,
          contentHash: plan.contentHash,
          errorMessage: exportError instanceof Error ? exportError.message : 'Không tạo được file backup.',
        }, classId).catch(() => undefined);
        showToast(`Đã tạo bài online nhưng backup PDF/DOCX chưa hoàn tất: ${exportError instanceof Error ? exportError.message : 'lỗi không xác định'}`, 'warning');
      }
      onCreated?.();
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không tạo được hoạt động hỗ trợ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!focus || !draft) {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Tạo hoạt động hỗ trợ">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-black text-slate-900">Chưa có điểm nghẽn để tạo hoạt động</h2><button type="button" onClick={onClose} aria-label="Đóng"><X /></button></div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">Báo cáo chưa có bằng chứng câu hỏi, lỗi hoặc chủ đề. Hãy chấm và duyệt thêm bài rồi tạo lại báo cáo.</p>
          <button type="button" onClick={onClose} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white">Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Tạo hoạt động hỗ trợ">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Tạo hoạt động từ bằng chứng</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Biến khuyến nghị thành việc có thể giao</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Giáo viên kiểm tra và sửa bản nháp trước khi giao. AI không tự giao và không tự ghi điểm chính thức.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng"><X /></button>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[0.8fr_1.2fr] lg:p-7">
          <section className="space-y-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" /><h3 className="font-black text-indigo-950">Bằng chứng nguồn</h3></div>
              <p className="mt-2 text-sm font-semibold leading-6 text-indigo-950">{draft.evidenceSummary}</p>
            </div>
            <label className="block text-sm font-black text-slate-700">Điểm cần xử lý
              <select value={focus.id} onChange={event => setFocusId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                {focusOptions.map(option => <option key={option.id} value={option.id}>{option.kind === 'question' ? 'Câu hỏi' : option.kind === 'error' ? 'Lỗi' : 'Chủ đề'} · {option.label} · {option.evidenceCount} bằng chứng</option>)}
              </select>
            </label>
            <label className="block text-sm font-black text-slate-700">Mục đích
              <select value={purpose} onChange={event => setPurpose(event.target.value as typeof purpose)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                {PURPOSE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="block text-sm font-black text-slate-700">Tên hoạt động<input value={title} onChange={event => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
              <label className="block text-sm font-black text-slate-700">Thời lượng<input type="number" min={10} max={60} value={durationMinutes} onChange={event => setDurationMinutes(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
            </div>
            <label className="block text-sm font-black text-slate-700">Mục tiêu đo được<textarea value={objective} onChange={event => setObjective(event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-semibold leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
            <div>
              <p className="text-sm font-black text-slate-700">Nhóm học sinh đích <span className="font-semibold text-slate-400">(bỏ chọn hết = cả lớp)</span></p>
              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                {students.map(student => <label key={student.id} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={event => setSelectedStudentIds(current => event.target.checked ? [...new Set([...current, student.id])] : current.filter(id => id !== student.id))} className="h-4 w-4 accent-indigo-600" />{student.name}<span className="text-xs text-slate-400">{student.code}</span></label>)}
              </div>
              {selectedStudentIds.length > 0 && <p className="mt-1 text-xs font-semibold text-slate-500">Đã chọn: {selectedStudentIds.map(id => names.get(id) || id).join(', ')}</p>}
            </div>
            {draft.blockingReasons.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Cần giáo viên kiểm tra thêm</p><ul className="mt-1 list-disc pl-5">{draft.blockingReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div></div></div>}
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><h3 className="font-black text-slate-900">Kịch bản triển khai ({draft.durationMinutes} phút)</h3><div className="mt-3 space-y-3">{draft.teacherSteps.map(step => <div key={step.title} className="rounded-xl bg-white p-3 text-sm leading-6"><p className="font-black text-indigo-800">{step.minutes} phút · {step.title}</p><p><span className="font-black">GV:</span> {step.teacherAction}</p><p><span className="font-black">HS:</span> {step.studentAction}</p><p><span className="font-black">Kiểm tra:</span> {step.check}</p></div>)}</div><p className="mt-3 text-sm font-black text-emerald-800">Tiêu chí đạt: {draft.successCriteria}</p></div>
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-slate-900">Câu hỏi hỗ trợ</h3><button type="button" onClick={() => setQuestions(current => [...current, { id: `support-extra-${Date.now()}`, type: 'essay', content: '', points: 1 }])} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50"><Plus className="h-3.5 w-3.5" /> Thêm câu</button></div><div className="mt-3 space-y-3">{questions.map((question, index) => <div key={question.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Câu {index + 1}</p><label className="flex items-center gap-1 text-xs font-bold text-slate-500">Điểm<input type="number" min={0.25} step={0.25} value={question.points} onChange={event => updateQuestion(question.id, { points: Number(event.target.value) })} className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right font-bold" /></label></div><textarea value={question.content} onChange={event => updateQuestion(question.id, { content: event.target.value })} rows={3} placeholder="Viết câu hỏi cụ thể, không để nội dung mẫu..." className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></div>)}</div></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950"><p className="font-black">Kiểm tra trước khi giao</p><p className="mt-1">Câu hỏi đang là bản nháp gợi ý. Hãy sửa thành nhiệm vụ có dữ kiện cụ thể. Bài online và 4 file backup (PDF/DOCX cho học sinh và giáo viên) được tạo từ cùng một snapshot. Nếu backup lỗi, bài online vẫn giữ nguyên và em có thể thử xuất lại.</p></div>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="text-xs font-semibold text-slate-500">{draft.targetStudentIds.length > 0 ? `Gợi ý hỗ trợ ${draft.targetStudentIds.length} học sinh` : 'Phạm vi: cả lớp'} · Không thay đổi bài nộp cũ</div>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50">Hủy</button><button type="button" onClick={() => void handleCreate()} disabled={!canSave} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo backup…</> : <><Save className="h-4 w-4" /> Tạo, xuất backup và giao</>}</button></div>
        </footer>
      </div>
    </div>
  );
};
