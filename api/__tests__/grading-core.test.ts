import { describe, it, expect } from 'vitest';
import {
  QUOTA_LIMITS,
  bumpQuota,
  emptyQuota,
  moTaFinishReason,
  parseDataUrl,
  remainingQuota,
  reserveQuota,
  rollQuota,
  today,
} from '../_grading-core.js';

const NGAY = '2026-08-20';

describe('rollQuota — sang ngày mới là về 0', () => {
  it('doc rỗng cho hạn mức mới', () => {
    expect(rollQuota(null, NGAY)).toEqual(emptyQuota(NGAY));
    expect(rollQuota(undefined, NGAY)).toEqual(emptyQuota(NGAY));
  });

  it('doc của hôm qua bị bỏ, không cộng dồn sang hôm nay', () => {
    const homQua = { day: '2026-08-19', teacherCount: 300, selfCount: 100, byStudent: { s1: 5 } };
    expect(rollQuota(homQua, NGAY)).toEqual(emptyQuota(NGAY));
  });

  it('doc cùng ngày thì giữ nguyên bộ đếm', () => {
    const nay = { ...emptyQuota(NGAY), teacherCount: 12, selfCount: 3, byStudent: { s1: 2 } };
    expect(rollQuota(nay, NGAY)).toEqual(nay);
  });

  it('today() trả về dạng YYYY-MM-DD', () => {
    expect(today(new Date('2026-08-20T23:30:00.000Z'))).toBe('2026-08-20');
  });
});

describe('hạn mức đường giáo viên', () => {
  it('chưa dùng thì còn đủ hạn mức ngày', () => {
    const v = remainingQuota(emptyQuota(NGAY), 'teacher', '');
    expect(v.allowed).toBe(QUOTA_LIMITS.teacherDaily);
    expect(v.reason).toBe('');
  });

  it('trả về SỐ CÒN LẠI để chấm được phần đầu thay vì từ chối cả lô', () => {
    const q = { ...emptyQuota(NGAY), teacherCount: QUOTA_LIMITS.teacherDaily - 7 };
    expect(remainingQuota(q, 'teacher', '').allowed).toBe(7);
  });

  it('hết hạn mức thì chặn kèm lý do đọc được', () => {
    const q = { ...emptyQuota(NGAY), teacherCount: QUOTA_LIMITS.teacherDaily };
    const v = remainingQuota(q, 'teacher', '');
    expect(v.allowed).toBe(0);
    expect(v.reason).toMatch(/hạn mức/i);
  });
});

describe('hạn mức đường học sinh tự nộp — chặt hơn hẳn', () => {
  it('mỗi em có hạn mức riêng trong ngày', () => {
    expect(remainingQuota(emptyQuota(NGAY), 'self', 's1').allowed).toBe(QUOTA_LIMITS.selfPerStudentDaily);
  });

  it('một em dùng hết thì chỉ em đó bị chặn, bạn khác vẫn nộp được', () => {
    const q = { ...emptyQuota(NGAY), byStudent: { s1: QUOTA_LIMITS.selfPerStudentDaily } };

    expect(remainingQuota(q, 'self', 's1').allowed).toBe(0);
    expect(remainingQuota(q, 'self', 's2').allowed).toBe(QUOTA_LIMITS.selfPerStudentDaily);
  });

  it('trần cả lớp chặn được cả khi từng em chưa hết lượt', () => {
    const q = { ...emptyQuota(NGAY), selfCount: QUOTA_LIMITS.selfDaily };
    const v = remainingQuota(q, 'self', 's1');

    expect(v.allowed).toBe(0);
    expect(v.reason).toMatch(/lớp/i);
  });

  it('lấy giá trị nhỏ hơn giữa hạn mức em và hạn mức lớp', () => {
    const q = { ...emptyQuota(NGAY), selfCount: QUOTA_LIMITS.selfDaily - 2 };
    expect(remainingQuota(q, 'self', 's1').allowed).toBe(2);
  });
});

