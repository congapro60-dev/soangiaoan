import { useCallback, useEffect, useRef, useState } from 'react';
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

// Phím tắt kiểu phần mềm trình chiếu. Bỏ qua khi con trỏ đang ở ô nhập liệu để
// không cướp phím của giáo viên đang gõ.
export const getPresenterKeyAction = (
  key: string,
  targetTagName: string | undefined,
): 'previous' | 'next' | 'toggle' | 'fullscreen' | null => {
  const tag = (targetTagName ?? '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return null;
  if (key === 'ArrowRight' || key === 'PageDown') return 'next';
  if (key === 'ArrowLeft' || key === 'PageUp') return 'previous';
  if (key === ' ' || key === 'Spacebar') return 'toggle';
  if (key === 'f' || key === 'F') return 'fullscreen';
  return null;
};

const IDLE_HIDE_MS = 3500;

export interface TvPresenterControlsProps {
  definition: Pick<LiveLessonDefinition, 'cues'>;
  session: Pick<LiveLessonSession, 'currentCueId' | 'status'>;
  busy?: boolean;
  error?: string | null;
  onNavigate: (patch: { currentCueId: string; currentTvScreenId: string }) => void;
  onToggleStatus: () => void;
  showStats?: boolean;
  onToggleStats?: () => void;
}

export const TvPresenterControls = ({ definition, session, busy = false, error = null, onNavigate, onToggleStatus, showStats = false, onToggleStats }: TvPresenterControlsProps) => {
  const index = Math.max(0, definition.cues.findIndex((cue) => cue.id === session.currentCueId));
  const total = definition.cues.length;
  const isClosed = session.status === 'closed';
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  // Thanh điều khiển tự ẩn sau vài giây: cửa sổ này đang được chiếu lên TV nên
  // nút bấm không được nằm thường trực trước mặt học sinh.
  const wake = useCallback(() => {
    setVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), IDLE_HIDE_MS);
  }, []);

  const goPrevious = useCallback(() => {
    if (index <= 0 || isClosed || busy) return;
    const { currentCueId, currentTvScreenId } = getPresenterCueNavigation(definition, session.currentCueId, 'previous');
    onNavigate({ currentCueId, currentTvScreenId });
  }, [busy, definition, index, isClosed, onNavigate, session.currentCueId]);

  const goNext = useCallback(() => {
    if (index >= total - 1 || isClosed || busy) return;
    const { currentCueId, currentTvScreenId } = getPresenterCueNavigation(definition, session.currentCueId, 'next');
    onNavigate({ currentCueId, currentTvScreenId });
  }, [busy, definition, index, isClosed, onNavigate, session.currentCueId, total]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    wake();
    const onPointer = () => wake();
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || target?.closest('button, a, summary, [role="button"], [role="textbox"]')) return;
      const action = getPresenterKeyAction(event.key, (event.target as HTMLElement | null)?.tagName);
      if (!action) return;
      event.preventDefault();
      wake();
      if (action === 'next') goNext();
      else if (action === 'previous') goPrevious();
      else if (action === 'fullscreen') toggleFullscreen();
      else if (!isClosed && !busy) onToggleStatus();
    };
    window.addEventListener('mousemove', onPointer);
    window.addEventListener('touchstart', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onPointer);
      window.removeEventListener('touchstart', onPointer);
      window.removeEventListener('keydown', onKey);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [busy, goNext, goPrevious, isClosed, onToggleStatus, toggleFullscreen, wake]);

  return (
    <div className={visible || error ? 'tv-presenter-bar is-visible' : 'tv-presenter-bar'} onMouseEnter={wake} onFocusCapture={wake} role="navigation" aria-label="Điều khiển trình chiếu">
      {error && <span className="tv-presenter-error">{error}</span>}
      <button
        type="button"
        disabled={index <= 0 || isClosed || busy}
        onClick={goPrevious}
        className="tv-presenter-btn"
      >← Trước</button>
      <span className="tv-presenter-count">{index + 1}/{total}</span>
      <button
        type="button"
        disabled={isClosed || busy}
        onClick={onToggleStatus}
        className="tv-presenter-btn is-primary"
      >{session.status === 'running' ? 'Tạm dừng' : 'Chạy'}</button>
      <button
        type="button"
        disabled={index >= total - 1 || isClosed || busy}
        onClick={goNext}
        className="tv-presenter-btn"
      >Sau →</button>
      <button type="button" onClick={toggleFullscreen} className="tv-presenter-btn">Toàn màn hình</button>
      {onToggleStats && <button type="button" disabled={isClosed || busy} aria-pressed={showStats} onClick={onToggleStats} className="tv-presenter-btn">{showStats ? 'Ẩn kết quả' : 'Hiện kết quả lớp'}</button>}
      <span className="tv-presenter-hint">← → chuyển slide · Space chạy/dừng · F toàn màn hình</span>
    </div>
  );
};
