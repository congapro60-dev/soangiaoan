import { useMemo, useState } from 'react';
import type { LessonIRV83 } from '../../../lib/lessonCompiler/v832/lessonIRSchema';
import { translateV832Reason } from '../../../lib/lessonCompiler/v832/reasonVi';
import {
  buildTeacherConfirmationCards,
  confirmTeacherDecision,
  type TeacherConfirmationAuditRecord,
} from '../../../lib/lessonCompiler/v832/confirmationReview';
import { computeLessonContentHash } from '../../../lib/lessonReview/v832/repairLifecycle';

export const TeacherConfirmationReview = ({
  lesson, teacherUid, assignments = {}, onDecision,
}: {
  lesson: LessonIRV83;
  teacherUid: string;
  assignments?: Record<string, string>;
  onDecision: (next: LessonIRV83, audit: TeacherConfirmationAuditRecord) => Promise<void> | void;
}) => {
  const cards = useMemo(() => buildTeacherConfirmationCards(lesson, assignments), [lesson, assignments]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (card: (typeof cards)[number]) => {
    if (!teacherUid || busyKey) return;
    setBusyKey(card.key);
    setError(null);
    try {
      const sources = new Set(card.refs.map(ref => ref.split(':', 1)[0]));
      const decision = sources.size > 1 ? 'confirm_group'
        : sources.has('learnerEvidence') ? 'confirm_planning_assumption' : 'confirm_quality_contract';
      const result = await confirmTeacherDecision(lesson, card, {
        teacherUid,
        baseLessonVersion: lesson.lesson.lessonVersion,
        baseContentHash: await computeLessonContentHash(lesson),
        decision,
        rationale: rationales[card.key] ?? '',
        confirmedAt: new Date().toISOString(),
        ...(sources.size > 1 ? { acknowledgedRefs: card.refs } : {}),
      });
      await onDecision(result.lessonIR, result.audit);
      setRationales(current => ({ ...current, [card.key]: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không ghi được quyết định của giáo viên.');
    } finally {
      setBusyKey(null);
    }
  };

  return <section className="space-y-4" aria-labelledby="v832-confirmation-heading">
    <div>
      <h2 id="v832-confirmation-heading" className="text-xl font-extrabold text-slate-900">Quyết định cần giáo viên xác nhận</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Mỗi thẻ ghi rõ các căn cứ sẽ được xác nhận cùng một quyết định. Giả định về lớp vẫn giữ nhãn giả định sau khi xác nhận.</p>
    </div>
    {cards.length === 0 && <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Không còn xác nhận đang chờ.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</p>}
    {cards.map(card => <article key={card.key} data-v832-confirmation-group={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{card.label}</h3>
        {card.materialForReadyToTeach && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">Chặn sẵn sàng dạy</span>}
      </div>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
        {card.reasons.map((reason, index) => <li key={`${card.refs[index]}-${index}`}>{translateV832Reason(reason)}</li>)}
      </ul>
      <label className="mt-4 block text-sm font-bold text-slate-800" htmlFor={`v832-reason-${card.key}`}>Căn cứ để chốt quyết định</label>
      <textarea id={`v832-reason-${card.key}`} value={rationales[card.key] ?? ''}
        onChange={event => setRationales(current => ({ ...current, [card.key]: event.target.value }))}
        rows={3} maxLength={4000} className="mt-2 w-full rounded-xl border-2 border-slate-300 p-3 text-sm text-slate-900 focus-visible:outline-3 focus-visible:outline-teal-600"
        placeholder="Nêu dữ liệu, kinh nghiệm quan sát hoặc lí do sư phạm cụ thể…" />
      <button type="button" disabled={!teacherUid || busyKey !== null || (rationales[card.key] ?? '').trim().length < 12}
        onClick={() => void confirm(card)}
        className="mt-3 min-h-12 rounded-xl bg-teal-700 px-5 py-2 font-bold text-white disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-amber-500">
        {busyKey === card.key ? 'Đang lưu…' : 'Xác nhận quyết định này'}
      </button>
    </article>)}
  </section>;
};
