import { useEffect, useState } from 'react';
import { CLASS_GROUPS, chooseLiveGroup, subscribeToMyLiveGroup } from '../../services/liveActivityService';

export function StudentGroupPicker({ sessionId, participantUid }: { sessionId: string; participantUid: string }) {
  const [group, setGroup] = useState<string | null>(null);
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setGroup(null);
    return subscribeToMyLiveGroup(sessionId, participantUid, value => { setGroup(value); setChoice(value ?? ''); setError(null); }, err => setError(err.message));
  }, [sessionId, participantUid]);
  const join = async () => {
    setBusy(true); setError(null);
    try { await chooseLiveGroup(sessionId, participantUid, choice); }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa ghi nhận được nhóm.'); }
    finally { setBusy(false); }
  };
  return <section className="student-group-card" aria-label="Nhóm học tập">
    <div><span className="activity-kicker">Cùng nhau khám phá</span><h2>{group ? `Em đang ở nhóm ${group}` : 'Nhận nhóm của em'}</h2>
      <p>Chọn số nhóm thầy cô đã phân công. Cùng trao đổi, thử cách giải và mỗi em ghi lại điều mình hiểu.</p></div>
    <div className="student-group-form"><label>Số nhóm<select value={choice} onChange={e => setChoice(e.target.value)} disabled={busy}><option value="">Chọn nhóm</option>{CLASS_GROUPS.map(number => <option key={number} value={number}>Nhóm {number}</option>)}</select></label>
      <button type="button" onClick={() => void join()} disabled={busy || !choice || choice === group}>{busy ? 'Đang ghi nhận…' : group ? 'Đổi nhóm' : 'Xác nhận nhóm'}</button></div>
    {error && <p role="alert">Chưa ghi nhận nhóm: {error}</p>}
    <p className="student-group-note">TV chỉ hiện số người đã gửi của từng nhóm. Một lượt gửi chưa có nghĩa cả nhóm đã hiểu bài.</p>
  </section>;
}
