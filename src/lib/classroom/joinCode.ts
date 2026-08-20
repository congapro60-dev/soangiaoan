/**
 * Mã vào lớp học sinh phải gõ trên điện thoại. Bỏ hẳn các ký tự dễ nhìn nhầm
 * (0/O, 1/I/L, 5/S, 8/B) vì mã này được đọc to trong lớp hoặc chép từ bảng.
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY2346789';
const LENGTH = 6;

const randomBytes = (count: number): Uint8Array => {
  const bytes = new Uint8Array(count);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let i = 0; i < count; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
};

export const createJoinCode = (): string => {
  const bytes = randomBytes(LENGTH);
  let code = '';
  for (let i = 0; i < LENGTH; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
};

/** Chuẩn hoá mã người dùng gõ: bỏ khoảng trắng, viết hoa. */
export const normalizeJoinCode = (raw: string): string => raw.replace(/\s+/g, '').toUpperCase();

export const isValidJoinCode = (raw: string): boolean => {
  const code = normalizeJoinCode(raw);
  return code.length === LENGTH && [...code].every(ch => ALPHABET.includes(ch));
};

export const JOIN_CODE_ALPHABET = ALPHABET;
export const JOIN_CODE_LENGTH = LENGTH;
