import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({ auth: { currentUser: null } }));

import { effectiveBranding, effectiveClassProgram, ownerBrandingDefaults, ownerClassProgram } from './ownerDefaults';

const OWNER = 'congapro60@gmail.com';

const withStorage = (data: Record<string, string>, run: () => void) => {
  const store = new Map(Object.entries(data));
  (globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  try { run(); } finally { delete (globalThis as any).localStorage; }
};

describe('giá trị điền sẵn cho chủ dự án', () => {
  it('chủ dự án (cả hai mail admin) có tên trường + tên giáo viên; giáo viên khác không có gì', () => {
    expect(ownerBrandingDefaults(OWNER)).toEqual({ schoolName: 'The Dewey Schools', teacherName: 'Vũ Việt Cường' });
    expect(ownerBrandingDefaults('cuong.vuviet@thedeweyschools.edu.vn')).not.toBeNull();
    expect(ownerBrandingDefaults('co.lan@truong.vn')).toBeNull();
    expect(ownerBrandingDefaults(null)).toBeNull();
  });

  it('11 Columbus và 12 VN Toán 1 → TDS cho chủ dự án; lớp khác và giáo viên khác → không đoán', () => {
    expect(ownerClassProgram(OWNER, '11 Columbus')).toBe('TDS');
    expect(ownerClassProgram(OWNER, '11Columbus')).toBe('TDS');
    expect(ownerClassProgram(OWNER, '12 VN Toán 1')).toBe('TDS');
    expect(ownerClassProgram(OWNER, '10Olinda')).toBeNull();
    expect(ownerClassProgram('co.lan@truong.vn', '11 Columbus')).toBeNull();
  });

  it('giá trị đã lưu trên máy luôn thắng giá trị điền sẵn; chỗ trống mới lấy điền sẵn', () => {
    withStorage({}, () => {
      expect(effectiveBranding(OWNER)).toMatchObject({ schoolName: 'The Dewey Schools', teacherName: 'Vũ Việt Cường' });
      expect(effectiveBranding('co.lan@truong.vn')).toMatchObject({ schoolName: '', teacherName: '' });
      expect(effectiveClassProgram('c1', '11 Columbus', OWNER)).toBe('TDS');
    });
    withStorage({
      'smartplan.parentBranding': JSON.stringify({ schoolName: 'Trường Khác', teacherName: '', logoDataUrl: '' }),
      'smartplan.classProgram.c1': 'MOET',
    }, () => {
      expect(effectiveBranding(OWNER)).toMatchObject({ schoolName: 'Trường Khác', teacherName: 'Vũ Việt Cường' });
      expect(effectiveClassProgram('c1', '11 Columbus', OWNER)).toBe('MOET');
    });
  });
});
