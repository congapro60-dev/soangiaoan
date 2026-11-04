// Patch StudentLiveView — R1 thẻ nhiệm vụ mở rộng khi nhóm xong sớm
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentLiveView.tsx';
let t = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

// 1) import subscribe + logic
const impAnchor = "import { StudentGroupPicker } from './StudentGroupPicker';";
if (!t.includes(impAnchor)) throw new Error('import anchor missing');
t = t.replace(impAnchor, `import { StudentGroupPicker } from './StudentGroupPicker';
import { subscribeToLiveGroupProgress, type LiveGroupProgress } from '../../services/liveActivityService';
import { isGroupDone } from '../../lib/liveLesson/v4/grouping';`);

// 2) state + effect (sau assignedGroup state)
const stateAnchor = "  const [assignedGroup, setAssignedGroup] = useState<{ groupId: string; scaffold: string; startedAt: number } | null>(null);";
if (!t.includes(stateAnchor)) throw new Error('state anchor missing');
t = t.replace(stateAnchor, stateAnchor + `
  const [groupCounters, setGroupCounters] = useState<LiveGroupProgress | null>(null);

  // Nhóm xoay tua tự động (R1) — theo dõi tiến độ nhóm công khai của phiên.
  useEffect(() => {
    if (!sessionId) return;
    const unsubscribe = subscribeToLiveGroupProgress(sessionId, (value) => setGroupCounters(value), () => setGroupCounters(null));
    return () => unsubscribe();
  }, [sessionId]);`);

// 3) Derived — nhiệm vụ mở rộng khi nhóm xong sớm (đặt trước return chính, sau isGroupActivity)
const derivedAnchor = "  const isGroupActivity = publicState.cueId === 'P20' || publicState.cueId === 'P22' || step?.id === 'cp-group-product';";
if (!t.includes(derivedAnchor)) throw new Error('derived anchor missing');
t = t.replace(derivedAnchor, derivedAnchor + `
  // R1 — nhóm xong sớm (mọi thành viên đã gửi) → hiện nhiệm vụ mở rộng (câu VD đề trần, không nộp).
  const myGroupNumber = assignedGroup?.groupId.replace(/[^0-9]/g, '') ?? '';
  const groupDone = isGroupActivity && Boolean(myGroupNumber) && groupCounters !== null
    && groupCounters.cueId === publicState.cueId
    && isGroupDone({ members: groupCounters.members, submitted: groupCounters.submitted }, myGroupNumber);
  const deepExercise = useMemo(() => {
    const vd = [...(v4Contract.sourceContent?.exercises ?? [])].filter((item) => item.level === 'VD');
    return vd.length > 0 ? vd[vd.length - 1] : null;
  }, [v4Contract.sourceContent?.exercises]);`);

// 4) Render thẻ DEEP — ngay sau section nhóm đã phân công
const cardAnchor = `      <div className="student-slot" data-slot="assignment">
        {assignedGroup && <section className="student-group-card">
          <div><p className="activity-kicker">Nhóm đã phân công</p><h2>{assignedGroup.groupId}</h2><p>{assignedGroup.scaffold}</p><p className="student-group-note">Bắt đầu: {new Date(assignedGroup.startedAt).toLocaleTimeString()}</p></div>
        </section>}
      </div>`;
if (!t.includes(cardAnchor)) throw new Error('card anchor missing');
t = t.replace(cardAnchor, `      <div className="student-slot" data-slot="assignment">
        {assignedGroup && <section className="student-group-card">
          <div><p className="activity-kicker">Nhóm đã phân công</p><h2>{assignedGroup.groupId}</h2><p>{assignedGroup.scaffold}</p><p className="student-group-note">Bắt đầu: {new Date(assignedGroup.startedAt).toLocaleTimeString()}</p></div>
        </section>}
        {groupDone && deepExercise && <section className="student-task-card" style={{ borderColor: '#10b981', background: '#ecfdf5' }}>
          <p className="activity-kicker" style={{ color: '#047857' }}>Nhóm em xong sớm — nhận nhiệm vụ mở rộng</p>
          <LiveLessonRichText text={deepExercise.question} className="mt-2 text-sm font-semibold leading-6 text-emerald-950" />
          <p className="mt-2 text-xs font-semibold text-emerald-700">Thảo luận trong nhóm và ghi lời giải vào vở — phần này không nộp máy, thầy cô sẽ mời trình bày.</p>
        </section>}
      </div>`);

writeFileSync(p, t, 'utf8');
console.log('PATCHED StudentLiveView:', t.includes('Nhóm em xong sớm') && t.includes('isGroupDone'));
