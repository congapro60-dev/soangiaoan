// Patch TeacherLiveView — R2 nhãn nhóm chậm (chỉ GV)
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/TeacherLiveView.tsx';
let t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const impAnchor = "import { GroupingApprovalPanel, type ApprovalResult } from './GroupingApprovalPanel';";
if (!t.includes(impAnchor)) throw new Error('import anchor missing');
t = t.replace(impAnchor, `import { GroupingApprovalPanel, type ApprovalResult } from './GroupingApprovalPanel';
import { subscribeToLiveGroupMemberships, subscribeToLiveGroupProgress } from '../../services/liveActivityService';
import { isGroupSlow } from '../../lib/liveLesson/v4/grouping';`);

const stateAnchor = "  const responseStepId = cue.responseStepId;";
if (!t.includes(stateAnchor)) throw new Error('state anchor missing');
t = t.replace(stateAnchor, stateAnchor + `
  // Nhóm xoay tua tự động (R2) — theo dõi tiến độ nhóm, chỉ hiển thị cảnh báo chậm cho GV.
  const [groupMemberships, setGroupMemberships] = useState<Array<{ participantUid: string; groupNumber: string }>>([]);
  const [groupCounters, setGroupCounters] = useState<{ members: Record<string, number>; submitted: Record<string, number>; cueId: string } | null>(null);
  useEffect(() => {
    if (!session.id) return;
    const unsub1 = subscribeToLiveGroupMemberships(session.id, (rows) => setGroupMemberships(rows), () => setGroupMemberships([]));
    const unsub2 = subscribeToLiveGroupProgress(session.id, (value) => setGroupCounters(value), () => setGroupCounters(null));
    return () => { unsub1(); unsub2(); };
  }, [session.id]);`);

const timerAnchor = "  const timer = getTimerSnapshot(definition, session.currentCueId, session.status);";
if (!t.includes(timerAnchor)) throw new Error('timer anchor missing');
t = t.replace(timerAnchor, timerAnchor + `
  const slowGroups = (() => {
    const beat = v4Contract.timeline.find((item) => item.id === session.currentCueId);
    if (!beat || !groupCounters || groupCounters.cueId !== session.currentCueId) return [];
    const ratio = beat.durationSeconds > 0 ? timer.elapsedSeconds / beat.durationSeconds : 0;
    const numbers = new Set([...groupMemberships.map((m) => m.groupNumber), ...Object.keys(groupCounters.members)]);
    return [...numbers].filter((g) => isGroupSlow({ members: groupCounters.members, submitted: groupCounters.submitted }, g, ratio)).sort((a, b) => Number(a) - Number(b));
  })();`);

const renderAnchor = "HS chọn số nhóm trên máy rồi mỗi em gửi phần giải thích của mình; TV hiển thị tiến độ theo nhóm đã chọn.</p>}</section>}";
if (!t.includes(renderAnchor)) throw new Error('render anchor missing');
t = t.replace(renderAnchor, renderAnchor + `
    {responseStepId === 'cp-group-product' && slowGroups.length > 0 && !isClosed && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label="Nhóm chậm — chỉ giáo viên"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Chỉ giáo viên · Nhóm chậm</p><p className="mt-1 text-sm font-semibold text-amber-900">Nhóm {slowGroups.join(', ')} gửi chậm hơn nửa nhóm — nên gửi gợi ý dắt tay hoặc ghép qua hỗ trợ.</p></section>}`);

writeFileSync(p, t, 'utf8');
console.log('PATCHED TeacherLiveView:', t.includes('Nhóm chậm') && t.includes('isGroupSlow'));
