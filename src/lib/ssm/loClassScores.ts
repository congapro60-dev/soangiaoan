/**
 * Điểm năng lực (thang 10) của TỪNG em trong lớp, từ bài BTVN đã duyệt — tái dùng đúng bộ máy
 * hồ sơ năng lực (`buildStudentCompetencyPortfolio`), chỉ gom theo học sinh. Thuần.
 *
 * Luật kỳ (chủ dự án chốt 24/10): điểm của kỳ IA/SE = **40% tích luỹ** mọi bài thường từ đầu năm
 * học tới hết tháng của kỳ + **60% bài kiểm tra định kì** của chính kỳ đó. Mỗi cặp (em, bài giao)
 * chỉ lấy lượt nộp MỚI NHẤT đã duyệt.
 */
import { buildStudentCompetencyPortfolio } from '../classroom/competency/portfolioModel';
import type { CompetencyGrade } from '../classroom/competency/framework';
import type { StudentCompetencyScores } from './loMapping';
import { fixedLoMapping } from './loFixedMapping';

export type LoPeriodKey = 'F1' | 'IA1' | 'F2' | 'SE1' | 'F3' | 'IA2' | 'F4' | 'SE2';

export interface LoScoreOptions {
  period: LoPeriodKey;
  /** Năm bắt đầu học kỳ, vd 2026 cho năm học 2026–2027. */
  academicYear: number;
}

export interface LoPeriodDefinition {
  key: LoPeriodKey;
  from: string;
  to: string;
}

/** Khoảng kỳ theo lịch học: F1 = tháng 8–9, sau đó mỗi mốc một tháng. */
export const loPeriodDefinition = (key: LoPeriodKey, academicYear: number): LoPeriodDefinition => {
  const month = key === 'F1' ? 8 : key === 'IA1' ? 10 : key === 'F2' ? 11 : key === 'SE1' ? 12 : key === 'F3' ? 1 : key === 'IA2' ? 2 : key === 'F4' ? 3 : 4;
  const year = month >= 8 ? academicYear : academicYear + 1;
  const fromMonth = key === 'F1' ? 8 : month;
  const fromYear = key === 'F1' ? academicYear : year;
  const endMonth = key === 'F1' ? 9 : month;
  const endYear = key === 'F1' ? academicYear : year;
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();
  return { key, from: `${fromYear}-${String(fromMonth).padStart(2, '0')}-01`, to: `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` };
};

/**
 * Ngày bắt đầu năm học — mốc sớm nhất của phần "tích luỹ" (tháng 8). Bài trước mốc này
 * (năm học trước) không được cộng vào kỳ hiện tại.
 */
export const loYearStart = (_key: LoPeriodKey, academicYear: number): string => `${academicYear}-08-01`;

export interface RosterEntry {
  id: string;
  /** Mã học sinh của trường — khoá khớp với file Excel SSM. */
  code: string;
}

export interface ClassSubmission {
  studentId: string;
  assignmentId: string | null;
  grade?: { score: number; maxScore: number; teacherApproved?: boolean } | null;
  createdAt: string;
}

export interface ClassAssignment {
  id: string;
  title?: string;
  createdAt?: string;
  dueAt?: string;
  periodicTest?: unknown;
  competencyTags?: ReadonlyArray<{ competencyId: string }>;
  /** Ma trận điểm của đề: LO → điểm tối đa. Thiếu thì chia đều theo số năng lực của bài. */
  loRubric?: ReadonlyArray<{ loCode: string; maxPoints: number }>;
  /** Cờ để biết `loRubric` tổng bằng bao nhiêu điểm (mặc định 10). */
  maxScore?: number;
}

