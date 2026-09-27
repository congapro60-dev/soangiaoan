/**
 * Đồng bộ BTVN sang Google Sheet — phần TÍNH TOÁN thuần, không gọi mạng.
 *
 * Mọi quyết định "ghi gì vào ô nào" nằm ở đây để test được mà không cần Google. Lớp gọi mạng
 * (`sheetsApi.ts`) chỉ đọc ảnh chụp tab và gửi đi những lệnh mà file này đã kiểm.
 *
 * Khuôn sheet là khuôn giáo viên đang dùng thật (file 11 Columbus và file theo dõi 3 lớp): dòng 3
 * Môn, 4 Nội dung, 5 Hạn kiểm tra, 6 Link, 7 Tính lỗi?, 8–10 ô đếm, 11 tiêu đề, học sinh từ dòng 12
 * ở cột B, trạng thái từ cột C.
 */

/** Đúng từng ký tự, kể cả biểu tượng: công thức đếm và công thức Hạnh kiểm so chuỗi y hệt. */
export const SHEET_STATUS = {
  du: '✅ Đủ',
  muon: '⏰ Nộp muộn',
  thieu: '⚠️ Thiếu',
  chuaLam: '❌ Chưa làm',
  khongApDung: '➖ Không áp dụng',
} as const;

export const SHEET_LAYOUT = {
  subjectRow: 3,
  contentRow: 4,
  deadlineRow: 5,
  linkRow: 6,
  countRow: 8,
  firstStudentRow: 12,
  firstColumn: 3,
} as const;

/** Tham số trên link bài của app; dòng 6 chứa tham số này là cột của bài đó. */
export const LINK_PARAM = 'baiGiao';
export const APP_NOTE_PREFIX = 'SmartPlan: ';

export interface SheetCell {
  value: string | number | boolean | null;
  formula?: string;
  note?: string;
}

export interface SheetColumnHeader {
  column: number;
  subject?: SheetCell;
  content?: SheetCell;
  deadline?: SheetCell;
  link?: SheetCell;
}

/** Ảnh chụp một tab — đủ để lập kế hoạch mà không cần gọi mạng thêm lần nào. */
export interface SheetSnapshot {
  sheetId: number;
  sheetTitle: string;
  timeZone: string;
  /** Cột A từ dòng 1 tới dòng 11, phần tử 0 là dòng 1. */
  labels: SheetCell[];
  students: Array<{ row: number; name: string }>;
  headers: SheetColumnHeader[];
  /** Ô trạng thái, khoá `${row}:${column}`. */
  statusCells: Record<string, SheetCell>;
  /** Danh sách chọn của ô trạng thái. */
  statusOptions: string[];
  /** Cột cuối cùng giáo viên đã định dạng sẵn (có danh sách chọn ở dòng học sinh đầu tiên). */
  lastColumn: number;
  /** Công thức đếm ở dòng 8, theo cột. */
  countFormulas: Record<number, string>;
}

export interface SyncAssignment {
  id: string;
  title: string;
  dueAt?: string;
  targetStudentIds?: string[];
}

export interface SyncSubmission {
  studentId: string;
  assignmentId: string | null;
  createdAt: string;
}

export interface SyncRosterStudent {
  studentId: string;
  name: string;
}

// ── Chữ ─────────────────────────────────────────────────────────────────────

