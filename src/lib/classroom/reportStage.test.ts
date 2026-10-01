import { describe, expect, it } from 'vitest';
import { asProgram, competencyTerms, inStage, stageForPeriod, termsForPeriod, termsOfSgk } from './reportStage';
import { aggregateRequirementLines, requirementsInStage, yccdInStage, yccdOptionsForPrompt, type EvidenceSubmission, type ParentRequirementLine } from './parentRequirements';
import { parentCompetencyFor } from './parentReportBuilder';
import { loadClassProgram, saveClassProgram } from './classProgram';
import type { AssignmentDoc, SubmissionDoc } from './types';

const line = (id: string): ParentRequirementLine => ({ id, level: 'vung', evidence: 3, percent: 90, note: '' });
const sort = (terms: readonly string[] | null) => [...(terms ?? [])].sort();
const SEP = { kind: 'month', from: '2026-09-01', to: '2026-09-30' };

describe('giai đoạn của năng lực / yêu cầu cần đạt', () => {
  it('lớp 10 (TDS và MOET giống nhau): Hàm số bậc hai (Bài 16) là HK2, Mệnh đề (Bài 1) là HK1', () => {
    for (const program of [null, 'TDS', 'MOET'] as const) {
      expect(competencyTerms('g10-ham-so-bac-hai', program)).toEqual(['HK2']);
      expect(competencyTerms('g10-tap-hop-va-menh-de', program)).toEqual(['HK1']);
      expect(competencyTerms('g10-vecto-mat-phang-toa-do', program)).toEqual(['HK1']);
      expect(competencyTerms('g10-xac-suat-co-dien', program)).toEqual(['HK2']);
    }
  });

  it('TDS: Tích phân + Ứng dụng tích phân (khối 12) dạy HK1, Phương trình mặt phẳng dạy HK2', () => {
    expect(competencyTerms('g12-nguyen-ham-tich-phan', 'TDS')).toEqual(['HK1']);
    expect(competencyTerms('g12-ung-dung-tich-phan', 'TDS')).toEqual(['HK1']);
    expect(competencyTerms('g12-pt-mat-phang', 'TDS')).toEqual(['HK2']);
    expect(competencyTerms('g11-gioi-han', 'TDS')).toEqual(['HK1']);
    expect(sort(competencyTerms('g11-ham-mu-va-logarit', 'TDS'))).toEqual(['HK1', 'HK2']); // Bài 18–19 HK1, Bài 20–21 HK2
  });

  it('MOET xếp ngược: Phương trình mặt phẳng HK1, Ứng dụng tích phân HK2; mũ–lôgarit (Bài 18–21) trọn HK2', () => {
    expect(competencyTerms('g12-pt-mat-phang', 'MOET')).toEqual(['HK1']);
    expect(competencyTerms('g12-ung-dung-tich-phan', 'MOET')).toEqual(['HK2']);
    expect(sort(competencyTerms('g12-nguyen-ham-tich-phan', 'MOET'))).toEqual(['HK1', 'HK2']); // Bài 11 HK1, Bài 12 HK2
    expect(competencyTerms('g11-ham-mu-va-logarit', 'MOET')).toEqual(['HK2']);
  });

  it('chưa chọn chương trình → bài hai chương trình xếp khác nhau tính cho cả hai học kì', () => {
    expect(sort(competencyTerms('g12-pt-mat-phang', null))).toEqual(['HK1', 'HK2']);
    expect(sort(competencyTerms('g12-ung-dung-tich-phan', null))).toEqual(['HK1', 'HK2']);
    expect(competencyTerms('g12-pt-mat-cau', null)).toEqual(['HK2']);
  });

  it('năng lực lạ hoặc không rõ bài → null (không bị lọc nhầm)', () => {
    expect(competencyTerms('g12-dao-ham')).toBeNull();
    expect(competencyTerms('khong-co')).toBeNull();
    const hk1 = { terms: ['HK1'], program: null } as const;
    expect(inStage(null, hk1)).toBe(true);
    expect(inStage(['HK2'], null)).toBe(true);
    expect(inStage(['HK2'], hk1)).toBe(false);
  });

  it('đọc "Bài 3–4", "Bài 8–11", "Chương V"', () => {
    expect(termsOfSgk(10, 'Bài 3–4')).toEqual(['HK1']);
    expect(termsOfSgk(10, 'Bài 8–11')).toEqual(['HK1']);
    expect(termsOfSgk(10, 'Bài 16')).toEqual(['HK2']);
    expect(termsOfSgk(10, 'Chương V')).toBeNull();
    expect(termsOfSgk(11, 'Bài 18', 'TDS')).toEqual(['HK1']);
    expect(termsOfSgk(11, 'Bài 18', 'MOET')).toEqual(['HK2']);
    expect(sort(termsOfSgk(11, 'Bài 18'))).toEqual(['HK1', 'HK2']);
  });

  it('kì báo cáo → học kì: tháng 9–12 HK1, tháng 1 cả hai, tháng 2–5 HK2, cả năm không lọc', () => {
    expect(termsForPeriod(SEP)).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'month', from: '2026-12-01', to: '2026-12-31' })).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'month', from: '2027-01-01', to: '2027-01-31' })).toEqual(['HK1', 'HK2']);
    expect(termsForPeriod({ kind: 'month', from: '2027-03-01', to: '2027-03-31' })).toEqual(['HK2']);
    expect(termsForPeriod({ kind: 'ck1', from: '2026-09-01', to: '2027-01-15' })).toEqual(['HK1']);
    expect(termsForPeriod({ kind: 'gk2', from: '2027-01-16', to: '2027-03-15' })).toEqual(['HK2']);
    expect(termsForPeriod({ kind: 'year', from: '2026-09-01', to: '2027-05-31' })).toBeNull();
    expect(termsForPeriod(null)).toBeNull();
    expect(stageForPeriod({ kind: 'year', from: '2026-09-01', to: '2027-05-31' }, 'TDS')).toBeNull();
    expect(stageForPeriod(SEP, 'TDS')).toEqual({ terms: ['HK1'], program: 'TDS' });
  });

  it('yêu cầu cần đạt lớp 10: báo cáo tháng 9 bỏ Hàm số bậc hai (T10.13), giữ Mệnh đề (T10.01); không lọc khi cả năm', () => {
    const lines = [line('T10.01'), line('T10.13'), line('T10.57')];
    expect(requirementsInStage(lines, '10', stageForPeriod(SEP)).map(l => l.id)).toEqual(['T10.01', 'T10.57']);
    expect(requirementsInStage(lines, '10', stageForPeriod({ kind: 'month', from: '2027-03-01', to: '2027-03-31' })).map(l => l.id)).toEqual(['T10.13']);
    expect(requirementsInStage(lines, '10', null)).toHaveLength(3);
  });

  it('yêu cầu cần đạt theo chương trình: tháng 9 khối 12 — TDS có Tích phân (T12.15) không có Phương trình mặt phẳng (T12.24); MOET ngược lại', () => {
    const lines = [line('T12.15'), line('T12.24')];
    expect(requirementsInStage(lines, '12', stageForPeriod(SEP, 'TDS')).map(l => l.id)).toEqual(['T12.15']);
    expect(requirementsInStage(lines, '12', stageForPeriod(SEP, 'MOET')).map(l => l.id)).toEqual(['T12.24']);
    expect(requirementsInStage(lines, '12', stageForPeriod(SEP, null)).map(l => l.id)).toEqual(['T12.15', 'T12.24']);
  });

  it('khối 11 TDS: Lũy thừa (T11.41, Bài 18) vào báo cáo tháng 11; MOET thì không', () => {
    const nov = { kind: 'month', from: '2026-11-01', to: '2026-11-30' };
    expect(requirementsInStage([line('T11.41')], '11', stageForPeriod(nov, 'TDS'))).toHaveLength(1);
    expect(requirementsInStage([line('T11.41')], '11', stageForPeriod(nov, 'MOET'))).toHaveLength(0);
  });

  it('AI chỉ được đề nghị YCCĐ đúng giai đoạn của kì', () => {
    const options = yccdOptionsForPrompt('10', stageForPeriod(SEP));
    expect(options).toContain('T10.01');
    expect(options).not.toContain('T10.13');
    expect(yccdInStage('10', stageForPeriod(SEP)).every(item => !/Hàm số bậc hai/.test(item.topic))).toBe(true);
    expect(yccdOptionsForPrompt('10', null)).toContain('T10.13');
  });

  it('AI lỡ ghép câu sang YCCĐ của học kì khác thì dòng đó bị bỏ, dòng đúng giai đoạn giữ lại', () => {
    const evidence: EvidenceSubmission[] = [{ ma: 'b1', ten: 'Bài 1', ngay: '2026-09-10', cau: [
      { ma: 'b1q1', diem: 1, toiDa: 1, ketQua: 'đúng' },
      { ma: 'b1q2', diem: 1, toiDa: 1, ketQua: 'đúng' },
    ] }];
    const draft = { yccd: [{ ma: 'T10.01', cau: ['b1q1'] }, { ma: 'T10.13', cau: ['b1q2'] }] };
    expect(aggregateRequirementLines('10', evidence, draft, null).map(l => l.id)).toEqual(['T10.01', 'T10.13']);
    expect(aggregateRequirementLines('10', evidence, draft, stageForPeriod(SEP)).map(l => l.id)).toEqual(['T10.01']);
  });

  it('chương trình chỉ nhận TDS hoặc MOET; lưu theo từng lớp trên máy', () => {
    expect(asProgram('TDS')).toBe('TDS');
    expect(asProgram('moet')).toBeNull();
    expect(asProgram(undefined)).toBeNull();
    const store = new Map<string, string>();
    (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    expect(loadClassProgram('lop-1')).toBeNull();
    saveClassProgram('lop-1', 'TDS');
    saveClassProgram('lop-2', 'MOET');
    expect(loadClassProgram('lop-1')).toBe('TDS');
    expect(loadClassProgram('lop-2')).toBe('MOET');
    saveClassProgram('lop-1', null);
    expect(loadClassProgram('lop-1')).toBeNull();
    delete (globalThis as any).localStorage;
  });
});

