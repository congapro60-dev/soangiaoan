# V28 — Hình minh hoạ trong gợi ý và đề bài (HS kém dễ hình dung)

> Quyết định của user 23/10/2026: **làm cả 2** — ảnh trong gợi ý **và** ảnh trong thân đề bài.
> Lý do: câu hình học (tứ diện, chóp, giao tuyến, góc quay) đang chỉ có chữ; HS kém không hình dung được.
> Checklist v27 đã ghi sẵn ý định "kèm SVG chóp/tứ diện" cho `thptqg-r028-*` — nay chốt đường ống kỹ thuật bên dưới.

## 1. Hiện trạng đã kiểm (23/10)

- **Renderer gợi ý: SẴN SÀNG.** `components/lesson/TaskInput.tsx:1106-1114` render `<img>` nếu hint có `diagramUrl` hoặc `image` (khung `maxHeight: 240px`).
- **Serializer cắt rơi 2 trường này** — cùng họ lỗi allowlist với `decimal_4` (F1):
  - `lib/lesson/serialize.js:134-138` (allowlist `task.hints`) — chỉ giữ `id/tier/text/taskId/objectiveIds/order/notAnswer/supportRationale`.
  - `lib/lesson/serialize.js:163-167` (allowlist `pkg.hints`) — giống hệt.
- **Đề bài chưa có slot ảnh.** `task.prompt` chỉ qua `MathText` (KaTeX) tại 5 điểm:
  `app/play/page.tsx:1272`, `components/lesson/ClassEventPanel.tsx:70`, `components/lesson/PracticePanel.tsx:42`, `app/shared/page.tsx:58`, `app/presenter/page.tsx:547`.
- **Allowlist task** (`serialize.js:433-441` `sanitizeTaskForStudent` và `:79-88` `sanitizeTaskForTeacher`) chỉ giữ `prompt` — sẽ thêm `imageUrl`.

## 2. Việc cần làm (nhánh mới trong worktree universal-content-release)

1. **serialize.js — mở khoá trường ảnh**
   - `sanitizeTaskForStudent`: thêm `imageUrl: task.imageUrl || task.diagramUrl || undefined`.
   - `sanitizeTaskForTeacher`: thêm tương tự (GV cần xem lại đề).
   - 2 allowlist hint (134-138, 163-167): thêm `diagramUrl: h.diagramUrl || h.image`.
   - Khắc phục luôn dòng 67 — allowlist `decimal_4` (lỗi F1: keypad SA thiếu kiểu thập phân 4 chữ số).
2. **Renderer — slot ảnh cạnh đề**
   - Thêm khối `{task.imageUrl && <img src={task.imageUrl} alt="Hình minh hoạ" className="task-prompt-image" />}` cạnh `<MathText text={task.prompt}/>` tại 5 điểm ở mục 1.
   - CSS `task-prompt-image`: `max-width: 100%`, bo góc, viền theo biến chủ đề (mô phỏng `task-hint-diagram`).
3. **Nội dung pilot (3 lessons g11-discover)**
   - r013: gợi ý tầng 1 của `thptqg-r013-mc/tf` kèm **hình tròn cung quay 240°** (đánh dấu 2π/3).
   - r028: đề + gợi ý `thptqg-r028-mc/tf` kèm **SVG tứ diện/chóp có giao tuyến** (đã ghi trong checklist v27).
   - r108: đề `thptqg-r108-mc/tf` kèm **hình hai mặt phẳng song song cắt mặt phẳng thứ ba**.
   - Nơi lưu ảnh: `public/content/hinh/…` dạng SVG tĩnh trong repo (tránh phụ thuộc Storage; đổi ý chỉ khi ảnh nặng).
4. **Verify**
   - `npm run build` sạch lỗi TS.
   - Serialize thử 1 gói có ảnh (unit hoặc script ad-hoc) → package HS/GV giữ đủ `imageUrl` + `diagramUrl`.
   - 1 phòng QA nhỏ: mở lesson r028 với tư cách HS → thấy ảnh trong đề và trong gợi ý vừa mở.

## 3. Ràng buộc

- KHÔNG đụng `lib/exam/**` (thang thi độc lập).
- KHÔNG commit `qa-*.mjs` (script QA untracked đúng ý — đã hỏi user về xoá giữ lại).
- Làm sau khi vòng QA v27 (r013/r028/r108) chốt và phòng QA đã đưa vào Thùng rác.
