import type { LivePublicStats } from '../../lib/liveLesson/types';

// Bảng thống kê TV — CHỈ hiển thị số liệu tổng hợp đã được khử danh tính. Không
// bao giờ nhận tên, UID, PIN hay câu trả lời thô; chỉ các trường đếm công khai.

export interface TvStatsItemView { label: string; count: number; accent?: boolean }

export type TvStatsView =
  | { kind: 'error'; title: string; items: TvStatsItemView[]; participantCount: number; submittedCount: number }
  | { kind: 'route'; title: string; items: TvStatsItemView[]; participantCount: number; submittedCount: number }
  | { kind: 'choice'; title: string; items: TvStatsItemView[]; participantCount: number; submittedCount: number }
  | { kind: 'counts'; title: string; participantCount: number; submittedCount: number };

const ERROR_CATEGORIES = ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'] as const;
const ROUTES = ['M', 'S', 'C'] as const;

const safeInt = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0);

const sumRecord = (record: Record<string, unknown> | undefined | null): number => {
  if (!record || typeof record !== 'object') return 0;
  return Object.values(record).reduce<number>((total, value) => total + safeInt(value), 0);
};

/**
 * Chọn cách trình bày theo bước hiện tại. Ưu tiên tín hiệu stepId (ai-error/route),
 * sau đó theo trường đếm nào có dữ liệu. Text/exit chỉ hiện participant/submitted.
 */
export function getTvStatsView(stats: LivePublicStats): TvStatsView {
  const participantCount = safeInt(stats.participantCount);
  const submittedCount = safeInt(stats.submittedCount);
  const stepId = typeof stats.stepId === 'string' ? stats.stepId : '';
  const errorTotal = sumRecord(stats.errorCategoryCounts);
  const routeTotal = sumRecord(stats.routeCounts);
  const choiceKeys = stats.choiceCounts && typeof stats.choiceCounts === 'object' ? Object.keys(stats.choiceCounts) : [];

  if (stepId.includes('ai-error') || errorTotal > 0) {
    return {
      kind: 'error',
      title: 'Phân loại lỗi AI',
      participantCount,
      submittedCount,
      items: ERROR_CATEGORIES.map((category) => ({ label: category, count: safeInt(stats.errorCategoryCounts?.[category]), accent: true })),
    };
  }
  if (stepId.includes('route') || routeTotal > 0) {
    return {
      kind: 'route',
      title: 'Tuyến M / S / C',
      participantCount,
      submittedCount,
      items: ROUTES.map((route) => ({ label: `Tuyến ${route}`, count: safeInt(stats.routeCounts?.[route]), accent: true })),
    };
  }
  if (choiceKeys.length > 0) {
    return {
      kind: 'choice',
      title: 'Lựa chọn của lớp',
      participantCount,
      submittedCount,
      items: choiceKeys
        .map((key) => ({ label: key, count: safeInt((stats.choiceCounts as Record<string, unknown>)[key]) }))
        .filter((item) => item.count > 0),
    };
  }
  return { kind: 'counts', title: 'Tiến độ gửi', participantCount, submittedCount };
}

export interface TvStatsPanelProps {
  stats: LivePublicStats | null;
  showStats: boolean;
}

export const TvStatsPanel = ({ stats, showStats }: TvStatsPanelProps) => {
  if (!showStats) {
    return <footer className="shrink-0 text-center text-[clamp(0.7rem,1.2vw,1rem)] font-bold text-slate-500">Thống kê đang ẩn.</footer>;
  }
  if (!stats) {
    return <footer className="shrink-0 text-center text-[clamp(0.7rem,1.2vw,1rem)] font-bold text-slate-400">Đang chờ dữ liệu thống kê tổng hợp…</footer>;
  }
  const view = getTvStatsView(stats);
  const countTiles = (
    <>
      <div className="min-w-0 rounded-xl bg-white/10 p-[clamp(0.45rem,1vw,1rem)]"><p className="truncate text-[clamp(0.65rem,1.1vw,0.95rem)] font-black uppercase text-slate-400">Tham gia</p><p className="mt-1 text-[clamp(1.5rem,3.5vw,3rem)] font-black leading-none">{view.participantCount}</p></div>
      <div className="min-w-0 rounded-xl bg-white/10 p-[clamp(0.45rem,1vw,1rem)]"><p className="truncate text-[clamp(0.65rem,1.1vw,0.95rem)] font-black uppercase text-slate-400">Đã gửi</p><p className="mt-1 text-[clamp(1.5rem,3.5vw,3rem)] font-black leading-none">{view.submittedCount}</p></div>
    </>
  );
  return (
    <footer className="shrink-0">
      <p className="text-[clamp(0.75rem,1.3vw,1rem)] font-black uppercase tracking-[0.14em] text-cyan-300">{view.title}</p>
      <div className="mt-2 flex flex-wrap gap-[clamp(0.35rem,1vw,1rem)]">
        {countTiles}
        {view.kind !== 'counts' && view.items.map((item) => (
          <div key={item.label} className={`min-w-0 rounded-xl p-[clamp(0.45rem,1vw,1rem)] ${item.accent ? 'bg-cyan-400/15' : 'bg-white/10'}`}>
            <p className={`truncate whitespace-nowrap text-[clamp(0.65rem,1.1vw,0.95rem)] font-black uppercase ${item.accent ? 'text-cyan-300' : 'text-slate-400'}`}>{item.label}</p>
            <p className="mt-1 text-[clamp(1.5rem,3.5vw,3rem)] font-black leading-none">{item.count}</p>
          </div>
        ))}
      </div>
    </footer>
  );
};
