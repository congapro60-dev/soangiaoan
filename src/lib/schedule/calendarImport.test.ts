import { describe, expect, it } from 'vitest';
import { parseGoogleLink } from './googleLink';
import { MAX_CALENDAR_CHARS, buildCalendarPrompt, fullyOffWeeks, offDatesFrom, parseCalendarResponse } from './calendarImport';

describe('buildCalendarPrompt', () => {
  it('kèm nội dung lịch, cắt bớt khi quá dài', () => {
    const p = buildCalendarPrompt('LỊCH 2026-2027\n' + 'x'.repeat(MAX_CALENDAR_CHARS * 2));
    expect(p).toContain('LỊCH 2026-2027');
    expect(p.length).toBeLessThan(MAX_CALENDAR_CHARS + 5_000);
  });
});

describe('parseCalendarResponse', () => {
  it('đọc JSON kèm chữ thừa; chỉ "nghỉ" được áp dụng sẵn', () => {
    const r = parseCalendarResponse('Đây: ```json\n{"week1Monday":"2026-08-19","events":[' +
      '{"from":"2026-09-01","to":"2026-09-02","kind":"nghi","note":"Quốc khánh"},' +
      '{"from":"2026-08-31","to":"2026-08-31","kind":"nghi","note":"Nghỉ lễ"},' +
      '{"from":"2026-09-15","kind":"giam-tiet","note":"Trung thu (-2 tiết)"}]}\n```');
    expect(r.week1Monday).toBe('2026-08-17');
    expect(r.events.map((e) => `${e.from}>${e.to} ${e.kind} ${e.applied}`)).toEqual([
      '2026-08-31>2026-08-31 nghi true',
      '2026-09-01>2026-09-02 nghi true',
      '2026-09-15>2026-09-15 giam-tiet false',
    ]);
  });

  it('bỏ ngày sai, kind lạ thành "khác", to < from thì = from', () => {
    const r = parseCalendarResponse(JSON.stringify({ week1Monday: 'W1', events: [
      { from: '2026-02-30', kind: 'nghi' },
      { from: '31/08/2026', kind: 'nghi' },
      { from: '2026-10-12', to: '2026-10-01', kind: 'họp', note: 'x' },
    ] }));
    expect(r.week1Monday).toBeNull();
    expect(r.events).toEqual([{ from: '2026-10-12', to: '2026-10-12', kind: 'khac', note: 'x', applied: false }]);
  });

  it('hỏng hẳn → rỗng', () => {
    expect(parseCalendarResponse('xin lỗi')).toEqual({ week1Monday: null, events: [] });
    expect(parseCalendarResponse('{hỏng')).toEqual({ week1Monday: null, events: [] });
  });
});

describe('ngày nghỉ', () => {
  it('chỉ lấy T2–T6 của sự kiện đang áp dụng', () => {
    const off = offDatesFrom([
      { from: '2027-02-05', to: '2027-02-14', kind: 'nghi', note: 'Tết', applied: true },
      { from: '2026-09-15', to: '2026-09-15', kind: 'giam-tiet', note: '', applied: false },
    ]);
    expect([...off].sort()).toEqual(['2027-02-05', '2027-02-08', '2027-02-09', '2027-02-10', '2027-02-11', '2027-02-12']);
    expect([...fullyOffWeeks(off)]).toEqual(['2027-02-08']);
  });
});

describe('parseGoogleLink', () => {
  it('nhận Sheet (kèm tab), Docs, file Drive; từ chối link khác', () => {
    expect(parseGoogleLink('https://docs.google.com/spreadsheets/d/1ieAttX3QsF0J3MTX9CbF2Umv7iQmGaI115zSLEX-EVg/edit#gid=1876176277'))
      .toEqual({ kind: 'sheet', id: '1ieAttX3QsF0J3MTX9CbF2Umv7iQmGaI115zSLEX-EVg', gid: 1876176277 });
    expect(parseGoogleLink('https://docs.google.com/spreadsheets/d/1ieAttX3QsF0J3MTX9CbF2Umv7iQmGaI115zSLEX-EVg/edit?usp=sharing'))
      .toEqual({ kind: 'sheet', id: '1ieAttX3QsF0J3MTX9CbF2Umv7iQmGaI115zSLEX-EVg', gid: null });
    expect(parseGoogleLink('https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit')).toEqual({ kind: 'doc', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz' });
    expect(parseGoogleLink('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view')).toEqual({ kind: 'file', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz' });
    expect(parseGoogleLink('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz')).toEqual({ kind: 'file', id: '1AbCdEfGhIjKlMnOpQrStUvWxYz' });
    expect(parseGoogleLink('https://evil.com/spreadsheets/d/1ieAttX3QsF0J3MTX9CbF2Umv7iQmGaI115zSLEX-EVg')).toBeNull();
    expect(parseGoogleLink('http://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz')).toBeNull();
    expect(parseGoogleLink('abc')).toBeNull();
  });
});
