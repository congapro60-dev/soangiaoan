import { awaitsClarification } from './clarification.js';

type Data = Record<string, any>;
export interface HomeworkGroup { id: string; leaderStudentId: string; memberStudentIds: string[] }
export type HomeworkReceiptStatus = 'missing' | 'received' | 'review' | 'in_progress' | 'not_assigned';
export interface HomeworkReceipt { assignmentId: string; status: HomeworkReceiptStatus; submittedAt?: string; firstSubmittedAt?: string }
export interface GroupHomeworkView {
  updatedAt: string;
  assignments: { id: string; title: string; dueAt: string; open: boolean }[];
  students: { id: string; name: string; groupId: string; work: HomeworkReceipt[] }[];
}
export const HOMEWORK_RECEIPT_LABELS: Record<HomeworkReceiptStatus, string> = {
  missing: 'Chưa nộp', received: 'Đã nhận bài', review: 'Cần kiểm tra/bổ sung', in_progress: 'Đang làm dở', not_assigned: 'Không được giao',
};
const validId = (s: unknown): s is string => typeof s === 'string' && /^[\p{L}\p{N}_-]{1,200}$/u.test(s);
export function validateHomeworkGroups(raw: unknown, students: { id: string }[]): HomeworkGroup[] {
  if (!Array.isArray(raw) || raw.length > 20) throw new Error('Danh sách tổ chưa hợp lệ.');
  const roster = new Set(students.map(s => s.id)), ids = new Set<string>(), members = new Set<string>();
  return raw.map(g => {
    if (!g || !validId(g.id) || ids.has(g.id) || !validId(g.leaderStudentId) || !Array.isArray(g.memberStudentIds)
      || !g.memberStudentIds.length || !g.memberStudentIds.includes(g.leaderStudentId)
      || g.memberStudentIds.some((id: unknown) => !validId(id) || !roster.has(id) || members.has(id))
      || new Set(g.memberStudentIds).size !== g.memberStudentIds.length) throw new Error('Danh sách tổ hoặc tổ trưởng không khớp lớp.');
    ids.add(g.id); g.memberStudentIds.forEach((id: string) => members.add(id));
    return { id: g.id, leaderStudentId: g.leaderStudentId, memberStudentIds: [...g.memberStudentIds] };
  });
}
const date = (raw: unknown): string => {
  const value = raw && typeof (raw as any).toDate === 'function' ? (raw as any).toDate() : raw;
  const ms = typeof value === 'string' || typeof value === 'number' || value instanceof Date ? new Date(value).getTime() : NaN;
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
};
const review = (s: Data): boolean => s.errorReason === 'photo' || s.errorReason === 'exam_code' || s.grade?.awaitingClarification === true
  || awaitsClarification(s.grade?.questionResults) || !!s.grade?.photoReview?.missingQuestionNumbers?.length
  || !!s.grade?.photoReview?.unreadablePhotoNumbers?.length || ['possibly_wrong', 'uncertain'].includes(s.grade?.photoReview?.assignmentMatch);
/** Source rows must be scoped by the server. Only explicit receipt fields leave this projection. */
export function buildGroupHomework(input: {
  classId: string; teacherId: string; students: Data[]; groups: HomeworkGroup[]; assignments: Data[]; submissions: Data[]; online: Data[]; now: number;
}): GroupHomeworkView {
  const assignments = input.assignments.filter(a => a.classId === input.classId && a.teacherId === input.teacherId && !a.periodicTest
    && !['draft', 'cancelled'].includes(a.status) && ['upload', 'exam', 'adaptive', undefined].includes(a.type))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')) || a.id.localeCompare(b.id));
  const attempts = new Map<string, Data[]>(), drafts = new Set<string>();
  for (const [rows, online] of [[input.submissions, false], [input.online, true]] as const) for (const s of rows) {
    if (s.classId !== input.classId || (online ? s.teacherId && s.teacherId !== input.teacherId : s.teacherId !== input.teacherId)) continue;
    const a = assignments.find(a => a.id === s.assignmentId && (a.type === 'exam') === online);
    if (!a) continue;
    const key = `${s.studentId}:${a.id}`;
    if ((online || a.type === 'adaptive') && s.status === 'in_progress') { drafts.add(key); continue; }
    if (!['submitted', 'grading', 'graded', 'error', 'teacher_review', 'pending_review', 'pending_teacher'].includes(s.status)) continue;
    const at = date(online ? s.submittedAt : s.createdAt);
    if (!at) continue;
    const list = attempts.get(key) || []; list.push({ ...s, at }); attempts.set(key, list);
  }
  return { updatedAt: new Date(input.now).toISOString(), assignments: assignments.map(a => ({ id: a.id, title: String(a.title || 'Bài tập').slice(0, 500), dueAt: date(a.dueAt), open: a.isOpen !== false && !a.submissionLocked })),
    students: input.groups.flatMap(g => g.memberStudentIds.flatMap(id => {
      const student = input.students.find(s => s.id === id); if (!student) return [];
      return [{ id, name: String(student.name || '').slice(0, 150), groupId: g.id, work: assignments.map((a): HomeworkReceipt => {
        if (Array.isArray(a.targetStudentIds) && a.targetStudentIds.length && !a.targetStudentIds.includes(id)) return { assignmentId: a.id, status: 'not_assigned' };
        const key = `${id}:${a.id}`, list = (attempts.get(key) || []).sort((a, b) => a.at.localeCompare(b.at) || String(a.id).localeCompare(String(b.id)));
        if (!list.length) return { assignmentId: a.id, status: drafts.has(key) ? 'in_progress' : 'missing' };
        const latest = list[list.length - 1];
        return { assignmentId: a.id, status: review(latest) ? 'review' : 'received', submittedAt: latest.at, ...(a.type === 'adaptive' ? {} : { firstSubmittedAt: list[0].at }) };
      }) }];
    })) };
}
