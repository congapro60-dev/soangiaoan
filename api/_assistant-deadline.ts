/** Deadline domain: no credentials, network calls or class-wide student payloads. */
import { awaitsClarification } from '../src/lib/classroom/clarification.js';
export interface DeadlineTaskConfig {
  id: string;
  header: string;
  state: 'draft' | 'published' | 'closed';
  optional: boolean;
  studentCodes: string[];
  assignmentId?: string;
}
export interface DeadlineConfig {
  spreadsheetId: string;
  sheetTitle: string;
  sheetId: number;
  studentNames: Record<string, string>;
  tasks: DeadlineTaskConfig[];
  notifications: boolean;
  digest: boolean;
}
export interface DeadlineItem {
  id: string;
  title: string;
  dueAt: string;
  url: string;
  status: 'missing' | 'review';
  note?: string;
  description?: string;
  assignmentId?: string;
}
export interface SheetTaskRow {
  id: string;
  title: string;
  studentCode: string;
  complete: boolean;
  dueAt: string;
  url: string;
}
export interface DeadlineCell {
  formattedValue?: string;
  hyperlink?: string;
  effectiveValue?: { boolValue?: boolean; stringValue?: string; numberValue?: number; errorValue?: unknown };
}
type Data = Record<string, any>;
const plain = (value: string) => value.normalize('NFC').trim().replace(/\s+/gu, ' ');
export const deadlineCommand = (message: string): boolean => /^(deadline|việc cần làm|viec can lam|mở bảng deadline|mo bang deadline)$/iu.test(plain(message));

export function safeTaskUrl(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 2000) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')
      || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)
      || url.hostname.endsWith('.local') || /\/spreadsheets\//i.test(url.pathname)
      || [...url.searchParams.keys()].some(key => /^(pin|password|secret|access_token|id_token|token)$/i.test(key))) return '';
    return url.href;
  } catch { return ''; }
}

