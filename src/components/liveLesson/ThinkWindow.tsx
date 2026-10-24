import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_THINK_SECONDS, getThinkWindowState, type ThinkWindowState } from '../../lib/liveLesson/thinkWindow';

/**
 * Thay bảng con bằng máy (quyết định thầy 2026-10-25): trong lúc "chờ hai nhịp",
 * nút gửi bị khoá và đồng thời hiện số giây còn lại để học sinh biết phải nghĩ chứ
 * không phải bấm. Hết giờ chờ thì tự mở.
 *
 * `roundKey` đổi mỗi khi GV chuyển câu hỏi; đổi khoá là bắt đầu lại đồng hồ chờ.
 */
export function useThinkWindow({
  roundKey,
  thinkSeconds = DEFAULT_THINK_SECONDS,
  skip = false,
  running,
}: {
  roundKey: string;
  thinkSeconds?: number;
  skip?: boolean;
  running: boolean;
}): ThinkWindowState {
  const [elapsed, setElapsed] = useState(0);
  const config = useMemo(() => ({ thinkSeconds, skip }), [thinkSeconds, skip]);

  useEffect(() => {
    setElapsed(0);
    if (!running) return undefined;
    const tick = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(tick);
  }, [roundKey, running]);

  return getThinkWindowState(config, elapsed);
}

export function ThinkWindowBanner({ window: thinkState }: { window: ThinkWindowState }) {
  if (thinkState.phase === 'answering') return null;
  const locked = thinkState.phase === 'thinking';
  return (
    <div
      role="status"
      aria-live="polite"
      className={locked ? 'student-think-banner is-locked' : 'student-think-banner is-closed'}
    >
      {thinkState.label}
    </div>
  );
}
