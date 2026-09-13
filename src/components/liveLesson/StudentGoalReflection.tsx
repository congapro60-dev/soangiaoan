import { useEffect, useState } from 'react';
import type { LiveResponse, LiveResponseStep } from '../../lib/liveLesson/types';
import type { StudentResponseDraft } from './useStudentDraft';
import { subscribeToStudentLiveResponse } from '../../services/liveLessonService';
import { LiveLessonRichText } from './LiveLessonRichText';

export function StudentGoalReflection({ sessionId, participantUid, goalStep, draft, onInsert }: {
  sessionId: string; participantUid: string; goalStep: LiveResponseStep;
  draft: StudentResponseDraft; onInsert?: (text: string) => void;
}) {
  const [answer, setAnswer] = useState<LiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setAnswer(null); setLoading(true); setFailed(false);
    return subscribeToStudentLiveResponse(sessionId, participantUid, goalStep.id,
      value => { setAnswer(value); setLoading(false); setFailed(false); },
      () => { setLoading(false); setFailed(true); });
  }, [sessionId, participantUid, goalStep.id]);
  const raw = answer ? String(answer.value) : draft.textValue || draft.selectedValue;
  const goalLabels: Record<string, string> = { G1: 'Kiểm tra một cặp số có là nghiệm', G2: 'Lập mô hình từ điều kiện thực tế', G3: 'Giải thích nghiệm bằng hình và phép kiểm' };
  const goal = goalStep.options?.find(option => option.value === raw)?.label ?? goalLabels[raw] ?? raw;
  return <section className="student-goal-reflection" aria-label="Đối chiếu mục tiêu cá nhân">
    <span className="activity-kicker">Nhìn lại hành trình của em</span>
    <h2>Mục tiêu em đặt đầu tiết</h2>
    {goal ? <>
      <p className="student-goal-source">{answer ? 'Mục tiêu đã gửi' : 'Bản nháp trên thiết bị · chưa xác nhận đã gửi'}</p>
      <LiveLessonRichText text={goal} className="student-goal-quote" />
    </> : <p>{loading ? 'Đang lấy mục tiêu của em…' : failed ? 'Chưa đọc được mục tiêu. Em có thể đối chiếu với mục tiêu đã ghi trong vở.' : 'Em chưa có mục tiêu được lưu ở bước đầu. Hãy dùng mục tiêu trong vở để đối chiếu.'}</p>}
    <ol><li>Chọn một bước giải, hình vẽ hoặc phép kiểm do em thực hiện.</li><li>Giải thích bằng chứng đó cho thấy em tiến bộ ở điểm nào.</li><li>Nêu một điều em còn cần hỗ trợ ở tiết sau.</li></ol>
    {onInsert && goal && <button type="button" onClick={() => onInsert(`Mục tiêu của em: ${goal}\nBằng chứng em tự làm được: ___\nĐiều em còn cần hỗ trợ: ___`)}>Dùng mục tiêu này để viết phản tư</button>}
  </section>;
}
