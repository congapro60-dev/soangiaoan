import { describe, expect, it } from 'vitest';
import { deadlineCommand, deadlineTasksForStudent, digestText, dueTime, safeTaskUrl, sheetTaskRows, type DeadlineConfig } from '../_assistant-deadline';

const config: DeadlineConfig = {
  spreadsheetId: 'abcdefghijklmnopqrstuvwx', sheetTitle: '01. DEADLINE', sheetId: 12,
  studentNames: { HS01: 'Em Một', HS02: 'Em Hai' },
  tasks: [{ id: 't1', header: 'Khảo sát', state: 'published', optional: false, studentCodes: [] }],
  notifications: false, digest: false,
};
const cells = (values: unknown[][]) => values.map(row => row.map(value => ({ formattedValue: String(value ?? '') })));
const grid = () => cells([
  ['DEADLINE'], ['Tên việc', '', 'Khảo sát'], ['Hạn chót (tự tính)', '', '10/11/2026 08:00'],
  ['Ngày'], ['Giờ'], ['Link', '', 'https://example.com/form'], [], [], ['STT', 'Học sinh'],
  ['2', 'Em Hai', 'TRUE'], ['1', 'Em Một', 'FALSE'],
]);
describe('deadline privacy and source mapping', () => {
  it('matches canonical code via explicit unique name mapping despite shuffled rows', () => {
    const rows = sheetTaskRows(config, grid());
    expect(rows.find(row => row.studentCode === 'HS01')?.complete).toBe(false);
    expect(rows.find(row => row.studentCode === 'HS02')?.complete).toBe(true);
  });
  it('does not guess an unknown or duplicate student name', () => {
    const data = grid(); data.push(data[10]);
    expect(() => sheetTaskRows(config, data)).toThrow(/trùng|khớp/i);
  });
  it('uses stable task identity after columns move', () => {
    const data = grid().map(row => [row[0], row[1], { formattedValue: 'khác' }, row[2]]);
    expect(sheetTaskRows(config, data)[0].id).toBe('t1');
  });
  it('rejects duplicate headers rather than picking a column', () => {
    const data = grid().map(row => [...row, row[2]]);
    expect(() => sheetTaskRows(config, data)).toThrow(/trùng|khớp/i);
  });
  it('fails closed if the due-date or link row has moved', () => {
    for (const index of [2, 5]) {
      const data = grid(); data[index][0].formattedValue = 'Đã đổi bố cục';
      expect(() => sheetTaskRows(config, data)).toThrow(/Bố cục/);
    }
  });
  it('never returns draft, closed, completed or unsigned optional tasks', () => {
    const task = { id: 't1', title: 'Khảo sát', studentCode: 'HS01', complete: false, dueAt: '2026-11-10T01:00:00.000Z', url: '' };
    for (const patch of [{ state: 'draft' }, { state: 'closed' }, { optional: true }]) {
      const settings = { ...config, tasks: [{ ...config.tasks[0], ...patch }] } as DeadlineConfig;
      expect(deadlineTasksForStudent(settings, 'HS01', 's1', [task], [], [])).toEqual([]);
    }
    expect(deadlineTasksForStudent(config, 'HS01', 's1', [{ ...task, complete: true }], [], [])).toEqual([]);
  });
  it('merges a web assignment linked by id; accepted attempt is not missing', () => {
    const settings = { ...config, tasks: [{ ...config.tasks[0], assignmentId: 'a1' }] };
    const assignments = [{ id: 'a1', title: 'Bài', isOpen: true, dueAt: '2026-11-10' }];
    for (const status of ['submitted', 'grading', 'graded', 'error']) {
      const items = deadlineTasksForStudent(settings, 'HS01', 's1', [{ id: 't1', title: 'Khảo sát', studentCode: 'HS01', complete: false, dueAt: '', url: '' }], assignments, [{ assignmentId: 'a1', status }]);
      expect(items.some(item => item.status === 'missing')).toBe(false);
      expect(items).toHaveLength(0);
    }
  });
  it('shows conflicting Sheet/web evidence as review rather than a false missing or all-clear', () => {
    const settings = { ...config, tasks: [{ ...config.tasks[0], assignmentId: 'a1' }] };
    const items = deadlineTasksForStudent(settings, 'HS01', 's1', [{ id: 't1', title: 'Khảo sát', studentCode: 'HS01', complete: true, dueAt: '', url: '' }], [{ id: 'a1', title: 'Bài' }], []);
    expect(items[0]?.status).toBe('review');
    expect(digestText(items, Date.now(), false)).toContain('web chưa ghi nhận');
  });
  it('flags uncertain review without claiming no submission', () => {
    const items = deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1', title: 'Bài', isOpen: true }], [{ assignmentId: 'a1', status: 'graded', grade: { photoReview: { missingQuestionNumbers: ['2'] } } }]);
    expect(items[0].status).toBe('review');
    expect(digestText(items, Date.parse('2026-11-09T00:00:00Z'), false)).toContain('cần kiểm tra/bổ sung');
  });
  it('does not leak another target group or count a draft online attempt as submitted', () => {
    const tasks = deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1', title: 'Bài', targetStudentIds: ['s2'] }], []);
    expect(tasks).toEqual([]);
    expect(deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a2', title: 'Bài' }], [{ assignmentId: 'a2', status: 'in_progress' }])[0].status).toBe('missing');
  });
  it('drops locked, closed and cancelled assignments', () => {
    expect(deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1', isOpen: false }, { id: 'a2', submissionLocked: true }, { id: 'a3', status: 'cancelled' }], [])).toEqual([]);
  });
});
describe('Vietnam date and safe messages', () => {
  it('separates and prioritizes unfinished Sheet tasks ahead of web homework', () => {
    const tasks = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: `web${i}`, title: `BTVN ${i} `.repeat(10), dueAt: '', url: '', status: 'missing' as const })),
      { id: 'sheet:t1', source: 'sheet' as const, title: 'Việc bắt buộc trên Sheet', dueAt: '2027-01-01T00:00:00Z', url: '', status: 'missing' as const },
    ];
    const text = digestText(tasks, Date.parse('2026-11-11T00:00:00Z'), true);
    expect(text).toContain('DEADLINE TRÊN SHEET');
    expect(text).toContain('BÀI TẬP TRÊN WEB');
    expect(text.indexOf('Việc bắt buộc trên Sheet')).toBeLessThan(text.indexOf('BTVN 0'));
    expect(text).toContain('Nhắn "deadline"');
    expect(text).toContain('Nhắn "web" vào ô chat để xem toàn bộ và mở đúng hồ sơ.');
    expect(text.length).toBeLessThanOrEqual(2000);
  });
  it('keeps uncertain/wrong or unreadable photos in review using the actual review schema', () => {
    for (const review of [{ assignmentMatch: 'possibly_wrong' }, { assignmentMatch: 'uncertain' }, { unreadablePhotoNumbers: [1] }]) {
      expect(deadlineTasksForStudent(config, 'HS01', 's1', [], [{ id: 'a1' }], [{ assignmentId: 'a1', status: 'graded', grade: { photoReview: review } }])[0]?.status).toBe('review');
    }
  });
  it('bounds the morning message without truncating a URL or losing the full-menu instruction', () => {
    const tasks = Array.from({ length: 60 }, (_, i) => ({ id: `t${i}`, title: 'Việc '.repeat(80), dueAt: '2026-11-09T01:00:00Z', url: 'https://example.com/' + 'a'.repeat(150), status: 'missing' as const }));
    const text = digestText(tasks, Date.parse('2026-11-09T00:00:00Z'), true);
    expect(text.length).toBeLessThanOrEqual(1800); expect(text).toContain('Nhắn "web"'); expect(text).not.toContain('Nhắn "deadline"'); expect(text).toContain('việc khác');
  });
  it('budgets command quotes before enforcing the platform message limit', () => {
    const tasks = Array.from({ length: 60 }, (_, i) => ({ id: `sheet:${i}`, source: 'sheet' as const, title: 'Nhắn 0 '.repeat(40), dueAt: '', url: '', status: 'missing' as const }));
    const text = digestText(tasks, Date.parse('2026-11-11T00:00:00Z'), true);
    expect(text.length).toBeLessThanOrEqual(1800);
    expect(text).toContain('Nhắn "deadline"');
    expect(text).toContain('Nhắn "web" vào ô chat');
  });
  it('parses local date, datetime and rejects impossible dates', () => {
    expect(dueTime('10/11/2026 08:00')).toBe('2026-11-10T01:00:00.000Z');
    expect(dueTime('2026-11-10')).toBe('2026-11-10T16:59:59.000Z');
    expect(dueTime('31/02/2026 08:00')).toBe('');
  });
  it('allows public task links, blocks workbook links, credentials and dangerous schemes', () => {
    for (const url of ['javascript:alert(1)', 'https://docs.google.com/spreadsheets/d/abc/edit#gid=2', 'https://u:p@example.com/a', 'http://localhost/a', 'https://example.com/?pin=1234']) expect(safeTaskUrl(url)).toBe('');
    expect(safeTaskUrl('https://example.com/form')).toBe('https://example.com/form');
  });
  it('recognizes explicit commands without stealing upload selection numbers', () => {
    for (const message of ['deadline', 'việc cần làm', 'mở bảng deadline']) expect(deadlineCommand(message)).toBe(true);
    expect(deadlineCommand('11')).toBe(false);
  });
  it('uses Vietnam today and next three calendar dates', () => {
    const tasks = [
      { id: 'a', title: 'Hôm nay', dueAt: '2026-11-09T16:00:00Z', url: '', status: 'missing' as const },
      { id: 'b', title: 'Ba ngày', dueAt: '2026-11-12T16:59:00Z', url: '', status: 'missing' as const },
      { id: 'c', title: 'Bốn ngày', dueAt: '2026-11-12T17:00:00Z', url: '', status: 'missing' as const },
    ];
    const result = digestText(tasks, Date.parse('2026-11-09T00:00:00Z'), true);
    expect(result).toContain('Hôm nay'); expect(result).toContain('Ba ngày'); expect(result).not.toContain('Bốn ngày');
  });
  it('empty-day text and menu preserve all tasks without grading details', () => {
    expect(digestText([], Date.parse('2026-11-09T00:00:00Z'), true)).toContain('không có');
    const tasks = Array.from({ length: 15 }, (_, i) => ({ id: `t${i}`, title: `Việc ${i}`, dueAt: '', url: '', status: 'missing' as const }));
    expect(digestText(tasks, Date.now(), false)).toContain('Việc 14');
  });
});
