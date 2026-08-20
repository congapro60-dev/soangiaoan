import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, Play, Square, RotateCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import {
  loadPpct, PPCT_GRADES, PPCT_SOURCE_LABELS,
  type PpctProgram, type PpctSource,
} from '../../../data/ppct';
import { buildQueue } from '../../../lib/ppct/lessonJob';
import type { TienDoQueue, BanGhiTienDo } from '../../../hooks/usePpctQueue';
import { khoaLo } from '../../../hooks/usePpctQueue';
import type { JobOutcome } from '../../../lib/ppct/runQueue';
import type { QueuePlan } from '../../../lib/ppct/lessonJob';

/** Ước lượng thô: mỗi tiết Toán tốn 2 lượt gọi AI, khoảng 90 giây. */
const uocLuong = (soTiet: number): string => {
  const phut = Math.round((soTiet * 90) / 60);
  if (phut < 60) return `khoảng ${phut} phút`;
  const gio = Math.floor(phut / 60);
  const le = phut % 60;
  return `khoảng ${gio} giờ${le ? ` ${le} phút` : ''}`;
};

interface Props {
  grade: string;
  tienDo: TienDoQueue;
  ketQua: JobOutcome[];
  banGhi: BanGhiTienDo | null;
  onChay: (plan: QueuePlan, lo: { khoa: string; nhan: string }, chayTiep: boolean) => void;
  onDung: () => void;
  onXoaTienDo: () => void;
}

