type Row = Record<string, unknown>;
export interface AssignmentStats {
  assignmentId: string;
  discoverSeedId: string;
  title: string;
  started: number;
  completed: number;
  objectives: Array<{ objectiveId: string; avgPercent: number }>;
  misconceptions: Array<{ id: string; count: number }>;
  wrongQuestions: Array<{ id: string; count: number }>;
  support: { retryEvents: number; studentsRetrying: number };
}

const str = (value: unknown) => typeof value === 'string' ? value : '';
const num = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const arr = (value: unknown): Row[] => Array.isArray(value) ? value.filter((item): item is Row => !!item && typeof item === 'object') : [];
const top = (counts: Map<string, number>) => [...counts].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, 5);

// Chỉ tính sự kiện lượt đầu (type 'attempt') cho điểm/mục tiêu/lỗi sai; 'retry' chỉ đếm làm mức hỗ trợ.
export const buildAssignmentStats = (assignments: Array<Row & { id: string }>, progress: Row[], events: Row[]): AssignmentStats[] =>
  assignments.map(assignment => {
    const mine = (row: Row) => row.assignmentId === assignment.id;
    const own = events.filter(mine);
    const first = own.filter(event => event.type === 'attempt');
    const retries = own.filter(event => event.type === 'retry');
    const rows = progress.filter(mine);
    const mastery = new Map<string, { sum: number; n: number }>();
    const misconceptions = new Map<string, number>();
    const wrong = new Map<string, number>();
    first.forEach(event => {
      arr(event.objectiveScores).forEach(score => {
        const max = num(score.maxScore);
        if (!max) return;
        const cur = mastery.get(str(score.objectiveId)) || { sum: 0, n: 0 };
        mastery.set(str(score.objectiveId), { sum: cur.sum + num(score.score) / max, n: cur.n + 1 });
      });
      (Array.isArray(event.misconceptionIds) ? event.misconceptionIds : []).forEach(id => misconceptions.set(String(id), (misconceptions.get(String(id)) || 0) + 1));
      (Array.isArray(event.wrongQuestionIds) ? event.wrongQuestionIds : []).forEach(id => wrong.set(String(id), (wrong.get(String(id)) || 0) + 1));
    });
    return {
      assignmentId: assignment.id,
      discoverSeedId: str(assignment.discoverSeedId),
      title: str(assignment.title),
      started: rows.length,
      completed: rows.filter(row => row.status === 'completed').length,
      objectives: [...mastery].map(([objectiveId, { sum, n }]) => ({ objectiveId, avgPercent: Math.round((sum / n) * 100) })),
      misconceptions: top(misconceptions),
      wrongQuestions: top(wrong),
      support: { retryEvents: retries.length, studentsRetrying: new Set(retries.map(event => event.studentId)).size },
    };
  });
