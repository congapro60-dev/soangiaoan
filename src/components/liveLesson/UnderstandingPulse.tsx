import { useEffect, useState } from 'react';
import { readMyPulse, submitPulse, type PulseReport } from '../../services/liveQuestionService';

const PULSE_OPTIONS: ReadonlyArray<{ value: PulseReport; label: string }> = [
  { value: 'understood', label: 'Em đã hiểu và có thể tự làm tương tự.' },
  { value: 'need_example', label: 'Em hiểu một phần, cần thêm ví dụ.' },
  { value: 'unclear', label: 'Em vẫn chưa rõ.' },
];

/**
 * COMM-AQ-01 — Understanding Pulse: mini-check 10–30 giây sau hoạt động trọng tâm.
 * Tự báo hiểu là PERCEPTION — không tính điểm, không tự bật hint, không chặn chuyển chặng.
 * Nhánh "còn băn khoăn" đi vào luồng câu hỏi ẩn danh (không kèm định danh).
 */
export function UnderstandingPulse({ sessionId, participantUid, classId, cueId }: {
  sessionId: string;
  participantUid: string;
  classId: string;
  cueId: string;
}) {
  const [report, setReport] = useState<PulseReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setReport(null);
    void readMyPulse(sessionId, participantUid, cueId).then(value => {
      if (active) setReport(value);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [sessionId, participantUid, cueId]);

  const pick = async (value: PulseReport) => {
    if (busy || report === value) return;
    setBusy(true);
    try {
      await submitPulse(sessionId, participantUid, classId, cueId, value);
      setReport(value);
    } catch {
      // Pulse là tự nguyện — lỗi không chặn việc học, giữ lựa chọn cũ.
    } finally {
      setBusy(false);
    }
  };

  return <section className="student-pulse" aria-label="Em hiểu bài đến đâu?">
    <p className="student-pulse-title">Em hiểu bài đến đâu? (không tính điểm)</p>
    <div className="student-pulse-options">
      {PULSE_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          disabled={busy}
          aria-pressed={report === option.value}
          className={report === option.value ? 'student-pulse-btn is-selected' : 'student-pulse-btn'}
          onClick={() => void pick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
    {report === 'need_example' || report === 'unclear' ? (
      <p className="student-pulse-note">Muốn hỏi riêng? Dùng <button type="button" className="student-pulse-link" onClick={() => window.dispatchEvent(new Event('open-anon-question'))}>❓ Đặt câu hỏi ẩn danh</button> — tên em không hiện.</p>
    ) : null}
  </section>;
}
