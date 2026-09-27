/**
 * Hàng rào cuối trước mọi phép ghi Admin SDK: loại đệ quy các field mang giá trị `undefined`.
 *
 * Firestore Admin SDK từ chối cả document nếu bất kỳ field lồng nhau nào là `undefined`
 * ("Cannot use undefined as a Firestore value"), khác với client SDK ở `src/lib/firebase.ts`
 * đã có `removeUndefinedFields`. Không import helper client vào server (khác runtime/deps),
 * nên server có bản riêng, áp dụng CÓ CHỦ ĐÍCH ngay trước `ref.set(...)`.
 *
 * Đây là defense-in-depth, không thay cho builder canonical: `profileMerge` vẫn phải tạo ref sạch.
 * Hàm giữ nguyên `null`, số 0, chuỗi rỗng, `false`; chỉ bỏ đúng `undefined`.
 */
export const stripUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      result[key] = stripUndefinedDeep(item);
    }
    return result as T;
  }
  return value;
};
