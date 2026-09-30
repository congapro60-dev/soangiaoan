import { afterEach, describe, expect, it } from 'vitest';
import { geminiRouteFor, getAiModeSnapshot, isOwnKeyFailure, setAiModeSnapshot } from './aiModeStore';

afterEach(() => setAiModeSnapshot(null));

describe('Gemini đi đường nào theo chế độ nguồn khoá', () => {
  const on = (mode: 'own' | 'wallet' | 'both') => ({ mode, gateEnabled: true });

  it('chưa biết chế độ, hoặc web chưa bật tính phí: giữ hành vi cũ (khoá riêng trên trình duyệt)', () => {
    expect(geminiRouteFor(true, null)).toBe('own');
    expect(geminiRouteFor(false, null)).toBe('own');
    expect(geminiRouteFor(false, { mode: 'wallet', gateEnabled: false })).toBe('own');
  });

  it('chỉ khoá riêng → luôn khoá riêng; chỉ ví web → luôn relay dù có khoá', () => {
    expect(geminiRouteFor(true, on('own'))).toBe('own');
    expect(geminiRouteFor(false, on('own'))).toBe('own');
    expect(geminiRouteFor(true, on('wallet'))).toBe('relay');
    expect(geminiRouteFor(false, on('wallet'))).toBe('relay');
  });

  it('cả hai → có khoá thì khoá riêng trước rồi mới relay; chưa có khoá thì relay luôn', () => {
    expect(geminiRouteFor(true, on('both'))).toBe('own-then-relay');
    expect(geminiRouteFor(false, on('both'))).toBe('relay');
  });

  it('QA F6: chế độ lạ hoặc thiếu trong kho → coi như chưa biết, đi khoá riêng (không suy ra ví)', () => {
    expect(geminiRouteFor(false, { mode: undefined, gateEnabled: true } as never)).toBe('own');
    expect(geminiRouteFor(true, { mode: 'khac', gateEnabled: true } as never)).toBe('own');
  });

  it('QA F7: phản hồi đến MUỘN (yêu cầu bắt đầu trước khi giáo viên đổi chế độ / đăng xuất) bị bỏ, không đè chế độ mới', () => {
    const startedAt = performance.now();
    setAiModeSnapshot({ mode: 'wallet', gateEnabled: true }); // giáo viên vừa đổi ở trang ví
    setAiModeSnapshot({ mode: 'own', gateEnabled: true }, startedAt); // phản hồi cũ của chip tới sau
    expect(getAiModeSnapshot()?.mode).toBe('wallet');
    const earlier = performance.now();
    setAiModeSnapshot(null); // đăng xuất
    setAiModeSnapshot({ mode: 'both', gateEnabled: true }, earlier); // phản hồi của phiên cũ
    expect(getAiModeSnapshot()).toBeNull();
    setAiModeSnapshot({ mode: 'both', gateEnabled: true }, performance.now()); // yêu cầu mới, bắt đầu sau → nhận
    expect(getAiModeSnapshot()?.mode).toBe('both');
  });

  it('kho lưu chỉ phát tin khi thật sự đổi', () => {
    setAiModeSnapshot(on('both'));
    const first = getAiModeSnapshot();
    setAiModeSnapshot(on('both'));
    expect(getAiModeSnapshot()).toBe(first);
    setAiModeSnapshot(on('wallet'));
    expect(getAiModeSnapshot()?.mode).toBe('wallet');
  });
});

describe('nhận diện lỗi CỦA KHOÁ (mới đáng chuyển sang ví)', () => {
  it('hết hạn mức / khoá hỏng / hết hạn', () => {
    expect(isOwnKeyFailure(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'))).toBe(true);
    expect(isOwnKeyFailure(new Error('You exceeded your current quota'))).toBe(true);
    expect(isOwnKeyFailure(new Error('API key not valid. Please pass a valid API key.'))).toBe(true);
    expect(isOwnKeyFailure(new Error('API key expired. Please renew the API key.'))).toBe(true);
  });

  it('quá tải, mạng đứt, prompt sai thì KHÔNG chuyển sang ví — tránh đốt tiền oan', () => {
    expect(isOwnKeyFailure(new Error('503 UNAVAILABLE: The model is overloaded'))).toBe(false);
    expect(isOwnKeyFailure(new Error('Hệ thống AI của Google đang quá tải (503)'))).toBe(false);
    expect(isOwnKeyFailure(new Error('Failed to fetch'))).toBe(false);
    expect(isOwnKeyFailure(new Error('Invalid JSON payload received'))).toBe(false);
    expect(isOwnKeyFailure(null)).toBe(false);
  });
});
