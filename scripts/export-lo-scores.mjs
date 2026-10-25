/**
 * Tính điểm LO cho từng lớp theo MA TRẬN ĐIỂM của trường, xuất ra JSON + CSV để giáo viên tự
 * nhập lên SSM khi đường API bị chặn (403).
 *
 * Không cần SSM: chỉ đọc Firestore (qua proxy của app) và dùng đúng công thức trong
 * `src/lib/ssm/loClassScores.ts` (40% thường + 60% định kì, cộng điểm thô theo trọng số LO).
 *
 * node scripts/export-lo-scores.js
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.QA_CDP_PORT || 9223);

const CLASSES = [
  { name: '10Olinda', id: 'class-1787208462088', grade: 10 },
  { name: '11Columbus', id: 'class-1787188523562', grade: 11 },
  { name: '12LoTrinh1', id: 'class-1787208442826', grade: 12 },
];

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const appTab = list.find((t) => t.type === 'page' && t.url.includes('giaoandewey'));
if (!appTab) {
  console.error('Không có tab app giaoandewey.');
  process.exit(2);
}

/** Chạy biểu thức trong tab app, trả về giá trị. */
const run = async (expression, timeoutMs = 240000) => {
  const sock = new WebSocket(appTab.webSocketDebuggerUrl);
  const outcome = await new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise({ error: 'TIMEOUT' }), timeoutMs);
    sock.addEventListener('open', () => {
      sock.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true, userGesture: true } }));
    });
    sock.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      resolvePromise(msg.result);
    });
    sock.addEventListener('error', (e) => {
      clearTimeout(timer);
      resolvePromise({ error: String(e.message || e) });
    });
  });
  sock.close();
  if (outcome.error) throw new Error(outcome.error);
  const value = outcome.result?.value;
  return typeof value === 'string' ? JSON.parse(value) : value;
};

/** Lấy dữ liệu thô (bài giao, bài nộp, danh sách lớp) của một lớp từ Firestore qua proxy app. */
const fetchClassData = async (classId) =>
  run(`(async () => {
    const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
    if (!key) return JSON.stringify({ error: 'chưa đăng nhập' });
    const user = JSON.parse(localStorage.getItem(key));
    const idToken = user.stsTokenManager.accessToken;
    const call = async (action) => {
      const res = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, idToken, classId: ${JSON.stringify(classId)} }) });
      const json = await res.json();
      return Array.isArray(json) ? json : (json.assignments || json.submissions || json.students || []);
    };
    const assignments = await call('teacherAssignments');
    const submissions = await call('teacherSubmissions');
    const roster = await call('teacherRoster');
    return JSON.stringify({ assignments, submissions, roster });
  })()`);

/** Kỳ nào chứa ngày nào: F1 = 01/08–30/09, IA1 = tháng 10. */
const PERIODS = {
  F1: { from: '2026-08-01', to: '2026-09-30' },
  IA1: { from: '2026-10-01', to: '2026-10-31' },
};

const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null);

/**
 * Điểm từng năng lực của từng em trong một kỳ.
 * - Chỉ lượt nộp đã duyệt, mỗi (em, bài) lấy lượt mới nhất.
 * - Bài có `loRubric`: đóng góp = (điểm đạt / điểm tối đa) × trọng số LO; cộng dồn rồi quy thang 10.
 * - Bài không có ma trận: rơi về trung bình nhãn năng lực (như trước).
 * - Gộp kỳ: 40% thường + 60% định kì khi có cả hai.
 */
const computeScores = (assignments, submissions, roster, periodKey) => {
  const period = PERIODS[periodKey];
  const from = Date.parse(`${period.from}T00:00:00+07:00`);
  const to = Date.parse(`${period.to}T23:59:59+07:00`);
  const byId = new Map(assignments.map((a) => [a.id, a]));

  const latest = new Map();
  for (const sub of submissions) {
    if (!sub.grade?.teacherApproved || !sub.assignmentId) continue;
    if (!byId.has(sub.assignmentId)) continue;
    const key = `${sub.studentId}::${sub.assignmentId}`;
    const current = latest.get(key);
    if (!current || Date.parse(sub.createdAt) > Date.parse(current.createdAt)) latest.set(key, sub);
  }

  const weighted = new Map();
  const plain = new Map();
  for (const sub of latest.values()) {
    const assignment = byId.get(sub.assignmentId);
    const dateText = (assignment.dueAt || assignment.createdAt || sub.createdAt || '').slice(0, 10);
    const date = Date.parse(`${dateText}T12:00:00+07:00`);
    if (!Number.isFinite(date) || date < from || date > to) continue;
    const max = sub.grade.maxScore || 0;
    if (!(max > 0)) continue;
    const ratio = Math.max(0, Math.min(sub.grade.score, max)) / max;

    if ((assignment.loRubric || []).length > 0) {
      const bucket = weighted.get(sub.studentId) ?? new Map();
      for (const [competencyId, maxPoints] of Object.entries(assignment.weightsByCompetency ?? {})) {
        const row = bucket.get(competencyId) ?? { rGot: 0, rMax: 0, pGot: 0, pMax: 0 };
        if (assignment.periodicTest) { row.pGot += ratio * maxPoints; row.pMax += maxPoints; }
        else { row.rGot += ratio * maxPoints; row.rMax += maxPoints; }
        bucket.set(competencyId, row);
      }
      weighted.set(sub.studentId, bucket);
    }

    const bucket2 = plain.get(sub.studentId) ?? new Map();
    for (const tag of assignment.competencyTags || []) {
      const row = bucket2.get(tag.competencyId) ?? { regular: [], periodic: [] };
      (assignment.periodicTest ? row.periodic : row.regular).push(ratio * 10);
      bucket2.set(tag.competencyId, row);
    }
    plain.set(sub.studentId, bucket2);
  }

  return roster.map((student) => {
    const byCompetency = {};
    const wb = weighted.get(student.studentId);
    if (wb) {
      for (const [competencyId, row] of wb) {
        const r = row.rMax > 0 ? (row.rGot / row.rMax) * 10 : null;
        const p = row.pMax > 0 ? (row.pGot / row.pMax) * 10 : null;
        let score = null;
        if (r !== null && p !== null) score = r * 0.4 + p * 0.6;
        else if (p !== null) score = p;
        else if (r !== null) score = r;
        if (score !== null) byCompetency[competencyId] = Math.round(score * 10) / 10;
      }
    }
    const pb = plain.get(student.studentId);
    if (pb) {
      for (const [competencyId, row] of pb) {
        if (byCompetency[competencyId] !== undefined) continue;
        const r = average(row.regular);
        const p = average(row.periodic);
        let score = null;
        if (r !== null && p !== null) score = r * 0.4 + p * 0.6;
        else if (p !== null) score = p;
        else if (r !== null) score = r;
        if (score !== null) byCompetency[competencyId] = Math.round(score * 10) / 10;
      }
    }
    return { studentId: student.studentId, name: student.name, code: student.code || '', byCompetency };
  });
};