const stripMarks = (value: unknown): string => String(value ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase();

/** Bỏ dấu, bỏ biểu tượng, gộp khoảng trắng — chỉ để SO nhãn, không bao giờ để ghi. */
const plain = (value: unknown): string => stripMarks(value).replace(/[^\p{L}\p{N}?]+/gu, ' ').trim();

export const normalizePersonName = (name: unknown): string => stripMarks(name).replace(/\s+/g, ' ').trim();

const cellText = (cell?: SheetCell): string => String(cell?.value ?? '').trim();

const isBlank = (cell?: SheetCell): boolean => !cell || (cellText(cell) === '' && !cell.formula);

const columnLetter = (column: number): string => {
  let n = column;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

export const cellAddress = (row: number, column: number): string => `${columnLetter(column)}${row}`;

// ── Nhận diện khuôn ─────────────────────────────────────────────────────────

const EXPECTED_LABELS: Array<{ row: number; label: string; test: (value: string) => boolean }> = [
  { row: 3, label: 'Môn', test: value => value === 'mon' },
  { row: 4, label: 'Nội dung', test: value => value.startsWith('noi dung') },
  { row: 5, label: 'Hạn kiểm tra', test: value => value.startsWith('han kiem tra') },
  { row: 6, label: 'Link', test: value => value === 'link' },
  { row: 7, label: 'Tính lỗi?', test: value => value.startsWith('tinh loi') },
  { row: 8, label: 'Đủ', test: value => /\bdu\b/.test(value) },
  { row: 9, label: 'Thiếu', test: value => /\bthieu\b/.test(value) },
  { row: 10, label: 'Chưa làm', test: value => /\bchua lam\b/.test(value) },
  { row: 11, label: 'Tổ hoặc STT', test: value => value === 'to' || value === 'stt' },
];

export type SheetLayoutProblem =
  | { kind: 'mirror' }
  | { kind: 'layout'; row: number; expected: string; found: string }
  | { kind: 'no-students' }
  | { kind: 'no-status-list' };

/**
 * Tab có đúng khuôn BTVN không. Sai khuôn thì KHÔNG đồng bộ — ghi bừa vào một sheet khác khuôn là
 * ghi đè lên dữ liệu của người khác theo cách không ai lường trước.
 */
export const checkSheetLayout = (snapshot: SheetSnapshot): SheetLayoutProblem | null => {
  // Tab chiếu lại từ file khác (IMPORTRANGE): ghi vào là vỡ công thức, phải nối file gốc.
  if (snapshot.labels.some(cell => /IMPORTRANGE/i.test(cell?.formula ?? ''))) return { kind: 'mirror' };
  for (const expected of EXPECTED_LABELS) {
    const found = cellText(snapshot.labels[expected.row - 1]);
    if (!expected.test(plain(found))) return { kind: 'layout', row: expected.row, expected: expected.label, found };
  }
  if (snapshot.students.length === 0) return { kind: 'no-students' };
  if (!snapshot.statusOptions.includes(SHEET_STATUS.du) || !snapshot.statusOptions.includes(SHEET_STATUS.chuaLam)) {
    return { kind: 'no-status-list' };
  }
  return null;
};

export const describeLayoutProblem = (problem: SheetLayoutProblem): string => {
  switch (problem.kind) {
    case 'mirror':
      return 'Tab này là bản chiếu lại từ file khác (IMPORTRANGE). Ghi vào sẽ làm hỏng công thức — hãy nối file gốc.';
    case 'layout':
      return `Tab chưa đúng khuôn BTVN: ô A${problem.row} cần là "${problem.expected}" nhưng đang là "${problem.found || '(trống)'}".`;
    case 'no-students':
      return 'Không thấy tên học sinh nào ở cột B từ dòng 12 trở xuống.';
    case 'no-status-list':
      return `Ô trạng thái chưa có danh sách chọn gồm "${SHEET_STATUS.du}" và "${SHEET_STATUS.chuaLam}".`;
  }
};

// ── Khớp học sinh ───────────────────────────────────────────────────────────

export interface StudentMatch {
  rowByStudentId: Map<string, number>;
  /** Có trong app mà không tìm thấy trên sheet. */
  rosterWithoutRow: string[];
  /** Có trên sheet mà không có trong app. */
  rowsWithoutStudent: string[];
  /** Trùng tên — không đoán, bỏ qua và báo. */
  ambiguous: string[];
}

export const matchStudents = (
  roster: readonly SyncRosterStudent[],
  rows: readonly { row: number; name: string }[],
): StudentMatch => {
  const rosterByKey = new Map<string, SyncRosterStudent[]>();
  for (const student of roster) {
    const key = normalizePersonName(student.name);
    if (!key) continue;
    rosterByKey.set(key, [...(rosterByKey.get(key) ?? []), student]);
  }
  const rowsByKey = new Map<string, Array<{ row: number; name: string }>>();
  for (const row of rows) {
    const key = normalizePersonName(row.name);
    if (!key) continue;
    rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row]);
  }

  const result: StudentMatch = { rowByStudentId: new Map(), rosterWithoutRow: [], rowsWithoutStudent: [], ambiguous: [] };
  for (const [key, students] of rosterByKey) {
    const sheetRows = rowsByKey.get(key) ?? [];
    if (students.length > 1 || sheetRows.length > 1) {
      result.ambiguous.push(students[0].name);
    } else if (sheetRows.length === 1) {
      result.rowByStudentId.set(students[0].studentId, sheetRows[0].row);
    } else {
      result.rosterWithoutRow.push(students[0].name);
    }
  }
  for (const [key, sheetRows] of rowsByKey) {
    if (!rosterByKey.has(key)) result.rowsWithoutStudent.push(...sheetRows.map(row => row.name));
  }
  return result;
};

