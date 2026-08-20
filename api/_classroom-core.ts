/// <reference types="node" />
// File prefix "_" → Vercel KHÔNG biến thành Serverless Function, nhưng api/classroom.ts import được.
// Gồm: băm/kiểm PIN học sinh và máy trạng thái khoá sau nhiều lần sai.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * PIN chỉ 4 chữ số nên tự nó KHÔNG đủ mạnh — 10.000 khả năng là dò hết trong vài phút.
 * Thứ làm nó an toàn là KHOÁ SAU 5 LẦN SAI ở dưới. Bỏ phần khoá đi thì PIN thành vô nghĩa.
 * Chọn 4 số thay vì mật khẩu thật vì người dùng là học sinh phổ thông, và thiệt hại tối đa
 * khi lộ là xem được bài tập của một bạn cùng lớp, không phải tài khoản có giá trị.
 */
export const PIN_LENGTH = 4;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

const SCRYPT_KEYLEN = 32;

export const createPin = (): string => {
  const bytes = randomBytes(PIN_LENGTH);
  let pin = '';
  for (let i = 0; i < PIN_LENGTH; i += 1) pin += String(bytes[i] % 10);
  return pin;
};

export const hashPin = (pin: string, salt = randomBytes(16).toString('hex')): string => {
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${derived}`;
};

export const verifyPin = (pin: string, stored: string): boolean => {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN);
  const expectedBuf = Buffer.from(expected, 'hex');
  if (expectedBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, expectedBuf);
};

export const isValidPinShape = (pin: unknown): pin is string =>
  typeof pin === 'string' && new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

export interface LockState {
  failedAttempts: number;
  lockedUntil: string | null;
}

export const EMPTY_LOCK: LockState = { failedAttempts: 0, lockedUntil: null };

export const isLocked = (state: LockState, now: Date): boolean =>
  Boolean(state.lockedUntil) && new Date(state.lockedUntil as string).getTime() > now.getTime();

/**
 * Máy trạng thái khoá. Đăng nhập đúng thì xoá sạch lịch sử sai; sai đủ ngưỡng thì khoá
 * LOCK_MINUTES phút và đặt lại bộ đếm để lần khoá sau cần đủ số lần sai mới.
 */
export const nextLockState = (state: LockState, success: boolean, now: Date): LockState => {
  if (success) return { ...EMPTY_LOCK };

  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedAttempts: 0,
      lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString(),
    };
  }
  return { failedAttempts, lockedUntil: null };
};

export const minutesUntilUnlock = (state: LockState, now: Date): number => {
  if (!state.lockedUntil) return 0;
  const remaining = new Date(state.lockedUntil).getTime() - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / 60_000);
};

/** Mã vào lớp — phải khớp bảng chữ cái ở src/lib/classroom/joinCode.ts. */
export const normalizeJoinCode = (raw: unknown): string =>
  String(raw ?? '').replace(/\s+/g, '').toUpperCase();
