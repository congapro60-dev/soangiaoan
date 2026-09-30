import { describe, expect, it } from 'vitest';
import { aiModeOptions, needsConsent, sourceStates } from './aiModeView';

describe('chế độ nguồn khoá — phần hiển thị', () => {
  it('ba lựa chọn theo đúng thứ tự, mô tả ví khác cho tài khoản được miễn', () => {
    expect(aiModeOptions(false).map(o => o.id)).toEqual(['own', 'wallet', 'both']);
    expect(aiModeOptions(false)[1].desc).toContain('trừ ví');
    expect(aiModeOptions(true)[1].desc).toContain('không bị trừ ví');
  });

  it('trạng thái từng nguồn: nguồn không dùng thì "Tắt", cả hai thì khoá riêng ưu tiên 1 và ví dự phòng', () => {
    expect(sourceStates('own')).toEqual({ own: { label: 'Đang dùng', active: true }, wallet: { label: 'Tắt', active: false } });
    expect(sourceStates('wallet')).toEqual({ own: { label: 'Tắt', active: false }, wallet: { label: 'Đang dùng', active: true } });
    expect(sourceStates('both')).toEqual({ own: { label: 'Ưu tiên 1', active: true }, wallet: { label: 'Dự phòng', active: true } });
  });

  it('chỉ chọn ví/cả hai lần đầu ngoài nhóm mới phải tích đồng ý', () => {
    expect(needsConsent({ shared: false, consent: false }, 'own')).toBe(false);
    expect(needsConsent({ shared: false, consent: false }, 'wallet')).toBe(true);
    expect(needsConsent({ shared: false, consent: false }, 'both')).toBe(true);
    expect(needsConsent({ shared: false, consent: true }, 'both')).toBe(false);
    expect(needsConsent({ shared: true, consent: false }, 'wallet')).toBe(false);
  });
});
