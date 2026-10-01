import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Loader2, X } from 'lucide-react';
import { fetchStudentAiCost } from '../../../../services/studentPortalApi';
import { formatStudentVnd, type StudentAiCostItem, type StudentAiCostTotals, type StudentAiCostView } from '../../../../lib/classroom/studentAiCost';

/** Đọc lại thỉnh thoảng để số mới (bài vừa được AI chấm) hiện mà em không phải tải lại trang. */
const POLL_MS = 120_000;

const khoangThoiGian = (at: string, now = Date.now()): string => {
  const moc = Date.parse(at);
  if (!Number.isFinite(moc)) return '';
  const phut = Math.floor((now - moc) / 60_000);
  if (phut < 1) return 'vừa xong';
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngay = Math.floor(gio / 24);
  if (ngay === 1) return 'hôm qua';
  if (ngay < 7) return `${ngay} ngày trước`;
  return new Date(moc).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const tokens = (value: number): string => value.toLocaleString('vi-VN');

const Tile = ({ title, totals }: { title: string; totals: StudentAiCostTotals }) => (
  <div className="rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
    <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p>
    <p className="mt-1 text-lg font-black text-slate-900">{formatStudentVnd(totals.vnd, totals.calls > 0)}</p>
    <p className="text-[11px] font-semibold text-slate-500">{totals.calls} lượt · {tokens(totals.tokens)} token</p>
  </div>
);

const Row = ({ item }: { item: StudentAiCostItem }) => (
  <li className="flex items-start justify-between gap-3 py-2.5">
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
      <p className="truncate text-[11px] font-semibold text-slate-400">
        {item.assignmentTitle ? `${item.assignmentTitle} · ` : ''}{khoangThoiGian(item.at)} · {tokens(item.inputTokens)} vào · {tokens(item.outputTokens)} ra
      </p>
    </div>
    <p className="shrink-0 text-sm font-black text-slate-900">{formatStudentVnd(item.vnd)}</p>
  </li>
);

/** Phần ruột của hộp "Chi phí AI của em" (3 tổng + hoạt động gần đây) — thuần, chỉ nhận số liệu để vẽ. */
export const StudentAiCostPanel = ({ view }: { view: StudentAiCostView | null }) => (
  <>
    {!view ? (
      <p className="flex items-center gap-2 py-6 text-sm font-semibold text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải…</p>
    ) : (
      <>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tile title="Hôm nay" totals={view.totals.today} />
          <Tile title="7 ngày" totals={view.totals.week} />
          <Tile title="Tất cả" totals={view.totals.all} />
        </div>

        <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">Hoạt động gần đây</p>
        {view.recent.length === 0 ? (
          <p className="py-4 text-sm font-semibold text-slate-500">Em chưa dùng AI lần nào. Khi AI chấm bài hay soạn bài luyện cho em, chi phí sẽ hiện ở đây.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {view.recent.map(item => <Row key={item.id} item={item} />)}
          </ul>
        )}
        {view.truncated && <p className="mt-2 text-[11px] font-semibold text-slate-400">Chỉ tính các lượt gần đây nhất.</p>}
        <p className="mt-3 text-[11px] font-semibold leading-4 text-slate-400">
          Số tiền là giá ước tính theo bảng giá của nhà cung cấp AI (đổi ra đồng theo tỷ giá), tính từ số token của từng lượt.
        </p>
      </>
    )}
  </>
);

/** Chữ trên chip: tiền hôm nay (chưa tải xong thì dấu ba chấm). */
export const studentAiChipLabel = (view: StudentAiCostView | null, compact = false): string =>
  (view ? `${compact ? '' : 'AI hôm nay '}${formatStudentVnd(view.totals.today.vnd, view.totals.today.calls > 0)}` : 'AI…');

/**
 * Chip + hộp "Chi phí AI của em" ở đầu cổng học sinh. Chỉ để em BIẾT mỗi hoạt động của mình tốn bao nhiêu tiền của thầy cô
 * (em không phải trả) — nhằm giúp em quý trọng đồng tiền. Chỉ thấy số của chính em; không có số liệu ví của thầy cô.
 */
export const StudentAiCostChip = () => {
  const [view, setView] = useState<StudentAiCostView | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const hasView = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchStudentAiCost();
      if (!mounted.current) return;
      hasView.current = true;
      setView(next);
      setFailed(false);
    } catch {
      // Đã có số rồi thì giữ số cũ; chưa có lần nào thì ẩn chip.
      if (mounted.current && !hasView.current) setFailed(true);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
    const closeOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, load]);

  // Máy chủ cũ / lỗi ngay lần đầu: không hiện chip nửa vời.
  if (failed && !view) return null;


  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="Chi phí AI của em hôm nay"
        className="inline-flex min-h-11 items-center gap-1 rounded-2xl border border-amber-200 bg-amber-50 px-2 text-xs sm:gap-1.5 sm:px-3 font-black text-amber-800 transition hover:bg-amber-100"
      >
        <Coins className="h-4 w-4 shrink-0" />
        {/* Điện thoại hẹp: rút gọn để tên em ở bên cạnh không bị cắt. */}
        <span className="whitespace-nowrap sm:hidden">{studentAiChipLabel(view, true)}</span>
        <span className="hidden whitespace-nowrap sm:inline">{studentAiChipLabel(view)}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chi phí AI của em"
          className="fixed inset-x-4 top-[4.5rem] z-40 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[26rem]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-black text-slate-900">Chi phí AI của em</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Mỗi lần AI chấm bài hay soạn bài luyện cho em, thầy cô phải trả tiền cho AI. Em xem để biết và quý trọng nhé — em không phải trả khoản này.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <StudentAiCostPanel view={view} />
        </div>
      )}
    </div>
  );
};
