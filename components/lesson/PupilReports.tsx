"use client";

import { useEffect, useId, useRef, useState } from 'react';

const labels: Record<string, string> = { question_repeated: 'Câu hỏi lặp lại', content: 'Nội dung chưa đúng', progress: 'Tiến độ hoặc kết quả', display: 'Hiển thị hoặc thao tác', other: 'Vấn đề khác' };
const statuses: Record<string, string> = { new: 'Mới nhận', reviewed: 'Đã xem', resolved: 'Đã xử lý', archived: 'Thùng rác' };
const errors: Record<string, string> = {
  REPORT_RATE_LIMIT: 'Em đã gửi 3 báo lỗi trong một phút. Hãy đợi một chút rồi thử lại.',
  REPORT_ROOM_LIMIT: 'Phòng đã nhận đủ báo lỗi. Em hãy báo trực tiếp với thầy/cô.',
  FORBIDDEN: 'Phiên truy cập không còn hợp lệ. Hãy vào lại phòng.',
  DEVICE_UNAVAILABLE: 'Thiết bị không còn quyền truy cập. Hãy báo với thầy/cô.',
  REPORT_CONTEXT_CHANGED: 'Hoạt động vừa thay đổi. Hãy đóng và mở lại báo lỗi.',
  INVALID_REPORT_CONTEXT: 'Câu hỏi vừa thay đổi. Hãy đóng và mở lại báo lỗi.',
  REPORT_SENSITIVE_TEXT: 'Không gửi mã truy cập hoặc khóa API trong mô tả.',
  INVALID_BODY: 'Hãy chọn loại lỗi, nhập mô tả từ 10 đến 1.200 ký tự.',
};
const message = (code: unknown) => errors[String(code)] || 'Chưa thực hiện được. Hãy thử lại; nội dung vẫn được giữ.';
const endpoint = '/api/lesson-sessions/reports';