// ── Link bài ────────────────────────────────────────────────────────────────

export const assignmentLink = (origin: string, assignmentId: string): string =>
  `${origin.replace(/\/+$/, '')}/?${LINK_PARAM}=${encodeURIComponent(assignmentId)}`;

export const assignmentIdFromCell = (cell?: SheetCell): string | null => {
  const text = `${cell?.formula ?? ''} ${cellText(cell)}`;
  const match = new RegExp(`[?&#]${LINK_PARAM}=([A-Za-z0-9_%-]{1,200})`).exec(text);
  return match ? decodeURIComponent(match[1]) : null;
};

// ── Giờ giấc ────────────────────────────────────────────────────────────────

/** Độ lệch múi giờ của sheet tại một thời điểm (Việt Nam không có giờ mùa hè nhưng giáo viên khác thì có). */
export const timeZoneOffsetMs = (utcMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string): number => Number(parts.find(part => part.type === type)?.value ?? 0);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - utcMs;
};

/** Giờ đồng hồ treo tường của sheet → mốc UTC thật. */
const wallClockToUtcMs = (wallMs: number, timeZone: string): number => {
  const firstGuess = wallMs - timeZoneOffsetMs(wallMs, timeZone);
  return wallMs - timeZoneOffsetMs(firstGuess, timeZone);
};

const SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

/**
 * Hạn ở dòng 5 → mốc UTC. Sheet lưu ngày dạng số (công thức `=DATE(..)+TIME(..)`), nhưng giáo viên
 * cũng có thể gõ chữ "07/09/2026 08:00". Gõ thiếu giờ thì lấy 23:59 — lấy muộn là để không ghi
 * "Chưa làm" oan cho em trước khi hết ngày.
 */
export const sheetDeadlineMs = (cell: SheetCell | undefined, timeZone: string): number | null => {
  if (!cell) return null;
  if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
    const wallMs = Math.round((SERIAL_EPOCH_MS + cell.value * 86_400_000) / 60_000) * 60_000;
    return wallClockToUtcMs(wallMs, timeZone);
  }
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/.exec(cellText(cell));
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const wallMs = Date.UTC(Number(year), Number(month) - 1, Number(day), hour ? Number(hour) : 23, minute ? Number(minute) : 59);
  return wallClockToUtcMs(wallMs, timeZone);
};

/**
 * Hạn của bài trong app → SỐ ngày kiểu Sheets (serial), KHÔNG phải công thức.
 *
 * Trước đây ghi `=DATE(2026,9,16)+TIME(8,0,0)` dùng dấu PHẨY, nhưng file đặt ngôn ngữ Việt lại đòi
 * dấu CHẤM PHẨY nên công thức báo #ERROR!, app đọc lại ra "không có hạn" → không tính được muộn/chưa
 * nộp. Số ngày không phụ thuộc dấu phân cách nên chạy đúng ở mọi ngôn ngữ; khi ghi kèm định dạng ngày
 * (buildSheetRequests) thì ô vẫn hiển thị ra ngày giờ như thường.
 */
export const deadlineSerial = (iso: string | undefined, timeZone: string): number | null => {
  const utcMs = Date.parse(String(iso ?? ''));
  if (!Number.isFinite(utcMs)) return null;
  const wallMs = utcMs + timeZoneOffsetMs(utcMs, timeZone);
  return (wallMs - SERIAL_EPOCH_MS) / 86_400_000;
};

// ── Trạng thái và quy tắc ghi ───────────────────────────────────────────────

export const desiredStatus = (input: {
  submittedAtMs: number | null;
  deadlineMs: number | null;
  nowMs: number;
  /** Bài giao cho nhóm mà em không thuộc nhóm. */
  notAssigned: boolean;
  options: readonly string[];
}): string | null => {
  if (input.notAssigned) {
    return input.options.includes(SHEET_STATUS.khongApDung) ? SHEET_STATUS.khongApDung : null;
  }
  if (input.submittedAtMs !== null) {
    const late = input.deadlineMs !== null && input.submittedAtMs > input.deadlineMs;
    return late && input.options.includes(SHEET_STATUS.muon) ? SHEET_STATUS.muon : SHEET_STATUS.du;
  }
  // Chưa qua giờ kiểm thì chưa nộp là chuyện bình thường. Ghi sớm là em bị trừ hạnh kiểm từ tối
  // hôm trước, trong khi sáng hôm sau em mang vở tới và tổ trưởng kiểm là đủ.
  if (input.deadlineMs !== null && input.nowMs > input.deadlineMs) return SHEET_STATUS.chuaLam;
  return null;
};

