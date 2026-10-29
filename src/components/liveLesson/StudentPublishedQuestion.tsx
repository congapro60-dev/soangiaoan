import { useEffect, useState } from 'react';
import { subscribeToPublishedQuestions, type PublishedQuestionRow } from '../../services/liveQuestionService';

/** Câu hỏi ẩn danh ĐÃ được GV công bố — hiển thị cho cả lớp, chỉ nội dung + mã ẩn danh. */
export function StudentPublishedQuestion({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<PublishedQuestionRow[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    return subscribeToPublishedQuestions(sessionId, setRows, () => setRows([]));
  }, [sessionId]);
  const latest = rows[rows.length - 1];
  if (!latest) return null;
  const index = rows.indexOf(latest) + 1;
  return <section className="student-published-question" aria-label="Câu hỏi đã được công bố">
    <p className="student-published-title">❓ Câu hỏi đã công bố #{String(index).padStart(2, '0')}</p>
    <p className="student-published-body">{latest.body}</p>
  </section>;
}
