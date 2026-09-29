/**
 * Điểm năng lực (thang 10) của TỪNG em trong lớp, từ bài BTVN đã duyệt — tái dùng đúng bộ máy
 * hồ sơ năng lực (`buildStudentCompetencyPortfolio`), chỉ gom theo học sinh. Thuần.
 */
import { buildStudentCompetencyPortfolio } from '../classroom/competency/portfolioModel';
import type { CompetencyGrade } from '../classroom/competency/framework';
import type { StudentCompetencyScores } from './loMapping';

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
  competencyTags?: ReadonlyArray<{ competencyId: string }>;
}

/** Mỗi em → điểm thang 10 của các năng lực em CÓ minh chứng (bài đã duyệt). */
export const buildClassLoScores = (
  grade: CompetencyGrade,
  roster: readonly RosterEntry[],
  submissions: readonly ClassSubmission[],
  assignments: readonly ClassAssignment[],
): StudentCompetencyScores[] => {
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
