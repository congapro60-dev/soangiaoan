import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import {
  listBenchmarkModels, listBenchmarkSubmissions, runBenchmarkGrade, summarizeBenchmark,
  type BenchmarkRun, type BenchmarkTruth,
} from '../../../lib/admin/modelBenchmark';

const card = 'rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm';
const btn = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const input = 'w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs';

/** 3 bài GHKI có điểm GV chốt: Columbus (11), Olinda (10), 12LoTrinh1 — đổi được trong ô. */
const DEFAULT_ASSIGNMENTS = [
  'asg_1787d143-4d24-43a6-ae8c-d9e45a498258',
  'asg_70eb10a9-912c-4551-b389-d5e43107d6c0',
  'asg_ec30fd04-4486-47d0-aad8-a634c90cd0b5',
].join('\n');
const DEFAULT_MODELS = ['vilao/gemini-3.8-flash@none', 'vilao/gemini-3.8-flash@low', 'xkiro/qwen/qwen3.8-max:free'].join('\n');
const USD_VND = 26_190;

/** Kết quả lưu ở trình duyệt này: mất mạng/đóng tab thì bấm chạy lại sẽ chạy tiếp, không làm lại lượt đã xong. */
const SAVE_KEY = 'modelBenchmarkRuns';
const loadSaved = (): { submissionId: string; run: BenchmarkRun }[] => {
  try { const value = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
};
const save = (runs: { submissionId: string; run: BenchmarkRun }[]) => {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(runs)); } catch { /* đầy bộ nhớ: vẫn hiện trên màn hình */ }
};

const lines = (text: string) => text.split(/\s+/).map(s => s.trim()).filter(Boolean);
const vnd = (usd: number | null) => (usd === null ? '—' : `${Math.round(usd * USD_VND).toLocaleString('vi-VN')}₫`);
const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const num = (x: number | null) => (x === null ? '—' : x.toLocaleString('vi-VN'));

/**
 * Đo model chấm trên bài đã có điểm GV: máy chấm lại từng bài bằng từng model, KHÔNG ghi vào bài nộp,
 * rồi so 3 chỉ số chủ dự án đặt — lệch điểm GV, số câu phải hỏi lại, tiền mỗi bài.
 */
