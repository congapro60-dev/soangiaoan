/**
 * Tính điểm LO cho 3 lớp × (IA1, F1) từ `class-dump.json`, theo MA TRẬN ĐIỂM của trường.
 *
 * Dùng khi SSM chặn API (403): tính offline, xuất CSV/JSON để giáo viên tự nhập lên SSM.
 * Công thức khớp `src/lib/ssm/loClassScores.ts`: mỗi (em, bài) lấy lượt duyệt mới nhất;
 * bài có ma trận thì đóng góp = tỉ lệ đạt × trọng số LO (cộng thô, không lấy trung bình thang);
 * gộp kỳ = 40% thường + 60% định kì khi có cả hai.
 *
 * node scripts/compute-lo-scores.mjs "<đường dẫn class-dump.json>"
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const input = process.argv[2] || resolve(process.env.USERPROFILE || '.', 'Downloads/class-dump.json');
const { dump } = JSON.parse(readFileSync(input, 'utf8'));

/** Bảng ghép LO ↔ năng lực khung (trùng src/lib/ssm/loFixedMapping.ts). */
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

/** Tên chủ đề hiển thị cho giáo viên đọc bảng. */
const COMPETENCY_LABEL = {
  'g10-tap-hop-va-menh-de': 'Mệnh đề',
  'g10-phep-toan-tren-tap-hop': 'Tập hợp',
  'g10-bpt-bac-nhat-hai-an': 'BPT bậc nhất 2 ẩn',
  'g10-gia-tri-luong-giac-0-180': 'Lượng giác 0–180°',
  'g10-he-thuc-luong-tam-giac': 'Hệ thức lượng',
  'g10-vecto-va-phep-toan': 'Vectơ',
  'g11-ham-va-pt-luong-giac': 'Lượng giác & PT LG',
  'g11-day-so-cap-so': 'Dãy số & cấp số',
  'g11-duong-thang-mat-phang-kg': 'Đường thẳng & mp',
  'g11-quan-he-song-song': 'Quan hệ song song',
  'g12-khao-sat-ham-so': 'Khảo sát hàm số',
  'g12-toa-do-khong-gian': 'Toạ độ không gian',
};

const PERIODS = {
  IA1: { from: '2026-10-01', to: '2026-10-31', label: 'IA1 · tháng 10' },
  F1: { from: '2026-08-01', to: '2026-09-30', label: 'F1 · tháng 8–9' },
};

const SCALE = [4, 3.5, 3, 2.5, 2, 1.5, 1, 0];

/** Thang 10 → mức SSM; thang nhảy từ 1 xuống 0, không có 0.5. */
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

const avg = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

const weightsOf = (assignment) => {
  const out = {};
  for (const row of assignment.loRubric || []) {
    const competencyId = LO_TO_COMPETENCY[row.loCode];
    if (!competencyId || !(row.maxPoints > 0)) continue;
    out[competencyId] = (out[competencyId] || 0) + row.maxPoints;
  }
  return out;
};

