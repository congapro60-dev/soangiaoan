import { describe, it, expect } from 'vitest';
import { FIX_FOR_FINDING, countFixableFailures, getFixMenuIds, hasAutoFix } from './fixSuggestions';
import { UPGRADE_MENU } from './menu';
import { auditLesson } from './lessonAudit';
import type { StandardsFinding } from './standardsTypes';

const finding = (id: string, status: StandardsFinding['status']): StandardsFinding => ({
  id,
  title: id,
  status,
  severity: 'medium',
  evidence: '',
  suggestion: '',
  scope: 'all',
});

describe('FIX_FOR_FINDING — tính toàn vẹn của bảng ánh xạ', () => {
  it('mọi mục menu được tham chiếu đều tồn tại thật', () => {
    const known = new Set(UPGRADE_MENU.map((m) => m.id));
    for (const [findingId, menuIds] of Object.entries(FIX_FOR_FINDING)) {
      for (const id of menuIds!) {
        expect(known.has(id), `${findingId} trỏ tới mục menu không có: ${id}`).toBe(true);
      }
    }
  });

  it('mọi tiêu chí được ánh xạ đều là tiêu chí có thật', () => {
    // Chấm một giáo án bất kỳ để lấy đủ id của cả hai tầng, gồm cả bộ kiểm tiết luyện tập.
    const ids = new Set(
      auditLesson('luyện tập, polya, bài 1', { forceSubject: 'toan', forceType: 'practice' })
        .findings.map((f) => f.id),
    );
    for (const findingId of Object.keys(FIX_FOR_FINDING)) {
      expect(ids.has(findingId), `ánh xạ cho tiêu chí không tồn tại: ${findingId}`).toBe(true);
    }
  });

  it('không ánh xạ các tiêu chí app không được tự sửa', () => {
    // App không được bịa tên người soạn, ngày, sĩ số lớp thật.
    expect(hasAutoFix('plan-metadata')).toBe(false);
    expect(hasAutoFix('student-profile')).toBe(false);
  });
});

describe('getFixMenuIds', () => {
  it('trả về mục vá được', () => {
    expect(getFixMenuIds('formative-assessment')).toEqual(['F', 'L']);
    expect(getFixMenuIds('worksheet-appendix')).toEqual(['E']);
  });

  it('trả mảng rỗng cho tiêu chí chưa có công cụ', () => {
    expect(getFixMenuIds('time-continuity')).toEqual([]);
    expect(getFixMenuIds('khong-ton-tai')).toEqual([]);
  });
});

describe('countFixableFailures', () => {
  it('đếm cả fail lẫn warn, bỏ qua pass', () => {
    const findings = [
      finding('formative-assessment', 'fail'), // F, L
      finding('worksheet-appendix', 'warn'), // E
      finding('practice-min-three', 'pass'), // C — đã đạt, không tính
    ];
    expect(countFixableFailures(findings, 'F')).toBe(1);
    expect(countFixableFailures(findings, 'L')).toBe(1);
    expect(countFixableFailures(findings, 'E')).toBe(1);
    expect(countFixableFailures(findings, 'C')).toBe(0);
  });

  it('một mục vá nhiều lỗi thì cộng dồn', () => {
    const findings = [
      finding('differentiation-dimensions', 'fail'),
      finding('dual-hint-routes', 'fail'),
      finding('concrete-differentiation', 'fail'),
    ];
    expect(countFixableFailures(findings, 'Q')).toBe(3);
  });

  it('giáo án đạt hết thì không mục nào được gắn nhãn', () => {
    const findings = Object.keys(FIX_FOR_FINDING).map((id) => finding(id, 'pass'));
    for (const m of UPGRADE_MENU) {
      expect(countFixableFailures(findings, m.id)).toBe(0);
    }
  });
});
