// Nối bộ chạy hàng đợi PPCT (thuần, `lib/ppct/runQueue.ts`) với React và với bộ nhớ trình duyệt.
//
// Mọi logic khó — thứ tự, huỷ, lỗi liên tiếp, chạy tiếp — nằm ở tầng thuần và đã có test. Ở đây
// chỉ còn trạng thái giao diện và việc ghi nhớ tiến độ.

import { useCallback, useRef, useState } from 'react';
import type { LessonPlan, ToanKeHoach, BuiltinFormat } from '../types';
import type { PpctJob, QueuePlan } from '../lib/ppct/lessonJob';
import { moTaKetQua, runPpctQueue, type JobOutcome, type QueueOutcome } from '../lib/ppct/runQueue';

const KHOA_TIEN_DO = 'smartplan.ppctQueue.v1';

export interface TienDoQueue {
  dangChay: boolean;
  daLam: number;
  tong: number;
  dangSoan: string;
}

/** Ghi nhớ giữa các phiên: mở lại app vẫn biết lô nào đang dở. */
export interface BanGhiTienDo {
  khoa: string;
  nhan: string;
  daXong: string[];
  capNhat: string;
}

const docTienDo = (): BanGhiTienDo | null => {
  try {
    const raw = localStorage.getItem(KHOA_TIEN_DO);
    return raw ? (JSON.parse(raw) as BanGhiTienDo) : null;
  } catch {
    return null;
  }
};

const ghiTienDo = (ban: BanGhiTienDo | null): void => {
  try {
    if (ban) localStorage.setItem(KHOA_TIEN_DO, JSON.stringify(ban));
    else localStorage.removeItem(KHOA_TIEN_DO);
  } catch {
    // Chế độ riêng tư chặn localStorage — mất khả năng chạy tiếp, nhưng không được làm hỏng lô.
  }
};

export const khoaLo = (source: string, grade: number, fromWeek: number, toWeek: number): string =>
  `${source}-g${grade}-w${fromWeek}-${toWeek}`;

interface Params {
  /** Gọi lại ĐÚNG đường soạn đơn — pipeline nhiều agent + cổng chất lượng Toán. */
  soanMotTiet: (job: PpctJob) => Promise<string | null>;
  luuGiaoAn: (plan: LessonPlan) => Promise<string>;
  showToast: (msg: string, type?: any) => void;
  builtinFormat: BuiltinFormat;
  subjectId?: string;
  grade: number;
}

export const usePpctQueue = ({ soanMotTiet, luuGiaoAn, showToast, builtinFormat, subjectId, grade }: Params) => {
  const [tienDo, setTienDo] = useState<TienDoQueue>({ dangChay: false, daLam: 0, tong: 0, dangSoan: '' });
  const [ketQua, setKetQua] = useState<JobOutcome[]>([]);
  const [banGhi, setBanGhi] = useState<BanGhiTienDo | null>(() => docTienDo());
  const cancelRef = useRef(false);

  const dung = useCallback(() => {
    cancelRef.current = true;
    setTienDo(t => ({ ...t, dangSoan: 'Đang dừng sau khi soạn xong tiết hiện tại...' }));
  }, []);

  const xoaTienDo = useCallback(() => {
    ghiTienDo(null);
    setBanGhi(null);
  }, []);

  const chay = useCallback(async (
    plan: QueuePlan,
    lo: { khoa: string; nhan: string; keHoachMacDinh: ToanKeHoach },
    chayTiep = false,
  ): Promise<QueueOutcome | null> => {
    if (plan.jobs.length === 0) {
      showToast('Khoảng tuần này không có tiết nào soạn được.', 'warning');
      return null;
    }

    const truoc = docTienDo();
    const daXong = new Set<string>(chayTiep && truoc?.khoa === lo.khoa ? truoc.daXong : []);

    cancelRef.current = false;
    setKetQua([]);
    setTienDo({ dangChay: true, daLam: 0, tong: plan.jobs.length - daXong.size, dangSoan: '' });

    const xong: string[] = [...daXong];
    const luu = (): void => {
      const ban: BanGhiTienDo = { khoa: lo.khoa, nhan: lo.nhan, daXong: xong, capNhat: new Date().toISOString() };
      ghiTienDo(ban);
      setBanGhi(ban);
    };

    try {
      const outcome = await runPpctQueue({
        jobs: plan.jobs,
        daXong,
        shouldStop: () => cancelRef.current,
        onProgress: p => setTienDo({ dangChay: true, daLam: p.daLam, tong: p.tong, dangSoan: p.dangSoan }),
        generate: async (job) => {
          const content = await soanMotTiet(job);
          if (!content) throw new Error('Bộ sinh không trả về nội dung');
          return content;
        },
        save: async (job, content) => {
          const now = new Date().toISOString();
          const giaoAn: LessonPlan = {
            id: crypto.randomUUID(),
            subjectId: subjectId || 'math',
            title: job.title,
            content,
            // Cố ý để 'draft': máy soạn hàng loạt thì giáo viên vẫn phải đọc trước khi dùng.
            status: 'draft',
            createdAt: now,
            updatedAt: now,
            grade: String(grade),
            week: String(job.week),
            ...(builtinFormat ? { builtinFormat } : {}),
            ...(builtinFormat === 'toan' ? { toanKeHoach: job.keHoach || lo.keHoachMacDinh } : {}),
          } as LessonPlan;
          return luuGiaoAn(giaoAn);
        },
        onJobDone: (kq) => {
          setKetQua(prev => [...prev, kq]);
          if (kq.status === 'done') {
            xong.push(kq.lessonId);
            luu();
          }
        },
      });

      showToast(moTaKetQua(outcome), outcome.failed || outcome.reason !== 'hoan_tat' ? 'warning' : 'success');
      if (outcome.reason === 'hoan_tat' && outcome.failed === 0) xoaTienDo();
      return outcome;
    } finally {
      setTienDo({ dangChay: false, daLam: 0, tong: 0, dangSoan: '' });
      cancelRef.current = false;
    }
  }, [soanMotTiet, luuGiaoAn, showToast, builtinFormat, subjectId, grade, xoaTienDo]);

  return { tienDo, ketQua, banGhi, chay, dung, xoaTienDo };
};