export const PpctBulkPanel = ({ grade, tienDo, ketQua, banGhi, onChay, onDung, onXoaTienDo }: Props) => {
  const [source, setSource] = useState<PpctSource>('TDS');
  const [khoi, setKhoi] = useState<number>(() => Number(grade) || PPCT_GRADES.TDS[0]);
  const [program, setProgram] = useState<PpctProgram | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [tuTuan, setTuTuan] = useState(1);
  const [denTuan, setDenTuan] = useState(2);
  const [phanMon, setPhanMon] = useState<string[]>([]);
  const [soanTuChon, setSoanTuChon] = useState(true);

  useEffect(() => {
    const allowed = PPCT_GRADES[source];
    if (!allowed.includes(khoi)) setKhoi(allowed[0]);
  }, [source, khoi]);

  useEffect(() => {
    let huy = false;
    setDangTai(true);
    loadPpct(source, khoi)
      .then(p => { if (!huy) setProgram(p); })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, [source, khoi]);

  const cacPhanMon = useMemo(() => {
    if (!program) return [];
    return [...new Set(program.lessons.map(l => l.subject).filter(Boolean))];
  }, [program]);

  const tuanToiDa = useMemo(() => {
    if (!program) return 42;
    return Math.max(...program.lessons.map(l => l.week ?? l.weeks[0] ?? 0), 1);
  }, [program]);

  const plan = useMemo(() => {
    if (!program) return null;
    return buildQueue({ program, fromWeek: tuTuan, toWeek: denTuan, subjects: phanMon, soanTuChon });
  }, [program, tuTuan, denTuan, phanMon, soanTuChon]);

  const soTuChon = useMemo(
    () => (plan ? plan.jobs.filter(j => j.title.startsWith('Tiết tự chọn')).length : 0),
    [plan],
  );

  const khoa = khoaLo(source, khoi, tuTuan, denTuan);
  const nhan = `${source} lớp ${khoi}, tuần ${tuTuan}–${denTuan}`;
  const coTheChayTiep = banGhi?.khoa === khoa && banGhi.daXong.length > 0;

  const togglePhanMon = (mon: string) =>
    setPhanMon(prev => (prev.includes(mon) ? prev.filter(m => m !== mon) : [...prev, mon]));

  if (tienDo.dangChay) {
    const pct = tienDo.tong ? Math.round((tienDo.daLam / tienDo.tong) * 100) : 0;
    const loi = ketQua.filter(k => k.status === 'failed').length;
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang soạn {tienDo.daLam}/{tienDo.tong} tiết
          </div>
          <button
            onClick={onDung}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:text-red-600 hover:border-red-200"
          >
            <Square className="w-3.5 h-3.5" /> Dừng
          </button>
        </div>
        <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-slate-600 line-clamp-1">{tienDo.dangSoan}</p>
        <p className="text-xs text-slate-500">
          Đừng đóng tab này. Mỗi tiết soạn xong được lưu ngay vào Thư viện, dừng giữa chừng không mất phần đã xong.
          {loi > 0 && <span className="text-amber-700 font-semibold"> · {loi} tiết lỗi</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-blue-600" />
        <h4 className="font-bold text-slate-800">Soạn hàng loạt theo phân phối chương trình</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase">Nguồn</span>
          <select
            value={source}
            onChange={e => setSource(e.target.value as PpctSource)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {(Object.keys(PPCT_SOURCE_LABELS) as PpctSource[]).map(s => (
              <option key={s} value={s}>{PPCT_SOURCE_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase">Khối</span>
          <select
            value={khoi}
            onChange={e => setKhoi(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {PPCT_GRADES[source].map(g => <option key={g} value={g}>Lớp {g}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase">Từ tuần</span>
          <input
            type="number" min={1} max={tuanToiDa} value={tuTuan}
            onChange={e => setTuTuan(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-slate-500 uppercase">Đến tuần (tối đa {tuanToiDa})</span>
          <input
            type="number" min={1} max={tuanToiDa} value={denTuan}
            onChange={e => setDenTuan(Math.max(1, Number(e.target.value) || 1))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {cacPhanMon.length > 1 && (
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase">Phân môn</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {cacPhanMon.map(mon => (
              <button
                key={mon}
                onClick={() => togglePhanMon(mon)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                  phanMon.includes(mon)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {mon}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Không chọn gì = lấy hết mọi phân môn.</p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer">
        <input
          type="checkbox" checked={soanTuChon}
          onChange={e => setSoanTuChon(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-blue-600"
        />
        <span>
          Soạn cả <strong>tiết tự chọn</strong>
          <span className="block text-[11px] text-slate-400">
            Phân phối để trống nội dung, AI sẽ tự chọn theo tiến độ của chính tuần đó và ghi rõ lý do chọn.
          </span>
        </span>
      </label>

      {dangTai && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang nạp phân phối chương trình...
        </p>
      )}

      {plan && !dangTai && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
          <p className="text-sm text-slate-700">
            Sẽ soạn <strong className="text-blue-700">{plan.jobs.length} tiết</strong>
            {soTuChon > 0 && <span className="text-slate-500"> (gồm {soTuChon} tiết tự chọn)</span>}
            {plan.jobs.length > 0 && <span className="text-slate-500"> · {uocLuong(plan.jobs.length)}</span>}
          </p>
          {plan.skipped.kiemTra.length > 0 && (
            <p className="text-xs text-amber-700 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Bỏ qua {plan.skipped.kiemTra.length} tiết kiểm tra — đó là tiết học sinh làm bài, không soạn giáo án dạy học.
              </span>
            </p>
          )}
          {plan.skipped.elective.length > 0 && (
            <p className="text-xs text-slate-500">
              Bỏ qua {plan.skipped.elective.length} tiết tự chọn theo lựa chọn ở trên.
            </p>
          )}
        </div>
      )}

      {coTheChayTiep && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start justify-between gap-3">
          <p className="text-xs text-emerald-800">
            Lô <strong>{banGhi!.nhan}</strong> còn dở — đã xong {banGhi!.daXong.length} tiết.
          </p>
          <button onClick={onXoaTienDo} className="text-xs font-bold text-slate-500 hover:text-slate-700 shrink-0">
            Bỏ ghi nhớ
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => plan && onChay(plan, { khoa, nhan }, false)}
          disabled={!plan || plan.jobs.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Play className="w-4 h-4" /> Bắt đầu soạn
        </button>
        {coTheChayTiep && (
          <button
            onClick={() => plan && onChay(plan, { khoa, nhan }, true)}
            disabled={!plan}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            <RotateCw className="w-4 h-4" /> Chạy tiếp
          </button>
        )}
      </div>

      {ketQua.length > 0 && (
        <ul className="max-h-48 overflow-y-auto space-y-1 border-t border-slate-100 pt-3">
          {ketQua.map(k => (
            <li key={k.lessonId} className="flex items-start gap-2 text-xs">
              {k.status === 'done'
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                : <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
              <span className={k.status === 'done' ? 'text-slate-600' : 'text-red-600'}>
                {k.title}{k.error && ` — ${k.error}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
