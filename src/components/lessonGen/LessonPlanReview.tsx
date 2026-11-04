import type { LessonPlanDraft } from '../../lib/lessonGen/planValidator';

const formatActivity = (id: string): string => ({ warmup: 'Khởi động', driving_question: 'Câu hỏi dẫn dắt', exit: 'Exit Ticket' }[id] ?? id.replace(/[-_]/g, ' '));

export const LessonPlanReview = ({ draft, onChangeQuestionPrompt }: { draft: LessonPlanDraft; onChangeQuestionPrompt?: (questionId: string, prompt: string) => void }) => {
  const questions = new Map(draft.questions.map(question => [question.id, question]));
  const instances = new Map(draft.questionInstances.map(instance => [instance.id, instance]));
  return <section className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-black">Kế hoạch để giáo viên duyệt</h2>
    <p className="mt-2 text-sm text-slate-600">{Math.round(draft.durationSec / 60)} phút · {draft.activities.length} hoạt động · {draft.questions.length} câu hỏi.</p>
    <ol className="mt-5 space-y-3">
      {draft.activities.map(activity => <li key={activity.id} className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-baseline justify-between gap-3"><h3 className="font-black capitalize text-slate-900">{formatActivity(activity.id)}</h3><span className="text-xs font-bold text-slate-500">{activity.durationSec}s</span></div>
        {activity.questionInstanceIds.length > 0 && <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {activity.questionInstanceIds.map(instanceId => {
            const instance = instances.get(instanceId);
            const question = instance ? questions.get(instance.questionId) : null;
            return <li key={instanceId} className="rounded-xl border border-slate-200 bg-white p-3"><span className="font-bold">Câu hỏi: </span>{question?.prompt ?? 'Thiếu câu hỏi'}{question && onChangeQuestionPrompt && <label className="mt-3 block text-xs font-bold text-slate-600">Sửa câu hỏi<textarea className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm font-medium" value={question.prompt} onChange={event => onChangeQuestionPrompt(question.id, event.target.value)} /></label>}</li>;
          })}
        </ul>}
        {activity.assetIds.length > 0 && <p className="mt-3 text-xs font-semibold text-slate-600">Visual/tool: {activity.assetIds.join(', ')}</p>}
      </li>)}
    </ol>
  </section>;
};
