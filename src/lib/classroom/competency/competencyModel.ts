import { COMPETENCY_LEVELS, type CompetencyLevel } from './framework';

/**
 * Tổng hợp bằng chứng BTVN → ĐỀ XUẤT mức cho từng năng lực trong rubric trường
 * (Xuất sắc / Tốt / Đạt yêu cầu / Chưa đạt yêu cầu).
 *
 * KHÁC `profileMerge.ts`: profileMerge theo dõi điểm YẾU theo chủ đề tự do (weak/developing/solid,
 * cần 2 bằng chứng mới kết luận yếu). Model này tính MỨC ĐẠT 4 bậc theo ĐIỂM, gắn vào 29 năng lực
 * cố định của trường. Hai cái bổ sung nhau; model này KHÔNG thay profileMerge.
 *
 * Ba nguyên tắc, cưỡng chế bằng code:
 *  1. **Chỉ tính bài giáo viên đã duyệt** (`approved`) — giống cổng "vào hồ sơ" của profileMerge.
 *  2. **Không có bằng chứng thì không kết luận** — năng lực không có bài nào để `level = null`.
 *  3. **Chỉ ĐỀ XUẤT** — giáo viên/học sinh chốt lại; model không tự ghi gì.
 */

/** Ngưỡng quy đổi điểm (thang 10) → mức. Chủ dự án chốt mặc định; đổi được qua tham số. */
export interface LevelThresholds {
  /** >= mức này là Xuất sắc. */
  xuatSac: number;
  /** >= mức này là Tốt. */
  tot: number;
  /** >= mức này là Đạt yêu cầu; dưới nữa là Chưa đạt. */
  dat: number;
}

export const DEFAULT_THRESHOLDS: LevelThresholds = { xuatSac: 9, tot: 7, dat: 5 };

/** Số bài gần nhất của một năng lực dùng để tính mức — ưu tiên bài gần đây. */
export const RECENT_WINDOW = 3;

export interface CompetencyEvidenceInput {
  assignmentId: string;
  /** Năng lực đã gắn cho bài (AI đoán, giáo viên duyệt). Bài chưa gắn thì bỏ qua trước khi gọi. */
  competencyId: string;
  score: number;
  maxScore: number;
  /** Chỉ bài `teacherApproved` mới được đưa vào — lọc ở đây cho chắc. */
  approved: boolean;
  submittedAt: string;
  /** Nhận xét cho học sinh — dùng làm minh chứng ở giao diện/xuất file. */
  feedback?: string;
}

export interface CompetencyEvidence {
  assignmentId: string;
  score: number;
  maxScore: number;
  /** Điểm quy về thang 10, làm tròn 1 chữ số. */
  scoreOutOf10: number;
  submittedAt: string;
  feedback?: string;
}

export interface CompetencyResult {
  competencyId: string;
  /** Mức đề xuất, hoặc null khi chưa có bài nào (chưa đánh giá). */
  level: CompetencyLevel | null;
  /** Điểm đại diện (thang 10) tính từ tối đa RECENT_WINDOW bài gần nhất, hoặc null. */
  scoreOutOf10: number | null;
  /** Mọi bằng chứng đã duyệt của năng lực, mới nhất trước. */
  evidence: CompetencyEvidence[];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Điểm thang 10 → mức. Không phụ thuộc ngôn ngữ/dấu vì so số. */
export const levelForScore = (scoreOutOf10: number, thresholds: LevelThresholds = DEFAULT_THRESHOLDS): CompetencyLevel => {
  if (scoreOutOf10 >= thresholds.xuatSac) return 'Xuất sắc';
  if (scoreOutOf10 >= thresholds.tot) return 'Tốt';
  if (scoreOutOf10 >= thresholds.dat) return 'Đạt yêu cầu';
  return 'Chưa đạt yêu cầu';
};

/**
 * Gộp bằng chứng của MỘT học sinh → kết quả theo từng năng lực.
 * Chỉ trả năng lực có ít nhất một bài đã duyệt; ưu tiên bài gần đây khi tính mức.
 */
export const aggregateCompetencies = (
  inputs: readonly CompetencyEvidenceInput[],
  thresholds: LevelThresholds = DEFAULT_THRESHOLDS,
): CompetencyResult[] => {
  const byCompetency = new Map<string, CompetencyEvidence[]>();

  for (const item of inputs) {
    if (!item.approved) continue;
    if (!item.competencyId) continue;
    if (!(item.maxScore > 0)) continue; // tránh chia 0 và dữ liệu hỏng
    const score = Math.max(0, Math.min(item.score, item.maxScore));
    const evidence: CompetencyEvidence = {
      assignmentId: item.assignmentId,
      score: item.score,
      maxScore: item.maxScore,
      scoreOutOf10: round1((score / item.maxScore) * 10),
      submittedAt: item.submittedAt,
      ...(item.feedback ? { feedback: item.feedback } : {}),
    };
    const list = byCompetency.get(item.competencyId) ?? [];
    list.push(evidence);
    byCompetency.set(item.competencyId, list);
  }

  const results: CompetencyResult[] = [];
  for (const [competencyId, evidenceList] of byCompetency) {
    // Mới nhất trước; mốc bằng nhau thì giữ ổn định theo assignmentId để kết quả không đổi thất thường.
    const sorted = [...evidenceList].sort((a, b) =>
      (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0)
      || a.assignmentId.localeCompare(b.assignmentId));
    const recent = sorted.slice(0, RECENT_WINDOW);
    const avg = recent.reduce((sum, e) => sum + e.scoreOutOf10, 0) / recent.length;
    const scoreOutOf10 = round1(avg);
    results.push({ competencyId, level: levelForScore(scoreOutOf10, thresholds), scoreOutOf10, evidence: sorted });
  }

  // Ổn định thứ tự đầu ra theo competencyId để test/hiển thị không nhảy.
  return results.sort((a, b) => a.competencyId.localeCompare(b.competencyId));
};

/** Nhãn mức hợp lệ — tiện cho nơi khác kiểm tra. */
export const isCompetencyLevel = (value: string): value is CompetencyLevel =>
  (COMPETENCY_LEVELS as readonly string[]).includes(value);
