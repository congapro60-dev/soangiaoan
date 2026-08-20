import { describe, it, expect, vi } from 'vitest';
import { MAC_DINH_LOI_LIEN_TIEP, moTaKetQua, runPpctQueue } from './runQueue';
import type { PpctJob } from './lessonJob';

const job = (n: number): PpctJob => ({
  lessonId: `l${n}`,
  title: `Tiết ${n}`,
  requirement: `yêu cầu ${n}`,
  keHoach: 'kien_thuc',
  week: n,
  periodNo: n,
  subject: 'Đại số',
});

const jobs = (n: number) => Array.from({ length: n }, (_, i) => job(i + 1));

/** Bộ đôi generate/save mặc định: luôn thành công. */
const okDeps = () => {
  const saved: { lessonId: string; content: string }[] = [];
  return {
    saved,
    generate: async (j: PpctJob) => `nội dung ${j.lessonId}`,
    save: async (j: PpctJob, content: string) => {
      saved.push({ lessonId: j.lessonId, content });
      return `plan-${j.lessonId}`;
    },
  };
};

describe('runPpctQueue — đường chạy bình thường', () => {
  it('soạn tuần tự đúng thứ tự và lưu từng tiết một', async () => {
    const d = okDeps();
    const out = await runPpctQueue({ jobs: jobs(4), generate: d.generate, save: d.save });

    expect(out.reason).toBe('hoan_tat');
    expect(out.done).toBe(4);
    expect(out.failed).toBe(0);
    expect(d.saved.map(s => s.lessonId)).toEqual(['l1', 'l2', 'l3', 'l4']);
    expect(out.results.every(r => r.planId?.startsWith('plan-'))).toBe(true);
  });

  it('KHÔNG chạy song song — tiết sau chỉ bắt đầu khi tiết trước xong', async () => {
    let dangChay = 0;
    let dinhNhau = false;
    await runPpctQueue({
      jobs: jobs(5),
      generate: async (j) => {
        dangChay += 1;
        if (dangChay > 1) dinhNhau = true;
        await new Promise(r => setTimeout(r, 1));
        dangChay -= 1;
        return `x-${j.lessonId}`;
      },
      save: async () => 'p',
    });
    expect(dinhNhau).toBe(false);
  });

  it('báo tiến độ theo từng tiết', async () => {
    const d = okDeps();
    const moc: string[] = [];
    await runPpctQueue({
      jobs: jobs(3), generate: d.generate, save: d.save,
      onProgress: p => moc.push(`${p.daLam}/${p.tong} ${p.dangSoan}`),
    });
    expect(moc[0]).toBe('0/3 Tiết 1');
    expect(moc.at(-1)).toBe('3/3 ');
  });
});

describe('runPpctQueue — một tiết lỗi không được làm đổ cả lô', () => {
  it('ghi nhận lỗi rồi chạy tiếp tiết sau', async () => {
    const d = okDeps();
    const out = await runPpctQueue({
      jobs: jobs(4),
      generate: async (j) => {
        if (j.lessonId === 'l2') throw new Error('AI trả lỗi 500');
        return `nội dung ${j.lessonId}`;
      },
      save: d.save,
    });

    expect(out.reason).toBe('hoan_tat');
    expect(out.done).toBe(3);
    expect(out.failed).toBe(1);
    expect(out.results[1]).toMatchObject({ lessonId: 'l2', status: 'failed', error: 'AI trả lỗi 500' });
    expect(d.saved.map(s => s.lessonId)).toEqual(['l1', 'l3', 'l4']);
  });

  it('nội dung rỗng tính là lỗi, không lưu bài trắng vào thư viện', async () => {
    const d = okDeps();
    const out = await runPpctQueue({
      jobs: jobs(2),
      generate: async (j) => (j.lessonId === 'l1' ? '   ' : 'nội dung thật'),
      save: d.save,
    });
    expect(out.failed).toBe(1);
    expect(d.saved.map(s => s.lessonId)).toEqual(['l2']);
  });

  it('lỗi lúc LƯU cũng tính là tiết lỗi', async () => {
    const out = await runPpctQueue({
      jobs: jobs(2),
      generate: async () => 'nội dung',
      save: async (j) => { if (j.lessonId === 'l1') throw new Error('Firestore từ chối'); return 'p'; },
    });
    expect(out.failed).toBe(1);
    expect(out.results[0].error).toBe('Firestore từ chối');
  });
});

