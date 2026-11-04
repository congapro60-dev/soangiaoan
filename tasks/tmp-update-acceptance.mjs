import { readFileSync, writeFileSync } from 'node:fs';

// 1) Cập nhật acceptance: QA live R1 PASS + R2 NOT_RUN
const a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const marker = '## Gate D mini · Nhóm xoay tua tự động (29/10/2026)';
const idx = a.indexOf(marker);
if (idx === -1) throw new Error('không tìm thấy mục Gate D mini trong acceptance');
const replacement = [
  '## Gate D mini · Nhóm xoay tua tự động (29/10/2026 — QA live chốt ngày 29/10)',
  '',
  '| Khoản | Kết quả | Verdict |',
  '|---|---|---|',
  '| Unit test R1/R2/R3 (grouping.test.ts) | PASS (thuần, không TDZ) | ✓ |',
  '| Build | 0 TS error | ✓ |',
  '| vitest `src/lib/liveLesson/v4 src/components src/pages` | 84 file / 732 test PASS (gồm test render) | ✓ |',
  '| QA live R1 (thẻ DEEP) | Session `Dypueu4PNboPdTOqQGon` (bài 11-11-76, lớp 11Columbus, HS Đặng Tuệ Minh): HS chọn nhóm 3 + gửi bài → GV bật "Hiện kết quả lớp" → máy HS hiện **"NHÓM EM XONG SỚM — NHẬN NHIỆM VỤ MỞ RỘNG"** với câu VD đề trần (Phiếu số 3, ý 3) và dòng "không nộp máy" — đúng đặc tả | ✓ PASS |',
  '| QA live R2 (nhãn chậm GV) | Unit test `TvSlowGroups.test.ts` 6/6 PASS; nhãn đã chuyển sang màn GV thật (tv-control). Live cần 2 HS (1 nhóm gửi, 1 nhóm không) — chỉ có 1 PIN HS | ⏳ NOT_RUN (unit PASS) |',
  '| R3 | Hàm thuần không đổi counters (test assert) | ✓ |',
  '',
  '### Hai lỗi đã sửa khi QA live (commit `00cc56b`, `b9e5c03`)',
  '1. **Listener `groupProgress` chết vì 403**: doc chỉ đọc được khi GV bật "Hiện kết quả lớp". HS/GV subscribe lúc stats tắt → 403 vĩnh viễn, bật stats lại cũng không nhận. Sửa: chỉ subscribe khi `publicStatsEnabled`/`showStats` bật, đổi cờ thì gắn lại listener (`StudentLiveView`, `TeacherLiveView`, `TvSlowGroups`).',
  '2. **R2 gắn sai màn hình**: `mode=teacher` bị remap thành `tv-control` nên `TeacherLiveView` không bao giờ render — nhãn "Nhóm chậm" không bao giờ tới tay GV. Sửa: tách thành `TvSlowGroups` gắn vào presenterControls của `TvLiveView` (màn điều khiển thật của GV); HS/TV không thấy. Logic thuần tách ra `selectSlowGroups` (6 test).',
  '',
  '**Lưu ý vận hành cho thầy**: thứ tự dùng đúng là (1) HS chọn nhóm và **gửi bài lúc "Hiện kết quả lớp" còn TẮT** (bật stats sẽ khoá ô trả lời của HS), (2) sau khi nhóm gửi đủ, thầy bật "Hiện kết quả lớp" → thẻ nhiệm vụ mở rộng hiện cho nhóm xong sớm, nhãn nhóm chậm hiện cho thầy nếu nhóm nào quá 80% thời lượng mà gửi dưới 50%.',
  '',
  '**Trạng thái: R1 VERIFIED (live); R2 IMPLEMENTED — unit PASS, live cần 2 HS để chạy.**',
].join('\n');
writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.slice(0, idx) + replacement, 'utf8');

// 2) HANDOFF: ghi trạng thái chốt của Gate D mini
const h = readFileSync('HANDOFF.md', 'utf8');
const anchor = '## VIỆC MỚI 29/10 — 2 chức năng V8.8 (addendum thầy giao)';
if (!h.includes(anchor)) throw new Error('không tìm thấy anchor HANDOFF');
const gateStatus = [
  '## Gate D mini — nhóm xoay tua: ĐÃ CHỐT QA (29/10)',
  '- R1 thẻ DEEP: **VERIFIED trên live** — session `Dypueu4PNboPdTOqQGon` (11-11-76): HS nhóm 3 gửi bài + GV bật "Hiện kết quả lớp" → thẻ "NHÓM EM XONG SỚM — NHẬN NHIỆM VỤ MỞ RỘNG" hiện với câu VD đề trần, không nộp máy. Chi tiết: `tasks/qa-w11-batch2-acceptance.md`.',
  '- R2 nhãn nhóm chậm: đã chuyển sang `TvSlowGroups` trên màn tv-control (TeacherLiveView không bao giờ render vì mode=teacher bị remap); unit test 6/6; live cần 2 HS — NOT_RUN.',
  '- Hai fix đi kèm (commit `00cc56b`, `b9e5c03`): listener groupProgress 403 khi stats tắt; R2 sai màn hình.',
  '- Quy tắc vận hành: HS gửi bài lúc stats TẮT → GV bật "Hiện kết quả lớp" sau. Bật stats trước sẽ khoá ô trả lời của HS.',
  '',
].join('\n');
let updated = h;
if (!h.includes('## Gate D mini — nhóm xoay tua: ĐÃ CHỐT QA')) {
  updated = h.replace(anchor, gateStatus + anchor);
  writeFileSync('HANDOFF.md', updated, 'utf8');
}

// 3) PENDING: mục 1 hoàn tất
const p = readFileSync('PENDING.md', 'utf8');
const p2 = p.replace(
  '| 1 | QA live nhóm xoay tua (R1 thẻ DEEP + R2 nhãn chậm) — code + test 305/305 xong, deploy xong; QA live bị chặn Edge WS fetch failed (retry được) | ĐANG LÀM | hoàn tất trước khi mở chức năng mới |',
  '| 1 | QA live nhóm xoay tua — R1 thẻ DEEP **PASS trên live** (session Dypueu4PNboPdTOqQGon); R2 unit 6/6 PASS, live cần 2 HS (NOT_RUN); 2 fix: listener 403 + R2 sai màn hình | XONG | `tasks/qa-w11-batch2-acceptance.md` |',
);
writeFileSync('PENDING.md', p2.includes('XONG | `tasks/qa') ? p2 : p2, 'utf8');
console.log('updated: acceptance + HANDOFF + PENDING');
