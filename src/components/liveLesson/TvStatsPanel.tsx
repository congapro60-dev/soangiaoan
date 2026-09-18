import { useEffect, useState } from 'react';
import { CLASS_GROUPS, subscribeToLiveGroupProgress, type LiveGroupProgress } from '../../services/liveActivityService';
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
export function getTvStatsView(stats: LivePublicStats, options: Array<{ value: string; label: string }> = []): TvStatsView {
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
    const orderedKeys = options.length > 0
      ? options.map(option => option.value).filter(key => choiceKeys.includes(key))
      : choiceKeys;
    return {
      kind: 'choice',
      title: 'Lựa chọn của lớp',
      participantCount,
      submittedCount,
      items: orderedKeys
        .map((key) => ({ label: key, count: safeInt((stats.choiceCounts as Record<string, unknown>)[key]) }))
        .filter((item) => item.count > 0),
    };
  }
  return { kind: 'counts', title: 'Tiến độ gửi', participantCount, submittedCount };
}

export interface TvStatsPanelProps {
  stats: LivePublicStats | null;
  showStats: boolean;
  sessionId?: string;
  cueId?: string;
  stepId?: string;
  options?: Array<{ value: string; label: string }>;
}

const PUBLIC_LABELS: Record<string, string> = {
  Conceptual: 'Khái niệm', Algebraic: 'Tính toán / biến đổi', Logical: 'Lập luận',
  'Missing condition': 'Điều kiện', G1: 'Kiểm tra nghiệm', G2: 'Lập mô hình',
  G3: 'Giải thích', true: 'Đúng', false: 'Chưa đúng', Yes: 'Có', No: 'Không',
};

export const TvStatsPanel = ({ stats, showStats, sessionId, cueId, stepId, options }: TvStatsPanelProps) => {
  const isGroupActivity = cueId === 'P20' || cueId === 'P22' || stepId === 'cp-group-product';
  const [groups, setGroups] = useState<LiveGroupProgress | null>(null);
  const [groupError, setGroupError] = useState(false);
  useEffect(() => {
    setGroups(null); setGroupError(false);
    if (!showStats || !isGroupActivity || !sessionId) return;
    return subscribeToLiveGroupProgress(sessionId, value => { setGroups(value); setGroupError(false); }, () => setGroupError(true));
  }, [showStats, sessionId, cueId, stepId, isGroupActivity]);

  if (!showStats) return <footer className="tv-results-hidden"><span aria-hidden="true">◌</span> Cùng suy nghĩ · Kết quả chờ thầy cô mở</footer>;
  const view = stats ? getTvStatsView(stats, options) : null;
  const items = view && view.kind !== 'counts' ? view.items : [];
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const groupRows = groups && groups.cueId === cueId && groups.stepId === stepId
    ? CLASS_GROUPS.filter(key => groups.members[key] > 0) : [];
  return <section className="tv-results-panel" aria-label="Kết quả hoạt động">
    <header className="tv-results-header">
      <span className="tv-results-live"><span aria-hidden="true" /> Theo phản hồi đã nhận</span>
      <h3>{isGroupActivity ? 'Nhịp làm việc của các nhóm' : view?.title ?? 'Kết quả của lớp'}</h3>
    </header>
    {!view ? <p className="tv-results-empty">Đang chờ phản hồi của hoạt động này…</p> : <>
      <div className="tv-response-total"><strong>{view.submittedCount}</strong><span>học sinh đã gửi</span></div>
      {items.length > 0 && <div className="tv-result-bars">{items.map(item => {
        const percent = total ? Math.round(item.count / total * 100) : 0;
        return <div key={item.label} className="tv-result-row">
          <div className="tv-result-row-label"><span>{options?.find(option => option.value === item.label)?.label ?? PUBLIC_LABELS[item.label] ?? item.label}</span><strong>{item.count}</strong></div>
          <div className="tv-result-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
        </div>;
      })}</div>}
      {view.submittedCount === 0 && <p className="tv-results-empty">Chưa có phản hồi. Hãy dành thời gian suy nghĩ trước khi gửi.</p>}
    </>}
    {isGroupActivity && <div className="tv-group-progress">
      {groupError ? <p className="tv-results-empty">Chưa kết nối được tiến độ nhóm.</p>
        : groupRows.length === 0 ? <p className="tv-results-empty">HS chọn số nhóm thầy cô đã phân công trên thiết bị.</p>
        : groupRows.map(key => <div className="tv-group-tile" key={key}>
          <div><strong>Nhóm {key}</strong><span>{groups!.submitted[key] ?? 0}/{groups!.members[key]} đã gửi</span></div>
          <div className="tv-result-track" aria-hidden="true"><span style={{ width: `${Math.min(100, (groups!.submitted[key] ?? 0) / groups!.members[key] * 100)}%` }} /></div>
        </div>)}
    </div>}
    <p className="tv-results-caption">{isGroupActivity
      ? 'Theo số thành viên đã chọn nhóm. Lượt gửi là tín hiệu tiến độ, chưa phải đánh giá chất lượng.'
      : items.length ? 'Số lượt chọn để cùng thảo luận, không phải bảng xếp hạng.' : 'Thầy cô đọc bài và chọn điểm cần trao đổi. Số lượt gửi không phải số câu đúng.'}</p>
  </section>;
};
