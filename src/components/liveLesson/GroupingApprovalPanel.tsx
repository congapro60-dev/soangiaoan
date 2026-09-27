import { useEffect, useRef, useState } from 'react';
import type { GroupProposal } from '../../lib/liveLesson/v4/grouping';

const APPROVAL_TIMEOUT_MS = 40_000;

export type ApprovalAction = 'approved' | 'switched' | 'default';

export interface ApprovalResult {
  action: ApprovalAction;
  proposal: GroupProposal;
  chosenGroupId: string;
}

export const getElapsedMs = (startedAt: number, now: number): number =>
  Math.max(0, now - startedAt);

export const shouldSuggestDefault = (startedAt: number, now: number, timeoutMs: number = APPROVAL_TIMEOUT_MS): boolean =>
  getElapsedMs(startedAt, now) >= timeoutMs;

export const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${totalSeconds}s`;
};

export interface GroupingApprovalPanelProps {
  proposals: GroupProposal[];
  onApprove: (result: ApprovalResult) => void;
}

export const GroupingApprovalPanel = ({ proposals, onApprove }: GroupingApprovalPanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      if (shouldSuggestDefault(startedAt, tick)) {
        setTimedOut(true);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startedAt]);

  const proposal = proposals[currentIndex] ?? null;
  if (!proposal) return null;

  const remainingMs = Math.max(0, APPROVAL_TIMEOUT_MS - getElapsedMs(startedAt, now));

  const approve = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onApprove({ action: 'approved', proposal, chosenGroupId: proposal.groupId });
  };

  const switchGroup = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= proposals.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const useDefault = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const defaultProposal: GroupProposal = {
      groupId: 'default-mixed',
      purpose: 'teacher_defined',
      memberIds: proposal.memberIds,
      scaffold: 'Nhóm mặc định — GV quyết định nhiệm vụ.',
      reason: 'GV chọn nhóm mặc định.',
    };
    onApprove({ action: 'default', proposal: defaultProposal, chosenGroupId: 'default-mixed' });
  };

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-widest text-amber-700">
          Đề xuất nhóm ({currentIndex + 1}/{proposals.length})
        </p>
        {!timedOut && (
          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-800 tabular-nums">
            {formatCountdown(remainingMs)}
          </span>
        )}
        {timedOut && (
          <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-black text-rose-800">
            Hết thời gian
          </span>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-white p-3 shadow-sm">
        <p className="text-sm font-black text-slate-800">
          Nhóm: <span className="text-indigo-600">{proposal.groupId}</span>
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Mục đích: {proposal.purpose === 'same_need_workshop' ? 'Đồng nhu cầu' : proposal.purpose === 'mixed_reasoning' ? 'Đa dạng lý luận' : 'GV quyết định'}
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {proposal.memberIds.length} thành viên · {proposal.scaffold}
        </p>
        <p className="mt-1 text-xs italic text-slate-400">
          Lý do: {proposal.reason}
        </p>
      </div>

      {timedOut && (
        <p className="mt-2 text-xs font-black text-rose-600">
          Đề xuất chưa được duyệt sau 40 giây. Hãy dùng nhóm mặc định hoặc duyệt nhanh.
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={approve}
          className="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white hover:bg-emerald-700"
        >
          Duyệt
        </button>
        <button
          type="button"
          onClick={switchGroup}
          disabled={proposals.length <= 1}
          className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Đổi nhóm
        </button>
        <button
          type="button"
          onClick={useDefault}
          className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-3 text-sm font-black text-amber-800 hover:bg-amber-200"
        >
          Mặc định
        </button>
      </div>
    </section>
  );
};
