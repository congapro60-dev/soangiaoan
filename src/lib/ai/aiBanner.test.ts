import { describe, expect, it } from 'vitest';
import { aiBannerMessage } from './aiBanner';
import type { AiKeyStatus } from './aiBillingApi';

const base: AiKeyStatus = {
  month: '2026-10', charged: true, exempt: false, spentVnd: 0, grossVnd: 0, spentCalls: 0, today: '2026-10-01', todayVnd: 0, todayCalls: 0, usdVnd: 26190, capVnd: null,
  gateEnabled: true, shared: false, hasKey: false, last4: '', keyStatus: null, keyStatusAt: null, consent: false, consentAt: null,
  blockedSubmissionIds: [], balanceVnd: 0, topupCode: 'SPAI123456', paymentAccount: null, vouchers: [], activeVoucher: null, mode: 'own',
};
// `mode` chưa nêu thì suy như máy chủ: nhóm hoặc đã đồng ý = cả hai, còn lại = chỉ khoá riêng.
const status = (patch: Partial<AiKeyStatus>): AiKeyStatus => {
  const merged = { ...base, ...patch };
  return { ...merged, mode: patch.mode ?? (merged.shared || merged.consent ? 'both' : 'own') };
};
const voucher100 = { code: 'THANG10', percent: 100, validFrom: '2026-09-25', validTo: '2026-10-31' };

describe('aiBannerMessage', () => {
  it('chưa bật tính phí hoặc tài khoản chủ dự án → im lặng', () => {
    expect(aiBannerMessage(status({ gateEnabled: false }))).toBeNull();
    expect(aiBannerMessage(status({ exempt: true, shared: true }))).toBeNull();
  });

  it('giáo viên ngoài nhóm chưa chọn cách dùng AI → nhắc nhập khoá hoặc đồng ý', () => {
    expect(aiBannerMessage(status({}))?.text).toContain('nhập khoá Gemini riêng');
    expect(aiBannerMessage(status({ hasKey: true, keyStatus: 'invalid' }))?.text).toContain('không dùng được');
  });

  it('chỉ dùng khoá riêng thì KHÔNG báo hết tiền ví', () => {
    expect(aiBannerMessage(status({ hasKey: true, keyStatus: 'ok', balanceVnd: 0 }))).toBeNull();
  });

  it('nhóm dùng thẳng khoá chung: ví 0đ báo dừng, mã 100% thì thôi', () => {
    expect(aiBannerMessage(status({ shared: true }))).toMatchObject({ urgent: true });
    expect(aiBannerMessage(status({ shared: true, activeVoucher: voucher100 }))).toBeNull();
    expect(aiBannerMessage(status({ shared: true, balanceVnd: 15_000 }))?.text).toContain('nên nạp thêm');
    expect(aiBannerMessage(status({ shared: true, balanceVnd: 150_000 }))).toBeNull();
  });

  it('chọn "chỉ ví web": ví hết tiền báo dừng dù còn khoá riêng dùng được; chọn "chỉ khoá riêng" mà khoá hỏng thì nhắc chuyển sang ví', () => {
    expect(aiBannerMessage(status({ mode: 'wallet', consent: true, hasKey: true, keyStatus: 'ok' }))?.text).toContain('chấm bài bằng AI sẽ tạm dừng');
    expect(aiBannerMessage(status({ mode: 'both', consent: true, hasKey: true, keyStatus: 'ok' }))?.text).toContain('khi khoá riêng hết lượt');
    expect(aiBannerMessage(status({ mode: 'own', shared: true, consent: true, hasKey: true, keyStatus: 'invalid' }))?.text).toContain('ví web');
  });

  it('có bài học sinh đang chờ → luôn báo', () => {
    expect(aiBannerMessage(status({ gateEnabled: false, blockedSubmissionIds: ['a', 'b'] }))?.text).toContain('2 bài');
  });
});
