import { describe, it, expect } from 'vitest';
import {
  EMPTY_LOCK,
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  createPin,
  hashPin,
  isLocked,
  isValidPinShape,
  minutesUntilUnlock,
  nextLockState,
  normalizeJoinCode,
  verifyPin,
} from '../_classroom-core.js';

const NOW = new Date('2026-08-20T10:00:00.000Z');

describe('PIN', () => {
  it('sinh PIN đúng 4 chữ số', () => {
    for (let i = 0; i < 200; i += 1) {
      const pin = createPin();
      expect(pin).toMatch(/^\d{4}$/);
      expect(isValidPinShape(pin)).toBe(true);
    }
  });

  it('băm rồi kiểm lại đúng PIN → true, sai PIN → false', () => {
    const stored = hashPin('1234');
    expect(verifyPin('1234', stored)).toBe(true);
    expect(verifyPin('1235', stored)).toBe(false);
  });

  it('hai lần băm cùng một PIN cho chuỗi khác nhau (có muối riêng)', () => {
    expect(hashPin('1234')).not.toBe(hashPin('1234'));
  });

  it('không vỡ khi chuỗi lưu bị hỏng', () => {
    expect(verifyPin('1234', '')).toBe(false);
    expect(verifyPin('1234', 'khong-co-dau-hai-cham')).toBe(false);
    expect(verifyPin('1234', 'muoi:')).toBe(false);
    expect(verifyPin('1234', 'muoi:abcd')).toBe(false);
  });

  it('từ chối PIN sai định dạng', () => {
    expect(isValidPinShape('123')).toBe(false);
    expect(isValidPinShape('12345')).toBe(false);
    expect(isValidPinShape('12a4')).toBe(false);
    expect(isValidPinShape(1234)).toBe(false);
    expect(isValidPinShape(null)).toBe(false);
  });
});

describe('khoá sau nhiều lần sai — thứ duy nhất làm PIN 4 số có nghĩa', () => {
  it('sai chưa đủ ngưỡng thì chỉ tăng bộ đếm, chưa khoá', () => {
    let state = EMPTY_LOCK;
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i += 1) {
      state = nextLockState(state, false, NOW);
      expect(state.failedAttempts).toBe(i);
      expect(state.lockedUntil).toBeNull();
      expect(isLocked(state, NOW)).toBe(false);
    }
  });

  it(`sai đủ ${MAX_FAILED_ATTEMPTS} lần thì khoá ${LOCK_MINUTES} phút`, () => {
    let state = EMPTY_LOCK;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) state = nextLockState(state, false, NOW);

    expect(isLocked(state, NOW)).toBe(true);
    expect(minutesUntilUnlock(state, NOW)).toBe(LOCK_MINUTES);
    expect(state.failedAttempts).toBe(0);
  });

  it('hết thời gian khoá thì vào lại được', () => {
    let state = EMPTY_LOCK;
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) state = nextLockState(state, false, NOW);

    const sau = new Date(NOW.getTime() + (LOCK_MINUTES + 1) * 60_000);
    expect(isLocked(state, sau)).toBe(false);
    expect(minutesUntilUnlock(state, sau)).toBe(0);
  });

  it('đăng nhập đúng thì xoá sạch lịch sử sai', () => {
    let state = nextLockState(EMPTY_LOCK, false, NOW);
    state = nextLockState(state, false, NOW);
    expect(state.failedAttempts).toBe(2);

    state = nextLockState(state, true, NOW);
    expect(state).toEqual(EMPTY_LOCK);
  });

  it('trạng thái rỗng thì không bị coi là đang khoá', () => {
    expect(isLocked(EMPTY_LOCK, NOW)).toBe(false);
    expect(minutesUntilUnlock(EMPTY_LOCK, NOW)).toBe(0);
  });
});

describe('normalizeJoinCode', () => {
  it('bỏ khoảng trắng và viết hoa', () => {
    expect(normalizeJoinCode(' ac defg ')).toBe('ACDEFG');
    expect(normalizeJoinCode('acdefg')).toBe('ACDEFG');
  });

  it('không vỡ với giá trị rỗng', () => {
    expect(normalizeJoinCode(null)).toBe('');
    expect(normalizeJoinCode(undefined)).toBe('');
  });
});
