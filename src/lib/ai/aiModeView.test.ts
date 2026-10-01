import { describe, expect, it } from 'vitest';
import { aiModeOptions, glmWalletNotice, needsConsent, sourceStates, vendorWalletHint, walletScopeText } from './aiModeView';

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

describe('GLM 5.2 — lời nhắc giá ở Cài đặt', () => {
  it('nói rõ trừ ví, giá theo bảng giá và ước tính một giáo án; không còn câu "key chung trên biến môi trường"', () => {
    const { text, warning } = glmWalletNotice(true, '2026-10-01');
    expect(text).toContain('TRỪ VÍ');
    expect(text).toContain('$0.5625 vào · $1.8 ra');
    expect(text).toContain('khoảng 590đ cho một giáo án'); // 8.000 vào + 10.000 ra, 26.000đ/USD = 585đ, làm tròn chục
    expect(text).toContain('đồng ý tính phí');
    expect(warning).toBeNull();
  });

  it('máy chủ chưa bật GLM thì cảnh báo thẳng; chưa biết (máy chủ cũ) thì không cảnh báo nhầm', () => {
    expect(glmWalletNotice(false).warning).toContain('chưa bật GLM 5.2');
    expect(glmWalletNotice(undefined).warning).toBeNull();
  });

  it('trang ví nhắc GLM cũng trừ ví', () => {
    expect(walletScopeText(undefined)).toContain('GLM 5.2');
    expect(walletScopeText(['claude'])).toContain('GLM 5.2');
  });
});