/** Mỗi em → điểm thang 10 của các năng lực em CÓ minh chứng (bài đã duyệt). */
export const buildClassLoScores = (
  grade: CompetencyGrade,
  roster: readonly RosterEntry[],
  submissions: readonly ClassSubmission[],
  assignments: readonly ClassAssignment[],
  options?: LoScoreOptions,
): StudentCompetencyScores[] => {
  if (options) return buildScopedClassLoScores(grade, roster, submissions, assignments, options);
  const asgs = assignments.map((a) => ({ id: a.id, competencyTags: a.competencyTags }));
  const byStudent = new Map<string, ClassSubmission[]>();
  for (const sub of submissions) {
    if (!sub.grade) continue;
    const list = byStudent.get(sub.studentId) ?? [];
    list.push(sub);
    byStudent.set(sub.studentId, list);
  }

  return roster
    .filter((r) => r.code.trim())
    .map((entry) => {
      const subs = (byStudent.get(entry.id) ?? []).map((s) => ({
        assignmentId: s.assignmentId ?? '',
        score: s.grade!.score,
        maxScore: s.grade!.maxScore,
        approved: Boolean(s.grade!.teacherApproved),
        submittedAt: s.createdAt,
      }));
      const areas = buildStudentCompetencyPortfolio(grade, subs, asgs);
      const scoreByCompetency: Record<string, number> = {};
      for (const area of areas) {
        for (const row of area.rows) {
          if (typeof row.result?.scoreOutOf10 === 'number') scoreByCompetency[row.competency.id] = row.result.scoreOutOf10;
        }
      }
      return { maHS: entry.code.trim(), scoreByCompetency };
    });
};

const average = (values: readonly number[]): number => Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

/**
 * Điểm từng năng lực theo MA TRẬN của đề (thay vì chia đều theo nhãn bài).
 *
 * `loRubric` ghi theo mã LO của SSM; `competencyTags` ghi theo id năng lực khung app. Hai bên được
 * nối bằng `fixedLoMapping` để biết LO nào ứng với năng lực nào, rồi:
 *   điểm năng lực trong bài = điểm em đạt / điểm tối đa bài × trọng số điểm của LO đó.
 *
 * Cộng điểm thô qua các bài của kỳ rồi mới quy thang 10 — bài nặng đóng góp nhiều hơn bài nhẹ,
 * đúng cách trường tính trong file nhập điểm. Trả `null` khi bài không có ma trận để nơi gọi rơi
 * về cách chia đều.
 */
const rubricWeightsFor = (
  assignment: ClassAssignment,
): Map<string, number> | null => {
  const rubric = assignment.loRubric ?? [];
  if (rubric.length === 0) return null;
  const mapping = fixedLoMapping(rubric.map((row) => row.loCode), (assignment.competencyTags ?? []).map((tag) => tag.competencyId));
  const weights = new Map<string, number>();
  for (const row of rubric) {
    const points = Number.isFinite(row.maxPoints) ? Math.max(0, row.maxPoints) : 0;
    if (points <= 0) continue;
    for (const competencyId of mapping[row.loCode] ?? []) {
      weights.set(competencyId, (weights.get(competencyId) ?? 0) + points);
    }
  }
  return weights.size > 0 ? weights : null;
};