describe('bumpQuota', () => {
  it('cộng đúng bộ đếm của đường giáo viên', () => {
    const q = bumpQuota(emptyQuota(NGAY), 'teacher', '', 26);
    expect(q.teacherCount).toBe(26);
    expect(q.selfCount).toBe(0);
  });

  it('đường học sinh cộng cả bộ đếm lớp lẫn bộ đếm từng em', () => {
    let q = bumpQuota(emptyQuota(NGAY), 'self', 's1', 2);
    q = bumpQuota(q, 'self', 's1', 1);
    q = bumpQuota(q, 'self', 's2', 1);

    expect(q.selfCount).toBe(4);
    expect(q.byStudent).toEqual({ s1: 3, s2: 1 });
  });

  it('cộng 0 hoặc số âm thì không đổi gì', () => {
    const q = emptyQuota(NGAY);
    expect(bumpQuota(q, 'teacher', '', 0)).toBe(q);
    expect(bumpQuota(q, 'self', 's1', -5)).toBe(q);
  });
});

describe('reserveQuota', () => {
  it('đọc và cộng một lượt trong cùng transaction', async () => {
    const state: Record<string, Record<string, unknown>> = {};
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: state[name]?.[id] !== undefined,
            data: () => state[name]?.[id] as Record<string, unknown> | undefined,
          }),
          set: async (payload: Record<string, unknown>) => {
            state[name] ||= {};
            state[name][id] = payload;
          },
        }),
      }),
      runTransaction: async (work: (transaction: {
        get: (ref: { get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }> }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
        set: (ref: { set: (payload: Record<string, unknown>) => Promise<void> }, payload: Record<string, unknown>) => void;
      }) => Promise<unknown>) => {
        const writes: Promise<void>[] = [];
        const result = await work({
          get: ref => ref.get(),
          set: (ref, payload) => { writes.push(ref.set(payload)); },
        });
        await Promise.all(writes);
        return result;
      },
    } as never;

    const result = await reserveQuota(db, 'teacher-1', 'self', 'student-1');

    expect(result.verdict.allowed).toBeGreaterThan(0);
    expect(state.gradingQuota['teacher-1']).toMatchObject({ selfCount: 1, byStudent: { 'student-1': 1 } });
  });
});

describe('parseDataUrl', () => {
  it('tách được mime và phần base64', () => {
    expect(parseDataUrl('data:image/jpeg;base64,QUJD')).toEqual({ mimeType: 'image/jpeg', data: 'QUJD' });
  });

  it('trả null với chuỗi không phải data URL', () => {
    expect(parseDataUrl('https://storage/anh.jpg')).toBeNull();
    expect(parseDataUrl('')).toBeNull();
  });
});

describe('moTaFinishReason — không đổ oan cho khâu đọc JSON', () => {
  it('bị cắt vì hết token thì nói ĐÚNG là bị cắt, không nói lỗi JSON', () => {
    const loi = moTaFinishReason('MAX_TOKENS', true);

    expect(loi).toMatch(/bị cắt giữa chừng/);
    expect(loi).not.toMatch(/JSON/);
  });

  it('bị chặn vì an toàn nội dung thì nói rõ là bị từ chối', () => {
    expect(moTaFinishReason('SAFETY', true)).toMatch(/từ chối/);
    expect(moTaFinishReason('PROHIBITED_CONTENT', false)).toMatch(/từ chối/);
  });

  it('trùng tài liệu bản quyền', () => {
    expect(moTaFinishReason('RECITATION', true)).toMatch(/bản quyền/);
  });

  it('trả lời bình thường và có chữ thì KHÔNG báo lỗi', () => {
    expect(moTaFinishReason('STOP', true)).toBeNull();
    expect(moTaFinishReason(undefined, true)).toBeNull();
  });

  it('dừng bình thường nhưng rỗng chữ thì vẫn phải báo', () => {
    expect(moTaFinishReason('STOP', false)).toMatch(/không trả về chữ nào/);
    expect(moTaFinishReason(undefined, false)).toMatch(/không trả về chữ nào/);
  });

  it('lý do lạ thì nêu nguyên văn để còn lần ra', () => {
    expect(moTaFinishReason('OTHER', true)).toMatch(/OTHER/);
  });
});
