import { readFileSync, writeFileSync } from 'node:fs';

// 1) Acceptance: kết quả QA live COMM-AQ-01
const a = readFileSync('tasks/qa-w11-batch2-acceptance.md', 'utf8');
const add = `

---

## COMM-AQ-01 · Hand Raise + Câu hỏi ẩn danh + Understanding Pulse (30/10/2026 — QA live)

| Khoản | Kết quả | Verdict |
|---|---|---|
| Unit (service thuần + server audit) | \`liveQuestionService.test.ts\` + \`api/__tests__/live-questions.test.ts\` — 14 test PASS | ✓ |
| Build / lint | \`npm run build\` 0 TS · \`npm run lint\` 0 · \`npm run lint:api\` 0 | ✓ |
| Hồi quy | vitest v4+components+pages: **86 file / 746 test PASS** | ✓ |
| QA live — Giơ tay | Session \`3BtScbb5aVCM2tCOFf4H\` (11-11-76, Đặng Tuệ Minh): bấm ✋ → nút chuyển "Đang giơ tay · Hạ tay"; GV thấy **"✋ 1 bạn đang giơ tay — Đặng Tuệ Minh"**; bấm Hạ tay → GV hết thấy; bấm lại không tạo trùng (doc theo uid) | ✓ PASS |
| QA live — Câu hỏi ẩn danh | HS gửi → xác nhận **"Đã nhận câu hỏi ẩn danh"**; GV panel realtime "❓ Câu hỏi ẩn danh (1) — chỉ giáo viên"; actions Công bố/Đã trả lời/Để sau/Ẩn/Gỡ đều bấm được | ✓ PASS |
| QA live — Privacy (quan trọng nhất) | Doc \`publishedQuestions\` đọc qua REST: **fields chỉ [questionId, activityId, body, publishedAt] — KHÔNG có participantUid/studentName/device**; review queue \`questions/\` client write = false (chỉ Admin SDK); không mapping question→student; log server không kèm uid | ✓ PASS |
| QA live — Công bố | GV bấm Công bố → panel chuyển "ĐÃ CÔNG BỐ"; HS (reload cùng phiên) thấy banner **"❓ CÂU HỎI ĐÃ CÔNG BỐ #01 — nội dung, KHÔNG có tên"**; GV Gỡ khỏi TV → HS hết thấy | ✓ PASS |
| QA live — Understanding Pulse | Chặng P20: HS thấy mini-check 3 lựa chọn, chọn "Em hiểu một phần" thành công; nút Hỏi ẩn danh vẫn hoạt động ngay trên pulse | ✓ PASS |
| Cập nhật realtime banner HS (không reload) | Listener nhận qua onSnapshot nhưng chưa xác nhận được bằng script (phiên hết hạn trước khi chụp đủ) — persistence đã PASS; cần xác nhận thêm khi dạy thật | ⏳ NOT_RUN |
| TV overlay câu công bố ở màn \`mode=tv\` (màn chiếu thuần) | Chưa làm — câu công bố hiện ở màn GV (tv-control) và máy HS; cần thêm nếu dạy qua 2 màn | ⏳ NOT_RUN |
| Coach backlog câu hỏi | Tối thiểu chưa làm (spec cho phép xếp sau P0) | ⏳ NOT_RUN |
| Mobile UX 320–430 | Chưa chạy viewport test riêng — nút min-height 44px, modal responsive | ⏳ NOT_RUN |

**Lỗi gặp và đã sửa trong Pha B:**
1. Query idempotency (clientNonce + serverReceivedAt) thiếu composite index → 500. Đã thêm \`firestore.indexes.json\` + deploy indexes.
2. \`owned.sessionRef()\` gọi nhầm (TS) — sửa thành property.

**Trạng thái: P0 PASS (giơ tay, hỏi ẩn danh, privacy, công bố, pulse). 4 mục phụ NOT_RUN — không chặn pilot.**
`;
if (!a.includes('## COMM-AQ-01 · Hand Raise')) {
  writeFileSync('tasks/qa-w11-batch2-acceptance.md', a.trimEnd() + add, 'utf8');
  console.log('acceptance updated');
}

// 2) HANDOFF
const h = readFileSync('HANDOFF.md', 'utf8');
if (!h.includes('## Chức năng 1 COMM-AQ-01 — ĐÃ CODE + QA (30/10)')) {
  const s = `## Chức năng 1 COMM-AQ-01 — ĐÃ CODE + QA (30/10)
- Pha A Gate P+D thầy duyệt (\`tasks/gate-pd-hand-raise-anon-questions.md\`) → Pha B code xong, commit \`0e5351a\` + index \`firestore.indexes.json\`.
- Kiến trúc: giơ tay CÓ tên (Firestore trực tiếp \`handRaises/{uid}\`, doc id = uid nên không trùng); câu hỏi ẩn danh CHỈ qua server (\`api/_live-questions.ts\`: \`liveAnonymousQuestion\` HS, \`livePublishQuestion\`/\`liveSetQuestionStatus\` GV) — server xác thực idToken rồi ghi doc KHÔNG có field định danh, không mapping, không log uid; pulse \`pulses/{uid}__{cueId}\` theo override \`PULSE_CUE_IDS_BY_KEY\` (không sửa snapshot).
- QA live PASS: giơ tay (tên + hạ tay + không trùng), gửi câu hỏi + xác nhận, GV panel realtime + công bố/gỡ, **privacy: doc published chỉ [questionId, activityId, body, publishedAt]**, pulse hoạt động.
- NOT_RUN (không chặn): realtime banner HS chưa chụp được; TV overlay mode=tv; Coach backlog; mobile viewport test.
- Deploy: Vercel success + \`firebase-tools deploy --only firestore:rules,firestore:indexes\` đã chạy.

`;
  const anchor = '## VIỆC MỚI 29/10 — 2 chức năng V8.8 (addendum thầy giao)';
  writeFileSync('HANDOFF.md', h.replace(anchor, s + anchor), 'utf8');
  console.log('HANDOFF updated');
}

// 3) PENDING
const p = readFileSync('PENDING.md', 'utf8');
const p2 = p.replace(
  '| 2 | Chức năng 1 (COMM-AQ-01): Hand Raise (có tên) + Câu hỏi ẩn danh (server-side, không định danh) + Understanding Pulse — **Pha A xong: Gate P+D chờ thầy duyệt** `tasks/gate-pd-hand-raise-anon-questions.md` | CHỜ DUYỆT | duyệt xong mới code (Pha B) |',
  '| 2 | Chức năng 1 (COMM-AQ-01): code + QA live xong — giơ tay/hỏi ẩn danh/công bố/privacy/pulse **PASS**; NOT_RUN: realtime banner HS, TV overlay mode=tv, Coach backlog, mobile viewport | XONG (P0) | `tasks/qa-w11-batch2-acceptance.md` mục COMM-AQ-01 |',
);
writeFileSync('PENDING.md', p2, 'utf8');
console.log('PENDING updated');