/** Giá trị app đã ghi vào ô, đọc từ ghi chú; ô không có ghi chú SmartPlan thì null. */
export const appNoteValue = (note?: string): string | null => {
  if (!note || !note.startsWith(APP_NOTE_PREFIX)) return null;
  return note.slice(APP_NOTE_PREFIX.length).split(' · ')[0].trim() || null;
};

export const buildAppNote = (value: string, nowMs: number, timeZone: string): string => {
  const when = new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(nowMs));
  return `${APP_NOTE_PREFIX}${value} · ${when}`;
};

export type CellDecision = { action: 'write' } | { action: 'keep'; reason: 'human' | 'same' | 'nothing' };

/**
 * NGƯỜI SỬA LUÔN THẮNG. App chỉ được ghi ô còn trống, hoặc ô mà chính app ghi và chưa ai động.
 *
 * Ghi chú SmartPlan là trí nhớ của app: nó nói app đã ghi giá trị gì. Ô có giá trị khác ghi chú
 * nghĩa là tổ trưởng đã sửa; ô trống mà vẫn còn ghi chú nghĩa là có người đã xoá — cả hai đều
 * không bao giờ bị ghi đè. Ghi chú đi theo ô khi chèn hay kéo cột, nên không lệch như lưu toạ độ.
 */
export const decideStatusCell = (cell: SheetCell | undefined, desired: string | null): CellDecision => {
  if (desired === null) return { action: 'keep', reason: 'nothing' };
  const current = cellText(cell);
  const written = appNoteValue(cell?.note);
  if (current === '') return written === null ? { action: 'write' } : { action: 'keep', reason: 'human' };
  if (written === null || written !== current) return { action: 'keep', reason: 'human' };
  return current === desired ? { action: 'keep', reason: 'same' } : { action: 'write' };
};

// ── Lập kế hoạch ────────────────────────────────────────────────────────────

export type SheetWrite =
  | { kind: 'status'; row: number; column: number; value: string; note: string }
  | { kind: 'content'; row: number; column: number; value: string }
  | { kind: 'deadline'; row: number; column: number; serial: number }
  | { kind: 'link'; row: number; column: number; value: string }
  | { kind: 'countFormula'; row: number; column: number; formula: string };

export interface PlannedColumn {
  assignmentId: string;
  title: string;
  column: number;
  source: 'linked' | 'attached' | 'created';
}

export interface SheetSyncPlan {
  columns: PlannedColumn[];
  skipped: Array<{ assignmentId: string; title: string; reason: string }>;
  writes: SheetWrite[];
  /** Danh sách chọn mới khi tab còn thiếu "Nộp muộn" và giáo viên đồng ý bổ sung. */
  upgradedStatusOptions: string[] | null;
  counts: { attached: number; created: number; statusWrites: number; keptHuman: number; deadlineWrites: number };
  students: StudentMatch;
}

/** Thêm "Nộp muộn" vào công thức đếm "Số HS đủ", y hệt file 11 Columbus. Công thức lạ thì không động. */
export const upgradeCountFormula = (formula: string): string | null => {
  if (!formula || formula.includes('Nộp muộn')) return null;
  const pattern = /COUNTIF\(([^,()]+),"✅ Đủ"\)/;
  if (!pattern.test(formula)) return null;
  return formula.replace(pattern, `COUNTIF($1,"${SHEET_STATUS.du}")+COUNTIF($1,"${SHEET_STATUS.muon}")`);
};

export const upgradedOptions = (options: readonly string[]): string[] | null => {
  if (options.includes(SHEET_STATUS.muon)) return null;
  const next = [...options];
  const afterDu = next.indexOf(SHEET_STATUS.du);
  next.splice(afterDu >= 0 ? afterDu + 1 : next.length, 0, SHEET_STATUS.muon);
  return next;
};

