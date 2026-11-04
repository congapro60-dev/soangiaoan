# Decision Pack · bàn giao Claude — Discover T5 + T7 (22/10)

Bạn là worker trong SmartPlan AI (React + TS + Vite, api/ = Vercel functions). Repo: worktree nhánh `feat/discover-t3b-t4`, HEAD 6bc7161 (đã gộp origin/main), node_modules sẵn có — **KHÔNG tạo nhánh mới, KHÔNG `git switch`, KHÔNG commit**: chỉ sửa file + chạy cổng kiểm; supervisor sẽ commit sau khi duyệt. Nguồn sự thật đọc TRƯỚC khi làm: `docs/spec/discover-self-study-v2.md`, `docs/spec/discover-self-study-v2.ledger.md`, `HANDOFF.md`.

## Việc theo thứ tự
1. `git status --short`: file không liên quan phải clean (file `docs/spec/dispatch-claude-t5-t7.md` chưa theo dõi là Decision Pack — bỏ qua). Nếu `origin/feat/discover-t3b-t4` chưa có commit 6bc7161 → chạy `git push origin feat/discover-t3b-t4` (chủ dự án đã duyệt; nếu bị chặn thì ghi vào ledger rồi vẫn tiếp tục code).
2. **T5** — UI GV **giao bài Discover cho lớp** + **bảng thống kê** theo seed/mục tiêu/lỗi sai/mức hỗ trợ, đọc từ `adaptiveAssignmentProgress` + `adaptiveEvents` (đã có `classId`). Giao bài dùng action `teacherAssignAdaptiveLesson` sẵn có trong `api/_classroom-teacher.ts`.
3. Sửa logic nộp lại theo quyết định sản phẩm đã chốt (22/10, chủ dự án): lời giải đúng tạo 1 lần và cố định; HS nộp lại KHÔNG xem lại lời giải; nộp lại chỉ đổi nhận xét về lỗi sai + báo cáo của chính HS đó → trong `api/_adaptive-submit.ts`, lượt `retry` phải cập nhật hồ sơ năng lực (`studentLearningProfiles`) nhưng KHÔNG đổi điểm attempt đầu (điểm giữ của lần nộp đầu).
4. **T7** — QA trình duyệt đủ luồng: GV giao → HS mở `/adaptive-portal/assignment/:assignmentId` → nộp → GV xem thống kê.

## Cổng bắt buộc xanh trước khi coi là xong
`npm run test:rules` (đang 11/11 file), `npm run test` (đang 3432/3432), `npm run lint`, `npm run lint:api`, `npm run build` (exit 0), test `function-count` (≤12).

## Ranh giới cứng
- CHỈ sửa file liên quan Discover + file logic ở mục 3 + `docs/spec/discover-self-study-v2.ledger.md` + `HANDOFF.md` của worktree này. KHÔNG đụng `api/_assistant-confirmations.ts` (phiên khác đang sửa).
- KHÔNG thêm file `api/` mới (Vercel đang 11/12 function). KHÔNG thêm dependency/abstraction/fallback ngoài tiêu chí. Không refactor ngoài phạm vi.
- KHÔNG merge vào `main`, KHÔNG push main, KHÔNG commit (supervisor commit sau khi duyệt). Chỉ push nhánh `feat/discover-t3b-t4` như mục 1. Không tự chế — thiếu gì thì ghi `blocked` vào ledger rồi dừng.
- KHÔNG deploy Firestore rules trong phiên này. Rules T6 đã test emulator (11/11 file xanh). Nếu mọi cổng xanh và bạn chắc chắn: có thể canary rồi `firebase deploy --only firestore:rules`; không chắc thì ghi vào ledger để chờ người dùng duyệt.

## Đã biết — không lặp lại
- Merge 6bc7161 đã giải xong 3 conflict (HANDOFF.md, StudentPortalDashboard.test.tsx, StudentPortalPage.tsx) — đừng merge lại origin/main.
- T6 rules đã viết + test: `tests/rules/discoverAdaptive.rules.test.ts` (4 case, emulator thật).
- T4 đã vá lỗi P1 Codex review (màn "Bước 3 · Bài kiểm tra cuối" stage `exit-ticket`) — không đụng lại.
- Lưu ý: T6 chỉ mới ghi trạng thái dở trong ledger — hãy đọc `tests/rules/discoverAdaptive.rules.test.ts` thực tế; không làm lại T6, chỉ deploy nếu đủ điều kiện.

## Trả lại
Cập nhật `.ledger.md`: mục mới "T5+T7 — bàn giao Claude 22/10" ghi trạng thái từng task + Evidence Pack ngắn (requested/served model, từng check + bằng chứng). Ý tưởng ngoài phạm vi ghi riêng mục **"New proposals"** — mặc định không làm.
