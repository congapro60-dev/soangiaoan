import { useState } from 'react';
import { getDeadlineSettings, previewDeadlineSettings, saveDeadlineSettings, type DeadlineConfig, type DeadlineSettingsResult } from '../../../lib/classroom/teacherService';

export function DeadlinePanel({ classId }: { classId: string }) {
  const [data, setData] = useState<DeadlineSettingsResult | null>(null);
  const [settings, setSettings] = useState<DeadlineConfig | null>(null);
  const [source, setSource] = useState('');
  const [preview, setPreview] = useState<{ studentNames: string[]; headers: string[]; sheetId: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (work: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Chưa thực hiện được. Thầy cô thử lại sau.'); }
    finally { setBusy(false); }
  };
  const load = () => run(async () => {
    const result = await getDeadlineSettings(classId); setData(result); setSettings(result.settings); setPreview(null);
    setSource(result.settings?.spreadsheetId || result.sources[0]?.spreadsheetId || '');
  });
  const read = () => run(async () => {
    const result = await previewDeadlineSettings(classId, source); setPreview(result);
    setSettings(settings?.spreadsheetId === source ? { ...settings, sheetId: result.sheetId } : { spreadsheetId: source, sheetTitle: '01. DEADLINE', sheetId: result.sheetId, studentNames: {}, tasks: [], notifications: false, digest: false });
  });
  const changeTask = (index: number, patch: Partial<DeadlineConfig['tasks'][number]>) => settings && setSettings({ ...settings, tasks: settings.tasks.map((t, i) => i === index ? { ...t, ...patch } : t) });
  const field = 'rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900';
  return <details className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" onToggle={e => { if (e.currentTarget.open && !data && !busy) void load(); }}>
    <summary className="cursor-pointer font-semibold">Deadline & nhắc việc qua Zalo</summary>
    <p className="my-2 text-sm text-slate-600">Giữ nguyên Sheet. Chỉ đọc tab 01. DEADLINE; HS chỉ xem việc của mình qua mục 11 hoặc nhắn deadline. Không gửi link cả file.</p>
    <p className="my-2 text-sm text-amber-800">Gửi tự động đang khóa ở máy chủ. Hai lựa chọn bên dưới chỉ lưu mong muốn; cần duyệt hạn mức và kích hoạt riêng.</p>
    {data && <fieldset disabled={busy} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label>File đã nối với lớp <select aria-label="File deadline" className={field} value={source} onChange={e => { setSource(e.target.value); setPreview(null); }}>
          {!data.sources.length && <option value="">Cần quản trị phê duyệt nguồn deadline cho lớp</option>}
          {data.sources.filter((s, i, all) => all.findIndex(x => x.spreadsheetId === s.spreadsheetId) === i).map(s => <option key={s.spreadsheetId} value={s.spreadsheetId}>{s.spreadsheetTitle || s.spreadsheetId}</option>)}
        </select></label>
        <button type="button" className={field} disabled={!source} onClick={() => void read()}>Đọc nguồn chỉ xem</button>
        <button type="button" className={field} onClick={() => void load()}>Tải lại cấu hình</button>
      </div>
      {settings && source === settings.spreadsheetId && <>
        <p className="text-sm">Ghép từng mã HS với tên duy nhất trong Sheet. Không ghép theo số dòng. Bỏ trống nghĩa là chưa dùng deadline cho HS đó.</p>
        <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
          {data.roster.map(student => <label key={student.id} className="flex flex-col gap-1 text-sm">{student.code || 'Chưa có mã'} — {student.name}
            <select className={field} disabled={!student.code || !preview} value={settings.studentNames[student.code] || ''} onChange={e => {
              const names = { ...settings.studentNames }; if (e.target.value) names[student.code] = e.target.value; else delete names[student.code];
              setSettings({ ...settings, studentNames: names });
            }}><option value="">Chưa ghép</option>
              {[...new Set([...(preview?.studentNames || []), settings.studentNames[student.code]].filter(Boolean))].map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>)}
        </div>
        {!preview && <p className="text-sm">Bấm Đọc nguồn chỉ xem trước khi đổi ánh xạ hoặc lưu.</p>}
        {settings.tasks.map((task, index) => <fieldset key={task.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-sm font-semibold">Việc {index + 1}</legend>
          <div className="flex flex-wrap gap-2">
            <label>Tên cột <select className={field} value={task.header} onChange={e => changeTask(index, { header: e.target.value })}>
              <option value="">Chọn việc trong Sheet</option>{[...new Set([...(preview?.headers || []), task.header].filter(Boolean))].map(h => <option key={h} value={h}>{h}</option>)}
            </select></label>
            <label>Trạng thái <select className={field} value={task.state} onChange={e => changeTask(index, { state: e.target.value as typeof task.state })}>
              <option value="draft">Nháp</option><option value="published">Đã giao</option><option value="closed">Đóng</option>
            </select></label>
            <label>Gắn bài trên web <select className={field} value={task.assignmentId || ''} onChange={e => changeTask(index, { assignmentId: e.target.value || undefined })}>
              <option value="">Việc riêng, không phải bài web</option>{data.assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={task.optional} onChange={e => changeTask(index, { optional: e.target.checked })} />Việc tự nguyện — chỉ nhắc HS đã chọn bên dưới</label>
          <label className="block text-sm">HS được giao (không chọn = cả nhóm đã ghép; việc tự nguyện bắt buộc chọn)
            <select multiple className={`${field} mt-1 block w-full`} value={task.studentCodes} onChange={e => changeTask(index, { studentCodes: Array.from(e.target.selectedOptions, o => o.value) })}>
              {data.roster.filter(s => settings.studentNames[s.code]).map(s => <option key={s.id} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
          </label>
          <button type="button" className="text-sm text-red-700 underline" onClick={() => setSettings({ ...settings, tasks: settings.tasks.filter((_, i) => i !== index) })}>Bỏ việc khỏi cấu hình</button>
        </fieldset>)}
        <button type="button" className={field} disabled={!preview || settings.tasks.length >= 60} onClick={() => setSettings({ ...settings, tasks: [...settings.tasks, { id: crypto.randomUUID(), header: '', state: 'draft', optional: false, studentCodes: [] }] })}>Thêm việc từ Sheet</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.notifications} onChange={e => setSettings({ ...settings, notifications: e.target.checked })} />Thông báo việc mới / đổi hạn / đổi yêu cầu</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.digest} onChange={e => setSettings({ ...settings, digest: e.target.checked })} />Bản tin 07:00 hằng ngày (giờ Việt Nam)</label>
        <button type="button" className={field} disabled={!preview} onClick={() => void run(async () => {
          const result = await saveDeadlineSettings(classId, settings, data.revision); setData({ ...data, settings, revision: result.revision }); setMessage('Đã lưu cấu hình. Chưa kích hoạt gửi tự động.');
        })}>Lưu cấu hình</button>
      </>}
    </fieldset>}
    {busy && <p role="status" className="mt-2 text-sm">Đang xử lý…</p>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
    {!data && !busy && <button type="button" className={field} onClick={() => void load()}>Tải cấu hình</button>}
  </details>;
}
