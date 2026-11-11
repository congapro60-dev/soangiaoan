import type { Firestore, Query } from 'firebase-admin/firestore';
import { buildGroupHomework, validateHomeworkGroups, type GroupHomeworkView } from '../src/lib/classroom/groupHomework.js';
import { deadlineOwner } from './_assistant-deadline-config.js';

type Data = Record<string, any>;
async function records(query: Query, max: number): Promise<(Data & { id: string })[]> {
  const snap = await query.limit(max + 1).get();
  if (snap.size > max) throw new Error('Danh sách BTVN vượt giới hạn; chưa thể xác minh đầy đủ.');
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}
export async function homeworkGroupsContext(db: Firestore, classId: string) {
  const [cls, config] = await Promise.all([db.collection('classes').doc(classId).get(), db.collection('classHomeworkGroups').doc(classId).get()]);
  const teacherId = deadlineOwner(cls.data() || {}), data = config.data();
  if (!teacherId || data?.active !== true || data.teacherId !== teacherId) return null;
  const students = await records(db.collection('classes').doc(classId).collection('students'), 100);
  const groups = validateHomeworkGroups(data.groups, students);
  return { classId, teacherId, students, groups };
}
export async function loadGroupHomework(db: Firestore, context: NonNullable<Awaited<ReturnType<typeof homeworkGroupsContext>>>, leaderStudentId?: string): Promise<GroupHomeworkView | null> {
  const groups = leaderStudentId ? context.groups.filter(g => g.leaderStudentId === leaderStudentId) : context.groups;
  if (!groups.length) return null;
  const [assignments, submissions, online, adaptive, progress] = await Promise.all([
    records(db.collection('assignments').where('classId', '==', context.classId), 200),
    records(db.collection('submissions').where('classId', '==', context.classId), 3000),
    records(db.collection('examSubmissions').where('classId', '==', context.classId), 3000),
    records(db.collection('adaptiveAssignments').where('classId', '==', context.classId), 100),
    records(db.collection('adaptiveAssignmentProgress').where('classId', '==', context.classId), 3000),
  ]);
  const members = new Set(groups.flatMap(g => g.memberStudentIds));
  const allAssignments: Data[] = [...assignments, ...adaptive.map(a => ({ ...a, id: `adaptive:${a.id}`, type: 'adaptive' }))];
  const adaptiveWork = progress.map(p => ({ ...p, assignmentId: `adaptive:${p.assignmentId}`, status: p.attempts?.exitTicket ? 'submitted' : 'in_progress', createdAt: p.completedAt }));
  return buildGroupHomework({ ...context, groups, assignments: allAssignments.filter(a => !Array.isArray(a.targetStudentIds) || !a.targetStudentIds.length || a.targetStudentIds.some((id: string) => members.has(id))),
    submissions: [...submissions, ...adaptiveWork], online, now: Date.now() });
}
/** Caller supplies an already authenticated student context; requested IDs never grant authority. */
export async function studentGroupHomework(db: Firestore, actor: { classId: string; studentId: string; teacherId: string }) {
  const context = await homeworkGroupsContext(db, actor.classId);
  if (!context || context.teacherId !== actor.teacherId || !context.students.some(s => s.id === actor.studentId)) return null;
  return loadGroupHomework(db, context, actor.studentId);
}
export function groupHomeworkSummary(view: GroupHomeworkView): string {
  const lines = [`THEO DÕI TỔ ${[...new Set(view.students.map(s => s.groupId))].join(', ')}`, 'Đã nhận bài không đồng nghĩa đã kiểm đủ vở.', ''];
  for (const a of view.assignments.filter(a => a.open).slice(0, 8)) {
    const work = view.students.map(s => s.work.find(w => w.assignmentId === a.id)).filter(w => w && w.status !== 'not_assigned');
    if (!work.length) continue;
    lines.push(`${a.title.slice(0, 120)}: ${work.filter(w => w?.status === 'received').length}/${work.length} đã nhận; ${work.filter(w => ['missing', 'in_progress'].includes(w!.status)).length} chưa nộp; ${work.filter(w => w?.status === 'review').length} cần bổ sung.`);
  }
  lines.push('', 'Nhắn "web" vào ô chat, mở mục "Theo dõi tổ" để xem danh sách và làm mới.');
  return lines.join('\n');
}
