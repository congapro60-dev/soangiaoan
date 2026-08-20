// Bộ chạy hàng đợi soạn giáo án theo PPCT.
//
// Cố ý KHÔNG phụ thuộc React và không tự gọi AI: nhận `generate` và `save` từ bên ngoài. Nhờ
// vậy kiểm thử được toàn bộ hành vi khó (huỷ giữa chừng, một tiết lỗi, hết quota) bằng stub,
// không cần khoá AI thật lẫn trình duyệt.

import type { PpctJob } from './lessonJob';

export type JobStatus = 'done' | 'failed';

export interface JobOutcome {
  lessonId: string;
  title: string;
  status: JobStatus;
  /** id giáo án đã lưu, có khi status = 'done'. */
  planId?: string;
  error?: string;
}

export type StopReason = 'hoan_tat' | 'nguoi_dung_huy' | 'loi_lien_tiep';

export interface QueueOutcome {
  reason: StopReason;
  results: JobOutcome[];
  done: number;
  failed: number;
}

/**
 * Vì sao phải dừng sớm khi lỗi liên tiếp: soạn cả học kỳ là hàng trăm lượt gọi AI, khoá miễn
 * phí gần như chắc chắn hết quota giữa chừng. Không có luật này thì mọi tiết còn lại fail liên
 * tiếp trong vài giây, ghi hàng trăm bản ghi vô nghĩa rồi báo "đã xong".
 */
export const MAC_DINH_LOI_LIEN_TIEP = 3;

export interface RunQueueParams {
  jobs: PpctJob[];
  /** Sinh nội dung cho một tiết. Ném lỗi thì tiết đó tính là failed. */
  generate: (job: PpctJob) => Promise<string>;
  /** Lưu ngay từng tiết. Trả về id giáo án đã lưu. */
  save: (job: PpctJob, content: string) => Promise<string>;
  /** Các `lessonId` đã soạn xong từ lần chạy trước — bỏ qua, không soạn lại. */
  daXong?: Set<string>;
  onProgress?: (p: { daLam: number; tong: number; dangSoan: string }) => void;
  onJobDone?: (outcome: JobOutcome) => void;
  /** Trả true để dừng — hook nối vào nút Dừng của giao diện. */
  shouldStop?: () => boolean;
  maxLoiLienTiep?: number;
}

export const runPpctQueue = async (params: RunQueueParams): Promise<QueueOutcome> => {
  const {
    jobs, generate, save, daXong,
    onProgress, onJobDone, shouldStop,
    maxLoiLienTiep = MAC_DINH_LOI_LIEN_TIEP,
  } = params;

  const canLam = daXong ? jobs.filter((j) => !daXong.has(j.lessonId)) : jobs;
  const results: JobOutcome[] = [];
  let loiLienTiep = 0;
  let reason: StopReason = 'hoan_tat';

  for (let i = 0; i < canLam.length; i++) {
    if (shouldStop?.()) {
      reason = 'nguoi_dung_huy';
      break;
    }
    const job = canLam[i];
    onProgress?.({ daLam: i, tong: canLam.length, dangSoan: job.title });

    let outcome: JobOutcome;
    try {
      const content = await generate(job);
      if (!content || !content.trim()) throw new Error('Bộ sinh trả về nội dung rỗng');
      const planId = await save(job, content);
      outcome = { lessonId: job.lessonId, title: job.title, status: 'done', planId };
      loiLienTiep = 0;
    } catch (err: any) {
      outcome = {
        lessonId: job.lessonId,
        title: job.title,
        status: 'failed',
        error: err?.message ? String(err.message) : 'Lỗi không rõ',
      };
      loiLienTiep += 1;
    }

    results.push(outcome);
    onJobDone?.(outcome);

    // Huỷ ngay sau khi một tiết vừa xong thì tiết đó vẫn được giữ, chỉ không chạy tiếp.
    if (shouldStop?.()) {
      reason = 'nguoi_dung_huy';
      break;
    }
    if (loiLienTiep >= maxLoiLienTiep) {
      reason = 'loi_lien_tiep';
      break;
    }
  }

  if (reason === 'hoan_tat') {
    onProgress?.({ daLam: canLam.length, tong: canLam.length, dangSoan: '' });
  }

  return {
    reason,
    results,
    done: results.filter((r) => r.status === 'done').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
};

/** Câu báo cho giáo viên, nói rõ vì sao dừng và phải làm gì tiếp. */
export const moTaKetQua = (outcome: QueueOutcome): string => {
  const { reason, done, failed } = outcome;
  if (reason === 'loi_lien_tiep') {
    return `Đã dừng sau ${MAC_DINH_LOI_LIEN_TIEP} tiết lỗi liên tiếp — nhiều khả năng khoá AI đã hết lượt trong ngày. `
      + `Đã soạn xong ${done} tiết. Kiểm tra lại khoá rồi bấm chạy tiếp.`;
  }
  if (reason === 'nguoi_dung_huy') {
    return `Đã dừng theo yêu cầu. Giữ lại ${done} tiết đã soạn xong${failed ? `, ${failed} tiết lỗi` : ''}.`;
  }
  return failed
    ? `Soạn xong ${done} tiết, ${failed} tiết lỗi — bấm chạy tiếp để soạn lại phần lỗi.`
    : `Đã soạn xong toàn bộ ${done} tiết.`;
};
