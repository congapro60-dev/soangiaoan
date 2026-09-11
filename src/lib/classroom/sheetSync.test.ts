import { describe, expect, it } from 'vitest';
import {
  SHEET_STATUS,
  SheetRangeError,
  assertWriteAllowed,
  assignmentIdFromCell,
  assignmentLink,
  buildSheetRequests,
  checkSheetLayout,
  deadlineFormula,
  decideStatusCell,
  desiredStatus,
  matchStudents,
  planSheetSync,
  sheetDeadlineMs,
  sheetsErrorMessage,
  upgradeCountFormula,
  type SheetCell,
  type SheetSnapshot,
  type SheetWrite,
} from './sheetSync';

const TZ = 'Asia/Ho_Chi_Minh';
const ORIGIN = 'https://giaoandewey.vercel.app';
const cell = (value: string | number | null, extra: Partial<SheetCell> = {}): SheetCell => ({ value, ...extra });
/** Số ngày kiểu Google Sheets cho một mốc giờ đồng hồ treo tường. */
const serial = (y: number, m: number, d: number, h = 0, mi = 0): number =>
  (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86_400_000 + (h * 60 + mi) / 1440;

// Nhãn cột A đúng như file 11 Columbus (tab 02. BTVN) và file theo dõi 3 lớp (tab 10. OLINDA).
const FILE1_LABELS = ['BTVN 11 COLUMBUS', 'Tổ trưởng chấm thành viên tổ mình', 'Môn', 'Nội dung BTVN', 'Hạn kiểm tra', 'Link', 'Tính lỗi?', '✅ Đủ', '⚠️ Thiếu', '❌ Chưa làm', 'Tổ'];
const OLINDA_LABELS = ['BTVN | 10 OLINDA', 'GV/lớp phó nhập thông tin', 'Môn', 'Nội dung', 'Hạn kiểm tra', 'Link', 'Tính lỗi?', 'Đủ', 'Thiếu', 'Chưa làm', 'STT'];
const OPTIONS_FILE1 = [SHEET_STATUS.du, SHEET_STATUS.muon, SHEET_STATUS.thieu, SHEET_STATUS.chuaLam, SHEET_STATUS.khongApDung];
const OPTIONS_OLINDA = [SHEET_STATUS.du, SHEET_STATUS.thieu, SHEET_STATUS.chuaLam, SHEET_STATUS.khongApDung];

// Tên hư cấu — không dùng tên học sinh thật trong test.
const roster = [
  { studentId: 's1', name: 'Nguyễn Văn An' },
  { studentId: 's2', name: 'Trần Thị Bình' },
  { studentId: 's3', name: 'Đỗ Minh Chi' },
];

const snapshotOf = (patch: Partial<SheetSnapshot> = {}): SheetSnapshot => ({
  sheetId: 559729920,
  sheetTitle: '02. BTVN',
  timeZone: TZ,
  labels: FILE1_LABELS.map(label => cell(label)),
  students: [
    { row: 12, name: 'Nguyễn Văn An' },
    { row: 13, name: 'Trần  thị Bình' },
    { row: 14, name: 'Đỗ Minh Chi' },
  ],
  headers: [3, 4, 5, 6].map(column => ({ column })),
  statusCells: {},
  statusOptions: OPTIONS_FILE1,
  lastColumn: 6,
  countFormulas: {},
  ...patch,
});

describe('checkSheetLayout', () => {
  it('nhận đúng khuôn của cả file 11 Columbus lẫn tab 10 Olinda', () => {
    expect(checkSheetLayout(snapshotOf())).toBeNull();
    expect(checkSheetLayout(snapshotOf({ labels: OLINDA_LABELS.map(label => cell(label)), statusOptions: OPTIONS_OLINDA }))).toBeNull();
  });

  it('từ chối tab chiếu lại bằng IMPORTRANGE — ghi vào là vỡ công thức', () => {
    const labels = FILE1_LABELS.map(label => cell(label));
    labels[3] = cell('BTVN 11 COLUMBUS', { formula: '=IMPORTRANGE("https://docs.google.com/spreadsheets/d/x/edit","\'02. BTVN\'!A1:BJ37")' });
    expect(checkSheetLayout(snapshotOf({ labels }))).toEqual({ kind: 'mirror' });
  });

  it('sai khuôn thì chỉ đúng ô lệch, không đồng bộ bừa', () => {
    const labels = FILE1_LABELS.map(label => cell(label));
    labels[4] = cell('Ghi chú');
    expect(checkSheetLayout(snapshotOf({ labels }))).toMatchObject({ kind: 'layout', row: 5, expected: 'Hạn kiểm tra' });
  });

  it('thiếu danh sách chọn trạng thái thì báo', () => {
    expect(checkSheetLayout(snapshotOf({ statusOptions: ['Có', 'Không'] }))).toEqual({ kind: 'no-status-list' });
  });
});

describe('matchStudents', () => {
  it('khớp bất kể dấu, hoa thường, khoảng trắng thừa và chữ đ', () => {
    const result = matchStudents(roster, [
      { row: 12, name: 'nguyen van  an' },
      { row: 13, name: 'TRẦN THỊ BÌNH' },
      { row: 14, name: 'Do Minh Chi' },
    ]);
    expect([...result.rowByStudentId.entries()]).toEqual([['s1', 12], ['s2', 13], ['s3', 14]]);
    expect(result.rosterWithoutRow).toEqual([]);
  });

  it('trùng tên thì không đoán, báo ra để giáo viên xử lý', () => {
    const result = matchStudents(
      [...roster, { studentId: 's4', name: 'Nguyễn Văn An' }],
      [{ row: 12, name: 'Nguyễn Văn An' }, { row: 13, name: 'Trần Thị Bình' }],
    );
    expect(result.rowByStudentId.has('s1')).toBe(false);
    expect(result.rowByStudentId.has('s4')).toBe(false);
    expect(result.ambiguous).toEqual(['Nguyễn Văn An']);
    expect(result.rosterWithoutRow).toEqual(['Đỗ Minh Chi']);
  });

  it('liệt kê em có trên sheet mà không có trong app', () => {
    expect(matchStudents(roster, [{ row: 12, name: 'Lê Văn Dũng' }]).rowsWithoutStudent).toEqual(['Lê Văn Dũng']);
  });
});

describe('link bài', () => {
  it('đọc được mã bài từ link thường lẫn công thức HYPERLINK', () => {
    expect(assignmentIdFromCell(cell(assignmentLink(ORIGIN, 'abc_123')))).toBe('abc_123');
    expect(assignmentIdFromCell(cell('Mở bài', { formula: `=HYPERLINK("${ORIGIN}/?baiGiao=xyz-9","Mở bài")` }))).toBe('xyz-9');
  });

  it('link LMS khác không bị nhận nhầm là bài của app', () => {
    expect(assignmentIdFromCell(cell('https://lms.example.edu/course/42'))).toBeNull();
    expect(assignmentIdFromCell(undefined)).toBeNull();
  });
});

describe('giờ giấc theo múi giờ của sheet', () => {
  it('ngày dạng số (công thức DATE+TIME) đổi đúng sang UTC', () => {
    expect(sheetDeadlineMs(cell(serial(2026, 8, 21, 8, 0)), TZ)).toBe(Date.UTC(2026, 7, 21, 1, 0));
  });

  it('ngày gõ tay dd/mm/yyyy hh:mm cũng đọc được; thiếu giờ thì lấy 23:59', () => {
    expect(sheetDeadlineMs(cell('07/09/2026 08:00'), TZ)).toBe(Date.UTC(2026, 8, 7, 1, 0));
    expect(sheetDeadlineMs(cell('07/09/2026'), TZ)).toBe(Date.UTC(2026, 8, 7, 16, 59));
    expect(sheetDeadlineMs(cell('chưa đặt'), TZ)).toBeNull();
  });

  it('hạn của bài ghi ra thành công thức ngày, đúng kiểu file 11 Columbus đang dùng', () => {
    expect(deadlineFormula('2026-09-07T01:00:00.000Z', TZ)).toBe('=DATE(2026,9,7)+TIME(8,0,0)');
    expect(deadlineFormula(undefined, TZ)).toBeNull();
  });
});

describe('desiredStatus', () => {
  const deadlineMs = Date.UTC(2026, 8, 7, 1, 0);
  const base = { deadlineMs, nowMs: Date.UTC(2026, 8, 10), notAssigned: false, options: OPTIONS_FILE1 };

  it('nộp trước hạn là Đủ, sau hạn là Nộp muộn', () => {
    expect(desiredStatus({ ...base, submittedAtMs: deadlineMs - 1 })).toBe(SHEET_STATUS.du);
    expect(desiredStatus({ ...base, submittedAtMs: deadlineMs + 1 })).toBe(SHEET_STATUS.muon);
  });

  it('tab chưa có lựa chọn Nộp muộn thì nộp muộn vẫn ghi Đủ', () => {
    expect(desiredStatus({ ...base, options: OPTIONS_OLINDA, submittedAtMs: deadlineMs + 1 })).toBe(SHEET_STATUS.du);
  });

  it('chỉ ghi Chưa làm sau giờ kiểm — trước đó chưa nộp là bình thường', () => {
    expect(desiredStatus({ ...base, submittedAtMs: null })).toBe(SHEET_STATUS.chuaLam);
    expect(desiredStatus({ ...base, submittedAtMs: null, nowMs: deadlineMs - 1 })).toBeNull();
    expect(desiredStatus({ ...base, submittedAtMs: null, deadlineMs: null })).toBeNull();
  });

  it('em ngoài nhóm được giao là Không áp dụng, không phải Chưa làm', () => {
    expect(desiredStatus({ ...base, submittedAtMs: null, notAssigned: true })).toBe(SHEET_STATUS.khongApDung);
  });
});

describe('decideStatusCell — người sửa luôn thắng', () => {
  const appNote = (value: string) => `SmartPlan: ${value} · 20:00 10/09/2026`;

  it('ô trống thì app ghi', () => {
    expect(decideStatusCell(undefined, SHEET_STATUS.du)).toEqual({ action: 'write' });
  });

  it('ô app đã ghi, chưa ai động, trạng thái đổi thì app cập nhật', () => {
    expect(decideStatusCell(cell(SHEET_STATUS.chuaLam, { note: appNote(SHEET_STATUS.chuaLam) }), SHEET_STATUS.muon)).toEqual({ action: 'write' });
    expect(decideStatusCell(cell(SHEET_STATUS.du, { note: appNote(SHEET_STATUS.du) }), SHEET_STATUS.du)).toEqual({ action: 'keep', reason: 'same' });
  });

  it('tổ trưởng đã sửa ô app ghi thì app không bao giờ ghi lại', () => {
    expect(decideStatusCell(cell(SHEET_STATUS.du, { note: appNote(SHEET_STATUS.chuaLam) }), SHEET_STATUS.chuaLam))
      .toEqual({ action: 'keep', reason: 'human' });
  });

  it('ô người tự chọn (không có ghi chú SmartPlan) thì không động', () => {
    expect(decideStatusCell(cell(SHEET_STATUS.thieu), SHEET_STATUS.du)).toEqual({ action: 'keep', reason: 'human' });
  });

  it('ô bị người xoá trống (còn ghi chú SmartPlan) cũng là quyết định của người', () => {
    expect(decideStatusCell(cell('', { note: appNote(SHEET_STATUS.chuaLam) }), SHEET_STATUS.chuaLam))
      .toEqual({ action: 'keep', reason: 'human' });
  });
});

describe('planSheetSync — dựng lại tình huống sheet thật', () => {
  // C: cột gõ tay không liên quan · D: cột gõ tay trùng tên bài app · E: cột đã gắn link · F: cột trống.
  const headers = [
    { column: 3, content: cell('Bài 1.1–1.4, trang 16 SGK'), deadline: cell(serial(2026, 8, 21, 8, 0)) },
    { column: 4, content: cell('BTVN Đại số 27/08/2026'), deadline: cell(serial(2026, 9, 4, 8, 0)) },
    { column: 5, content: cell('BTVN Hình học 25/08/2026'), deadline: cell(serial(2026, 8, 25, 8, 0)), link: cell(assignmentLink(ORIGIN, 'a2')) },
    { column: 6 },
  ];
  const assignments = [
    { id: 'a1', title: 'BTVN Đại số 27/08/2026' },
    { id: 'a2', title: 'BTVN Hình học 25/08/2026' },
    { id: 'a3', title: 'BTVN Hình học 03/09/2026', dueAt: '2026-09-03T01:00:00.000Z' },
  ];
  const submissions = [
    { studentId: 's1', assignmentId: 'a2', createdAt: '2026-08-24T12:00:00.000Z' },
    // Bổ sung ảnh SAU hạn không biến bài đã nộp đúng hạn thành muộn.
    { studentId: 's1', assignmentId: 'a2', createdAt: '2026-08-26T12:00:00.000Z' },
    { studentId: 's2', assignmentId: 'a2', createdAt: '2026-08-25T05:00:00.000Z' },
    { studentId: 's3', assignmentId: 'a2', createdAt: '2026-09-01T05:00:00.000Z' },
    { studentId: 's1', assignmentId: 'a3', createdAt: '2026-09-02T10:00:00.000Z' },
  ];
  const statusCells: Record<string, SheetCell> = {
    // Tổ trưởng đã chấm tay em Bình ở cột E là Thiếu.
    '13:5': cell(SHEET_STATUS.thieu),
    // App từng ghi Chưa làm cho em Chi ở cột E; em đã nộp muộn sau đó.
    '14:5': cell(SHEET_STATUS.chuaLam, { note: 'SmartPlan: ❌ Chưa làm · 09:00 26/08/2026' }),
    '12:3': cell(SHEET_STATUS.du),
  };
  const plan = planSheetSync({
    snapshot: snapshotOf({ headers, statusCells }),
    assignments,
    submissions,
    roster,
    appOrigin: ORIGIN,
    nowMs: Date.UTC(2026, 8, 10),
    addLateOption: false,
  });
  const writeAt = (row: number, column: number) => plan.writes.find(write => write.row === row && write.column === column);

  it('cột gõ tay trùng tên bài được gắn link, không tạo cột trùng', () => {
    expect(plan.columns.find(column => column.assignmentId === 'a1')).toMatchObject({ column: 4, source: 'attached' });
    expect(writeAt(6, 4)).toMatchObject({ kind: 'link', value: `${ORIGIN}/?baiGiao=a1` });
  });

  it('bài chưa có cột được tạo ở cột trống đầu tiên, điền tên, hạn và link; ô Môn để trống', () => {
    expect(plan.columns.find(column => column.assignmentId === 'a3')).toMatchObject({ column: 6, source: 'created' });
    expect(writeAt(4, 6)).toMatchObject({ kind: 'content', value: 'BTVN Hình học 03/09/2026' });
    expect(writeAt(5, 6)).toMatchObject({ kind: 'deadline', formula: '=DATE(2026,9,3)+TIME(8,0,0)' });
    expect(writeAt(6, 6)).toMatchObject({ kind: 'link' });
    expect(writeAt(3, 6)).toBeUndefined();
  });

  it('tính đúng trạng thái từng em, giữ nguyên ô tổ trưởng đã chấm', () => {
    expect(writeAt(12, 5)).toMatchObject({ value: SHEET_STATUS.du });
    expect(writeAt(13, 5)).toBeUndefined();
    expect(writeAt(14, 5)).toMatchObject({ value: SHEET_STATUS.muon });
    expect([12, 13, 14].map(row => (writeAt(row, 4) as { value?: string } | undefined)?.value))
      .toEqual([SHEET_STATUS.chuaLam, SHEET_STATUS.chuaLam, SHEET_STATUS.chuaLam]);
    expect([12, 13, 14].map(row => (writeAt(row, 6) as { value?: string } | undefined)?.value))
      .toEqual([SHEET_STATUS.du, SHEET_STATUS.chuaLam, SHEET_STATUS.chuaLam]);
  });

  it('không động vào cột gõ tay không liên quan tới bài nào của app', () => {
    expect(plan.writes.filter(write => write.column === 3)).toEqual([]);
  });

  it('ô app điền mang ghi chú SmartPlan để lần sau biết ô nào của app', () => {
    expect((writeAt(12, 5) as { note?: string }).note).toMatch(/^SmartPlan: ✅ Đủ · /);
  });

  it('đếm đúng cho bản xem trước', () => {
    expect(plan.counts).toEqual({ attached: 1, created: 1, statusWrites: 8, keptHuman: 1 });
  });
});

describe('planSheetSync — các giới hạn', () => {
  it('hết cột trống thì báo, không tự chèn cột', () => {
    const plan = planSheetSync({
      snapshot: snapshotOf({ headers: [{ column: 3, content: cell('Bài cũ') }], lastColumn: 3 }),
      assignments: [{ id: 'a9', title: 'Bài mới' }],
      submissions: [],
      roster,
      appOrigin: ORIGIN,
      nowMs: Date.UTC(2026, 8, 10),
      addLateOption: false,
    });
    expect(plan.columns).toEqual([]);
    expect(plan.skipped[0].reason).toMatch(/Hết cột trống/);
  });

  it('bài không được chọn trong bản xem trước thì không tạo cột', () => {
    const plan = planSheetSync({
      snapshot: snapshotOf(),
      assignments: [{ id: 'a1', title: 'Bài một' }, { id: 'a2', title: 'Bài hai' }],
      submissions: [],
      roster,
      appOrigin: ORIGIN,
      nowMs: Date.UTC(2026, 8, 10),
      createFor: new Set(['a2']),
      addLateOption: false,
    });
    expect(plan.columns.map(column => column.assignmentId)).toEqual(['a2']);
  });

  it('bổ sung Nộp muộn cho tab Olinda: danh sách chọn và công thức đếm, rồi ghi được Nộp muộn', () => {
    const olindaCount = '=IF(AND(C$3="",COUNTA(C$12:C$29)=0),"",COUNTIF(C$12:C$29,"✅ Đủ"))';
    const plan = planSheetSync({
      snapshot: snapshotOf({
        labels: OLINDA_LABELS.map(label => cell(label)),
        statusOptions: OPTIONS_OLINDA,
        headers: [{ column: 3, link: cell(assignmentLink(ORIGIN, 'a1')), deadline: cell(serial(2026, 9, 7, 8, 0)) }],
        lastColumn: 3,
        countFormulas: { 3: olindaCount },
      }),
      assignments: [{ id: 'a1', title: 'BTVN' }],
      submissions: [{ studentId: 's1', assignmentId: 'a1', createdAt: '2026-09-08T00:00:00.000Z' }],
      roster,
      appOrigin: ORIGIN,
      nowMs: Date.UTC(2026, 8, 10),
      addLateOption: true,
    });
    expect(plan.upgradedStatusOptions).toEqual([SHEET_STATUS.du, SHEET_STATUS.muon, SHEET_STATUS.thieu, SHEET_STATUS.chuaLam, SHEET_STATUS.khongApDung]);
    expect(plan.writes.find(write => write.kind === 'countFormula')).toMatchObject({
      row: 8,
      column: 3,
      formula: '=IF(AND(C$3="",COUNTA(C$12:C$29)=0),"",COUNTIF(C$12:C$29,"✅ Đủ")+COUNTIF(C$12:C$29,"⏰ Nộp muộn"))',
    });
    expect(plan.writes.find(write => write.kind === 'status' && write.row === 12)).toMatchObject({ value: SHEET_STATUS.muon });
  });
});

describe('upgradeCountFormula', () => {
  it('công thức đã đếm Nộp muộn (file 11 Columbus) thì để nguyên', () => {
    expect(upgradeCountFormula('=IF(AND(COUNTA(C$3:C$6)=0,COUNTA(C$12:C$37)=0),"",COUNTIF(C$12:C$37,"✅ Đủ")+COUNTIF(C$12:C$37,"⏰ Nộp muộn"))')).toBeNull();
  });

  it('công thức lạ thì không động', () => {
    expect(upgradeCountFormula('=SUM(C12:C29)')).toBeNull();
  });
});

describe('cổng chặn vùng ghi', () => {
  const snapshot = snapshotOf();
  const status = (row: number, column: number): SheetWrite => ({ kind: 'status', row, column, value: SHEET_STATUS.du, note: 'SmartPlan: ✅ Đủ' });

  it('chặn ghi vào cột tên học sinh và cột ngoài vùng đã định dạng', () => {
    expect(() => assertWriteAllowed(status(12, 2), snapshot)).toThrow(SheetRangeError);
    expect(() => assertWriteAllowed(status(12, 7), snapshot)).toThrow(SheetRangeError);
  });

  it('chặn trạng thái ngoài dòng học sinh và tiêu đề sai dòng', () => {
    expect(() => assertWriteAllowed(status(11, 3), snapshot)).toThrow(SheetRangeError);
    expect(() => assertWriteAllowed(status(15, 3), snapshot)).toThrow(SheetRangeError);
    expect(() => assertWriteAllowed({ kind: 'content', row: 7, column: 3, value: 'x' }, snapshot)).toThrow(SheetRangeError);
    expect(() => assertWriteAllowed({ kind: 'countFormula', row: 9, column: 3, formula: '=1' }, snapshot)).toThrow(SheetRangeError);
  });

  it('mọi lệnh gửi Google đều nhắm đúng tab đã nối', () => {
    const plan = planSheetSync({
      snapshot,
      assignments: [{ id: 'a1', title: 'Bài một', dueAt: '2026-09-01T01:00:00.000Z' }],
      submissions: [],
      roster,
      appOrigin: ORIGIN,
      nowMs: Date.UTC(2026, 8, 10),
      addLateOption: false,
    });
    const requests = buildSheetRequests(plan, snapshot);
    expect(requests.length).toBeGreaterThan(0);
    for (const request of requests) {
      const range = (Object.values(request)[0] as { range: { sheetId: number } }).range;
      expect(range.sheetId).toBe(snapshot.sheetId);
    }
  });

  it('một lệnh ghi lọt ra ngoài vùng làm hỏng cả lượt, không gửi dở dang', () => {
    const plan = planSheetSync({
      snapshot, assignments: [], submissions: [], roster, appOrigin: ORIGIN, nowMs: 0, addLateOption: false,
    });
    plan.writes.push(status(3, 4));
    expect(() => buildSheetRequests(plan, snapshot)).toThrow(SheetRangeError);
  });
});

describe('sheetsErrorMessage', () => {
  it('API chưa bật thì nói đúng nguyên nhân và đưa link bật, không đổ cho quyền của file', () => {
    // Nguyên văn lỗi Google trả về ở lần QA đầu tiên trên production (08/09 → 11/09/2026).
    const detail = 'Google Sheets API has not been used in project 1030734458631 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=1030734458631 then retry.';
    const message = sheetsErrorMessage(403, detail);

    expect(message).toContain('chưa được bật');
    expect(message).toContain('https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=1030734458631');
    expect(message).not.toContain('chưa có quyền sửa file');
  });

  it('403 thật sự về quyền thì vẫn báo là thiếu quyền với file', () => {
    expect(sheetsErrorMessage(403, 'The caller does not have permission')).toContain('chưa có quyền sửa file');
  });

  it('404 và lỗi khác có câu riêng', () => {
    expect(sheetsErrorMessage(404, '')).toContain('Không tìm thấy file');
    expect(sheetsErrorMessage(500, 'Internal error')).toBe('Google Sheets trả lỗi 500 (Internal error).');
  });
});
