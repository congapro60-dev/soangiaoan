import type { LiveLessonV4Contract } from '../../lib/liveLesson/v4/types';
import { LiveLessonRichText } from './LiveLessonRichText';

export function StudentActivityGuide({ contract, cueId, label, action, route }: { contract: LiveLessonV4Contract; cueId: string; label?: string; action?: string; route?: string | null }) {
  const cue = contract.timeline.find(item => item.id === cueId);
  if (!cue) return null;
  const frames = contract.languageDemands.find(item => item.stepId === cueId)?.sentenceFrames ?? [];
  const variant = contract.taskVariants.find(item => item.route === route);
  const criteria = variant?.successCriteria ?? contract.taskVariants[0]?.successCriteria ?? [];
  return <section className="student-task-card" aria-label="Hướng dẫn hoạt động">
    <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">Việc em cần làm lúc này</p>
    <p className="student-activity-time">Chặng {Math.floor(cue.startSeconds / 60)}–{Math.ceil(cue.endSeconds / 60)} phút · theo nhịp thầy cô</p>
    <h2>{label ?? cue.label}</h2>
    <LiveLessonRichText text={action ?? cue.studentAction ?? 'Theo dõi hướng dẫn của thầy cô.'} className="mt-2 text-lg leading-relaxed" />
    {criteria.length > 0 && <details className="mt-4 rounded-xl border border-indigo-200 bg-white/70 p-4">
      <summary className="cursor-pointer font-bold">Tiêu chí để tự đối chiếu bài làm</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5">{criteria.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="mt-3 text-sm text-slate-600">Đối chiếu với mục tiêu em chọn đầu tiết. Chỉ ra một bước làm, hình vẽ hoặc phép kiểm làm bằng chứng.</p>
    </details>}
    {frames.length > 0 && <details className="mt-3 rounded-xl border border-indigo-200 bg-white/70 p-4">
      <summary className="cursor-pointer font-bold">Em cần hỗ trợ diễn đạt</summary>
      {frames.map(frame => <LiveLessonRichText key={frame} text={frame} className="mt-3 leading-relaxed" />)}
    </details>}
  </section>;
}