type StudentReportProps = { sessionId: string; bearerToken: string; actingLearnerId?: string; taskId?: string; onClose: () => void };
export function StudentBugReport(props: StudentReportProps) {
  return <StudentReportForm key={JSON.stringify([props.sessionId, props.bearerToken, props.actingLearnerId, props.taskId])} {...props} />;
}
function StudentReportForm({ sessionId, bearerToken, actingLearnerId, taskId, onClose }: StudentReportProps) {
  const [category, setCategory] = useState('question_repeated');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const locked = useRef(false);
  const titleId = useId(), categoryId = useId(), descriptionId = useId(), helpId = useId();
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!locked.current) onClose(); }} style={{ width: 'min(540px, calc(100vw - 24px))', boxSizing: 'border-box', maxHeight: '85dvh', overflow: 'auto', borderRadius: 18, padding: 24, border: '1px solid #cbd5e1', margin: 'auto', background: '#fff', color: '#183342' }}>
    <h2 id={titleId}>Báo lỗi cho thầy/cô</h2>
    {sent ? <><p role="status">Đã gửi báo lỗi. Thầy/cô sẽ xem trong danh sách của phòng.</p><button type="button" onClick={onClose}>Đóng</button></> : <form onSubmit={async event => {
      event.preventDefault(); if (locked.current) return;
      locked.current = true; setPending(true); setError('');
      const signature = JSON.stringify({ sessionId, actingLearnerId, taskId, category, description: description.trim() });
      if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
      try {
        const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}` }, body: JSON.stringify({ action: 'submit', id: sessionId, actingLearnerId, taskId, category, description: description.trim(), requestId: request.current.id }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw Error(result.error);
        setSent(true);
      } catch (failure) { setError(message(failure instanceof Error ? failure.message : '')); }
      finally { locked.current = false; setPending(false); }
    }}>
      <label htmlFor={categoryId}>Loại lỗi</label>
      <select id={categoryId} value={category} disabled={pending} onChange={event => setCategory(event.target.value)} style={{ display: 'block', width: '100%', margin: '8px 0 16px', padding: 10 }}>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <label htmlFor={descriptionId}>Em gặp vấn đề gì?</label>
      <textarea id={descriptionId} value={description} disabled={pending} required minLength={10} maxLength={1200} rows={5} aria-describedby={helpId} onChange={event => setDescription(event.target.value)} style={{ display: 'block', width: '100%', margin: '8px 0', padding: 10 }} />
      <p id={helpId}>10–1.200 ký tự. Chỉ mô tả lỗi; không gửi đáp án, thông tin riêng tư hoặc mã truy cập.</p>
      {error && <p role="alert">{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <button type="button" disabled={pending} onClick={onClose}>Đóng</button>
        <button type="submit" disabled={pending || description.trim().length < 10}>{pending ? 'Đang gửi…' : 'Gửi báo lỗi'}</button>
      </div>
    </form>}
  </dialog>;
}

type Report = { id: string; category: string; description: string; packageHash: string; activityId: string | null; activityLabel: string; taskId: string | null; taskLabel: string | null; learnerName: string; status: string; createdAt: number };

export function TeacherBugReports({ sessionId }: { sessionId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadedSession, setLoadedSession] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [trash, setTrash] = useState(false);
  const [reload, setReload] = useState(0);
  const latest = useRef(sessionId);
  useEffect(() => { latest.current = sessionId; }, [sessionId]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${endpoint}?id=${encodeURIComponent(sessionId)}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const result = await response.json() as { error?: string; reports: Report[] };
      if (!response.ok) throw Error(result.error);
      if (!controller.signal.aborted) { setReports(result.reports); setLoadedSession(sessionId); setError(''); }
    }).catch(failure => { if (!controller.signal.aborted) setError(message(failure.message)); });
    return () => controller.abort();
  }, [sessionId, reload]);
  const ownReports = loadedSession === sessionId ? reports : [];
  const visible = ownReports.filter(report => (report.status === 'archived') === trash);
  const groups = new Map<string, Report[]>();
  for (const report of visible) { const key = JSON.stringify([report.category, report.activityId]); groups.set(key, [...(groups.get(key) || []), report]); }
  async function update(reportId: string, status: string) {
    if (pending) return;
    const target = sessionId; setPending(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', id: target, reportId, status }) });
      const result = await response.json() as { error?: string }; if (!response.ok) throw Error(result.error);
      if (latest.current === target) setReload(value => value + 1);
    } catch (failure) { if (latest.current === target) setError(message(failure instanceof Error ? failure.message : '')); }
    finally { setPending(false); }
  }
  return <section aria-label="Báo lỗi của học sinh" style={{ marginTop: 20 }}>
    <h3>Báo lỗi của học sinh ({ownReports.filter(report => report.status !== 'archived').length})</h3>
    <p>Thầy/cô xem nội dung, đánh dấu tiến độ xử lý. Báo lỗi không tự sửa trò chơi.</p>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" disabled={pending} onClick={() => setReload(value => value + 1)}>Tải lại</button>
      <button type="button" aria-pressed={trash} onClick={() => setTrash(value => !value)}>{trash ? 'Xem báo lỗi đang xử lý' : `Thùng rác (${ownReports.filter(report => report.status === 'archived').length})`}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {loadedSession !== sessionId && !error && <p role="status">Đang tải báo lỗi…</p>}
    {loadedSession === sessionId && visible.length === 0 && <p>{trash ? 'Thùng rác trống.' : 'Chưa có báo lỗi.'}</p>}
    {[...groups].map(([key, group]) => <details key={key} style={{ padding: '12px 0', borderBottom: '1px solid #cbd5e1' }}>
      <summary>{labels[group[0].category]} · {group[0].activityLabel} · {group.length} báo lỗi</summary>
      {group.map(report => <article key={report.id} style={{ padding: '12px 0', overflowWrap: 'anywhere' }}>
        <p><strong>{report.learnerName}</strong> · {new Date(report.createdAt).toLocaleString('vi-VN')} · {statuses[report.status]}</p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
        {report.taskLabel && <p>{report.taskLabel}</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {trash ? <button type="button" disabled={pending} onClick={() => void update(report.id, 'restore')}>Khôi phục</button> : <>
            <select aria-label={`Trạng thái báo lỗi của ${report.learnerName}`} value={report.status} disabled={pending} onChange={event => void update(report.id, event.target.value)}>
              {['new', 'reviewed', 'resolved'].map(status => <option key={status} value={status}>{statuses[status]}</option>)}
            </select>
            <button type="button" disabled={pending} onClick={() => void update(report.id, 'archived')}>Chuyển vào thùng rác</button>
          </>}
        </div>
      </article>)}
    </details>)}
  </section>;
}
