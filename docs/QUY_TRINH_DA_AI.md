# Quy trình làm việc với nhiều AI

> Cập nhật: 2026-09-28. Dành cho chủ dự án và mọi phiên AI (Claude Code, Codex, Gemini) làm việc trên repo này.

## 1. Nguyên tắc chi phí

Các gói **ChatGPT, Claude, Gemini** là gói tiêu dùng, trả **phí cố định**. Chúng không kèm quyền gọi API cho app, nên **không được nối vào app** (xem mục 7).

API thì **trả theo lượt**. App gọi API qua ba đường: khóa chung (trừ vào ví AI của giáo viên), khóa Gemini riêng của giáo viên, và khóa giáo viên tự nhập trên trình duyệt.

Vì vậy có một quy tắc: **việc nặng làm lúc xây app bằng gói; lúc app chạy thì gọi API càng ít càng tốt.** Nội dung nào làm sẵn được thì làm sẵn bằng gói, soát lại, rồi lưu vào repo.

## 2. Vai của từng AI

| Gói | Công cụ | Việc nên giao |
|---|---|---|
| Claude | Claude Code (tab Code của Claude Desktop) | Kiến trúc, viết brief, điều phối, review, nghiệm thu cuối |
| ChatGPT | Codex Desktop | Làm task đã có brief rõ, chạy song song; QA theo mẫu `docs/BAOCAO_QA_*.md` |
| Gemini | Antigravity, Google AI Studio | Đọc tài liệu dài (yêu cầu cần đạt, SGK, PDF); thử prompt với ảnh bài làm; kiểm thử giao diện theo `.agents/ANTIGRAVITY_REVIEW_PROMPT.md` |

Mỗi lô việc có **một AI chủ trì**, thường là Claude Code. AI chủ trì chịu trách nhiệm nghiệm thu, và không giao việc nghiệm thu cho chính AI đã làm.

Nếu giao code qua OpenCode Desk (skill `opencode-first`), vẫn dùng cùng mẫu brief ở mục 3.1 và cùng bước nghiệm thu ở mục 4.

## 3. Giao việc Claude → Codex qua cầu nối

Cầu nối là MCP server `@minhspark/codex-mcp-bridge`. Điều kiện để chạy:

- Chỉ gọi từ **tab Code** của Claude Desktop. Tab Chat/Cowork không qua được bước kiểm tra phiên gọi của cầu nối.
- **Codex Desktop phải đang mở.** Thư mục giao việc (`cwd`) phải là project **đã lưu trong Codex Desktop**, đúng đường dẫn. Worktree phụ không được nhận là project.
- Lệnh giao việc chỉ chờ tối đa khoảng **40 giây**. Task vẫn chạy tiếp trong Codex, nên theo dõi bằng `read_codex_thread` và **không gửi lại** prompt.
- Codex chỉ chạy trong thư mục project mà không phải xin phép. Nếu cần cho Codex đọc nội dung của một nhánh hay worktree khác, bảo nó dùng `git show <nhánh>:<đường dẫn>` **ngay trong project**, đừng trỏ tới đường dẫn worktree bên ngoài. Đọc ra ngoài project sẽ làm task dừng lại chờ duyệt.
- Tài khoản Codex phải **còn lượt dùng**. Hết lượt thì task treo, và app hiện thông báo kèm giờ được đặt lại.

Các bước:

1. Claude viết brief theo mẫu mục 3.1.
2. Gọi `delegate_to_codex` với `cwd` là project đã lưu, `name` ngắn mô tả việc.
3. Theo dõi bằng `read_codex_thread`, hoặc mở task trong Codex Desktop.
4. Codex báo xong thì Claude nghiệm thu theo mục 4.

Chiều ngược lại, Codex dùng `list_claude_sessions` và `send_to_claude_session` để hỏi hoặc báo lại cho phiên Claude Code đang mở.

### 3.1. Mẫu brief

Brief gửi sang AI khác viết **bằng tiếng Anh**, đúng thứ tự mục mà cầu nối quy định. Chữ tiếng Việt cần giữ nguyên (tên mục giáo án, câu hiển thị cho người dùng) thì đặt trong ngoặc kép.

```text
Goal: <one sentence: the outcome, not the steps>
Context: <repo, branch, relevant files, why this matters>
Task: <numbered concrete steps>
Scope: <files/dirs allowed to change; everything else is read-only>
Constraints:
- The main checkout C:\Users\ADMIN\Downloads\smart-lesson-plan-ai may hold uncommitted work. Do not reset, checkout, clean, stash, delete, rename or commit existing changes there. Make changes in a new git worktree branched from origin/main.
- Run npm as: npm --prefix "<worktree path>" run <script>
- No deploy (Vercel/Firebase), no production data writes, no real student data.
- If an API key, login or production access is needed, stop and report.
Done when: <verifiable checks, e.g. npm run build passes; named tests pass>
Reply format: <e.g. branch, commit hash, files changed, test summary, open risks>
```

## 4. Nghiệm thu trước khi gộp

AI chủ trì **tự chạy lại**, không nhận lời báo "đã xong" thay cho bằng chứng:

- `npm --prefix "<đường dẫn>" run build` không lỗi TypeScript.
- `npm --prefix "<đường dẫn>" run test`, và `run lint` nếu có đổi code.
- Đọc diff: mọi dòng đổi phải truy được về yêu cầu (mục "Surgical Changes" trong `CLAUDE.md` và `AGENTS.md`).
- Việc quan trọng thì nhờ **một AI khác** review chéo, kèm bằng chứng là lệnh đã chạy và kết quả.
- Không đẩy lên `main` khi chủ dự án chưa ra lệnh (xem `tasks/lessons.md`, mục Git Workflow).

