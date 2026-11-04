# GATE D MINI · Nhóm xoay tua tự động · V8.8 · 29/10/2026

> Bổ sung cho hoạt động nhóm đã có trong runtime (GroupingCheckpoint P13 + GroupingApprovalPanel + groupProgress trên TV). **KHÔNG đổi dữ liệu bài học, KHÔNG đổi checkpoint — chỉ thêm hành vi tự động theo tiến độ nhóm.**

## 1. Hiện trạng (đã khảo sát code)

| Thành phần | Hiện có | Vị trí |
|---|---|---|
| Nhóm HS | HS tự chọn số nhóm (Nhóm 1–12) qua `StudentGroupPicker`, được "Đổi nhóm" | `StudentGroupPicker.tsx` |
| Đề xuất nhóm GV | `GroupingApprovalPanel` — đề xuất tự động, GV duyệt/đổi; quá 40 giây không duyệt → nhóm mặc định | `GroupingApprovalPanel.tsx:83,114` |
| Tiến độ nhóm | `groupProgress` { G1: %, G2: %… } cập nhật theo lượt gửi của nhóm, hiển thị TV "Nhịp làm việc của các nhóm" | `TvStatsPanel.tsx:107`; `lessonProjection.ts:99` |
| Nhiệm vụ mở rộng | Câu DEEP / fast-path chỉ nằm trong kịch bản GV (Gate D chữ) — chưa có trên máy HS | Gate D các bài |

## 2. Đặc tả hành vi mới (3 quy tắc tự động)

### R1 — Nhóm xong sớm → tự nhận nhiệm vụ mở rộng (DEEP)
- **Điều kiện**: `groupProgress[nhóm] ≥ 100%` (mọi HS trong nhóm đã gửi phần nhóm) trong lúc chặng nhóm đang chạy.
- **Hành vi máy HS của nhóm đó**: hiện thẻ *"Nhóm em xong sớm — nhận nhiệm vụ mở rộng"* + nội dung câu DEEP của bài (lấy từ `spec.bonusChallenge.advancedProblem` nếu có, không có thì ẩn thẻ). HS làm trên giấy/máy mình, **không nộp** — chỉ hiển thị.
- **Panel GV**: hàng nhóm đó đổi màu xanh + nhãn "Xong sớm — đã giao mở rộng".

### R2 — Nhóm chậm → gợi ý hỗ trợ cho GV (không tự gửi)
- **Điều kiện**: đã quá 80% thời lượng chặng nhóm (tính theo timeline chặng) mà `groupProgress[nhóm] < 50%`.
- **Hành vi**: **chỉ trên panel GV** — hàng nhóm đó đổi màu vàng + nhãn "Chậm — nên gửi dắt tay"; GV bấm là gửi được cue dắt tay hiện có (không tự gửi).
- HS/TV **không thấy** anything (giữ không áp lực).

### R3 — Không tự di chuyển HS giữa các nhóm
- Xoay tua = xoay **nhiệm vụ** (R1), không xoay **người**. GV vẫn "Đổi nhóm" thủ công như cũ khi cần.

## 3. Phạm vi triển khai (code)

| # | Việc | File |
|---|---|---|
| 1 | Tính `libraryProgress` theo nhóm từ submissions nhóm hiện có (đã có groupProgress trên projection — tái dùng) | `lessonProjection.ts` |
| 2 | R1: thẻ nhiệm vụ mở rộng trên `StudentLiveView` (chỉ nhóm đạt 100%, có `bonusChallenge`) | `StudentLiveView.tsx` |
| 3 | R2: nhãn cảnh báo chậm trên `GroupingApprovalPanel`/panel GV (chỉ GV) | `GroupingApprovalPanel.tsx` |
| 4 | Test: unit test 3 quy tắc (R1 bật/ẩn theo progress + bonusChallenge; R2 ngưỡng 80%/50%; R3 không đổi nhóm) | test file mới |

## 4. Không làm

- Không tự di chuyển HS giữa nhóm (R3).
- Không tự gửi bất kỳ cue nào cho HS (R2 chỉ gợi ý GV).
- Không đụng checkpoint/timeline/spec các bài đã duyệt — dùng `bonusChallenge.advancedProblem` đã có trong spec.
- Không đụng MAIN snapshot.

## 5. Kiểm chứng

1. `npm run build` 0 TS; vitest v4 toàn bộ PASS.
2. QA phiên live Production (bài bất kỳ có `bonusChallenge`, ví dụ 12-11-79): nhóm gửi đủ → thẻ DEEP hiện; nhóm không gửi đủ quá 80% → nhãn vàng chỉ-GV; TV không đổi.
