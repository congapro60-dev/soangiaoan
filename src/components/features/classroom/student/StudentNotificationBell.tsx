import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, GraduationCap, ShieldCheck, Trash2 } from 'lucide-react';
import type { StudentFeedItem, StudentFeedKind } from '../../../../lib/classroom/studentNotifications';
import { countUnread } from '../../../../lib/classroom/studentNotifications';

interface StudentNotificationBellProps {
  items: readonly StudentFeedItem[];
  /** Mốc em mở chuông lần gần nhất, lưu theo máy. Chưa mở lần nào thì null. */
  lastSeenAt: string | null;
  onOpened: (seenAt: string) => void;
  /** Bấm vào một thông báo có bài kèm theo thì mở thẳng bài đó. */
  onSelectAssignment?: (assignmentId: string) => void;
}

const ICONS: Record<StudentFeedKind, typeof Bell> = {
  submitted: CheckCircle2,
  graded: GraduationCap,
  grade_error: AlertTriangle,
  teacher_approved: ShieldCheck,
  submission_deleted: Trash2,
};

const MAU: Record<StudentFeedKind, string> = {
  submitted: 'bg-emerald-50 text-emerald-600',
  graded: 'bg-indigo-50 text-indigo-600',
  grade_error: 'bg-amber-50 text-amber-600',
  teacher_approved: 'bg-emerald-50 text-emerald-600',
  submission_deleted: 'bg-red-50 text-red-600',
};

/** "3 phút trước", "hôm qua" — đọc nhanh hơn hẳn một chuỗi ngày giờ đầy đủ. */
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

export const StudentNotificationBell = ({
  items,
  lastSeenAt,
  onOpened,
  onSelectAssignment,
}: StudentNotificationBellProps) => {
  const [dangMo, setDangMo] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const chuaDoc = countUnread(items, lastSeenAt);

  // Bấm ra ngoài hoặc bấm Esc thì đóng — trên điện thoại không có chỗ nào khác để thoát.
  useEffect(() => {
    if (!dangMo) return;
    const dongNeuNgoai = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setDangMo(false);
    };
    const dongNeuEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setDangMo(false); };
    document.addEventListener('mousedown', dongNeuNgoai);
    document.addEventListener('keydown', dongNeuEsc);
    return () => {
      document.removeEventListener('mousedown', dongNeuNgoai);
      document.removeEventListener('keydown', dongNeuEsc);
    };
  }, [dangMo]);

  const moBang = () => {
    const sapMo = !dangMo;
    setDangMo(sapMo);
    // Đánh dấu đã đọc bằng mốc của mục mới nhất, không phải "bây giờ": thông báo đến trong lúc
    // bảng đang mở vẫn được tính là chưa đọc ở lần sau.
    if (sapMo && items.length > 0) onOpened(items[0].at);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={moBang}
        aria-label={chuaDoc > 0 ? `Thông báo, ${chuaDoc} mục mới` : 'Thông báo'}
        aria-expanded={dangMo}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-5 w-5" />
        {chuaDoc > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-4 text-white">
            {chuaDoc > 9 ? '9+' : chuaDoc}
          </span>
        )}
      </button>

      {dangMo && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-900">Thông báo</p>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm font-semibold text-slate-400">
              Chưa có thông báo nào.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {items.map(item => {
                const Icon = ICONS[item.kind];
                const moDuoc = Boolean(item.assignmentId && onSelectAssignment);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!moDuoc}
                      onClick={() => {
                        if (!item.assignmentId || !onSelectAssignment) return;
                        onSelectAssignment(item.assignmentId);
                        setDangMo(false);
                      }}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition ${moDuoc ? 'hover:bg-slate-50' : 'cursor-default'}`}
                    >
                      <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${MAU[item.kind]}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-sm font-black text-slate-900">{item.title}</span>
                          <span className="shrink-0 text-[11px] font-bold text-slate-400">{khoangThoiGian(item.at)}</span>
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-600">{item.body}</span>
                        {item.needsAction && (
                          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                            Cần em làm
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
