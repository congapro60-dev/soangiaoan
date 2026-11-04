import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AiKeyStatus } from '../../../lib/ai/aiBillingApi';
import { TopupQrForm } from './TopupDialog';

const status = (patch: Partial<AiKeyStatus> = {}): AiKeyStatus => ({
  balanceVnd: 0,
  topupCode: 'AIGV1234',
  paymentAccount: { bank: 'MB', accountNumber: '0123456789', accountName: 'CHU DU AN' },
  ...patch,
}) as AiKeyStatus;

describe('nạp tiền ví AI — mở là quét được ngay', () => {
  it('có sẵn mã QR (mặc định 100.000đ), các mức gợi ý và nội dung chuyển khoản riêng của GV', () => {
    const html = renderToStaticMarkup(<TopupQrForm status={status()} onUpdated={() => undefined} />);
    expect(html).toContain('Mã QR chuyển khoản');
    for (const amount of ['50.000', '100.000', '200.000', '500.000']) expect(html).toContain(amount);
    expect(html).toContain('AIGV1234');
    expect(html).toContain('Đang chờ tiền về');
  });
  it('quản trị chưa cài tài khoản nhận tiền thì nói rõ lí do, không hiện mã QR hỏng', () => {
    const html = renderToStaticMarkup(<TopupQrForm status={status({ paymentAccount: null })} onUpdated={() => undefined} />);
    expect(html).toContain('Quản trị chưa cài tài khoản nhận tiền');
    expect(html).not.toContain('Mã QR chuyển khoản');
  });
});