/** Date-only deadlines mean the end of that Vietnam day; never let Date normalize invalid dates. */
export function dueTime(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  const s = raw.trim();
  const local = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/.exec(s);
  if (local || iso) {
    const m = (local || iso)!;
    const year = Number(local ? m[3] : m[1]), month = Number(m[2]), day = Number(local ? m[1] : m[3]);
    const hour = Number(m[4] ?? 23), minute = Number(m[5] ?? 59), second = Number(m[6] ?? (m[4] ? 0 : 59));
    const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (year < 2000 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day
      || hour > 23 || minute > 59 || second > 59) return '';
    return new Date(check.getTime() - 7 * 3600_000).toISOString();
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return '';
  // Validate the calendar part separately, including leap days.
  if (!dueTime(s.slice(0, 10))) return '';
  const at = Date.parse(s);
  return Number.isFinite(at) ? new Date(at).toISOString() : '';
}

const value = (cell: DeadlineCell | undefined) => plain(String(cell?.formattedValue ?? cell?.effectiveValue?.stringValue ?? ''));
const yes = (cell: DeadlineCell | undefined) => cell?.effectiveValue?.boolValue === true || value(cell).toUpperCase() === 'TRUE';
/** Fixed source layout is checked, not guessed. Names require an explicit teacher mapping from student codes. */
export function sheetTaskRows(config: DeadlineConfig, grid: DeadlineCell[][]): SheetTaskRow[] {
  if (grid.length > 210 || grid.some(row => row.length > 200)) throw new Error('Vùng deadline vượt giới hạn; cần chọn lại vùng đọc.');
  if (value(grid[1]?.[0]) !== 'Tên việc' || value(grid[8]?.[1]) !== 'Học sinh'
    || !/^Hạn chót/u.test(value(grid[2]?.[0])) || value(grid[5]?.[0]) !== 'Link') throw new Error('Bố cục deadline đã đổi; thầy cô cần kiểm tra lại.');
  const result: SheetTaskRow[] = [];
  const names = Object.values(config.studentNames).map(plain);
  if (new Set(names).size !== names.length) throw new Error('Ghép học sinh trùng tên; cần đối chiếu mã HS.');
  for (const [code, mappedName] of Object.entries(config.studentNames)) {
    const matches = grid.slice(9).filter(row => value(row[1]) === plain(mappedName));
    if (matches.length !== 1) throw new Error('Tên học sinh không khớp duy nhất hoặc trùng; thầy cô cần ghép lại mã HS.');
    for (const task of config.tasks) {
      const columns = (grid[1] || []).flatMap((cell, i) => i >= 2 && value(cell) === plain(task.header) ? [i] : []);
      if (columns.length !== 1) throw new Error('Tên việc không khớp duy nhất hoặc trùng; thầy cô cần ghép lại mã việc.');
      const col = columns[0], dueRaw = value(grid[2]?.[col]);
      if (grid[2]?.[col]?.effectiveValue?.errorValue || dueRaw && !dueTime(dueRaw)) throw new Error('Hạn chót chưa hợp lệ; chưa thể gửi nhắc việc.');
      const cell = matches[0][col];
      if (cell?.effectiveValue?.errorValue || !['TRUE', 'FALSE', ''].includes(value(cell).toUpperCase()) && cell?.effectiveValue?.boolValue === undefined) {
        throw new Error('Ô hoàn thành chưa hợp lệ; cần kiểm tra trước khi nhắc.');
      }
      const link = grid[5]?.[col];
      result.push({ id: task.id, title: plain(task.header), studentCode: code, complete: yes(cell), dueAt: dueTime(dueRaw), url: safeTaskUrl(link?.hyperlink || value(link)) });
    }
  }
  return result;
}

const applies = (assignment: Data, studentId: string) => assignment.isOpen !== false && assignment.submissionLocked !== true
  && !['draft', 'closed', 'cancelled'].includes(assignment.status)
  && (!Array.isArray(assignment.targetStudentIds) || !assignment.targetStudentIds.length || assignment.targetStudentIds.includes(studentId));
function submissionState(submissions: Data[], assignmentId: string): 'missing' | 'review' | 'done' {
  const accepted = submissions.filter(sub => sub.assignmentId === assignmentId && ['submitted', 'grading', 'graded', 'error', 'teacher_review', 'pending_review'].includes(sub.status));
  accepted.sort((a, b) => String(b.updatedAt || b.createdAt || b.submittedAt || '').localeCompare(String(a.updatedAt || a.createdAt || a.submittedAt || '')));
  const sub = accepted[0];
  if (!sub) return 'missing';
  const review = sub.grade?.photoReview;
  return awaitsClarification(sub.grade?.questionResults) || sub.grade?.awaitingClarification || review?.missingQuestionNumbers?.length || review?.unreadablePhotoNumbers?.length
    || ['possibly_wrong', 'uncertain'].includes(review?.assignmentMatch) ? 'review' : 'done';
}

/** Input assignments/submissions must already be scoped by the authenticated class/student loader. */
export function deadlineTasksForStudent(config: DeadlineConfig, studentCode: string, studentId: string, sheet: SheetTaskRow[], assignments: Data[], submissions: Data[]): DeadlineItem[] {
  const result = new Map<string, DeadlineItem>();
  const configured = new Set(config.tasks.flatMap(task => task.assignmentId ? [task.assignmentId] : []));
  for (const task of config.tasks) {
    if (task.state !== 'published' || task.optional && !task.studentCodes.includes(studentCode)
      || !task.optional && task.studentCodes.length && !task.studentCodes.includes(studentCode)) continue;
    const row = sheet.find(item => item.id === task.id && item.studentCode === studentCode);
    if (!row || row.complete && !task.assignmentId) continue;
    const assignment = task.assignmentId && assignments.find(item => item.id === task.assignmentId);
    if (task.assignmentId && (!assignment || !applies(assignment, studentId))) continue;
    let state = task.assignmentId ? submissionState(submissions, task.assignmentId) : 'missing';
    if (state === 'done') continue;
    const conflict = row.complete && state === 'missing';
    if (conflict) state = 'review';
    const id = task.assignmentId || `sheet:${task.id}`;
    result.set(id, { id, title: row.title, dueAt: row.dueAt, url: safeTaskUrl(row.url), status: state,
      ...(assignment ? { description: String(assignment.description || '').replace(/https?:\/\/\S+/gi, '[mở qua web]').slice(0, 2000) } : {}),
      ...(conflict ? { note: 'Bảng đã đánh dấu hoàn thành; web chưa ghi nhận bài nộp. Em nhờ thầy cô đối chiếu.' } : {}),
      ...(task.assignmentId ? { assignmentId: task.assignmentId } : {}) });
  }
  for (const assignment of assignments) {
    if (!applies(assignment, studentId) || configured.has(assignment.id)) continue;
    const state = submissionState(submissions, assignment.id);
    if (state !== 'done') result.set(assignment.id, { id: assignment.id, assignmentId: assignment.id, title: String(assignment.title || 'Bài tập'), dueAt: dueTime(assignment.dueAt), url: '', status: state,
      description: String(assignment.description || '').replace(/https?:\/\/\S+/gi, '[mở qua web]').slice(0, 2000) });
  }
  return [...result.values()].sort((a, b) => (a.dueAt || '9999').localeCompare(b.dueAt || '9999') || a.id.localeCompare(b.id));
}

export const vietnamDate = (now: number): string => new Date(now + 7 * 3600_000).toISOString().slice(0, 10);
export const digestWindow = (now: number): boolean => {
  const d = new Date(now + 7 * 3600_000);
  return d.getUTCHours() === 7; // A bounded catch-up window tolerates scheduler drift; outbox deduplicates by date.
};
export function digestText(tasks: DeadlineItem[], now: number, morning: boolean): string {
  const today = vietnamDate(now), last = vietnamDate(now + 3 * 86400_000);
  const selected = morning ? tasks.filter(task => task.status === 'review' || !task.dueAt || vietnamDate(Date.parse(task.dueAt)) <= last) : tasks;
  const lines = [morning ? `VIỆC CỦA EM HÔM NAY · ${today.split('-').reverse().join('/')}` : 'DEADLINE & VIỆC CẦN LÀM'];
  if (!selected.length) lines.push(morning ? 'Hôm nay em không có việc tồn đọng hoặc sắp đến hạn.' : 'Em không còn việc cần làm trong danh sách đã công bố.');
  let shown = 0;
  selected.forEach((task, i) => {
    const day = task.dueAt ? vietnamDate(Date.parse(task.dueAt)) : '';
    const label = task.status === 'review' ? 'cần kiểm tra/bổ sung' : !day ? 'chưa có hạn' : day < today ? 'quá hạn' : day === today ? 'hạn hôm nay' : 'sắp đến hạn';
    const at = task.dueAt ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short', hour12: false }).format(new Date(task.dueAt)) : '';
    const block = ['', `${i + 1}. ${String(task.title).replace(/[\r\n]+/g, ' ').slice(0, 300)}`, `${label}${at ? ` · ${at}` : ''}`, ...(task.note ? [task.note] : []), ...(!morning && task.description ? [task.description] : []), ...(!morning && safeTaskUrl(task.url) ? [`Thực hiện: ${safeTaskUrl(task.url)}`] : [])];
    if (morning && (shown !== i || [...lines, ...block].join('\n').length > 1550)) return;
    lines.push(...block); shown++;
  });
  if (shown < selected.length) lines.push('', `Còn ${selected.length - shown} việc khác trong danh sách.`);
  lines.push('', morning ? 'Nhắn web để xem toàn bộ và mở đúng hồ sơ.' : 'Nhắn deadline để xem toàn bộ. Nhắn web để mở đúng hồ sơ.');
  return lines.join('\n');
}

/** Read-only source; never accept its configuration from an HS message. */
export interface DeadlineSource {
  read(config: DeadlineConfig): Promise<DeadlineCell[][]>;
}