describe('runPpctQueue — dừng sớm khi lỗi liên tiếp (hết quota)', () => {
  it(`dừng sau ${MAC_DINH_LOI_LIEN_TIEP} lỗi liên tiếp thay vì đốt hết hàng đợi`, async () => {
    const goi = vi.fn(async () => { throw new Error('429 quota exceeded'); });
    const out = await runPpctQueue({ jobs: jobs(200), generate: goi, save: async () => 'p' });

    expect(out.reason).toBe('loi_lien_tiep');
    expect(goi).toHaveBeenCalledTimes(MAC_DINH_LOI_LIEN_TIEP);
    expect(out.results).toHaveLength(MAC_DINH_LOI_LIEN_TIEP);
  });

  it('một tiết thành công là đếm lại từ đầu, không dừng oan', async () => {
    let n = 0;
    const out = await runPpctQueue({
      jobs: jobs(6),
      // lỗi, lỗi, xong, lỗi, lỗi, xong — không bao giờ đủ 3 lỗi liên tiếp
      generate: async () => {
        n += 1;
        if (n % 3 !== 0) throw new Error('lỗi lẻ tẻ');
        return 'nội dung';
      },
      save: async () => 'p',
    });
    expect(out.reason).toBe('hoan_tat');
    expect(out.done).toBe(2);
    expect(out.failed).toBe(4);
  });
});

describe('runPpctQueue — huỷ và chạy tiếp', () => {
  it('huỷ giữa chừng thì giữ nguyên phần đã soạn', async () => {
    const d = okDeps();
    let dem = 0;
    const out = await runPpctQueue({
      jobs: jobs(10), generate: d.generate, save: d.save,
      shouldStop: () => { dem += 1; return dem > 4; },
    });
    expect(out.reason).toBe('nguoi_dung_huy');
    expect(out.done).toBeGreaterThan(0);
    expect(out.done).toBeLessThan(10);
    expect(d.saved).toHaveLength(out.done);
  });

  it('huỷ ngay từ đầu thì không gọi AI lần nào', async () => {
    const goi = vi.fn(async () => 'x');
    const out = await runPpctQueue({
      jobs: jobs(5), generate: goi, save: async () => 'p', shouldStop: () => true,
    });
    expect(goi).not.toHaveBeenCalled();
    expect(out.done).toBe(0);
  });

  it('chạy tiếp bỏ qua các tiết đã xong lần trước', async () => {
    const d = okDeps();
    const out = await runPpctQueue({
      jobs: jobs(5), generate: d.generate, save: d.save,
      daXong: new Set(['l1', 'l2', 'l4']),
    });
    expect(d.saved.map(s => s.lessonId)).toEqual(['l3', 'l5']);
    expect(out.done).toBe(2);
  });

  it('mọi tiết đã xong thì kết thúc ngay, không gọi AI', async () => {
    const goi = vi.fn(async () => 'x');
    const out = await runPpctQueue({
      jobs: jobs(3), generate: goi, save: async () => 'p',
      daXong: new Set(['l1', 'l2', 'l3']),
    });
    expect(goi).not.toHaveBeenCalled();
    expect(out.reason).toBe('hoan_tat');
  });
});

describe('moTaKetQua', () => {
  it('nói rõ nghi hết quota khi dừng vì lỗi liên tiếp', () => {
    const msg = moTaKetQua({ reason: 'loi_lien_tiep', results: [], done: 40, failed: 3 });
    expect(msg).toMatch(/hết lượt/);
    expect(msg).toContain('40');
  });

  it('huỷ thì nói rõ giữ lại bao nhiêu', () => {
    expect(moTaKetQua({ reason: 'nguoi_dung_huy', results: [], done: 7, failed: 0 })).toContain('7');
  });

  it('xong hết mà có lỗi thì mời chạy tiếp', () => {
    expect(moTaKetQua({ reason: 'hoan_tat', results: [], done: 8, failed: 2 })).toMatch(/chạy tiếp/);
  });
});
