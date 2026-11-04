import { useEffect, useState } from 'react';
import type { LiveLessonDefinition, LiveLessonSession } from '../../lib/liveLesson/types';
import { subscribeToLiveGroupMemberships, subscribeToLiveGroupProgress, type GroupMembership } from '../../services/liveActivityService';
import { isGroupSlow } from '../../lib/liveLesson/v4/grouping';
import { getBanToanV4ContractForLiveDefinitionId } from '../../lib/liveLesson/v4';
import { getG10P31V4Contract } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';
import { getTimerSnapshot } from './TeacherLiveView';

export interface SlowGroupInput {
  memberships: Array<{ participantUid: string; groupNumber: string }>;
  counters: { members: Record<string, number>; submitted: Record<string, number>; cueId: string } | null;
  currentCueId: string;
  beat: { startSeconds: number; endSeconds: number } | null;
  elapsedSeconds: number;
}

/** R2 thuần — số nhóm gửi chậm (quá 80% thời lượng chặng mà < 50% đã gửi). Kiểm được bằng máy. */
export const selectSlowGroups = (input: SlowGroupInput): string[] => {
  if (!input.beat || !input.counters || input.counters.cueId !== input.currentCueId) return [];
  const beatSeconds = input.beat.endSeconds - input.beat.startSeconds;
  const ratio = beatSeconds > 0 ? input.elapsedSeconds / beatSeconds : 0;
  const numbers = new Set([...input.memberships.map((m) => m.groupNumber), ...Object.keys(input.counters.members)]);
  return [...numbers]
    .filter((g) => isGroupSlow({ members: input.counters.members, submitted: input.counters.submitted }, g, ratio))
    .sort((a, b) => Number(a) - Number(b));
};

// R2 — nhãn "Nhóm chậm — chỉ giáo viên" trên màn điều khiển thật của GV (tv-control).
// TeacherLiveView không bao giờ render (mode=teacher được remap thành tv-control), nên
// cảnh báo chậm phải nằm ở đây mới tới được giáo viên. HS/TV không thấy gì.
export function TvSlowGroups({ sessionId, definition, session }: {
  sessionId: string;
  definition: LiveLessonDefinition;
  session: LiveLessonSession;
}) {
  const [memberships, setMemberships] = useState<Array<{ participantUid: string; groupNumber: string }>>([]);
  const [groupCounters, setGroupCounters] = useState<{ members: Record<string, number>; submitted: Record<string, number>; cueId: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToLiveGroupMemberships(sessionId, (rows) => setMemberships(rows), () => setMemberships([]));
  }, [sessionId]);
  // `public/groupProgress` chỉ đọc được khi bật "Hiện kết quả lớp"; subscribe lúc tắt
  // sẽ bị 403 và listener chết vĩnh viễn — gắn lại theo cờ publicStatsEnabled.
  useEffect(() => {
    if (!sessionId || !session.publicStatsEnabled) { setGroupCounters(null); return; }
    return subscribeToLiveGroupProgress(sessionId, (value) => setGroupCounters(value), () => setGroupCounters(null));
  }, [sessionId, session.publicStatsEnabled]);

  const beat = getBanToanV4ContractForLiveDefinitionId(definition.id)?.timeline.find((item) => item.id === session.currentCueId)
    ?? getG10P31V4Contract().timeline.find((item) => item.id === session.currentCueId) ?? null;
  const timer = getTimerSnapshot(definition, session.currentCueId, session.status);
  const slow = selectSlowGroups({
    memberships, counters: groupCounters, currentCueId: session.currentCueId, beat,
    elapsedSeconds: timer.elapsedSeconds,
  });
  if (slow.length === 0) return null;
  return <section className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800" role="status">
    Nhóm chậm — chỉ giáo viên: nhóm {slow.join(', ')} · nên gửi gợi ý dắt tay
  </section>;
}
