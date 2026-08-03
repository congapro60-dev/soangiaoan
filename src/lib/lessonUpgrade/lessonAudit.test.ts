import { describe, it, expect } from 'vitest';
import { auditLesson, formatLessonReport } from './lessonAudit';

const TOAN = `
Trường THPT A. Lớp: 10A1. Giáo viên soạn: Nguyễn Văn A. Ngày soạn 12/08. Tiết 25 theo PPCT.
Môn: Toán. Bài: Hàm số bậc hai và đồ thị.
# Khởi động (trải nghiệm)
# Hình thành kiến thức mới
# Luyện tập củng cố: bài 1, bài 2, bài 3
# Sơ kết — BTVN: làm bài 4 trang 30`;

const VAN = `
Môn: Ngữ văn. Lớp 10.
Phân tích tác phẩm và nhân vật trữ tình, chỉ ra các biện pháp tu từ trong bài.`;

describe('auditLesson — ghép 2 tầng', () => {
  it('giáo án Toán chạy cả hai tầng', () => {
    const res = auditLesson(TOAN);
    expect(res.subject).toBe('toan');
    expect(res.mathLayerApplied).toBe(true);
    expect(res.findings.some((f) => f.id === 'plan-metadata')).toBe(true);
    expect(res.findings.some((f) => f.id === 'four-phases')).toBe(true);
  });

  it('giáo án Ngữ văn KHÔNG bị chấm theo tiêu chí Toán', () => {
    const res = auditLesson(VAN);
    expect(res.subject).toBe('ngu-van');
    expect(res.mathLayerApplied).toBe(false);
    expect(res.lessonType).toBe('unknown');
    expect(res.findings).toHaveLength(10);
    expect(res.findings.some((f) => f.id === 'four-phases')).toBe(false);
    expect(res.findings.some((f) => f.id === 'polya-4-steps')).toBe(false);
  });

  it('forceSubject ép được lớp kiểm Toán', () => {
    expect(auditLesson(VAN, { forceSubject: 'toan' }).mathLayerApplied).toBe(true);
  });

  it('criticalFailures chỉ đếm tiêu chí severity high đang fail', () => {
    const res = auditLesson(TOAN);
    const expected = res.findings.filter((f) => f.severity === 'high' && f.status === 'fail').length;
    expect(res.criticalFailures).toBe(expected);
  });

  it('mọi id tiêu chí là duy nhất — panel dùng id làm React key', () => {
    const ids = auditLesson(TOAN).findings.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('formatLessonReport', () => {
  it('ghi rõ môn và gắn mã Danielson', () => {
    const md = formatLessonReport(auditLesson(TOAN));
    expect(md).toMatch(/## Rà soát giáo án — Toán/);
    expect(md).toMatch(/Danielson 1e/);
    expect(md).toMatch(/Đạt \d+\/\d+ tiêu chí/);
  });

  it('nói rõ khi chỉ áp bộ tiêu chí toàn trường', () => {
    const md = formatLessonReport(auditLesson(VAN));
    expect(md).toMatch(/Ngữ văn — chỉ áp bộ tiêu chí toàn trường/);
  });
});
