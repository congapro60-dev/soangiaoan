import { describe, expect, it } from 'vitest';
import { findDuplicateJoinCodes } from './joinCode';

const lop = (id: string, joinCode: string) => ({ id, name: `Lớp ${id}`, teacherId: `gv-${id}`, joinCode });

describe('findDuplicateJoinCodes', () => {
  it('không có mã nào dùng chung → rỗng', () => {
    expect(findDuplicateJoinCodes([lop('a', 'ABCD23'), lop('b', 'KMTH27')])).toEqual([]);
  });

  it('hai lớp (kể cả của hai giáo viên) cùng một mã → báo đủ các lớp; không phân biệt hoa/thường, bỏ khoảng trắng', () => {
    const result = findDuplicateJoinCodes([lop('a', 'ABCD23'), lop('b', 'abcd23 '), lop('c', 'KMTH27')]);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('ABCD23');
    expect(result[0].classes.map(item => item.id)).toEqual(['a', 'b']);
  });

  it('bỏ qua lớp chưa có mã', () => {
    expect(findDuplicateJoinCodes([lop('a', ''), lop('b', '')])).toEqual([]);
  });
});