const isFreeColumn = (header: SheetColumnHeader, snapshot: SheetSnapshot): boolean =>
  isBlank(header.subject) && isBlank(header.content) && isBlank(header.deadline) && isBlank(header.link)
  && snapshot.students.every(student => isBlank(snapshot.statusCells[`${student.row}:${header.column}`]));

export const planSheetSync = (input: {
  snapshot: SheetSnapshot;
  assignments: readonly SyncAssignment[];
  submissions: readonly SyncSubmission[];
  roster: readonly SyncRosterStudent[];
  appOrigin: string;
  nowMs: number;
  /** Bài được phép tạo cột mới; bỏ trống là tất cả. */
  createFor?: ReadonlySet<string>;
  /** Giáo viên đồng ý bổ sung "Nộp muộn" cho tab chưa có. */
  addLateOption: boolean;
}): SheetSyncPlan => {
  const { snapshot } = input;
  const students = matchStudents(input.roster, snapshot.students);
  const upgradedStatusOptions = input.addLateOption ? upgradedOptions(snapshot.statusOptions) : null;
  const options = upgradedStatusOptions ?? snapshot.statusOptions;

  const headers = snapshot.headers.filter(header => header.column >= SHEET_LAYOUT.firstColumn && header.column <= snapshot.lastColumn);
  const linkedColumn = new Map<string, number>();
  for (const header of headers) {
    const id = assignmentIdFromCell(header.link);
    if (id && !linkedColumn.has(id)) linkedColumn.set(id, header.column);
  }
  const freeColumns = headers.filter(header => isFreeColumn(header, snapshot)).map(header => header.column);
  const taken = new Set<number>(linkedColumn.values());

  const plan: SheetSyncPlan = {
    columns: [],
    skipped: [],
    writes: [],
    upgradedStatusOptions,
    counts: { attached: 0, created: 0, statusWrites: 0, keptHuman: 0, deadlineWrites: 0 },
    students,
  };

  for (const assignment of input.assignments) {
    const linked = linkedColumn.get(assignment.id);
    if (linked !== undefined) {
      plan.columns.push({ assignmentId: assignment.id, title: assignment.title, column: linked, source: 'linked' });
      continue;
    }

    // Cột gõ tay trùng tên bài → gắn link vào đó, không tạo cột trùng.
    const sameTitle = headers.find(header => !taken.has(header.column)
      && !assignmentIdFromCell(header.link)
      && plain(cellText(header.content)) !== ''
      && plain(cellText(header.content)) === plain(assignment.title));
    if (sameTitle) {
      taken.add(sameTitle.column);
      if (!isBlank(sameTitle.link)) {
        plan.skipped.push({
          assignmentId: assignment.id,
          title: assignment.title,
          reason: `Cột ${columnLetter(sameTitle.column)} trùng tên nhưng ô Link đã có link khác — thầy cô tự quyết gắn cột nào.`,
        });
        continue;
      }
      plan.writes.push({
        kind: 'link',
        row: SHEET_LAYOUT.linkRow,
        column: sameTitle.column,
        value: assignmentLink(input.appOrigin, assignment.id),
      });
      plan.columns.push({ assignmentId: assignment.id, title: assignment.title, column: sameTitle.column, source: 'attached' });
      plan.counts.attached += 1;
      continue;
    }

    if (input.createFor && !input.createFor.has(assignment.id)) continue;
    const column = freeColumns.find(candidate => !taken.has(candidate));
    if (column === undefined) {
      plan.skipped.push({
        assignmentId: assignment.id,
        title: assignment.title,
        reason: 'Hết cột trống đã định dạng sẵn. App không tự chèn cột vì chèn cột làm lệch công thức Hạnh kiểm.',
      });
      continue;
    }
    taken.add(column);
    plan.writes.push({ kind: 'content', row: SHEET_LAYOUT.contentRow, column, value: assignment.title });
    const deadline = deadlineSerial(assignment.dueAt, snapshot.timeZone);
    if (deadline !== null) plan.writes.push({ kind: 'deadline', row: SHEET_LAYOUT.deadlineRow, column, serial: deadline });
    plan.writes.push({ kind: 'link', row: SHEET_LAYOUT.linkRow, column, value: assignmentLink(input.appOrigin, assignment.id) });
    plan.columns.push({ assignmentId: assignment.id, title: assignment.title, column, source: 'created' });
    plan.counts.created += 1;
  }

  // Lượt nộp ĐẦU TIÊN mới là mốc nộp; bổ sung ảnh sau hạn không biến bài nộp đúng hạn thành muộn.
  const firstSubmittedAt = new Map<string, number>();
  for (const submission of input.submissions) {
    if (!submission.assignmentId) continue;
    const at = Date.parse(submission.createdAt);
    if (!Number.isFinite(at)) continue;
    const key = `${submission.studentId}:${submission.assignmentId}`;
    const previous = firstSubmittedAt.get(key);
    if (previous === undefined || at < previous) firstSubmittedAt.set(key, at);
  }

  const assignmentById = new Map(input.assignments.map(assignment => [assignment.id, assignment]));
  for (const planned of plan.columns) {
    const assignment = assignmentById.get(planned.assignmentId);
    if (!assignment) continue;
    const header = headers.find(item => item.column === planned.column);
    // Hạn của app là chuẩn. Cột đã có sẵn trong sheet trước đây lấy hạn từ dòng 5 — nếu dòng đó trống
    // hoặc lỗi (#ERROR! do công thức sai dấu) thì không tính được muộn/chưa nộp. Nên ưu tiên hạn app,
    // và ghi hạn app (số ngày) đè lên ô đang trống/lỗi/khác để dòng 5 chuẩn theo app.
    const appDeadlineMs = Number.isFinite(Date.parse(String(assignment.dueAt ?? ''))) ? Date.parse(String(assignment.dueAt)) : null;
    const sheetMs = sheetDeadlineMs(header?.deadline, snapshot.timeZone);
    const deadlineMs = appDeadlineMs ?? sheetMs;
    if (appDeadlineMs !== null && planned.source !== 'created') {
      const serial = deadlineSerial(assignment.dueAt, snapshot.timeZone);
      if (serial !== null && (sheetMs === null || Math.abs(sheetMs - appDeadlineMs) > 60_000)) {
        plan.writes.push({ kind: 'deadline', row: SHEET_LAYOUT.deadlineRow, column: planned.column, serial });
        plan.counts.deadlineWrites += 1;
      }
    }
    const targets = assignment.targetStudentIds && assignment.targetStudentIds.length > 0
      ? new Set(assignment.targetStudentIds)
      : null;

    for (const [studentId, row] of students.rowByStudentId) {
      const desired = desiredStatus({
        submittedAtMs: firstSubmittedAt.get(`${studentId}:${assignment.id}`) ?? null,
        deadlineMs,
        nowMs: input.nowMs,
        notAssigned: targets !== null && !targets.has(studentId),
        options,
      });
      const decision = decideStatusCell(snapshot.statusCells[`${row}:${planned.column}`], desired);
      if (decision.action === 'write' && desired !== null) {
        plan.writes.push({
          kind: 'status',
          row,
          column: planned.column,
          value: desired,
          note: buildAppNote(desired, input.nowMs, snapshot.timeZone),
        });
        plan.counts.statusWrites += 1;
      } else if (decision.action === 'keep' && decision.reason === 'human') {
        plan.counts.keptHuman += 1;
      }
    }
  }

  if (upgradedStatusOptions) {
    for (const [column, formula] of Object.entries(snapshot.countFormulas)) {
      const upgraded = upgradeCountFormula(formula);
      if (upgraded) plan.writes.push({ kind: 'countFormula', row: SHEET_LAYOUT.countRow, column: Number(column), formula: upgraded });
    }
  }

  return plan;
};

