/**
 * Tính điểm LO + soạn nhận xét NGAY TRONG trang app (không cần dump file, không cần CDP).
 *
 * Trả về JSON gọn: mỗi lớp × kỳ gồm danh sách { code, name, marks: {LO: mức}, comment }.
 * Được gọi qua cloud browser hoặc `node scripts/run-in-app.js` (in kết quả ra stdout để shell ghi file).
 */
export const COMPUTE_IN_APP = String.raw`
(async () => {
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
    LO_DIS_TO_34392: 'g12-toa-do-khong-gian'
  };
  const LABEL = {
    'g10-tap-hop-va-menh-de': 'mệnh đề',
    'g10-phep-toan-tren-tap-hop': 'các phép toán trên tập hợp',
    'g10-bpt-bac-nhat-hai-an': 'bất phương trình bậc nhất hai ẩn',
    'g10-gia-tri-luong-giac-0-180': 'giá trị lượng giác của góc 0°–180°',
    'g10-he-thuc-luong-tam-giac': 'hệ thức lượng trong tam giác',
    'g10-vecto-va-phep-toan': 'vectơ và các phép toán',
    'g11-ham-va-pt-luong-giac': 'hàm số lượng giác và phương trình lượng giác',
    'g11-day-so-cap-so': 'dãy số, cấp số cộng và cấp số nhân',
    'g11-duong-thang-mat-phang-kg': 'đường thẳng, mặt phẳng trong không gian',
    'g11-quan-he-song-song': 'quan hệ song song',
    'g12-khao-sat-ham-so': 'khảo sát hàm số và ứng dụng đạo hàm',
    'g12-toa-do-khong-gian': 'toạ độ trong không gian'
  };
  const PERIODS = {
    IA1: { from: '2026-10-01', to: '2026-10-31', label: 'IA1 · tháng 10' },
    F1: { from: '2026-08-01', to: '2026-09-30', label: 'F1 · tháng 8–9' }
  };
  const SCALE = [4, 3.5, 3, 2.5, 2, 1.5, 1, 0];
  const toScale4 = (score) => {
    if (typeof score !== 'number' || !isFinite(score) || score < 0 || score > 10) return 'N';
    const raw = score / 2.5;
    let best = SCALE[0], gap = Math.abs(SCALE[0] - raw);
    for (const mark of SCALE) { const d = Math.abs(mark - raw); if (d < gap) { best = mark; gap = d; } }
    return best;
  };
  const avg = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);
  const round1 = (v) => Math.round(v * 10) / 10;

  const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
  const idToken = JSON.parse(localStorage.getItem(key)).stsTokenManager.accessToken;
  const call = async (action, classId) => {
    const res = await fetch('/api/classroom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, idToken, classId }) });
    const json = await res.json();
    return Array.isArray(json) ? json : (json.assignments || json.submissions || json.students || []);
  };
  const cacheKey = Object.keys(localStorage).find(k => k.startsWith('smart_lesson_plan_data:') && !k.endsWith('anonymous'));
  const appData = JSON.parse(localStorage.getItem(cacheKey) || '{}');

  const classes = [
    { name: '10Olinda', id: 'class-1787208462088' },
    { name: '11Columbus', id: 'class-1787188523562' },
    { name: '12LoTrinh1', id: 'class-1787208442826' }
  ];

  const comment = (name, mark4, ids) => {
    const marks = ids.map(id => ({ id, mark: typeof mark4[id] === 'number' ? mark4[id] : null })).filter(x => x.mark !== null);
    if (!marks.length) return 'Chưa có bài nộp nào được duyệt trong kỳ này nên chưa đủ căn cứ nhận xét.';
    const a = round1(marks.reduce((s, x) => s + x.mark, 0) / marks.length);
    const sorted = [...marks].sort((x, y) => y.mark - x.mark);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    const parts = [];
    if (a >= 3.5) parts.push('Em ' + name + ' học tốt môn Toán trong kỳ này.');
    else if (a >= 3) parts.push('Em ' + name + ' có ý thức học tập, kết quả ở mức khá.');
    else if (a >= 2.5) parts.push('Em ' + name + ' cần cố gắng thêm để nâng kết quả môn Toán.');
    else parts.push('Em ' + name + ' còn hạn chế nhiều ở môn Toán, cần được hỗ trợ thêm.');
    if (best.mark >= 2.5) parts.push('Em nắm ' + (best.mark >= 3.5 ? 'chắc' : 'được') + ' phần ' + (LABEL[best.id] || best.id) + '.');
    if (worst.mark < 2.5) parts.push('Cần tập trung ôn lại phần ' + (LABEL[worst.id] || worst.id) + '.');
    else if (round1(best.mark - worst.mark) >= 1) parts.push('Cần chú ý hơn ở phần ' + (LABEL[worst.id] || worst.id) + '.');
    if (a >= 3) parts.push('Em tiếp tục phát huy, làm thêm bài tập nâng cao để giữ vững phong độ.');
    else if (a >= 2.5) parts.push('Em nên làm lại các bài tập đã chữa và hỏi thầy cô ngay khi chưa hiểu bài.');
    else parts.push('Em cần học lại kiến thức nền, làm bài tập cơ bản và nhờ thầy cô kèm thêm.');
    return parts.join(' ');
  };

  const out = [];
  for (const cls of classes) {
    const assignments = await call('teacherAssignments', cls.id);
    const submissions = await call('teacherSubmissions', cls.id);
    const roster = await call('teacherRoster', cls.id);
    const target = (appData.classes || []).find(c => c.id === cls.id);
    const codeById = new Map(((target ? target.students : []) || []).map(s => [s.id, s.code || '']));
    const rosterWithCode = roster.map(r => ({ ...r, code: codeById.get(r.studentId) || '' }));
    const los = [...new Set(assignments.flatMap(a => (a.loRubric || []).map(x => x.loCode)))].sort();

    for (const periodKey of ['IA1', 'F1']) {
      const p = PERIODS[periodKey];
      const from = Date.parse(p.from + 'T00:00:00+07:00');
      const to = Date.parse(p.to + 'T23:59:59+07:00');
      const byId = new Map(assignments.map(a => [a.id, a]));

      const latest = new Map();
      for (const sub of submissions) {
        if (!sub.grade || !sub.grade.teacherApproved || !sub.assignmentId) continue;
        if (!byId.has(sub.assignmentId)) continue;
        const k2 = sub.studentId + '::' + sub.assignmentId;
        const cur = latest.get(k2);
        if (!cur || Date.parse(sub.createdAt) > Date.parse(cur.createdAt)) latest.set(k2, sub);
      }

      const weighted = new Map(), plain = new Map();
      for (const sub of latest.values()) {
        const a = byId.get(sub.assignmentId);
        const dateText = String(a.dueAt || a.createdAt || sub.createdAt || '').slice(0, 10);
        const date = Date.parse(dateText + 'T12:00:00+07:00');
        if (!isFinite(date) || date < from || date > to) continue;
        const max = sub.grade.maxScore || 0;
        if (!(max > 0)) continue;
        const ratio = Math.max(0, Math.min(sub.grade.score, max)) / max;

        const weights = {};
        for (const row of a.loRubric || []) {
          const cid = LO_TO_COMPETENCY[row.loCode];
          if (!cid || !(row.maxPoints > 0)) continue;
          weights[cid] = (weights[cid] || 0) + row.maxPoints;
        }
        if (Object.keys(weights).length) {
          const bucket = weighted.get(sub.studentId) || new Map();
          for (const cid of Object.keys(weights)) {
            const row = bucket.get(cid) || { rG: 0, rM: 0, pG: 0, pM: 0 };
            if (a.periodicTest) { row.pG += ratio * weights[cid]; row.pM += weights[cid]; }
            else { row.rG += ratio * weights[cid]; row.rM += weights[cid]; }
            bucket.set(cid, row);
          }
          weighted.set(sub.studentId, bucket);
        } else {
          const bucket = plain.get(sub.studentId) || new Map();
          for (const tag of a.competencyTags || []) {
            const row = bucket.get(tag.competencyId) || { regular: [], periodic: [] };
            (a.periodicTest ? row.periodic : row.regular).push(ratio * 10);
            bucket.set(tag.competencyId, row);
          }
          plain.set(sub.studentId, bucket);
        }
      }

      const rows = rosterWithCode.map(stu => {
        const byC = {};
        for (const [cid, row] of weighted.get(stu.studentId) || []) {
          const r = row.rM > 0 ? (row.rG / row.rM) * 10 : null;
          const q = row.pM > 0 ? (row.pG / row.pM) * 10 : null;
          const score = (r !== null && q !== null) ? r * 0.4 + q * 0.6 : (q !== null ? q : r);
          if (score !== null) byC[cid] = round1(score);
        }
        for (const [cid, row] of plain.get(stu.studentId) || []) {
          if (byC[cid] !== undefined) continue;
          const r = avg(row.regular), q = avg(row.periodic);
          const score = (r !== null && q !== null) ? r * 0.4 + q * 0.6 : (q !== null ? q : r);
          if (score !== null) byC[cid] = round1(score);
        }
        const mark4 = {};
        for (const lo of los) mark4[lo] = toScale4(byC[LO_TO_COMPETENCY[lo]]);
        const competencyIds = [...new Set(los.map(lo => LO_TO_COMPETENCY[lo]).filter(Boolean))];
        return { code: stu.code, name: stu.name, mark10: byC, mark4, comment: comment(stu.name, mark4, competencyIds) };
      });

      out.push({ className: cls.name, period: periodKey, label: p.label, los, rows });
    }
  }
  return JSON.stringify({ generatedAt: new Date().toISOString(), classes: out });
})()
`;
