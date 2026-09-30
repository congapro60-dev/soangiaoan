import { describe, expect, it } from 'vitest';
import { competencyById, MATH_COMPETENCIES } from './framework';
import { levelDescriptions } from './levelDescriptions';
import { nextLevel, suggestEntryText } from './portfolioGuide';
import { applyPortfolioDraft, buildPortfolioDraftPrompt, parsePortfolioDraft } from './portfolioDraftPrompt';

const hs = competencyById('g10-ham-so-bac-hai')!;

describe('mô tả mức', () => {
  it('đủ 4 mô tả cho MỌI năng lực trong khung (gốc lấy từ file mẫu, bổ sung lấy từ rubric)', () => {
    for (const c of MATH_COMPETENCIES) {
      const d = levelDescriptions(c);
      expect(d, c.id).not.toBeNull();
      expect(d!.every(t => t.trim().length > 0), c.id).toBe(true);
    }
    expect(levelDescriptions('g10-ham-so-bac-hai')![0]).toBe('Vẽ chính xác Parabola và giải quyết đúng bài toán thực tiễn');
    expect(levelDescriptions('khong-co')).toBeNull();
  });
});

describe('gợi ý điền (không AI)', () => {
  it('mức kế tiếp', () => {
    expect(nextLevel(null)).toBe('Đạt yêu cầu');
    expect(nextLevel('Chưa đạt yêu cầu')).toBe('Đạt yêu cầu');
    expect(nextLevel('Tốt')).toBe('Xuất sắc');
    expect(nextLevel('Xuất sắc')).toBe('Xuất sắc');
  });

  it('mục tiêu nhắm mức kế tiếp, dùng đúng mô tả mức đó, có hạn', () => {
    const text = suggestEntryText(hs, { selfLevel: 'Đạt yêu cầu' }, 'tháng 11/2026');
    expect(text.goal).toBe('Đạt mức Tốt ở "Hàm số bậc hai": vẽ được đồ thị nhưng chưa giải quyết hết bài toán trước tháng 11/2026.');
    expect(text.plan).toContain('hàm số bậc hai');
    expect(suggestEntryText(hs, { selfLevel: 'Xuất sắc' }, '').goal).toMatch(/^Giữ mức Xuất sắc/);
  });
});

describe('AI soạn nháp cho GV', () => {
  it('prompt có mô tả mức, mức app tính, bài minh chứng, phần HS đã điền, danh sách tháng', () => {
    const prompt = buildPortfolioDraftPrompt({
      grade: 10, studentName: 'An', months: ['tháng 10/2026', 'tháng 11/2026'],
      rows: [{ competency: hs, suggestedLevel: 'Tốt', scoreOutOf10: 7.5, evidence: ['BTVN parabol 7.5/10'], entry: { selfLevel: 'Đạt yêu cầu' } }],
    });
    expect(prompt).toContain('g10-ham-so-bac-hai');
    expect(prompt).toContain('Vẽ chính xác Parabola');
    expect(prompt).toContain('Mức app tính từ bài đã duyệt: Tốt (điểm đại diện 7.5/10)');
    expect(prompt).toContain('BTVN parabol 7.5/10');
    expect(prompt).toContain('"selfLevel":"Đạt yêu cầu"');
    expect(prompt).toContain('tháng 10/2026, tháng 11/2026');
  });

  it('đọc JSON AI, lọc id/giá trị sai', () => {
    const draft = parsePortfolioDraft('```json\n{"g10-ham-so-bac-hai":{"teacherLevel":"Tốt","teacherComment":"Em tiến bộ","goal":"Đạt Xuất sắc","progress":"Đang thực hiện"},"g11-gioi-han":{"teacherLevel":"Tốt"},"g10-pt-duong-tron":{"teacherLevel":"Giỏi"}}\n```', 10);
    expect(Object.keys(draft)).toEqual(['g10-ham-so-bac-hai']);
    expect(parsePortfolioDraft('không có json', 10)).toEqual({});
  });

  it('gộp nháp: mức/ý kiến GV lấy nháp; ô HS chỉ điền khi trống, không đè chữ HS viết', () => {
    const merged = applyPortfolioDraft(
      { 'g10-ham-so-bac-hai': { selfLevel: 'Đạt yêu cầu', goal: 'Mục tiêu của em', plan: '  ' } },
      { 'g10-ham-so-bac-hai': { teacherLevel: 'Tốt', teacherComment: 'Tốt', goal: 'AI goal', plan: 'AI plan', selfLevel: 'Xuất sắc', progress: 'Đang thực hiện' } },
    );
    expect(merged['g10-ham-so-bac-hai']).toEqual({
      selfLevel: 'Đạt yêu cầu', goal: 'Mục tiêu của em', plan: 'AI plan', teacherLevel: 'Tốt', teacherComment: 'Tốt', progress: 'Đang thực hiện',
    });
  });
});