/** Quy thang 10 → mức SSM (4 / 3.5 / 3 / 2.5 / 2 / 1.5 / 1 / 0), thang không có 0.5. */
const SCALE = [4, 3.5, 3, 2.5, 2, 1.5, 1, 0];
const toScale4 = (score) => {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 10) return 'N';
  const raw = score / 2.5;
  let best = SCALE[0];
  let gap = Math.abs(SCALE[0] - raw);
  for (const mark of SCALE) {
    const d = Math.abs(mark - raw);
    if (d < gap) { best = mark; gap = d; }
  }
  return best;
};

/** Bảng ghép LO ↔ năng lực khung (trùng với src/lib/ssm/loFixedMapping.ts). */
const LO_TO_COMPETENCY = {
  LO_DIS_TO_34344: 'g10-tap-hop-va-menh-de',
  LO_DIS_TO_34345: 'g10-phep-toan-tren-tap-hop',
  LO_DIS_TO_34346: 'g10-bpt-bac-nhat-hai-an',
  LO_DIS_TO_34352: 'g10-gia-tri-luong-giac-0-180',
  LO_DIS_TO_34353: 'g10-he-thuc-luong-tam-giac',
  LO_DIS_TO_34354: 'g10-vecto-va-phep-toan',
  LO_DIS_TO_34745: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34746: 'g11-ham-va-pt-luong-giac',
  LO_DIS_TO_34747: 'g11-day-so-cap-so',
  LO_DIS_TO_34748: 'g11-day-so-cap-so',
  LO_DIS_TO_34756: 'g11-duong-thang-mat-phang-kg',
  LO_DIS_TO_34757: 'g11-quan-he-song-song',
  LO_DIS_TO_34383: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34384: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34385: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34386: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34387: 'g12-khao-sat-ham-so',
  LO_DIS_TO_34390: 'g12-toa-do-khong-gian',
  LO_DIS_TO_34391: 'g12-toa-do-khong-gian',
  LO_DIS_TO_34392: 'g12-toa-do-khong-gian',
};

/** Đổ trọng số LO vào từng năng lực để bộ tính dùng lại được. */
const withWeights = (assignments) =>
  assignments.map((a) => {
    const weights = {};
    for (const row of a.loRubric || []) {
      const competencyId = LO_TO_COMPETENCY[row.loCode];
      if (!competencyId) continue;
      if (!(row.maxPoints > 0)) continue;
      weights[competencyId] = (weights[competencyId] || 0) + row.maxPoints;
    }
    return { ...a, weightsByCompetency: weights };
  });

const output = [];
for (const cls of CLASSES) {
  const data = await fetchClassData(cls.id);
  if (data.error) throw new Error(`${cls.name}: ${data.error}`);
  const assignments = withWeights(data.assignments || []);
  const roster = data.roster || [];
  const rubricLos = [...new Set((data.assignments || []).flatMap((a) => (a.loRubric || []).map((r) => r.loCode)))].sort();

  for (const periodKey of ['IA1', 'F1']) {
    const scores = computeScores(assignments, data.submissions || [], roster, periodKey);
    output.push({
      class: cls.name,
      grade: cls.grade,
      period: periodKey,
      los: rubricLos,
      rows: scores.map((row) => ({
        name: row.name,
        code: row.code,
        marks: Object.fromEntries(rubricLos.map((loCode) => {
          const competencyId = LO_TO_COMPETENCY[loCode];
          return [loCode, toScale4(row.byCompetency[competencyId])];
        })),
      })),
    });
  }
}

const outPath = resolve('docs/qa/lo-scores.json');
writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify({ written: outPath, classes: output.length, summary: output.map((o) => `${o.class} ${o.period}: ${o.rows.length} HS, ${o.los.length} LO`) }, null, 1));
