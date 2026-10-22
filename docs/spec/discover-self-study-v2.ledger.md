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
| T2 | logic | M | cx/gpt-6.1-sol (medium) | T1 | tested: `studentAdaptiveList`/`studentAdaptiveOpen` + action GV giao bài |
| T3 | logic | M | cc/claude-sonnet-5-5 | T1,T2 | tested (T3a xong 22/10) |
| T4 | ui+logic | M | cc/claude-sonnet-5-5 | T3 | tested (22/10, PR #21 → nhánh `feat/discover-t3b-t4`) |
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

## T3b + T4 — tiến độ có classId + player HS dùng máy chủ (22/10, opencode)
- Nhánh: `feat/discover-t3b-t4` (worktree `~/.config/superpowers/worktrees/smart-lesson-plan-ai/discover-t3b-t4`), base `origin/codex/elearning-muse-task1` (PR #21). Không sửa worktree của phiên Claude/Codex.
- **T3b (server)**: `api/_adaptive-submit.ts` — ghi tiến độ bằng `set(..., { merge: true })` (trước đó đè mất field người khác đã ghi); thêm ghi `adaptiveSessionProgress/{assignmentId}_{studentId}` và `studentLearningProfiles/{studentId}` **có `classId`** để bảng GV đúng lớp đọc được. Tính mastery/lỗi sai tách ra `src/lib/adaptive/learningProfile.ts` (dùng CHUNG cho client và server → không lệch nhau).
- **T4 (client)**: `AdaptiveStudentPortalPage` có chế độ bài giao (`/adaptive-portal/assignment/:assignmentId`): mở qua `studentAdaptiveOpen` (bản **đã bỏ đáp án**), nộp qua `studentAdaptiveSubmit` (**máy chủ chấm**, client không gửi điểm); link công khai giữ chấm ở trình duyệt như cũ để demo GV còn chạy.
- **Vá lỗi P1 của Codex review** (`dewey:complete` chỉ lưu checkpoint rồi `return` → em mắc màn bài học, không bao giờ chốt xong): thêm màn **Bước 3 · Bài kiểm tra cuối** (stage `exit-ticket`), `dewey:complete` → chuyển sang màn đó, chỉ "xong" khi đã nộp vé thoát.
- **Mở khoá nút ở `/lop`**: mục "Discover · Tự học" nay bấm được khi thầy cô đã giao (nút "Học bài này"); chưa được giao thì vẫn khoá, ghi rõ "Chưa được giao" (trước ghi "Đang chuẩn bị bài" gây hiểu nhầm).
- Test: +1 api (merge + classId + hồ sơ), +3 service client (list/open/submit — nộp KHÔNG gửi điểm), +1 UI dashboard (nút mở khoá).
- Gate: full **3404/3404**, `lint` + `lint:api` exit 0, `build` exit 0. Chưa deployed; chưa QA trình duyệt với bài giao thật (cần bài Discover đã giao cho lớp).
- Còn lại: T5 (bảng thống kê GV), T6 (rules `adaptiveAssignments`/`adaptiveEvents`), T7 (QA GV giao → HS nộp → GV xem), và câu hỏi sản phẩm "lời giải có hiện sau mỗi lần nộp lại không".

## T5+T7 — bàn giao Claude 22/10
Worker: requested `cc/claude-sonnet-5-5`, served `unknown` (opencode không lộ served model). Không commit, không tạo nhánh, không `git switch`.

| task | trạng thái |
|---|---|
| Push nhánh (mục 1) | blocked: `git push origin feat/discover-t3b-t4` bị harness từ chối quyền shell. `origin/feat/discover-t3b-t4` = 4e9f9ed, chưa chứa 6bc7161 (`merge-base --is-ancestor` = 1). Supervisor push. |
| T5 | implemented, tested (unit). Chưa QA trình duyệt. |
| Nộp lại (mục 3) | implemented, tested |
| T7 QA trình duyệt | blocked: cần tài khoản GV + lớp + HS thật và bài Discover đã giao; phiên này không có. Không ghi dữ liệu production. |
| Deploy rules | KHÔNG deploy. Chờ người dùng duyệt (rules không đổi trong phiên này). |

### Thay đổi
- `src/lib/adaptive/assignmentStats.ts` (+test): gộp theo bài giao/seed: số HS bắt đầu/xong, % mục tiêu TB, lỗi sai (misconception) + câu sai hay gặp, mức hỗ trợ (HS/lượt nộp lại). Chỉ sự kiện `attempt` tính điểm/lỗi sai; `retry` chỉ đếm hỗ trợ.
- `src/components/adaptive/DiscoverClassPanel.tsx`: chọn lớp + bài đã xuất bản → `teacherAssignAdaptiveLesson`; bảng thống kê đọc `adaptiveAssignments`/`adaptiveAssignmentProgress`/`adaptiveEvents` lọc `classId` (rules T6 cho GV chủ lớp đọc). Gắn vào `AdaptiveLessonListPage.tsx`.
- `api/_adaptive-submit.ts`: lượt `retry` cập nhật `studentLearningProfiles` (objectiveMemory, misconceptionCounts) nhưng KHÔNG đổi `totalSessions`/`averageMastery`, KHÔNG đổi điểm progress/session; response retry bỏ `feedback` (không xem lại lời giải). Đọc profile trước mọi ghi trong transaction.
- Test mới: `student-adaptive-submit.test.ts` +1 (retry), `assignmentStats.test.ts` +1.

### Evidence Pack
| check | kết quả | bằng chứng |
|---|---|---|
| `npm run test:rules` | xanh | 11/11 file, 314 test, exit 0 |
| `npm run test` | xanh | 329 file, 3434/3434, exit 0 (gồm function-count ≤12; không thêm file `api/`) |
| `npm run lint` | xanh | exit 0 |
| `npm run lint:api` | xanh | exit 0 |
| `npm run build` | xanh | exit 0 (cảnh báo chunk có sẵn) |

### New proposals (không làm)
- Chọn `targetStudentIds` khi giao bài (action đã hỗ trợ, UI chưa).
- Tên objective/misconception hiển thị là ID; nên map sang tiêu đề từ lesson.
- Bảng thống kê đọc client-side qua rules; nếu lớp lớn nên chuyển sang action server tổng hợp.
