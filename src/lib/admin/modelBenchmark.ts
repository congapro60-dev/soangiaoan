/** Đo so sánh model chấm: gọi máy chủ (chỉ quản trị) + tính 3 chỉ số so với điểm giáo viên đã chốt. */
import { auth } from '../firebase';
import { moTaLoiHttp } from '../httpErrorText';
import { questionKey } from '../classroom/questionRescore';

export interface BenchmarkTruth {
  id: string;
  assignmentId: string;
  studentId: string;
  examCode: string | null;
  score: number;
  maxScore: number;
  approved: boolean;
  editedByTeacher: boolean;
  files: number;
  rows: { q: string; score: number; maxScore: number; teacherEdited: boolean }[];
}

export interface BenchmarkRun {
  ok: boolean;
  model: string;
  ms: number;
  error?: string;
  score?: number;
  maxScore?: number;
  rows?: { q: string; score: number; maxScore: number; status: string; review: boolean }[];
  usage?: { model: string; inputTokens: number; outputTokens: number; thoughtsTokens: number; costUsd: number | null }[];
}

const call = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần đăng nhập tài khoản quản trị.');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : moTaLoiHttp(response.status));
  return data as T;
};

export const listBenchmarkModels = () => call<{ vilao: { id?: string }[]; xkiro: { id?: string }[] }>({ action: 'adminBenchmarkModels' });
export const listBenchmarkSubmissions = (assignmentIds: string[]) => call<{ items: BenchmarkTruth[] }>({ action: 'adminBenchmarkList', assignmentIds });
export const loadBenchmarkRuns = (clear = false) => call<{ runs: { submissionId: string; run: BenchmarkRun }[] }>({ action: 'adminBenchmarkRuns', clear });
export const runBenchmarkGrade = (submissionId: string, model: string, mode: 'quick' | 'thorough') =>
  call<BenchmarkRun>({ action: 'adminBenchmarkGrade', submissionId, model, mode });

export interface ModelSummary {
  model: string;
  runs: number;
  failed: number;
  /** Trung bình |điểm máy − điểm GV| trên thang 10. */
  meanAbsDiff10: number | null;
  maxAbsDiff10: number | null;
  /** Tỉ lệ bài lệch ≤ 0,25 điểm (thang 10). */
  within025: number | null;
  /** Số câu lệch điểm GV trung bình mỗi bài (so theo số câu). */
  rowMismatchPerSubmission: number | null;
  /** Số câu máy gắn cờ phải hỏi lại / GV soát, trung bình mỗi bài. */
  flaggedPerSubmission: number | null;
  costUsdPerSubmission: number | null;
  /** Có lượt gọi chưa có giá trong bảng giá → tiền chỉ là phần đã biết. */
  costPartial: boolean;
  avgSeconds: number | null;
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

export const summarizeBenchmark = (truth: BenchmarkTruth[], runs: { submissionId: string; run: BenchmarkRun }[]): ModelSummary[] => {
  const byId = new Map(truth.map(t => [t.id, t]));
  const models = [...new Set(runs.map(r => r.run.model))];
  return models.map(model => {
    const mine = runs.filter(r => r.run.model === model);
    const good = mine.filter(r => r.run.ok && byId.has(r.submissionId) && typeof r.run.score === 'number' && r.run.maxScore);
    const diffs = good.map(r => {
      const t = byId.get(r.submissionId)!;
      return Math.abs(r.run.score! / r.run.maxScore! - t.score / t.maxScore) * 10;
    });
    const mismatches = good.map(r => {
      const teacherRows = new Map(byId.get(r.submissionId)!.rows.map(row => [questionKey(row.q), row.score]));
      return (r.run.rows || []).filter(row => {
        const teacher = teacherRows.get(questionKey(row.q));
        return teacher !== undefined && Math.abs(teacher - row.score) > 0.01;
      }).length;
    });
    const costs = mine.filter(r => r.run.ok).map(r => (r.run.usage || []).reduce((s, u) => s + (u.costUsd ?? 0), 0));
    const costPartial = mine.some(r => (r.run.usage || []).some(u => u.costUsd === null));
    const meanAbs = avg(diffs);
    return {
      model,
      runs: mine.length,
      failed: mine.length - good.length,
      meanAbsDiff10: meanAbs === null ? null : round(meanAbs),
      maxAbsDiff10: diffs.length ? round(Math.max(...diffs)) : null,
      within025: diffs.length ? round(diffs.filter(d => d <= 0.25 + 1e-9).length / diffs.length) : null,
      rowMismatchPerSubmission: mismatches.length ? round(avg(mismatches)!) : null,
      flaggedPerSubmission: good.length ? round(avg(good.map(r => (r.run.rows || []).filter(row => row.review).length))!) : null,
      costUsdPerSubmission: costs.length ? round(avg(costs)!, 6) : null,
      costPartial,
      avgSeconds: mine.length ? round(avg(mine.map(r => r.run.ms / 1000))!, 1) : null,
    };
  });
};
