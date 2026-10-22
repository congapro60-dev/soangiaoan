# Sổ tiến độ — Discover Self-study v2

Spec: `discover-self-study-v2.md`. Brain: Claude Sonnet 5.5 (Claude Code). Cập nhật 2026-10-16 08:40.

## Sức khoẻ hãng (quota.py 08:23)
- Claude: sống (phiên 100%, tuần 59%, reset 21/10 22:00).
- ChatGPT: 3 tài khoản Plus hết phiên đến 12:28 hôm nay; 1 tài khoản free 76%. Sol/Astra có thể trượt combo → gọi bằng id `cx/`, kiểm `served`.
- Gemini: unknown (timeout).

## Task
| id | kind | size | model (effort) | depends | trạng thái |
|---|---|---|---|---|---|
| T1 | logic | M | cx/gpt-6.1-sol (medium) | — | tested: vitest src/lib/adaptive 99 pass, tsc api pass; tsc có 2 lỗi cast readonly cũ ở Discover (từ 58e1d53), sửa ở T7 |
| T2 | logic | M | cx/gpt-6.1-sol (medium) | T1 | đang chạy |
| T3 | logic | M | cc/claude-sonnet-5-5 | T1,T2 | planned |
| T4 | ui+logic | M | cc/claude-sonnet-5-5 | T3 | planned |
| T5 | ui | M | cc/claude-sonnet-5-5 | T3 | planned |
| T6 | rules | S | cc/claude-sonnet-5-5 | T2 | planned |
| T7 | verify | — | brain | all | planned |

- T1 seed id xuyên suốt + `stripAnswers` thuần (+test).
- T2 `adaptiveAssignments` + action GV giao bài + action HS liệt kê/mở (đã strip) trong `api/classroom.ts`/`_student-workspace.ts`.
- T3 `studentAdaptiveSubmit`: server chấm, ghi `adaptiveEvents` + progress/profile có classId.
- T4 HS player dùng open/submit; mở khoá nút trong `/lop`.
- T5 GV: UI giao bài + bảng thống kê theo seed/mục tiêu/lỗi sai/hỗ trợ.
- T6 thu hẹp rules đọc `adaptiveLessons`, rules `adaptiveAssignments`/`adaptiveEvents`, rules test.
- T7 rebase lên `origin/main`, full test/lint/build, browser QA.

Review: tác giả Claude → reviewer khác hãng khi Codex hồi (sau 12:28) hoặc `cx/gpt-6-luna` free; không có thì `degraded: cùng hãng, reviewer Opus phiên mới + test thật`.

## checks
| task | yêu cầu | lệnh kiểm | kết luận | bằng chứng |
|---|---|---|---|---|
| T1 | stripAnswers bỏ mọi trường đáp án | vitest stripAnswers.test | | |
| T1 | seed id tới lesson đã lưu | vitest | | |
| T2 | HS lớp khác bị từ chối | vitest api student-adaptive | | |
| T3 | nộp trùng không nâng điểm; completed chỉ qua exit ticket | vitest | | |
| T3 | thiếu idToken bị từ chối | vitest | | |
| T5 | thống kê đúng trên dữ liệu seed | vitest | | |
| T6 | rules emulator | npm run test:rules | | |
| T7 | function count ≤ 12 | vitest function-count | | |
| T7 | lint, lint:api, test, build | npm run … | | |
| T7 | QA GV→giao→HS→nộp→GV | browser | | |

## Task thêm
| id | kind | size | model | depends | trạng thái |
|---|---|---|---|---|---|
| T8 | logic+ui | M | cx/gpt-6.1-sol (medium) | — (worktree riêng từ main: `Downloads\smart-lesson-plan-ai-t8`, nhánh `dieu-phoi/report-custom-range`) | implemented: tsc + 53 test pass; chưa build, chưa QA trình duyệt, chưa commit (brain sửa 2 import) |
| T9a | ui | S | cx/gpt-6.1-sol (medium), worktree `Downloads\smart-lesson-plan-ai-t9a` nhánh `dieu-phoi/teacher-student-search` | — | đang chạy |
| T9b | logic+ui | M | CHỦ LỰC | T3 | planned (`preview` chỉ đọc + route xem-thử) |

## T3a — server chấm + sự kiện (22/10)
- Worker: requested `cx/gpt-6-sol` medium (served `unknown`, model_family OpenAI). `cx/gpt-6.1-sol` lỗi 'at capacity' 2 lần nên đổi. account `unknown`, cost_class subscription.
- Review chéo (read-only, khác họ model): `cc/claude-opus-5-5` (Anthropic) và `xk/minimax/minimax-m2.7` (MiniMax) — cả hai `blocked` lần đầu; cùng tìm ra: lộ lời giải cho câu chưa trả lời; sự kiện ghi ngoài transaction.
- Đã sửa: ẩn `feedback` câu chưa trả lời; sự kiện ghi trong transaction (`tx.create`); báo lỗi đúng khi đáp án không phải chuỗi; `Object.create(null)` chống khoá kế thừa; `unitId` phải là doc id an toàn.
- Chưa sửa (ghi nhận): `retry` không giới hạn số sự kiện; lời giải hiện sau mỗi lần nộp lại (quyết định sản phẩm: có giữ đến khi đóng bài không?); bài kiểm tra 0 câu không hoàn thành được; `set` chưa `merge` (T3b); mã tiến độ `${assignmentId}_${studentId}` có thể trùng nếu id chứa `_` do người tạo gài.
- Trạng thái: tested — 30 test api đạt (student-adaptive-submit 10, student-adaptive 6, student-workspace, function-count), `tsc -p tsconfig.api.json` sạch. Chưa deployed/verified.