// ── Cổng chặn vùng ghi ──────────────────────────────────────────────────────

export class SheetRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetRangeError';
  }
}

/**
 * CỔNG DUY NHẤT trước khi gửi lệnh sang Google. Google cấp quyền theo cả file chứ không theo tab,
 * nên cam kết "không động vào tab liên lạc phụ huynh, ghi chú học sinh, quỹ lớp, hạnh kiểm" do cổng
 * này giữ: mọi lệnh chỉ nhắm đúng tab đã nối, đúng dòng và cột được liệt kê dưới đây.
 */
export const assertWriteAllowed = (write: SheetWrite, snapshot: SheetSnapshot): void => {
  const lastStudentRow = Math.max(...snapshot.students.map(student => student.row));
  const where = cellAddress(write.row, write.column);
  if (write.column < SHEET_LAYOUT.firstColumn || write.column > snapshot.lastColumn) {
    throw new SheetRangeError(`Chặn ghi ${where}: ngoài vùng cột bài tập (C tới ${columnLetter(snapshot.lastColumn)}).`);
  }
  const allowedRow = (() => {
    switch (write.kind) {
      case 'status': return write.row >= SHEET_LAYOUT.firstStudentRow && write.row <= lastStudentRow;
      case 'content': return write.row === SHEET_LAYOUT.contentRow;
      case 'deadline': return write.row === SHEET_LAYOUT.deadlineRow;
      case 'link': return write.row === SHEET_LAYOUT.linkRow;
      case 'countFormula': return write.row === SHEET_LAYOUT.countRow;
    }
  })();
  if (!allowedRow) throw new SheetRangeError(`Chặn ghi ${where}: dòng này không thuộc loại "${write.kind}".`);
};

