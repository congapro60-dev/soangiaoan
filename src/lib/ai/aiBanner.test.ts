import { describe, expect, it } from 'vitest';
import { aiBannerMessage } from './aiBanner';
import type { AiKeyStatus } from './aiBillingApi';

const base: AiKeyStatus = {
  month: '2026-10', charged: true, exempt: false, spentVnd: 0, grossVnd: 0, spentCalls: 0, usdVnd: 26190, capVnd: null,
  gateEnabled: true, shared: false, hasKey: false, last4: '', keyStatus: null, keyStatusAt: null, consent: false, consentAt: null,
  blockedSubmissionIds: [], balanceVnd: 0, topupCode: 'SPAI123456', paymentAccount: null, vouchers: [], activeVoucher: null,
};
const status = (patch: Partial<AiKeyStatus>): AiKeyStatus => ({ ...base, ...patch });
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

  it('có bài học sinh đang chờ → luôn báo', () => {
    expect(aiBannerMessage(status({ gateEnabled: false, blockedSubmissionIds: ['a', 'b'] }))?.text).toContain('2 bài');
  });
});
