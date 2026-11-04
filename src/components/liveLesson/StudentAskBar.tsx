import { useEffect, useState } from 'react';
import { subscribeToMyHand, setHandRaised, submitAnonymousQuestion, sanitizeQuestionBody, buildQuestionNonce, type HandAction } from '../../services/liveQuestionService';

/**
 * COMM-AQ-01 — thanh 2 nút thường trực trên mọi trạng thái của Student View:
 * ✋ Giơ tay (CÓ tên để GV gọi) và ❓ Đặt câu hỏi ẩn danh (KHÔNG định danh, bất biến).
 * Không che math input / nút nộp; modal riêng nên không đụng draft bài đang làm.
 */
export function StudentAskBar({ sessionId, participantUid, classId, studentName, activityId }: {
  sessionId: string;
  participantUid: string;
  classId: string;
  studentName: string;
  activityId?: string | null;
}) {
  const [hand, setHand] = useState<HandAction | null>(null);
  const [handBusy, setHandBusy] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  // Reload trang vẫn giữ đúng trạng thái tay (doc theo uid).
  useEffect(() => {
    return subscribeToMyHand(sessionId, participantUid, action => { setHand(action); }, () => {});
  }, [sessionId, participantUid]);
  // Pulse có thể yêu cầu mở modal hỏi (event — không ràng buộc props).
  useEffect(() => {
    const open = () => setAskOpen(true);
    window.addEventListener('open-anon-question', open);
    return () => window.removeEventListener('open-anon-question', open);
  }, []);

  const toggleHand = async () => {
    if (handBusy) return;
    setHandBusy(true);
    try {
      const next: HandAction = hand === 'raise' ? 'lower' : 'raise';
      await setHandRaised(sessionId, participantUid, classId, studentName, next);
      setHand(next);
    } catch {
      setSendError(hand === 'raise' ? 'Chưa hạ được tay — thử lại.' : 'Chưa ghi nhận được giơ tay — thử lại.');
    } finally {
      setHandBusy(false);
    }
  };

  const send = async () => {
    if (sendState === 'sending') return;
    const clean = sanitizeQuestionBody(draft);
    if (clean.length < 2) { setSendState('error'); setSendError('Câu hỏi còn quá ngắn.'); return; }
    setSendState('sending'); setSendError(null);
    try {
      void buildQuestionNonce; // nonce do service tự sinh khi gửi
      await submitAnonymousQuestion(sessionId, clean, activityId ?? undefined);
      setSendState('sent');
      setDraft('');
    } catch (error) {
      setSendState('error');
      setSendError(error instanceof Error ? error.message : 'Chưa gửi được câu hỏi.');
    }
  };

  return <section className="student-ask-bar" aria-label="Giơ tay và hỏi ẩn danh">
    <button
      type="button"
      onClick={() => void toggleHand()}
      disabled={handBusy}
      className={hand === 'raise' ? 'student-ask-btn is-raised' : 'student-ask-btn'}
      aria-pressed={hand === 'raise'}
    >
      {hand === 'raise' ? '✋ Đang giơ tay · Hạ tay' : '✋ Giơ tay'}
    </button>
    <button type="button" onClick={() => setAskOpen(open => !open)} className="student-ask-btn">
      ❓ Đặt câu hỏi ẩn danh
    </button>
    {sendState === 'sent' && !askOpen && <span className="student-ask-note">Đã nhận câu hỏi ẩn danh.</span>}
    {sendError && !askOpen && <span className="student-ask-note is-error" role="alert">{sendError}</span>}
    {askOpen && <div className="student-ask-modal" role="dialog" aria-label="Đặt câu hỏi ẩn danh">
      <p className="student-ask-title">Đặt câu hỏi ẩn danh</p>
      <label className="student-ask-label" htmlFor="anon-question-input">Em muốn hỏi điều gì?</label>
      <textarea
        id="anon-question-input"
        value={draft}
        onChange={event => { setDraft(event.target.value); if (sendState !== 'idle') setSendState('idle'); }}
        maxLength={500}
        rows={3}
        placeholder="Viết câu hỏi của em…"
        className="student-ask-input"
      />
      <p className="student-ask-hint">Câu hỏi của em sẽ không hiển thị tên. Đừng ghi tên hoặc thông tin riêng tư của em/bạn vào câu hỏi.</p>
      <div className="student-ask-actions">
        <button type="button" onClick={() => setAskOpen(false)} className="student-ask-secondary">Đóng</button>
        <button type="button" onClick={() => void send()} disabled={sendState === 'sending'} className="student-ask-primary">
          {sendState === 'sending' ? 'Đang gửi…' : 'Gửi câu hỏi'}
        </button>
      </div>
      {sendState === 'sent' && <p className="student-ask-note" role="status">Đã nhận câu hỏi ẩn danh.</p>}
      {sendState === 'error' && sendError && <p className="student-ask-note is-error" role="alert">{sendError}</p>}
    </div>}
  </section>;
}
