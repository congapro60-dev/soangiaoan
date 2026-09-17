import {
  aggregateCompetencies,
  DEFAULT_THRESHOLDS,
  type CompetencyEvidenceInput,
  type CompetencyResult,
  type LevelThresholds,
} from './competencyModel';
import {
  competenciesByGrade,
  type Competency,
  type CompetencyGrade,
} from './framework';

/**
 * Dựng HỒ SƠ NĂNG LỰC đầy đủ của một học sinh theo khung khối, để xem trên app trước khi xuất file.
 *
 * Ghép hai nguồn đã có sẵn ở client (không thêm truy vấn máy chủ):
 *  - bài NỘP đã chấm của học sinh (điểm + đã-duyệt), và
 *  - NHÃN năng lực gắn cho từng bài GIAO (competencyTags, AI đề xuất — GĐ2b).
 *
 * Rồi giao cho `aggregateCompetencies` (GĐ2a) tính MỨC. Cổng "đã duyệt" và cách tính mức nằm trọn
 * trong aggregateCompetencies — file này chỉ NỐI dữ liệu và bày ra đủ khung để thấy phần còn trống.
 */

/** Bài nộp rút gọn — chỉ phần cần cho hồ sơ. */
export interface PortfolioSubmission {
  assignmentId: string;
  score: number;
  maxScore: number;
  approved: boolean;
  submittedAt: string;
  feedback?: string;
}

/** Bài giao rút gọn — chỉ cần nhãn năng lực đã gắn. */
export interface PortfolioAssignment {
  id: string;
  competencyTags?: ReadonlyArray<{ competencyId: string }>;
}

export interface PortfolioRow {
  competency: Competency;
  /** Kết quả tổng hợp, hoặc null khi chưa có bài đã duyệt nào chạm năng lực này. */
  result: CompetencyResult | null;
}

/** Nhóm theo mảng nội dung, khớp cách template trường trình bày. */
export interface PortfolioArea {
  area: string;
  rows: PortfolioRow[];
}

/**
 * Ghép bài nộp × nhãn của bài giao thành đầu vào cho aggregateCompetencies.
 * Bài không gắn assignmentId, hoặc bài giao thiếu/không nhãn, thì không sinh minh chứng.
 */
export const buildEvidenceInputs = (
  submissions: readonly PortfolioSubmission[],
  assignments: readonly PortfolioAssignment[],
): CompetencyEvidenceInput[] => {
  const tagsByAssignment = new Map<string, ReadonlyArray<{ competencyId: string }>>();
  for (const assignment of assignments) {
    if (assignment.competencyTags && assignment.competencyTags.length > 0) {
      tagsByAssignment.set(assignment.id, assignment.competencyTags);
    }
  }

  const inputs: CompetencyEvidenceInput[] = [];
  for (const submission of submissions) {
    const tags = submission.assignmentId ? tagsByAssignment.get(submission.assignmentId) : undefined;
    if (!tags) continue;
    for (const tag of tags) {
      inputs.push({
        assignmentId: submission.assignmentId,
        competencyId: tag.competencyId,
        score: submission.score,
        maxScore: submission.maxScore,
        approved: submission.approved,
        submittedAt: submission.submittedAt,
        ...(submission.feedback ? { feedback: submission.feedback } : {}),
      });
    }
  }
  return inputs;
};

/**
 * Hồ sơ đầy đủ theo khung khối: LIỆT KÊ MỌI năng lực của khối (kể cả chưa có minh chứng, để thấy
 * còn thiếu gì đến khi tốt nghiệp), điền mức ở chỗ đã có bài đã duyệt. Nhóm theo mảng, giữ đúng
 * thứ tự khung.
 */
export const buildStudentCompetencyPortfolio = (
  grade: CompetencyGrade,
  submissions: readonly PortfolioSubmission[],
  assignments: readonly PortfolioAssignment[],
  thresholds: LevelThresholds = DEFAULT_THRESHOLDS,
): PortfolioArea[] => {
  const results = new Map<string, CompetencyResult>();
  for (const result of aggregateCompetencies(buildEvidenceInputs(submissions, assignments), thresholds)) {
    results.set(result.competencyId, result);
  }

  const areas: PortfolioArea[] = [];
  const areaIndex = new Map<string, PortfolioArea>();
  for (const competency of competenciesByGrade(grade)) {
    let area = areaIndex.get(competency.area);
    if (!area) {
      area = { area: competency.area, rows: [] };
      areaIndex.set(competency.area, area);
      areas.push(area);
    }
    area.rows.push({ competency, result: results.get(competency.id) ?? null });
  }
  return areas;
};

/** Số năng lực đã có mức trên tổng số của khung — dùng cho dòng tiến độ ở đầu hồ sơ. */
export const portfolioProgress = (areas: readonly PortfolioArea[]): { assessed: number; total: number } => {
  let assessed = 0;
  let total = 0;
  for (const area of areas) {
    for (const row of area.rows) {
      total += 1;
      if (row.result) assessed += 1;
    }
  }
  return { assessed, total };
};
