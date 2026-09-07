import type { LiveLessonDefinition, LiveLessonSession } from '../../lib/liveLesson/types';

export type PresenterDirection = 'previous' | 'next';

export interface PresenterCueNavigation {
  currentCueId: string;
  currentTvScreenId: string;
  index: number;
  total: number;
}

// Điều hướng cue cho màn TV có điều khiển. Trả về cả currentTvScreenId để cập
// nhật nguyên tử cùng currentCueId qua updateLiveLessonState.
export const getPresenterCueNavigation = (
  definition: Pick<LiveLessonDefinition, 'cues'>,
  cueId: string,
  direction: PresenterDirection,
): PresenterCueNavigation => {
  const index = Math.max(0, definition.cues.findIndex((cue) => cue.id === cueId));
  const nextIndex = direction === 'next'
    ? Math.min(definition.cues.length - 1, index + 1)
    : Math.max(0, index - 1);
  const cue = definition.cues[nextIndex] ?? definition.cues[0];
  return { currentCueId: cue.id, currentTvScreenId: cue.tvScreenId, index: nextIndex, total: definition.cues.length };
};

// Chỉ chủ phiên đã xác thực mới được điều khiển. Public TV không bao giờ đi qua đây.
export const canPresenterControl = (
  session: Pick<LiveLessonSession, 'teacherUid'>,
  uid: string | null | undefined,
): boolean => Boolean(uid && session.teacherUid === uid);

export interface TvPresenterControlsProps {
  definition: Pick<LiveLessonDefinition, 'cues'>;
  session: Pick<LiveLessonSession, 'currentCueId' | 'status'>;
  busy?: boolean;
  error?: string | null;
  onNavigate: (patch: { currentCueId: string; currentTvScreenId: string }) => void;
  onToggleStatus: () => void;
}

export const TvPresenterControls = ({ definition, session, busy = false, error = null, onNavigate, onToggleStatus }: TvPresenterControlsProps) => {
  const index = Math.max(0, definition.cues.findIndex((cue) => cue.id === session.currentCueId));
  const total = definition.cues.length;
  const isClosed = session.status === 'closed';
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2 border-t border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur">
      {error && <span className="mr-3 text-xs font-bold text-rose-300">{error}</span>}
      <button
        type="button"
        disabled={index <= 0 || isClosed || busy}
        onClick={() => onNavigate(getPresenterCueNavigation(definition, session.currentCueId, 'previous'))}
        className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
      >← Trước</button>
      <span className="min-w-16 text-center text-sm font-black tabular-nums text-cyan-200">{index + 1}/{total}</span>
      <button
        type="button"
        disabled={isClosed || busy}
        onClick={onToggleStatus}
        className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
      >{session.status === 'running' ? 'Tạm dừng' : 'Chạy'}</button>
      <button
        type="button"
        disabled={index >= total - 1 || isClosed || busy}
        onClick={() => onNavigate(getPresenterCueNavigation(definition, session.currentCueId, 'next'))}
        className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
      >Sau →</button>
    </div>
  );
};
