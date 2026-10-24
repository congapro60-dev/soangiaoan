import { describe, expect, it } from 'vitest';
import { CASIO_FX580_STEPS, CASIO_REMINDER, formatCasioKeys, getCasioGuideForLesson } from './casioGuide';

describe('getCasioGuideForLesson', () => {
  it('chỉ bài Phương sai lớp 12 mới có hướng dẫn Casio', () => {
    expect(getCasioGuideForLesson('adaptive-1792834706906')).toHaveLength(4);
    expect(getCasioGuideForLesson('adaptive-1792827090625')).toBeNull();
    expect(getCasioGuideForLesson('adaptive-1792831747929')).toBeNull();
  });
});

describe('CASIO_FX580_STEPS', () => {
  it('giữ đúng chuỗi phím của giáo án gốc', () => {
    expect(CASIO_FX580_STEPS[0].keys).toEqual(['MENU', '6', '1']);
    expect(CASIO_FX580_STEPS[1].keys).toEqual(['SHIFT', 'MENU', '▼', '3', '1']);
    expect(CASIO_FX580_STEPS[3].keys).toEqual(['OPTN', '3']);
  });

  it('bước cuối có kết quả để học sinh đối soát trên máy thật', () => {
    expect(CASIO_FX580_STEPS[3].expected).toBe('σx = 1,02469…');
  });

  it('đánh số bước liên tục từ 1', () => {
    expect(CASIO_FX580_STEPS.map(step => step.order)).toEqual([1, 2, 3, 4]);
  });

  it('không bước nào thiếu phím', () => {
    for (const step of CASIO_FX580_STEPS) expect(step.keys.length).toBeGreaterThan(0);
  });
});

describe('formatCasioKeys', () => {
  it('nối phím bằng mũi tên để học sinh đọc theo thứ tự', () => {
    expect(formatCasioKeys(CASIO_FX580_STEPS[0])).toBe('MENU → 6 → 1');
  });
});

describe('CASIO_REMINDER', () => {
  it('giữ câu chốt của giáo án gốc', () => {
    expect(CASIO_REMINDER).toContain('tư duy lập bảng của con người mới là gốc rễ');
  });
});
