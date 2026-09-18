import type { LiveResponseStep } from '../../lib/liveLesson/types';
import type { LiveLessonV4Contract, StudentLanguageView } from '../../lib/liveLesson/v4/types';
import { useStudentDraft } from './useStudentDraft';
import { StudentWritingSupport } from './StudentWritingSupport';
import { LiveLessonRichText } from './LiveLessonRichText';

const questionLabel = (step: LiveResponseStep, index: number): string => {
  if (/^[A-D]/.test(step.label.trim())) return step.label.split(/[.:]/, 1)[0];
  return index === 4 ? 'Challenge' : String.fromCharCode(65 + index);
};

function PracticeQuestionCard({
  step, index, contract, cueId, sessionId, participantUid, route, languageView, onSubmit,
}: {
  step: LiveResponseStep; index: number; contract: LiveLessonV4Contract; cueId: string;
  sessionId: string; participantUid: string; route: string | null; languageView: StudentLanguageView;
  onSubmit: (step: LiveResponseStep, value: string) => void;
}) {
  const draft = useStudentDraft(sessionId, participantUid, step.id);
  const insert = (text: string) => {
    const next = draft.textValue ? `${draft.textValue}\n${text}` : text;
    if (next.length <= (step.maxTextLength ?? 2000)) draft.setTextValue(next);
  };
  const submitted = Boolean(draft.submittedTextValue && !draft.hasUnsentChanges);
  const label = questionLabel(step, index);
  return <article className={`student-practice-card ${index === 4 ? 'is-challenge' : ''}`} aria-label={`Bài luyện tập ${label}`}>
    <header className="student-practice-card-head"><span>{label}</span>{submitted && <small>Đã gửi</small>}</header>
    <LiveLessonRichText text={step.label.replace(/^[A-D]\s*[·.:]\s*/i, '').replace(/^Challenge\s*[·.:]\s*/i, '')} className="student-practice-prompt" />
    <StudentWritingSupport contract={contract} cueId={cueId} stepId={step.id} route={route} languageView={languageView} onInsert={insert} />
    <textarea aria-label={`Câu trả lời bài ${label}`} value={draft.textValue} onChange={event => draft.setTextValue(event.target.value)} maxLength={step.maxTextLength ?? 2000} placeholder="Viết bước làm và phép kiểm" className="student-practice-input" />
    <div className="student-practice-footer"><span>{draft.textValue.length}/{step.maxTextLength ?? 2000}</span><button type="button" disabled={!draft.textValue.trim()} onClick={() => { onSubmit(step, draft.textValue); draft.recordSubmission(); }}>{submitted ? 'Gửi lại' : 'Gửi bài này'}</button></div>
  </article>;
}

export function StudentPracticeSet({ steps, contract, cueId, sessionId, participantUid, route, languageView, onSubmit }: {
  steps: LiveResponseStep[]; contract: LiveLessonV4Contract; cueId: string; sessionId: string; participantUid: string;
  route: string | null; languageView: StudentLanguageView; onSubmit: (step: LiveResponseStep, value: string) => void;
}) {
  return <section className="student-practice-set" aria-label="Bộ luyện tập V7.2">
    <div className="student-practice-roadmap"><span>A–B · Cốt lõi</span><span>C · Trường hợp đặc biệt</span><span>D · Mở rộng</span><span>Challenge · Kiểm chứng</span></div>
    <p className="student-practice-note">Làm A và B trước. Khi đã chắc, chuyển sang C, D và Challenge theo nhu cầu của em.</p>
    <div className="student-practice-grid">{steps.map((step, index) => <PracticeQuestionCard key={step.id} step={step} index={index} contract={contract} cueId={cueId} sessionId={sessionId} participantUid={participantUid} route={route} languageView={languageView} onSubmit={onSubmit} />)}</div>
  </section>;
}