describe('mục "Năng lực Toán học" chỉ gồm năng lực cùng giai đoạn', () => {
  const sub = (assignmentId: string): SubmissionDoc => ({
    assignmentId, createdAt: '2026-09-20T03:00:00Z',
    grade: { score: 9, maxScore: 10, teacherApproved: true },
  } as unknown as SubmissionDoc);
  const asg = (id: string, competencyId: string): AssignmentDoc =>
    ({ id, competencyTags: [{ competencyId }], competencyTagsApproved: true }) as unknown as AssignmentDoc;
  const hk1 = stageForPeriod(SEP);
  const hk2 = stageForPeriod({ kind: 'month', from: '2027-03-01', to: '2027-03-31' });

  it('mẫu số "x/y" chỉ đếm năng lực của học kì: lớp 10 HK1 = 8, HK2 = 9, cả năm = 17', () => {
    expect(parentCompetencyFor('10', [], [], hk1)?.total).toBe(8);
    expect(parentCompetencyFor('10', [], [], hk2)?.total).toBe(9);
    expect(parentCompetencyFor('10', [], [], null)?.total).toBe(17);
  });

  it('bài tháng 9 gắn nhầm Hàm số bậc hai (HK2) thì không hiện trong báo cáo HK1; năng lực HK1 vẫn hiện', () => {
    const assignments = [asg('a1', 'g10-tap-hop-va-menh-de'), asg('a2', 'g10-ham-so-bac-hai')];
    const subs = [sub('a1'), sub('a2')];
    const result = parentCompetencyFor('10', subs, assignments, hk1)!;
    expect(result.items.map(item => item.topic)).toEqual(['Tập hợp và mệnh đề']);
    expect(result.assessed).toBe(1);
    expect(result.total).toBe(8);
    const all = parentCompetencyFor('10', subs, assignments, null)!;
    expect(all.items.map(item => item.topic).sort()).toEqual(['Hàm số bậc hai', 'Tập hợp và mệnh đề']);
  });

  it('khối 12 theo chương trình của lớp: Phương trình mặt phẳng chỉ vào báo cáo HK1 của lớp MOET, không vào lớp TDS', () => {
    const assignments = [asg('a1', 'g12-pt-mat-phang')];
    const subs = [sub('a1')];
    const tds = parentCompetencyFor('12', subs, assignments, stageForPeriod(SEP, 'TDS'))!;
    const moet = parentCompetencyFor('12', subs, assignments, stageForPeriod(SEP, 'MOET'))!;
    const chua = parentCompetencyFor('12', subs, assignments, stageForPeriod(SEP, null))!;
    expect(tds.items.map(item => item.topic)).toEqual([]);
    expect(moet.items.map(item => item.topic)).toEqual(['Phương trình mặt phẳng']);
    expect(chua.items.map(item => item.topic)).toEqual(['Phương trình mặt phẳng']); // chưa chọn → không ẩn nhầm
  });
});
