import { useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { refreshRestore, type RefreshRestoreItem } from '../../../lib/admin/adminApi';

const card = 'rounded-3xl border border-rose-200 bg-white p-5 shadow-sm';
const btn = 'inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const diem = (score: number | null, max: number | null) => (score === null ? '—' : `${score}${max ? `/${max}` : ''}`);
const duyet = (value: boolean | null) => (value === null ? '—' : value ? 'đã duyệt' : 'chưa duyệt');

/**
 * Khôi phục sau sự cố 15–16/10: job "làm mới dấu trên ảnh" đã chấm lại toàn bộ bài. Chủ dự án xem trước từng bài
 * rồi bấm khôi phục; máy chạy theo lô cho tới hết. Chỉ bài thầy cô đã sửa tay sau đợt chạy được giữ nguyên.
 */
export const RefreshRestorePanel = () => {
  const [plan, setPlan] = useState<RefreshRestoreItem[] | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const preview = async () => {
    setBusy('Đang xem trước…'); setMessage('');
    try { setPlan((await refreshRestore(false)).plan); } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa xem trước được.'); } finally { setBusy(''); }
  };

  const restoreAll = async () => {
    const pending = plan?.filter(item => item.action === 'restore').length ?? 0;
    if (!pending || !window.confirm(`Khôi phục ${pending} bài về điểm, nhận xét, trạng thái duyệt TRƯỚC đợt chạy 15–16/10 (giữ dấu trên ảnh)?`)) return;
    setMessage('');
    let total = 0;
    try {
      for (let round = 0; round < 30; round += 1) {
        setBusy(`Đang khôi phục… đã xong ${total} bài`);
        const result = await refreshRestore(true);
        total += result.restored;
        setPlan(result.plan);
        if (result.pending === 0 || result.restored === 0) {
          setMessage(`Đã khôi phục ${total} bài.${result.failed ? ` ${result.failed} bài chưa được — xem cột lý do, bấm lại để thử.` : ''}${result.pending && !result.restored ? ' Còn bài chưa khôi phục được — xem cột lý do.' : ''}`);
          break;
        }
      }
    } catch (error) {
      setMessage(`Đã khôi phục ${total} bài rồi dừng vì lỗi: ${error instanceof Error ? error.message : 'không rõ'}. Bấm lại để chạy tiếp.`);
    } finally { setBusy(''); }
  };

  const restore = plan?.filter(item => item.action === 'restore') ?? [];
  const changed = restore.filter(item => item.oldScore !== item.currentScore || item.oldApproved !== item.currentApproved);
  return (
    <section className={card} aria-label="Khôi phục điểm bị chấm lại">
      <h3 className="flex items-center gap-2 text-base font-black text-rose-900"><History className="h-4 w-4" /> Khôi phục điểm bị chấm lại (15–16/10)</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
        Đợt “làm mới dấu trên ảnh” đã chấm lại bài thay vì chỉ thêm dấu. Khôi phục trả lại điểm, nhận xét, trạng thái duyệt trước đợt chạy
        (lấy từ lịch sử điểm máy đã lưu) và GIỮ dấu trên ảnh mới. Giữ nguyên: bài thầy cô đã sửa tay sau đợt chạy, và 18 bài đã soát ảnh thấy lần chấm lại đúng hơn (cần duyệt lại).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void preview()}>Xem trước</button>
        {plan && <button type="button" className={btn} disabled={Boolean(busy) || restore.length === 0} onClick={() => void restoreAll()}>Khôi phục {restore.length} bài</button>}
        {busy && <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{busy}</span>}
      </div>
      {message && <p role="status" className="mt-2 text-sm font-bold text-slate-800">{message}</p>}
      {plan && (
        <>
          <p className="mt-3 text-xs font-bold text-slate-600">
            {plan.length} bài bị đợt chạy chấm lại · sẽ khôi phục {restore.length} (đổi điểm/duyệt: {changed.length}) · giữ nguyên {plan.length - restore.length}
          </p>
          <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 font-black text-slate-500">
                <tr><th className="p-2">Học sinh</th><th className="p-2">Bài</th><th className="p-2">Điểm cũ → hiện tại</th><th className="p-2">Duyệt cũ → hiện tại</th><th className="p-2">Xử lý</th></tr>
              </thead>
              <tbody>
                {plan.map(item => (
                  <tr key={item.submissionId} className="border-t border-slate-100">
                    <td className="p-2 font-bold">{item.studentName}</td>
                    <td className="p-2">{item.assignmentTitle}</td>
                    <td className={`p-2 font-bold ${item.oldScore !== null && item.oldScore !== item.currentScore ? 'text-rose-700' : ''}`}>{diem(item.oldScore, item.maxScore)} → {diem(item.currentScore, item.maxScore)}</td>
                    <td className="p-2">{duyet(item.oldApproved)} → {duyet(item.currentApproved)}</td>
                    <td className={`p-2 ${item.action === 'restore' ? 'font-bold text-rose-700' : 'text-slate-500'}`}>{item.action === 'restore' ? 'Khôi phục' : 'Giữ nguyên'} — {item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};
