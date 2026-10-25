import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_THINK_SECONDS, getLockedThinkWindow, getThinkWindowState, type ThinkWindowState } from '../../lib/liveLesson/thinkWindow';

/**
 * Thay bảng con bằng máy (quyết định thầy 2026-10-25): trong lúc "chờ hai nhịp",
 * nút gửi bị khoá và đồng thời hiện số giây còn lại để học sinh biết phải nghĩ chứ
 * không phải bấm. Hết giờ chờ thì tự mở.
 *
 * `roundKey` đổi mỗi khi GV chuyển câu hỏi; đổi khoá là bắt đầu lại đồng hồ chờ.
 *
 * `locked` = GV đã Công bố kết quả cho câu này ⇒ khoá hẳn, không cho sửa nữa
 * (dùng `getLockedThinkWindow`).
 *
 * Mốc thời gian tính bằng `Date.now()` chứ không đếm tick: pause/resume không reset
 * đồng hồ cũ, và hai máy học sinh cùng chờ đúng một khoảng như nhau.
 */
export function useThinkWindow({
  roundKey,
  thinkSeconds = DEFAULT_THINK_SECONDS,
  skip = false,
  running,
  locked = false,
}: {
  roundKey: string;
  thinkSeconds?: number;
  skip?: boolean;
  running: boolean;
  locked?: boolean;
}): ThinkWindowState {
  // Mốc bắt đầu lượt chờ, ghim theo roundKey — không đổi khi pause/resume.
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());
  const config = useMemo(() => ({ thinkSeconds, skip }), [thinkSeconds, skip]);

  // Chỉ đổi câu hỏi mới reset mốc. Pause/resume KHÔNG reset.
  useEffect(() => {
    setStartedAt(Date.now());
    setNow(Date.now());
  }, [roundKey]);

  useEffect(() => {
    // Đồng hồ chờ là thời gian SUY NGHĨ của chính học sinh cho câu đang hiện,
    // nên phải chạy bất kể GV đang tạm dừng hay phiên vừa mở. Trước đây gắn vào
    // `running` khiến phiên chưa chạy là ô khoá vĩnh viễn, HS không bấm được gì.
    void running;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [roundKey]);

  if (locked) return getLockedThinkWindow();
  const elapsed = (now - startedAt) / 1000;
  return getThinkWindowState(config, elapsed);
}

export function ThinkWindowBanner({ window: thinkState }: { window: ThinkWindowState }) {
  if (thinkState.phase === 'answering') return null;
  const thinking = thinkState.phase === 'thinking';
  return (
    <div
      role="status"
      aria-live="polite"
      className={thinking ? 'student-think-banner is-locked' : 'student-think-banner is-closed'}
    >
      {thinkState.label}
    </div>
  );
}
