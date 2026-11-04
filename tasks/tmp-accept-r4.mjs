// Append mục R4 vào tasks/qa-w11-batch2-acceptance.md (UTF-8 chuẩn)
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'tasks/qa-w11-batch2-acceptance.md';
let t = readFileSync(P, 'utf8');

const r4 = `
---

## R4 · \`11-11-79\` — Hai mặt phẳng song song — Tiết 3 (practice) · QA A–F Production 28/10/2026

Phiên live \`T5lfCYGxrpRSg1aikwhj\` (definitionKey \`11-11-79\`, lessonId \`adaptive-v4-11-11-79-24YyULmWgBOM6HZCfJ56RN5tiet2\` — deterministic đúng dự kiến; lớp \`class-1787188523562\`/\`R6RCFC\`; HS Đặng Tuệ Minh PIN 2750, Edge 9223). Deploy \`b14d0db\` success cả 2 Vercel; Production chunk \`liveLessonService-DhtfPWkx.js\` (index \`index-DKbs2wEJ.js\`) chứa \`gateD79\` + fingerprint \`b6dfa109…7be24\` + \`STEP_REFERENCE_INVALID\`.

| Khoản | Cách đo | Kết quả | Verdict |
|---|---|---|---|
| A·Phiên mới + contract | \`node tasks/tmp-r4-qa-session.cjs\` | Phiên tạo cho 11-11-79, joinCode R6RCFC; GV/HS/TV nạp từ Production | ✓ |
| A·Timeline 12 chặng (dải Gate D 79 riêng) | Quét 11 chặng GV→HS | HS bands **0–1 / 1–5 / 5–7 / 7–12 / 12–15 / 15–16 / 16–24 / 24–29 / 29–35 / 35–38 / 38–40 phút** — khớp đúng phân bổ thầy duyệt 1-4-2-5-3-1-8-5-6-3-2; chặng 12 "Sau" disabled, stage giữ 12, "Kế hoạch 40–40′ · tiết 40′" | ✓ |
| A·Think window | Poll dày ~700ms sau từng click "Sau →" | **63 reads**, \`saw10\`, \`lockedAll\`, \`minSeen=6\`; **11 cửa sổ đều \`decreasing=true\` + \`lockedAll=true\`** | ✓ |
| B·AI-error chặng 5 (S4 720–900s) | Dump HS/TV tại band 12–15′ | HS + TV hiện **"AI" + "MN ∥ AB" + "MNPQ"** (bài làm sai bỏ điều kiện cắt nhau — riêng của bài 79); "PHẢN HỒI NHANH" + đủ 4 nhãn; **không lộ** correction/proof (\`hsNoProof\`/\`tvNoProof\` = true) | ✓ |
| C·HS join thật bằng mã lớp + PIN | Join qua form mới (Đặng Tuệ Minh + 2750) | \`view-stable\` | ✓ |
| C·Route choice chặng 6 | \`tmp-r4-probe7.cjs\` — chờ think hết rồi bấm thẻ S | Clicked **"Bắt đầu với hỗ trợ"** (thẻ S), **taskAppeared=true** — task "Cho hình chóp S.ABCD… trung điểm M, N, P…" đúng bài 79 | ✓ |
| C·Nháp giữ sau reload + tự rejoin không PIN | \`tmp-r4-reload.cjs\` — gõ marker ở chặng 5, reload | \`relogged=view\` (không hiện form, không cần PIN); \`keptInField=true\`, \`nhapPanel=true\` ("Nháp đã lưu trên máy"); band về đúng 12–15′, AI-error vẫn hiện | ✓ |
| D·Exit gửi trống bị chặn | Bấm Gửi khi ô trống | \`{exists:false}\` → blocked (không có "Đã gửi" nào) | ✓ |
| D·Exit gửi trọn + "Tiến độ gửi · 1 HS" | Điền "Đã làm được" → chèn tự đánh giá → Gửi | **"Đã gửi." + "Đã xác nhận trên máy chủ."**; GV bấm "Hiện kết quả lớp" → GV + TV **"Tiến độ gửi · 1 học sinh đã gửi"** | ✓ |
| F·mode=tv \`buttons: []\` + no-spoiler | Dump nút TV chặng 7; regex \`d_S\` + \`HÌNH THANG\` (hoa) ở HS/TV/GV chặng 7/8/9 | \`tvButtons = []\`; **0/6 lộ** (cả GV live cũng không lộ — đáp án chỉ ở \`exercises[].answer\`) | ✓ |

### Ghi chú R4

- Dải phút GV đọc qua "Kế hoạch X–Y′ · tiết 40′" (đúng quirk đã ghi ở R3 — regex "Chặng" chỉ khớp trên HS).
- Lần QA đầu bấm route choice khi còn "Chờ 2s" → nút chưa render (không phải bug); probe7 chờ \`thinkGone\` rồi bấm thành công — giữ thứ tự này cho các vòng sau.
- GV live view không hiện \`d_S\`/\`HÌNH THANG\`: đáp án PHT nằm ở \`exercises[].answer\` (panel soạn/offline pack), không nằm trong cue live — khớp bảng phân quyền Gate D 79.
- Think \`minSeen=6\` (khác R3 \`minSeen=0\`) do poll bắt nhịp giữa cửa sổ; vẫn \`decreasing\` trọn từng cửa sổ + \`lockedAll\` — không phải regression.
- Log + ảnh: \`tasks/tmp-r4-qa-log.json\`, \`tmp-r4-probe7-log.json\`, \`tmp-r4-reload.json\`, ảnh \`tasks/tmp-r4-*.png\`. Các file \`tmp-*\` không commit.
`;

if (!t.includes('## R4 · `11-11-79`')) {
  writeFileSync(P, t.trimEnd() + '\n' + r4, 'utf8');
  console.log('APPENDED R4, total lines=' + (t.split('\n').length + r4.split('\n').length));
} else console.log('R4 đã có — bỏ qua');
