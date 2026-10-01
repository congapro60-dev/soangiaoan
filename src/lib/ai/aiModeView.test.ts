import { describe, expect, it } from 'vitest';
import { aiModeOptions, needsConsent, sourceStates, vendorWalletHint, walletScopeText } from './aiModeView';

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

describe('ví web trả cho hãng AI nào — câu chữ', () => {
  it('máy chủ chưa bật hãng nào: nói rõ chỉ Gemini dùng ví, các hãng khác dùng khoá riêng', () => {
    for (const none of [undefined, []]) {
      const text = walletScopeText(none);
      expect(text).toContain('ví web không trả cho các hãng này');
      expect(text).not.toContain('cũng dùng được ví web');
    }
  });

  it('đã bật Claude và ChatGPT: nói đúng tên và rằng không cần dán khoá; Grok/DeepSeek vẫn khoá riêng', () => {
    const text = walletScopeText(['claude', 'openai']);
    expect(text).toContain('Claude và ChatGPT cũng dùng được ví web');
    expect(text).toContain('Grok, DeepSeek');
    expect(walletScopeText(['claude'])).toContain('Claude cũng dùng được ví web');
    expect(walletScopeText(['claude'])).not.toContain('ChatGPT cũng');
  });

  it('nhắc ở Cài đặt chỉ khi hãng đang xem được ví trả thay', () => {
    expect(vendorWalletHint('claude', ['claude'])).toContain('Claude');
    expect(vendorWalletHint('openai', ['claude'])).toBeNull();
    expect(vendorWalletHint('grok', ['claude', 'openai'])).toBeNull();
    expect(vendorWalletHint('claude', undefined)).toBeNull();
  });
});
