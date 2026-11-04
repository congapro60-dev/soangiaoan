import { useEffect, useState } from 'react';
import {
  publishQuestion, setQuestionStatus, subscribeToTeacherHands, subscribeToTeacherQuestions,
  type AnonymousQuestionRow, type HandRaiseRow,
} from '../../services/liveQuestionService';

const STATUS_LABEL: Record<AnonymousQuestionRow['status'], string> = {
  new: 'Mới', reviewing: 'Đang xem', answered: 'Đã trả lời', deferred: 'Để sau', hidden: 'Đã ẩn',
};

/**
 * COMM-AQ-01 — panel GV trên màn tv-control (màn GV thật):
 * - Dải gọn "✋ N bạn đang giơ tay" + tên (chỉ thuộc chức năng giơ tay).
 * - Khối "Câu hỏi ẩn danh" cập nhật realtime; câu mới KHÔNG tự lên TV — chỉ khi GV bấm Công bố.
 * Không có bất kỳ nút/cách nào xem người gửi câu hỏi (khóa cứng theo spec).
 */
export function TvQuestionsPanel({ sessionId, sessionActive }: { sessionId: string; sessionActive: boolean }) {
  const [hands, setHands] = useState<HandRaiseRow[]>([]);
  const [questions, setQuestions] = useState<AnonymousQuestionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !sessionActive) { setHands([]); setQuestions([]); return; }
    const unsubHands = subscribeToTeacherHands(sessionId, rows => setHands(rows), () => setHands([]));
    const unsubQuestions = subscribeToTeacherQuestions(sessionId, rows => setQuestions(rows), () => setQuestions([]));
    return () => { unsubHands(); unsubQuestions(); };
  }, [sessionId, sessionActive]);

  const act = async (key: string, run: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(key);
    try { await run(); } catch { /* giữ trạng thái, GV thử lại */ } finally { setBusy(null); }
  };

  const raised = hands.filter(row => row.action === 'raise');
  const active = questions.filter(row => row.status !== 'hidden');
  const previewNames = raised.slice(0, 3).map(row => row.studentName).join(', ');

  return <>
    {raised.length > 0 && <section className="tv-hand-raise" aria-label="Học sinh giơ tay">
      ✋ {raised.length} bạn đang giơ tay{previewNames ? ` — ${previewNames}${raised.length > 3 ? '…' : ''}` : ''}
    </section>}
    {active.length > 0 && <section className="tv-questions" aria-label="Câu hỏi ẩn danh — chỉ giáo viên">
      <button type="button" onClick={() => setOpen(value => !value)} className="tv-questions-toggle">
        ❓ Câu hỏi ẩn danh ({active.length}) — chỉ giáo viên {open ? '▾' : '▸'}
      </button>
      {open && <ul className="tv-questions-list">
        {active.map((row, index) => (
          <li key={row.questionId} className="tv-question-item">
            <p className="tv-question-meta">#{String(index + 1).padStart(2, '0')} · {row.activityId ?? 'toàn tiết'} · {STATUS_LABEL[row.status]}{row.isPublished ? ' · đã công bố' : ''}</p>
            <p className="tv-question-body">{row.body}</p>
            <div className="tv-question-actions">
              {!row.isPublished && <button type="button" disabled={busy !== null} onClick={() => void act(row.questionId, () => publishQuestion(sessionId, row.questionId))}>Công bố</button>}
              {row.isPublished && <button type="button" disabled={busy !== null} onClick={() => void act(row.questionId, () => setQuestionStatus(sessionId, row.questionId, 'hidden'))}>Gỡ khỏi TV</button>}
              <button type="button" disabled={busy !== null} onClick={() => void act(row.questionId, () => setQuestionStatus(sessionId, row.questionId, 'answered'))}>Đã trả lời</button>
              <button type="button" disabled={busy !== null} onClick={() => void act(row.questionId, () => setQuestionStatus(sessionId, row.questionId, 'deferred'))}>Để sau</button>
              <button type="button" disabled={busy !== null} onClick={() => void act(row.questionId, () => setQuestionStatus(sessionId, row.questionId, 'hidden'))}>Ẩn nội dung</button>
            </div>
          </li>
        ))}
      </ul>}
    </section>}
  </>;
}