## 5. Nội dung làm sẵn bằng gói

Đây là chỗ các gói **giảm tiền API** trực tiếp: mỗi nội dung làm sẵn là một lượt gọi API bớt đi khi app chạy.

| Nội dung | Vị trí trong repo | Gợi ý |
|---|---|---|
| Mẫu giáo án Toán | `src/prompts/toanFormats.ts` | Gemini đọc bộ yêu cầu cần đạt; Claude chuẩn hóa |
| Thư viện nước đi dạy học | `src/prompts/toanClassroomMoves.ts` | Giữ dưới ngưỡng 7000 ký tự mà `src/prompts/toanClassroomMoves.test.ts` đang kiểm |
| Prompt và rubric chấm bài | `src/lib/classroom/gradingPrompt.ts`, `api/_grading-core.ts` | Thử trên bài mẫu đã ẩn danh, so điểm giữa các model |
| Mô phỏng cho bài hay dùng | sinh qua `api/generate-simulation.ts` | Chỉ làm sẵn khi đã thiết kế chỗ lưu và cách chọn lại |

Hai quy tắc khi làm sẵn:

- **Không dán dữ liệu học sinh thật** (tên, bài làm có danh tính) vào chat của gói tiêu dùng. Dùng bài mẫu đã ẩn danh.
- Nội dung do AI soạn phải được người soát trước khi vào repo, như mọi thay đổi khác.

## 6. Theo dõi và giảm tiền API

App đã tự đo chi phí. Mỗi lượt gọi AI bằng khóa chung được ghi vào collection `aiUsage` (tính năng, token vào, ra, suy nghĩ, cache). Xem ở tab **Quản trị** (`AiBillingAdminPanel`) và tab **Chi phí AI** (`AiBillingTab`).

Từ tháng 11/2026, chi phí khóa chung trừ vào ví của giáo viên. Giảm token vì thế vừa giảm tiền của chủ dự án, vừa giảm tiền giáo viên phải trả.

Thứ tự nên làm:

1. **Xem số trước.** Lọc `aiUsage` theo trường `feature` để biết tính năng nào tốn nhất, rồi chỉ tối ưu chỗ đó.
2. **Đặt hạn mức và cảnh báo chi tiêu** cho project Google Cloud chứa khóa chung.
3. **Làm sẵn nội dung** (mục 5) cho các tính năng tốn nhất.
4. **Chỉ đổi model sau khi đo.** Chấm bài dùng hằng `GRADING_MODEL` trong `api/_grading-core.ts` (hiện `gemini-3.8-flash`). Mô phỏng dùng `gemini-3.7-flash` trong `api/generate-simulation.ts`. Chấm thử cùng một bộ bài mẫu đã ẩn danh bằng hai model, so điểm, rồi mới đổi.
5. **Bài của học sinh dùng gói trả phí của Gemini API**, không dùng gói miễn phí, vì điều khoản dùng dữ liệu khác nhau.

## 7. Không làm

- **Không nối gói tiêu dùng vào app**, kể cả qua công cụ tự động hóa chatgpt.com như codex-chatgpt-web ("Codex Web GPT"). Đã thử trên máy chủ dự án: chế độ browser-only không có công cụ đọc/sửa file, gây lỗi hết giờ cho Codex Desktop (WebSocket 426), và có rủi ro vi phạm điều khoản. Đã gỡ ngày 2026-09-27.
- Không để hai AI cùng sửa một file trong cùng lúc.
- Không giao việc nghiệm thu cho chính AI đã làm việc đó.

## 8. Khi cầu nối lỗi

Kiểm tra nhanh: gọi `codex_bridge_status`, rồi `list_codex_threads`.

| Thông báo | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `connect ENOENT ...codex-native-relay...` | Codex Desktop chưa mở hoặc chưa nạp thread nào | Mở Codex Desktop, mở một thread bất kỳ |
| `Invalid app tool request` | Codex Desktop vừa cập nhật, cầu nối còn bản cũ | `npm install -g @minhspark/codex-mcp-bridge@latest`, rồi khởi động lại Codex Desktop |
| `Bridge source changed after this MCP process started` | Vừa cập nhật cầu nối, phiên Claude còn giữ bản cũ | Mở tab Code mới, hoặc khởi động lại MCP của phiên |
| `no registered Claude Desktop Code session in its parent ancestry` | Gọi từ Chat/Cowork, hoặc `claude_desktop_config.json` có mục `codex-bridge` trùng tên | Chỉ gọi từ tab Code; không thêm `codex-bridge` vào cấu hình Claude Desktop |
| `create_thread failed: ... did not answer` hoặc `closed before answering` | Relay trả lời chậm; task **có thể đã được tạo** | Không gửi lại. Tìm file phiên chứa brief trong `~/.codex/sessions/<năm>/<tháng>/<ngày>/`; mã thread nằm cuối tên file. Đọc bằng `read_codex_thread`, hoặc đọc thẳng file khi relay còn chập chờn |
| Task đứng im lâu, thanh bên ghi "Đang chờ phê duyệt" | Codex xin quyền chạy lệnh, thường là đọc ngoài project | Mở task trong Codex Desktop để duyệt hoặc từ chối; lần sau viết brief theo mục 3 (dùng `git show`) |
