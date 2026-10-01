import { describe, expect, it } from 'vitest';
import { competencyTerms, inStage, termsForPeriod, termsOfSgk } from './reportStage';
import { requirementsInStage, yccdInStage, yccdOptionsForPrompt, type ParentRequirementLine } from './parentRequirements';
import { parentCompetencyFor } from './parentReportBuilder';
import type { AssignmentDoc, SubmissionDoc } from './types';

const line = (id: string): ParentRequirementLine => ({ id, level: 'vung', evidence: 3, percent: 90, note: '' });

describe('giai đoạn của năng lực / yêu cầu cần đạt', () => {
  it('lớp 10: Hàm số bậc hai (Bài 16) là HK2, Mệnh đề (Bài 1) là HK1', () => {
    expect(competencyTerms('g10-ham-so-bac-hai')).toEqual(['HK2']);
    expect(competencyTerms('g10-tap-hop-va-menh-de')).toEqual(['HK1']);
    expect(competencyTerms('g10-vecto-mat-phang-toa-do')).toEqual(['HK1']);
    expect(competencyTerms('g10-xac-suat-co-dien')).toEqual(['HK2']);
  });

  it('bài mà TDS và MOET xếp khác học kì thì tính cho cả hai (khối 11 Bài 18–19, khối 12 Bài 12–14)', () => {
    expect([...competencyTerms('g11-ham-mu-va-logarit')!].sort()).toEqual(['HK1', 'HK2']);
    expect([...competencyTerms('g12-pt-mat-phang')!].sort()).toEqual(['HK1', 'HK2']);
    expect([...competencyTerms('g12-nguyen-ham-tich-phan')!].sort()).toEqual(['HK1', 'HK2']);
    expect(competencyTerms('g11-gioi-han')).toEqual(['HK1']);
    expect(competencyTerms('g12-pt-mat-cau')).toEqual(['HK2']);
  });

  it('năng lực lạ hoặc không rõ bài → null (không bị lọc nhầm)', () => {
    expect(competencyTerms('g12-dao-ham')).toBeNull();
    expect(competencyTerms('khong-co')).toBeNull();
    expect(inStage(null, ['HK1'])).toBe(true);
    expect(inStage(['HK2'], null)).toBe(true);
    expect(inStage(['HK2'], ['HK1'])).toBe(false);
  });

  it('đọc "Bài 3–4", "Bài 8–11", "Chương V"', () => {
    expect(termsOfSgk(10, 'Bài 3–4')).toEqual(['HK1']);
    expect(termsOfSgk(10, 'Bài 8–11')).toEqual(['HK1']);
    expect(termsOfSgk(10, 'Bài 16')).toEqual(['HK2']);
    expect(termsOfSgk(10, 'Chương V')).toBeNull();
    expect([...termsOfSgk(11, 'Bài 18')!].sort()).toEqual(['HK1', 'HK2']);
  });

  it('kì báo cáo → học kì: tháng 9–12 HK1, tháng 1 cả hai, tháng 2–5 HK2, cả năm không lọc', () => {
    expect(termsForPeriod({ kind: 'month', from: '2026-09-01', to: '2026-09-30' })).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'month', from: '2026-12-01', to: '2026-12-31' })).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'month', from: '2027-01-01', to: '2027-01-31' })).toEqual(['HK1', 'HK2']);
    expect(termsForPeriod({ kind: 'month', from: '2027-03-01', to: '2027-03-31' })).toEqual(['HK2']);
    expect(termsForPeriod({ kind: 'ck1', from: '2026-09-01', to: '2027-01-15' })).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'gk2', from: '2027-01-16', to: '2027-03-15' })).toEqual(['HK2']);
    expect(termsForPeriod({ kind: 'year', from: '2026-09-01', to: '2027-05-31' })).toBeNull();
    expect(termsForPeriod(null)).toBeNull();
  });

  it('yêu cầu cần đạt: báo cáo tháng 9 lớp 10 bỏ Hàm số bậc hai (T10.13), giữ Mệnh đề (T10.01); không lọc khi cả năm', () => {
    const lines = [line('T10.01'), line('T10.13'), line('T10.57')];
    const sep = termsForPeriod({ kind: 'month', from: '2026-09-01', to: '2026-09-30' });
    expect(requirementsInStage(lines, '10', sep).map(l => l.id)).toEqual(['T10.01', 'T10.57']);
    expect(requirementsInStage(lines, '10', termsForPeriod({ kind: 'month', from: '2027-03-01', to: '2027-03-31' })).map(l => l.id)).toEqual(['T10.13']);
    expect(requirementsInStage(lines, '10', null)).toHaveLength(3);
  });

  it('AI chỉ được đề nghị YCCĐ đúng giai đoạn của kì', () => {
    const sep = termsForPeriod({ kind: 'month', from: '2026-09-01', to: '2026-09-30' });
    const options = yccdOptionsForPrompt('10', sep);
    expect(options).toContain('T10.01');
    expect(options).not.toContain('T10.13');
    expect(yccdInStage('10', sep).every(item => !/Hàm số bậc hai/.test(item.topic))).toBe(true);
    expect(yccdOptionsForPrompt('10', null)).toContain('T10.13');
  });
});

describe('mục "Năng lực Toán học" chỉ gồm năng lực cùng giai đoạn', () => {
  const sub = (assignmentId: string): SubmissionDoc => ({
    assignmentId, createdAt: '2026-09-20T03:00:00Z',
    grade: { score: 9, maxScore: 10, teacherApproved: true },
  } as unknown as SubmissionDoc);
  const asg = (id: string, competencyId: string): AssignmentDoc =>
    ({ id, competencyTags: [{ competencyId }], competencyTagsApproved: true }) as unknown as AssignmentDoc;

  it('mẫu số "x/y" chỉ đếm năng lực của học kì: lớp 10 HK1 = 8, HK2 = 9, cả năm = 17', () => {
    expect(parentCompetencyFor('10', [], [], ['HK1'])?.total).toBe(8);
    expect(parentCompetencyFor('10', [], [], ['HK2'])?.total).toBe(9);
    expect(parentCompetencyFor('10', [], [], null)?.total).toBe(17);
  });

  it('bài tháng 9 gắn nhầm Hàm số bậc hai (HK2) thì không hiện trong báo cáo HK1; năng lực HK1 vẫn hiện', () => {
    const assignments = [asg('a1', 'g10-tap-hop-va-menh-de'), asg('a2', 'g10-ham-so-bac-hai')];
    const subs = [sub('a1'), sub('a2')];
    const hk1 = parentCompetencyFor('10', subs, assignments, ['HK1'])!;
    expect(hk1.items.map(item => item.topic)).toEqual(['Tập hợp và mệnh đề']);
    expect(hk1.assessed).toBe(1);
    expect(hk1.total).toBe(8);
    const all = parentCompetencyFor('10', subs, assignments, null)!;
    expect(all.items.map(item => item.topic).sort()).toEqual(['Hàm số bậc hai', 'Tập hợp và mệnh đề']);
  });
});
