import { describe, expect, it } from 'vitest';
import { suggestMark, suggestGrid, parseLoInfo, type LoInfo, type StudentCompetencyScores } from './loMapping';
import { buildLoMappingPrompt, parseLoMappingResponse } from './loMappingPrompt';
import type { Competency } from '../classroom/competency/framework';

describe('suggestMark', () => {
  const scores = { c1: 8, c2: 9, c3: 5 };
  it('trung bình năng lực được ghép rồi quy thang 4', () => {
    expect(suggestMark(['c1'], scores)).toBe(3); // 8 → 3.2 → 3
    expect(suggestMark(['c1', 'c2'], scores)).toBe(3.5); // (8+9)/2=8.5 → 3.4 → 3.5
  });
  it('bỏ qua năng lực không có minh chứng', () => {
    expect(suggestMark(['c1', 'cX'], scores)).toBe(3); // chỉ c1
  });
  it('không có minh chứng nào → N', () => {
    expect(suggestMark(['cX', 'cY'], scores)).toBe('N');
    expect(suggestMark([], scores)).toBe('N');
  });
});

describe('suggestGrid', () => {
  const los: LoInfo[] = [{ loCode: 'LO1', text: 'a' }, { loCode: 'LO2', text: 'b' }];
  const mapping = { LO1: ['c1'], LO2: [] };
  const students: StudentCompetencyScores[] = [
    { maHS: 'HS1', scoreByCompetency: { c1: 10 } },
    { maHS: 'HS2', scoreByCompetency: {} },
  ];
  it('mọi ô có mặt; LO chưa ghép hoặc không minh chứng → N', () => {
    const grid = suggestGrid(los, mapping, students);
    expect(grid.get('HS1')!.get('LO1')).toBe(4);
    expect(grid.get('HS1')!.get('LO2')).toBe('N'); // LO2 chưa ghép
    expect(grid.get('HS2')!.get('LO1')).toBe('N'); // HS2 không minh chứng
    expect([...grid.keys()]).toEqual(['HS1', 'HS2']);
  });
});

describe('parseLoInfo', () => {
  it('tách mã và mô tả, gộp khoảng trắng', () => {
    expect(parseLoInfo('LO_DIS_TO_100:\nHiểu   A')).toEqual({ loCode: 'LO_DIS_TO_100', text: 'Hiểu A' });
  });
  it('không phải LO → null', () => {
    expect(parseLoInfo('FP_DIS_TO_1: x')).toBeNull();
  });
});

describe('AI ghép LO', () => {
  const los: LoInfo[] = [{ loCode: 'LO_A', text: 'dãy số' }, { loCode: 'LO_B', text: 'quan hệ song song' }];
  const comps = [
    { id: 'g11-day-so-cap-so', grade: 11, area: 'x', topic: 'Dãy số', competency: 'y' },
    { id: 'g11-quan-he-song-song', grade: 11, area: 'x', topic: 'Song song', competency: 'y' },
  ] as Competency[];

  it('prompt liệt kê LO và id năng lực hợp lệ', () => {
    const p = buildLoMappingPrompt(11, los, comps);
    expect(p).toContain('[LO_A] dãy số');
    expect(p).toContain('g11-day-so-cap-so');
    expect(p).toContain('lớp 11');
  });

  it('parse chỉ giữ LO và id hợp lệ, bỏ id bịa', () => {
    const text = 'Kết quả: {"LO_A":["g11-day-so-cap-so"],"LO_B":["g11-bia-dat"],"LO_Z":["x"]}';
    const r = parseLoMappingResponse(text, ['LO_A', 'LO_B'], comps.map((c) => c.id));
    expect(r).toEqual({ LO_A: ['g11-day-so-cap-so'] }); // LO_B rỗng sau lọc → bỏ; LO_Z không hợp lệ
  });

  it('JSON hỏng → bảng rỗng', () => {
    expect(parseLoMappingResponse('không có json', ['LO_A'], ['c'])).toEqual({});
  });
});