/** Tính điểm theo đúng kỳ SSM; chỉ gọi khi có `options` để giữ nguyên API cũ. */
const buildScopedClassLoScores = (
  _grade: CompetencyGrade,
  roster: readonly RosterEntry[],
  submissions: readonly ClassSubmission[],
  assignments: readonly ClassAssignment[],
  options: LoScoreOptions,
): StudentCompetencyScores[] => {
  const period = loPeriodDefinition(options.period, options.academicYear);
  // 40% "tích luỹ" = MỌI bài thường từ đầu năm học tới hết tháng của kỳ; 60% = bài kiểm tra định kì
  // của chính kỳ. Bài tháng 8-9 vì thế vẫn vào điểm IA1 (qua phần 40%), không bị bỏ phí.
  const yearStart = Date.parse(`${loYearStart(options.period, options.academicYear)}T00:00:00+07:00`);
  const to = Date.parse(`${period.to}T23:59:59+07:00`);
  const byAssignment = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  // Mỗi em chỉ lấy MỘT lượt nộp mới nhất cho mỗi bài giao: học sinh nộp lại (attempt mới) thì điểm
  // của lượt cũ không được cộng dồn vào trung bình của năng lực.
  const latestByKey = new Map<string, ClassSubmission>();
  for (const submission of submissions) {
    if (!submission.grade || !submission.grade.teacherApproved || !submission.assignmentId) continue;
    if (!byAssignment.has(submission.assignmentId)) continue;
    const key = `${submission.studentId}::${submission.assignmentId}`;
    const current = latestByKey.get(key);
    if (!current || Date.parse(submission.createdAt) > Date.parse(current.createdAt)) latestByKey.set(key, submission);
  }
  const evidence = new Map<string, Map<string, { regular: number[]; periodic: number[] }>>();
  // Cộng dồn điểm THÔ theo ma trận: got = điểm em đạt quy theo trọng số LO, max = tổng trọng số.
  const weighted = new Map<string, Map<string, { regularGot: number; regularMax: number; periodicGot: number; periodicMax: number }>>();
  let hasRubric = false;
  for (const submission of latestByKey.values()) {
    const assignment = byAssignment.get(submission.assignmentId!)!;
    const date = Date.parse(`${(assignment.dueAt ?? assignment.createdAt ?? submission.createdAt).slice(0, 10)}T12:00:00+07:00`);
    if (!Number.isFinite(date) || date < yearStart || date > to) continue;
    const ratio = submission.grade!.maxScore > 0 ? Math.max(0, Math.min(submission.grade!.score, submission.grade!.maxScore)) / submission.grade!.maxScore : NaN;
    if (!Number.isFinite(ratio)) continue;
    const score = ratio * 10;
    const target = evidence.get(submission.studentId) ?? new Map<string, { regular: number[]; periodic: number[] }>();
    for (const tag of assignment.competencyTags ?? []) {
      const row = target.get(tag.competencyId) ?? { regular: [], periodic: [] };
      (assignment.periodicTest ? row.periodic : row.regular).push(score);
      target.set(tag.competencyId, row);
    }
    evidence.set(submission.studentId, target);

    const weights = rubricWeightsFor(assignment);
    if (!weights) continue;
    hasRubric = true;
    const bucket = weighted.get(submission.studentId) ?? new Map<string, { regularGot: number; regularMax: number; periodicGot: number; periodicMax: number }>();
    for (const [competencyId, maxPoints] of weights) {
      const row = bucket.get(competencyId) ?? { regularGot: 0, regularMax: 0, periodicGot: 0, periodicMax: 0 };
      if (assignment.periodicTest) {
        row.periodicGot += ratio * maxPoints;
        row.periodicMax += maxPoints;
      } else {
        row.regularGot += ratio * maxPoints;
        row.regularMax += maxPoints;
      }
      bucket.set(competencyId, row);
    }
    weighted.set(submission.studentId, bucket);
  }
  return roster.filter((entry) => entry.code.trim()).map((entry) => {
    const scoreByCompetency: Record<string, number> = {};
    // Có ma trận thì tính theo điểm thô đã cộng dồn (40% thường + 60% định kì, đúng luật kỳ).
    const bucket = weighted.get(entry.id);
    if (hasRubric && bucket) {
      for (const [competencyId, row] of bucket) {
        const regularScore = row.regularMax > 0 ? (row.regularGot / row.regularMax) * 10 : null;
        const periodicScore = row.periodicMax > 0 ? (row.periodicGot / row.periodicMax) * 10 : null;
        if (regularScore !== null && periodicScore !== null) scoreByCompetency[competencyId] = Math.round((regularScore * 0.4 + periodicScore * 0.6) * 10) / 10;
        else if (periodicScore !== null) scoreByCompetency[competencyId] = Math.round(periodicScore * 10) / 10;
        else if (regularScore !== null) scoreByCompetency[competencyId] = Math.round(regularScore * 10) / 10;
      }
    }
    const rows = evidence.get(entry.id) ?? new Map();
    for (const [competencyId, values] of rows) {
      if (scoreByCompetency[competencyId] !== undefined) continue;
      // Bài CÓ ma trận nhưng năng lực này không được chấm (trọng số 0, vd vectơ lớp 10 giữa HKI)
      // thì tuyệt đối không rơi về trung bình nhãn bài — làm vậy là tự bịa điểm cho phần đề không có.
      if (hasRubric && bucket && bucket.size > 0 && !bucket.has(competencyId)) continue;
      if (values.regular.length && values.periodic.length) scoreByCompetency[competencyId] = Math.round((average(values.regular) * 0.4 + average(values.periodic) * 0.6) * 10) / 10;
      else if (values.periodic.length) scoreByCompetency[competencyId] = average(values.periodic);
      else if (values.regular.length) scoreByCompetency[competencyId] = average(values.regular);
    }
    return { maHS: entry.code.trim(), scoreByCompetency };
  });
};
