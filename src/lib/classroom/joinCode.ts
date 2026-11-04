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

/**
 * Các mã lớp đang bị DÙNG CHUNG bởi từ hai lớp trở lên (không phân biệt hoa/thường, bỏ khoảng trắng).
 * Mỗi link vào lớp phải có mã riêng — trùng là lỗi, phải báo chủ dự án.
 */
export interface JoinCodeClass { id: string; name: string; teacherId: string; joinCode: string }
export const findDuplicateJoinCodes = (classes: readonly JoinCodeClass[]): Array<{ code: string; classes: JoinCodeClass[] }> => {
  const byCode = new Map<string, JoinCodeClass[]>();
  for (const item of classes) {
    const code = normalizeJoinCode(String(item.joinCode ?? ''));
    if (!code) continue;
    byCode.set(code, [...(byCode.get(code) ?? []), item]);
  }
  return [...byCode.entries()].filter(([, list]) => list.length > 1).map(([code, list]) => ({ code, classes: list }));
};