const computePeriod = (assignments, submissions, roster, periodKey) => {
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
  let usedWeighted = 0;
  let usedPlain = 0;

  for (const sub of latest.values()) {
    const assignment = byId.get(sub.assignmentId);
    const dateText = String(assignment.dueAt || assignment.createdAt || sub.createdAt || '').slice(0, 10);
    const date = Date.parse(`${dateText}T12:00:00+07:00`);
    if (!Number.isFinite(date) || date < from || date > to) continue;
    const max = sub.grade.maxScore || 0;
    if (!(max > 0)) continue;
    const ratio = Math.max(0, Math.min(sub.grade.score, max)) / max;

    const weights = weightsOf(assignment);
    if (Object.keys(weights).length > 0) {
      usedWeighted += 1;
      const bucket = weighted.get(sub.studentId) ?? new Map();
      for (const [competencyId, maxPoints] of Object.entries(weights)) {
        const row = bucket.get(competencyId) ?? { rGot: 0, rMax: 0, pGot: 0, pMax: 0 };
        if (assignment.periodicTest) { row.pGot += ratio * maxPoints; row.pMax += maxPoints; }
        else { row.rGot += ratio * maxPoints; row.rMax += maxPoints; }
        bucket.set(competencyId, row);
      }
      weighted.set(sub.studentId, bucket);
    } else {
      usedPlain += 1;
      const bucket = plain.get(sub.studentId) ?? new Map();
      for (const tag of assignment.competencyTags || []) {
        const row = bucket.get(tag.competencyId) ?? { regular: [], periodic: [] };
        (assignment.periodicTest ? row.periodic : row.regular).push(ratio * 10);
        bucket.set(tag.competencyId, row);
      }
      plain.set(sub.studentId, bucket);
    }
  }

  const rows = roster.map((student) => {
    const byCompetency = {};
    for (const [competencyId, row] of weighted.get(student.studentId) ?? []) {
      const r = row.rMax > 0 ? (row.rGot / row.rMax) * 10 : null;
      const p = row.pMax > 0 ? (row.pGot / row.pMax) * 10 : null;
      const score = r !== null && p !== null ? r * 0.4 + p * 0.6 : (p ?? r);
      if (score !== null) byCompetency[competencyId] = Math.round(score * 10) / 10;
    }
    for (const [competencyId, row] of plain.get(student.studentId) ?? []) {
      if (byCompetency[competencyId] !== undefined) continue;
      const r = avg(row.regular);
      const p = avg(row.periodic);
      const score = r !== null && p !== null ? r * 0.4 + p * 0.6 : (p ?? r);
      if (score !== null) byCompetency[competencyId] = Math.round(score * 10) / 10;
    }
    return { name: student.name, code: student.code || '', mark10: byCompetency, mark4: {} };
  });

  const competencyIds = [...new Set(rows.flatMap((r) => Object.keys(r.mark10)))];
  for (const row of rows) {
    for (const competencyId of competencyIds) row.mark4[competencyId] = toScale4(row.mark10[competencyId]);
  }
  return { period: periodKey, label: period.label, competencyIds, rows, usedWeighted, usedPlain };
};

const output = [];
for (const entry of dump) {
  const { class: cls, assignments, submissions, roster, classStudents } = entry;
  // `teacherRoster` chỉ trả studentId + name; mã HS (cột "Mã HS" SSM) nằm ở `classStudents`.
  const codeById = new Map((classStudents || []).map((s) => [s.id, s.code || '']));
  const rosterWithCode = (roster || []).map((r) => ({ ...r, code: codeById.get(r.studentId) || '' }));
  const los = [...new Set((assignments || []).flatMap((a) => (a.loRubric || []).map((r) => r.loCode)))].sort();
  const periods = {};
  for (const periodKey of ['IA1', 'F1']) {
    periods[periodKey] = computePeriod(assignments || [], submissions || [], rosterWithCode, periodKey);
  }
  output.push({ className: cls.name, grade: cls.grade, los, periods });
}

writeFileSync(resolve('docs/qa/lo-scores.json'), JSON.stringify(output, null, 2), 'utf8');

/** Một dòng CSV mỗi học sinh × kỳ: mã HS, tên, rồi điểm từng LO theo thứ tự cột của SSM. */
const lines = ['lop,ky,ma_hs,ten,' + 'TODO_FILL_LO_COLUMNS'];
for (const cls of output) {
  for (const periodKey of ['IA1', 'F1']) {
    const p = cls.periods[periodKey];
    for (const row of p.rows) {
      lines.push([cls.className, p.label, row.code, row.name].join(','));
    }
  }
}
writeFileSync(resolve('docs/qa/lo-scores-raw.csv'), lines.join('\n'), 'utf8');

console.log(JSON.stringify({
  written: ['docs/qa/lo-scores.json', 'docs/qa/lo-scores-raw.csv'],
  summary: output.map((cls) => ({
    class: cls.className,
    los: cls.los.length,
    IA1: `${cls.periods.IA1.rows.length} HS, ${cls.periods.IA1.competencyIds.length} năng lực (ma trận ${cls.periods.IA1.usedWeighted} bài, thường ${cls.periods.IA1.usedPlain} bài)`,
    F1: `${cls.periods.F1.rows.length} HS, ${cls.periods.F1.competencyIds.length} năng lực (ma trận ${cls.periods.F1.usedWeighted} bài, thường ${cls.periods.F1.usedPlain} bài)`,
  })),
}, null, 1));
