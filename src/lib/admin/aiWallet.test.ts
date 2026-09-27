import { describe, expect, it } from 'vitest';
import {
  activePaymentAccount,
  bestActiveVoucher,
  canAffordUsage,
  canRedeemVoucher,
  chargeForCall,
  extractTopupCode,
  isPaymentQrUrl,
  makeTopupCode,
  monthsBetween,
  normalizePaymentSettings,
  sepayQrUrl,
  statementForMonth,
  statementTotals,
  validatePaymentAccount,
  validateVoucherInput,
} from './aiWallet';

const voucher = { code: 'THANG10', percent: 100, validFrom: '2026-10-01', validTo: '2026-10-31' };

describe('ví AI + mã giảm giá', () => {
  it('tạo mã: 10–100%, thời hạn hợp lệ, mã viết hoa', () => {
    expect(validateVoucherInput({ code: ' thang10 ', percent: 100, validFrom: '2026-10-01', validTo: '2026-10-31' }))
      .toMatchObject({ ok: true, voucher: { code: 'THANG10', percent: 100, active: true, maxUses: 0 } });
    expect(validateVoucherInput({ code: 'X9', percent: 50, validFrom: '2026-10-01', validTo: '2026-10-31' })).toMatchObject({ ok: false });
    expect(validateVoucherInput({ code: 'GIAM5', percent: 5, validFrom: '2026-10-01', validTo: '2026-10-31' })).toMatchObject({ ok: false });
    expect(validateVoucherInput({ code: 'GIAM200', percent: 150, validFrom: '2026-10-01', validTo: '2026-10-31' })).toMatchObject({ ok: false });
    expect(validateVoucherInput({ code: 'NGUOC', percent: 20, validFrom: '2026-10-31', validTo: '2026-10-01' })).toMatchObject({ ok: false });
  });

  it('đổi mã: đúng người, còn hạn, còn lượt, chưa dùng', () => {
    const def = { ...voucher, active: true, maxUses: 3, usedCount: 0, allowedEmails: ['co.hanh@truong.vn'] };
    expect(canRedeemVoucher(def, 'Co.Hanh@truong.vn', '2026-09-28', false)).toBeNull();
    expect(canRedeemVoucher(def, 'nguoi.khac@x.vn', '2026-09-28', false)).toMatch(/không dành/);
    expect(canRedeemVoucher(def, 'co.hanh@truong.vn', '2026-11-01', false)).toMatch(/hết hạn/);
    expect(canRedeemVoucher({ ...def, usedCount: 3 }, 'co.hanh@truong.vn', '2026-10-02', false)).toMatch(/hết lượt/);
    expect(canRedeemVoucher(def, 'co.hanh@truong.vn', '2026-10-02', true)).toMatch(/đã dùng/);
    expect(canRedeemVoucher(null, 'a@b.vn', '2026-10-02', false)).toMatch(/không tồn tại/);
  });

  it('chỉ áp mã đang hiệu lực, lấy mức cao nhất, không cộng dồn', () => {
    const list = [voucher, { code: 'GIAM30', percent: 30, validFrom: '2026-09-01', validTo: '2026-12-31' }];
    expect(bestActiveVoucher(list, '2026-10-15')?.code).toBe('THANG10');
    expect(bestActiveVoucher(list, '2026-11-02')?.code).toBe('GIAM30');
    expect(bestActiveVoucher(list, '2027-01-01')).toBeNull();
  });

  it('tiền một lượt: gốc làm tròn đồng, trừ ví sau giảm; mã 100% thì 0đ', () => {
    expect(chargeForCall(0.0234, 26_190, null)).toEqual({ grossVnd: 613, discountPct: 0, voucherCode: null, chargeVnd: 613 });
    expect(chargeForCall(0.0234, 26_190, { ...voucher, percent: 30, code: 'GIAM30' })).toEqual({ grossVnd: 613, discountPct: 30, voucherCode: 'GIAM30', chargeVnd: 429 });
    expect(chargeForCall(0.0234, 26_190, voucher).chargeVnd).toBe(0);
  });

  it('hết số dư thì dừng, trừ khi có mã 100% đang hiệu lực', () => {
    expect(canAffordUsage(0, null)).toBe(false);
    expect(canAffordUsage(-200, null)).toBe(false);
    expect(canAffordUsage(1, null)).toBe(true);
    expect(canAffordUsage(0, voucher)).toBe(true);
    expect(canAffordUsage(0, { ...voucher, percent: 90 })).toBe(false);
  });

  it('mã nạp tiền: tạo không ký tự dễ nhầm; đọc lại được dù ngân hàng chèn chữ/dấu cách', () => {
    const code = makeTopupCode(() => 0.5);
    expect(code).toMatch(/^SPAI[A-HJ-NP-Z2-9]{6}$/);
    expect(extractTopupCode('NGUYEN VAN A chuyen tien SPAI 7K2QX9 FT2610', null)).toBe('SPAI7K2QX9');
    expect(extractTopupCode(null, 'spai7k2qx9')).toBe('SPAI7K2QX9');
    expect(extractTopupCode('nap tien dien thoai')).toBeNull();
  });

  it('sao kê khớp: đầu kỳ + nạp + điều chỉnh − trừ = cuối kỳ', () => {
    expect(statementTotals(50_000, 200_000, -10_000, 73_500)).toEqual({ openingVnd: 50_000, topupVnd: 200_000, adjustVnd: -10_000, chargeVnd: 73_500, closingVnd: 166_500 });
  });

  it('sao kê tháng tính lại từ toàn bộ sổ: đầu kỳ = mọi dòng trước tháng', () => {
    const topups = [{ month: '2026-10', amountVnd: 100_000 }, { month: '2026-11', amountVnd: 200_000 }];
    const adjustments = [{ month: '2026-10', amountVnd: 20_000 }];
    const charges = [{ month: '2026-10', amountVnd: 30_000 }, { month: '2026-11', amountVnd: 45_500 }];
    expect(statementForMonth('2026-10', topups, adjustments, charges)).toEqual({ openingVnd: 0, topupVnd: 100_000, adjustVnd: 20_000, chargeVnd: 30_000, closingVnd: 90_000 });
    expect(statementForMonth('2026-11', topups, adjustments, charges)).toEqual({ openingVnd: 90_000, topupVnd: 200_000, adjustVnd: 0, chargeVnd: 45_500, closingVnd: 244_500 });
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2027-02', '2027-01', '2026-12', '2026-11']);
  });

  it('QR SePay điền sẵn số tiền + nội dung', () => {
    expect(sepayQrUrl({ bank: 'Vietcombank', accountNumber: '0123456789' }, 100_000, 'SPAI7K2QX9'))
      .toBe('https://qr.sepay.vn/img?acc=0123456789&bank=Vietcombank&amount=100000&des=SPAI7K2QX9');
  });
});

