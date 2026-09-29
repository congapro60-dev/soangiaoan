import { describe, expect, it } from 'vitest';
import { buildPpctPrompt, parsePpctResponse } from './ppctImport';

describe('ppctImport', () => {
  it('prompt kèm nội dung PPCT', () => {
    expect(buildPpctPrompt('Tuần 1: Mệnh đề')).toContain('Tuần 1: Mệnh đề');
  });

  it('đọc dòng, đánh lại số tiết, tính tiết mấy của bài, tuần thiếu thì lấy tuần trước', () => {
    const lessons = parsePpctResponse('```json\n{"lessons":[' +
      '[1,1,"Đại số","Mệnh đề","Tiết 1: Mệnh đề",false],' +
      '[2,1,"Đại số","Mệnh đề","Tiết 2",false],' +
      '["x",null,"","","",true],' +
      '"hỏng",' +
      '[4,2,"Hình học","Vectơ","",false],' +
      '[5,"2","","",null,false]]}\n```');
    expect(lessons.map((l) => `${l.periodNo} w${l.week} ${l.subject}|${l.title} ${l.periodIndex}/${l.periodCount} ${l.isElective}`)).toEqual([
      '1 w1 Đại số|Mệnh đề 1/2 false',
      '2 w1 Đại số|Mệnh đề 2/2 false',
      '3 w1 |Tiết tự chọn 1/1 true',
      '4 w2 Hình học|Vectơ 1/1 false',
    ]);
    expect(lessons[0].detail).toBe('Tiết 1: Mệnh đề');
    expect(lessons[3].notes).toBe('');
  });

  it('hỏng hẳn → rỗng', () => {
    expect(parsePpctResponse('không có')).toEqual([]);
    expect(parsePpctResponse('{"lessons": 3}')).toEqual([]);
  });
});