export const ModelBenchmarkPanel = () => {
  const [assignments, setAssignments] = useState(DEFAULT_ASSIGNMENTS);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [mode, setMode] = useState<'quick' | 'thorough'>('quick');
  const [onlyApproved, setOnlyApproved] = useState(true);
  const [parallel, setParallel] = useState(4);
  const [truth, setTruth] = useState<BenchmarkTruth[]>([]);
  const [runs, setRuns] = useState<{ submissionId: string; run: BenchmarkRun }[]>(loadSaved);
  const [catalog, setCatalog] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const loadCatalog = async () => {
    setBusy('Đang lấy danh sách model…');
    try {
      const list = await listBenchmarkModels();
      setCatalog([...list.vilao.map(m => `vilao/${m.id}`), ...list.xkiro.map(m => `xkiro/${m.id}`)].join('  '));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Chưa lấy được.'); } finally { setBusy(''); }
  };

  const run = async (limit: number | null) => {
    setMessage('');
    try {
      setBusy('Đang lấy bài có điểm GV…');
      const items = (await listBenchmarkSubmissions(lines(assignments))).items.filter(item => !onlyApproved || item.approved);
      setTruth(items);
      const picked = limit === null ? items : items.slice(0, limit);
      const allJobs = picked.flatMap(item => lines(models).map(model => ({ item, model })));
      // Chạy tiếp: lượt đã chấm được (ok) giữ lại, không tốn tiền chạy lần hai; lượt lỗi chạy lại.
      const done = loadSaved().filter(r => r.run.ok);
      const finished = new Set(done.map(r => `${r.submissionId}|${r.run.model}`));
      const queue = allJobs.filter(job => !finished.has(`${job.item.id}|${job.model}`));
      setRuns([...done]);
      // Chạy song song vài lượt: mỗi lượt là một hàm máy chủ riêng, chợ API chịu được.
      let next = 0;
      const worker = async () => {
        while (next < queue.length) {
          const job = queue[next++];
          setBusy(`Đang chấm thử… còn ${queue.length - next} lượt chờ`);
          let result: BenchmarkRun;
          try { result = await runBenchmarkGrade(job.item.id, job.model, mode); } catch (error) {
            result = { ok: false, model: job.model, ms: 0, error: error instanceof Error ? error.message : 'lỗi' };
          }
          done.push({ submissionId: job.item.id, run: result });
          setRuns([...done]);
          save(done);
        }
      };
      await Promise.all(Array.from({ length: parallel }, () => worker()));
      setMessage(`Xong. Có ${done.length} lượt chấm thử trên ${picked.length} bài.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Lỗi không rõ.');
    } finally { setBusy(''); }
  };

  const summary = summarizeBenchmark(truth, runs);
  const copy = () => void navigator.clipboard?.writeText(JSON.stringify({ summary, runs }, null, 1));

  return (
    <section className={card} aria-label="Đo model chấm">
      <h3 className="flex items-center gap-2 text-base font-black text-indigo-900"><FlaskConical className="h-4 w-4" /> Đo model chấm (không ghi vào bài)</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
        Máy chấm lại bài ĐÃ có điểm giáo viên bằng từng model, so ba chỉ số: lệch điểm GV, số câu phải hỏi lại, tiền mỗi bài.
        Bài nộp không bị đổi. Tiền tính vào sổ dùng AI của tài khoản quản trị. Model viết dạng <code>vilao/…[@none|low|medium|high]</code>, <code>xkiro/…</code>, <code>gemini/…</code>.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-black text-slate-700">Mã bài giao (mỗi dòng một mã)
          <textarea className={`${input} mt-1 h-24`} value={assignments} onChange={e => setAssignments(e.target.value)} />
        </label>
        <label className="text-xs font-black text-slate-700">Model (mỗi dòng một model)
          <textarea className={`${input} mt-1 h-24`} value={models} onChange={e => setModels(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={onlyApproved} onChange={e => setOnlyApproved(e.target.checked)} /> Chỉ bài GV đã duyệt</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={mode === 'thorough'} onChange={e => setMode(e.target.checked ? 'thorough' : 'quick')} /> Chấm kĩ (chép bài trước)</label>
        <label className="inline-flex items-center gap-1">Song song <input type="number" min={1} max={8} className="w-12 rounded-lg border border-slate-200 px-1" value={parallel} onChange={e => setParallel(Math.min(8, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void loadCatalog()}>Xem model có sẵn</button>
        <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void run(3)}>Chạy thử 3 bài</button>
        <button type="button" className={btn} disabled={Boolean(busy)} onClick={() => void run(null)}>Chạy tất cả</button>
        {runs.length > 0 && <button type="button" className={btnGhost} onClick={copy}>Chép kết quả (JSON)</button>}
        {runs.length > 0 && <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => { save([]); setRuns([]); }}>Xoá kết quả cũ</button>}
        {busy && <span className="inline-flex items-center gap-1 text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{busy}</span>}
      </div>
      {catalog && <p className="mt-2 max-h-28 overflow-auto break-all rounded-xl bg-slate-50 p-2 font-mono text-[11px] text-slate-600">{catalog}</p>}
      {message && <p role="status" className="mt-2 text-sm font-bold text-slate-800">{message}</p>}
      {summary.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-slate-500"><tr>
              <th className="py-1">Model</th><th>Bài</th><th>Lỗi</th><th>Lệch TB (thang 10)</th><th>Lệch lớn nhất</th><th>Bài lệch ≤0,25</th>
              <th>Câu lệch/bài</th><th>Câu phải hỏi lại/bài</th><th>Tiền/bài</th><th>Giây/bài</th>
            </tr></thead>
            <tbody>{summary.map(s => (
              <tr key={s.model} className="border-t border-slate-100 font-semibold text-slate-800">
                <td className="py-1 font-mono">{s.model}</td><td>{s.runs}</td><td>{s.failed}</td><td>{num(s.meanAbsDiff10)}</td><td>{num(s.maxAbsDiff10)}</td>
                <td>{pct(s.within025)}</td><td>{num(s.rowMismatchPerSubmission)}</td><td>{num(s.flaggedPerSubmission)}</td>
                <td>{vnd(s.costUsdPerSubmission)}{s.costPartial ? '*' : ''}</td><td>{num(s.avgSeconds)}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="mt-1 text-[11px] text-slate-500">* Có lượt gọi model chưa có trong bảng giá — tiền chỉ tính phần đã biết; xem số token ở JSON. Tỷ giá ước {USD_VND.toLocaleString('vi-VN')}₫/USD.</p>
          <details className="mt-2"><summary className="cursor-pointer text-xs font-black text-slate-600">Lỗi từng lượt</summary>
            <ul className="mt-1 space-y-0.5 text-[11px] text-rose-700">{runs.filter(r => !r.run.ok).map((r, i) => <li key={i}>{r.run.model} · {r.submissionId.slice(0, 8)}: {r.run.error}</li>)}</ul>
          </details>
        </div>
      )}
    </section>
  );
};