describe('tài khoản nhận tiền nạp', () => {
  it('kiểm dữ liệu tài khoản; ảnh QR chỉ nhận link Storage payment-qr của web', () => {
    expect(validatePaymentAccount({ bank: 'MBBank', accountNumber: '0123 456 789', accountName: ' NGUYEN VAN A ' }))
      .toEqual({ ok: true, account: { bank: 'MBBank', accountNumber: '0123456789', accountName: 'NGUYEN VAN A', qrImageUrl: '' } });
    expect(validatePaymentAccount({ bank: '', accountNumber: '0123456789' }).ok).toBe(false);
    expect(validatePaymentAccount({ bank: 'MBBank', accountNumber: '12-34' }).ok).toBe(false);
    expect(validatePaymentAccount({ bank: 'MBBank', accountNumber: '0123456789', qrImageUrl: 'https://la.example/qr.png' }).ok).toBe(false);
    expect(isPaymentQrUrl('https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/payment-qr%2Fab12.png?alt=media&token=1f2a-9c')).toBe(true);
    expect(isPaymentQrUrl('https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/homework%2Fab12.png?alt=media&token=1f2a')).toBe(false);
  });

  it('bỏ dữ liệu hỏng; tài khoản đang dùng không còn thì lấy tài khoản đầu', () => {
    const settings = normalizePaymentSettings({
      accounts: [{ id: 'a', bank: 'MBBank', accountNumber: '0123456789' }, { id: 'b', bank: 'ACB', accountNumber: 'xx' }, 'rác'],
      activeId: 'khong-con',
    });
    expect(settings.accounts.map(a => a.id)).toEqual(['a']);
    expect(settings.activeId).toBe('a');
    expect(activePaymentAccount(settings)?.bank).toBe('MBBank');
    expect(activePaymentAccount(normalizePaymentSettings(undefined))).toBeNull();
  });
});