/** Lệnh `batchUpdate` gửi Google — chỉ dựng được sau khi mọi lệnh ghi đã qua cổng. */
export const buildSheetRequests = (plan: SheetSyncPlan, snapshot: SheetSnapshot): Array<Record<string, unknown>> => {
  const lastStudentRow = Math.max(...snapshot.students.map(student => student.row));
  const requests: Array<Record<string, unknown>> = [];

  if (plan.upgradedStatusOptions) {
    requests.push({
      setDataValidation: {
        range: {
          sheetId: snapshot.sheetId,
          startRowIndex: SHEET_LAYOUT.firstStudentRow - 1,
          endRowIndex: lastStudentRow,
          startColumnIndex: SHEET_LAYOUT.firstColumn - 1,
          endColumnIndex: snapshot.lastColumn,
        },
        rule: {
          condition: { type: 'ONE_OF_LIST', values: plan.upgradedStatusOptions.map(value => ({ userEnteredValue: value })) },
          strict: true,
          showCustomUi: true,
        },
      },
    });
  }

  for (const write of plan.writes) {
    assertWriteAllowed(write, snapshot);
    const cell: Record<string, unknown> = {};
    let fields = 'userEnteredValue';
    if (write.kind === 'deadline') {
      // Số ngày + định dạng ngày giờ: hiển thị ra ngày, không lệ thuộc dấu phân cách như công thức.
      cell.userEnteredValue = { numberValue: write.serial };
      cell.userEnteredFormat = { numberFormat: { type: 'DATE_TIME', pattern: 'dd/mm/yyyy hh:mm' } };
      fields = 'userEnteredValue,userEnteredFormat.numberFormat';
    } else if (write.kind === 'countFormula') {
      cell.userEnteredValue = { formulaValue: write.formula };
    } else {
      cell.userEnteredValue = { stringValue: write.value };
    }
    if (write.kind === 'status') {
      cell.note = write.note;
      fields = 'userEnteredValue,note';
    }
    requests.push({
      updateCells: {
        range: {
          sheetId: snapshot.sheetId,
          startRowIndex: write.row - 1,
          endRowIndex: write.row,
          startColumnIndex: write.column - 1,
          endColumnIndex: write.column,
        },
        rows: [{ values: [cell] }],
        fields,
      },
    });
  }
  return requests;
};

/**
 * Dịch lỗi của Google Sheets sang câu nói ĐÚNG nguyên nhân.
 *
 * Google trả 403 cho cả hai chuyện rất khác nhau: tài khoản không có quyền với file, và dự án của
 * app chưa bật Sheets API. Gộp chung thành "chưa có quyền sửa file" là đẩy giáo viên đi xin quyền
 * một file mà họ vốn là chủ — chuyện đã xảy ra ở lần QA đầu tiên.
 */
export const sheetsErrorMessage = (status: number, detail: string): string => {
  if (/has not been used in project|it is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(detail)) {
    const link = /https:\/\/console\.developers\.google\.com\/apis\/api\/sheets\.googleapis\.com\/overview\?project=\d+/.exec(detail)?.[0];
    return `Google Sheets API chưa được bật cho app này. Chủ app cần bật một lần${link ? ` tại ${link}` : ' trong Google Cloud Console'}, đợi vài phút rồi thử lại.`;
  }
  const suffix = detail ? ` (${detail})` : '';
  if (status === 403) return `Tài khoản Google của bạn chưa có quyền sửa file này${suffix}.`;
  if (status === 404) return 'Không tìm thấy file. Kiểm tra lại link Google Sheet.';
  return `Google Sheets trả lỗi ${status}${suffix}.`;
};
