import { useEffect, useState } from 'react';
import type { LiveResponse } from '../../lib/liveLesson/types';
import { subscribeToTeacherResponses } from '../../services/liveLessonService';
import { publishLiveActivity, subscribeToLiveGroupMemberships, type GroupMembership } from '../../services/liveActivityService';
import { LiveLessonStatus } from './LiveLessonStatus';

// Mounted only inside the authenticated owner branch, never inside public TV.
export function LiveActivityPublisher({ sessionId, cueId, stepId, enabled }: { sessionId: string; cueId: string; stepId: string; enabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let responses: LiveResponse[] | null = null;
    let memberships: GroupMembership[] | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let writing = false;
    let dirty = false;
    const report = (err: Error) => { if (active) setError(err.message); };
    const write = async () => {
      if (!active || responses === null) return;
      if (writing) { dirty = true; return; }
      writing = true;
      dirty = false;
      try {
        await publishLiveActivity(sessionId, cueId, stepId, responses, stepId === 'cp-group-product' ? memberships : null);
        if (active) setError(null);
      } catch (err) { report(err instanceof Error ? err : new Error('Không thể công bố thống kê.')); }
      finally { writing = false; if (active && dirty) schedule(); }
    };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => { void write(); }, 200); };
    setError(null);
    const stopResponses = subscribeToTeacherResponses(sessionId, stepId, rows => { responses = rows; schedule(); }, report);
    const stopGroups = stepId === 'cp-group-product'
      ? subscribeToLiveGroupMemberships(sessionId, rows => { memberships = rows; schedule(); }, report) : () => {};
    const retry = () => schedule();
    window.addEventListener('online', retry);
    return () => { active = false; clearTimeout(timer); stopResponses(); stopGroups(); window.removeEventListener('online', retry); };
  }, [sessionId, cueId, stepId, enabled]);
  return enabled && error ? <LiveLessonStatus tone="error">Chưa công bố được thống kê TV: {error}</LiveLessonStatus> : null;
}
