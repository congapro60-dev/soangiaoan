# Quy trình làm việc với nhiều AI

> Cập nhật: 2026-09-29. Dành cho chủ dự án và mọi phiên AI (Claude Code, Codex, Gemini) làm việc trên repo này.

## 1. Nguyên tắc chi phí

Các gói **ChatGPT, Claude, Gemini** là gói tiêu dùng, trả **phí cố định**. Chúng không kèm quyền gọi API cho app, nên **không được nối vào app** (xem mục 7).

API tính tiền **theo token và theo model**. App gọi API qua ba đường: khóa chung của chủ dự án, khóa Gemini riêng của giáo viên (lưu ở máy chủ), và khóa giáo viên tự nhập trên trình duyệt.

Vì vậy có một quy tắc: **việc nặng làm lúc xây app bằng gói; lúc app chạy thì bớt lượt gọi và bớt token.**

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
- **Codex Desktop phải đang mở**, tài khoản Codex **còn lượt dùng**, và sandbox Windows của Codex đã dựng xong. Thư mục giao việc (`cwd`) phải là project **đã lưu trong Codex Desktop**, đúng đường dẫn. Worktree phụ không được nhận là project.
- Cần Codex đọc nội dung của nhánh khác thì bảo nó dùng `git show <nhánh>:<đường dẫn>` **ngay trong project**. Đọc đường dẫn ngoài project thường khiến task dừng lại xin duyệt; quyền cụ thể còn tùy lệnh và cấu hình sandbox.
- Lệnh giao việc chỉ chờ tối đa khoảng **40 giây**. Hết thời gian chờ thì **chưa chắc task đã được tạo**. Kiểm tra theo mục 8 trước, và **không gửi lại** khi chưa kiểm.

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
Context: <repo, branch or ref to start from, relevant files, why this matters>
Task: <numbered concrete steps>
Scope: <files/dirs allowed to change; everything else is read-only>
Constraints:
- The main checkout C:\Users\ADMIN\Downloads\smart-lesson-plan-ai may hold uncommitted work. Do not reset, checkout, clean, stash, delete, rename or commit existing changes there. Make changes in a new git worktree branched from the ref named in Context (origin/main for new work).
- To read another branch, use git show <branch>:<path> inside this project instead of paths outside it.
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
- Việc quan trọng thì nhờ **một AI khác** review chéo, kèm bằng chứng là lệnh đã chạy và kết quả. Phát hiện của reviewer cũng phải tự kiểm lại trên code trước khi sửa.
- Không đẩy lên `main` khi chủ dự án chưa ra lệnh (xem `tasks/lessons.md`, mục Git Workflow).

## 5. Làm sẵn bằng gói

Có hai loại, đừng lẫn:

**Loại 1 — nội dung thay được một lần sinh lúc chạy.** Chỉ loại này mới **bớt lượt gọi API**. Ví dụ rõ nhất là mô phỏng: `api/generate-simulation.ts` đã có cache trong collection `lessonSimulations`, bài nào đã có mô phỏng thì trả bản lưu, trừ khi yêu cầu tạo lại (`regenerate`). Làm sẵn mô phỏng cho các bài hay dùng nghĩa là nạp trước vào cache này. Cách nạp hàng loạt cần thiết kế riêng trước khi làm.

**Loại 2 — tài sản prompt.** Loại này nâng chất lượng nhưng **không bớt lượt gọi**, và có thể **tăng token đầu vào** vì bị ghép vào mọi prompt. Ví dụ: `src/prompts/toanFormats.ts` và `src/prompts/toanClassroomMoves.ts` được ghép vào prompt tạo giáo án Toán trong `src/hooks/useLessonCreator.ts`. Soạn bằng gói thì tốt, nhưng phải đo token trước và sau. Thư viện nước đi phải giữ dưới ngưỡng 7000 ký tự mà `src/prompts/toanClassroomMoves.test.ts` đang kiểm.

Với chấm bài: prompt chấm nằm ở `src/lib/classroom/gradingPrompt.ts`; quota, chọn model và lời gọi Gemini nằm ở `api/_grading-core.ts`. Rubric là đầu vào của giáo viên, không phải thứ làm sẵn.

Hai quy tắc khi làm sẵn:

- **Không dán dữ liệu học sinh thật** (tên, bài làm có danh tính) vào chat của gói tiêu dùng. Dùng bài mẫu đã ẩn danh.
- Nội dung do AI soạn phải được người soát trước khi vào repo, như mọi thay đổi khác.

## 6. Theo dõi và giảm tiền API

App ghi lượt dùng AI vào collection `aiUsage`: tính năng (`feature`), token vào, ra, suy nghĩ, cache, model và nguồn khóa (`keySource`: khóa chung hay khóa riêng). Ba điều cần biết khi đọc số liệu:

- Chỉ lượt có metadata token mới được ghi. Ghi lỗi thì chỉ còn log, nên thiếu bản ghi thì đối chiếu log.
- Số tiền là **ước tính** từ bảng giá trong `src/lib/admin/aiPricing.ts`, không phải hóa đơn của nhà cung cấp.
- Tab **Quản trị** (`AiBillingAdminPanel`) tổng hợp theo giáo viên và model; tab **Chi phí AI** (`AiBillingTab`) có sao kê. **Chưa có báo cáo gộp theo tính năng.**

Tiền dùng khóa chung trừ vào ví của giáo viên khi công tắc tính phí `adminSettings/aiAccess` đang bật và người dùng không nằm trong danh sách miễn (`api/_ai-keys.ts`). Công tắc bật từ 25/09/2026; tháng 10 có mã THANG10 miễn 100% (xem `HANDOFF.md`).

Thứ tự nên làm:

1. **Xem số trước.** Gộp `aiUsage` theo `feature` (cần truy vấn phía máy chủ hoặc thêm một báo cáo), rồi chỉ tối ưu tính năng tốn nhất.
2. **Đặt hạn mức và cảnh báo chi tiêu** cho project Google Cloud chứa khóa chung.
3. **Làm sẵn nội dung loại 1** ở mục 5 cho các tính năng tốn nhất.
4. **Chỉ đổi model sau khi đo, theo tiêu chí của từng tính năng:**
   - Chấm bài dùng hằng `GRADING_MODEL` trong `api/_grading-core.ts` (hiện `gemini-3.8-flash`): so điểm trên cùng một bộ bài mẫu đã ẩn danh.
   - Mô phỏng dùng `gemini-3.7-flash` trong `api/generate-simulation.ts`: so tính đúng về Toán, khả năng dùng trên lớp và cách hiển thị HTML.
5. **Quy tắc vận hành (app không tự kiểm):** trước khi xử lý bài thật của học sinh, xác minh project Google Cloud của khóa đang ở gói trả phí theo điều khoản hiện hành.

## 7. Không làm

- **Không nối gói tiêu dùng vào app**, kể cả qua công cụ tự động hóa chatgpt.com như codex-chatgpt-web ("Codex Web GPT"). Đã thử trên máy chủ dự án: chế độ browser-only không có công cụ đọc/sửa file, gây lỗi hết giờ cho Codex Desktop (WebSocket 426), và có rủi ro vi phạm điều khoản. Đã gỡ ngày 2026-09-27.
- Không để hai AI cùng sửa một file trong cùng lúc.
- Không giao việc nghiệm thu cho chính AI đã làm việc đó.

## 8. Khi cầu nối lỗi

Kiểm tra nhanh: gọi `codex_bridge_status`, rồi `list_codex_threads`. Các bước đọc file phiên dưới đây do Claude hoặc chủ dự án làm trên máy chạy Codex, không giao cho Codex.

| Thông báo | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `connect ENOENT ...codex-native-relay...` | Codex Desktop chưa mở hoặc chưa nạp thread nào | Mở Codex Desktop, mở một thread bất kỳ |
| `Invalid app tool request` | Codex Desktop vừa cập nhật, cầu nối còn bản cũ | `npm install -g @minhspark/codex-mcp-bridge@latest`, rồi khởi động lại Codex Desktop |
| `Bridge source changed after this MCP process started` | Vừa cập nhật cầu nối, phiên Claude còn giữ bản cũ | Mở tab Code mới, hoặc khởi động lại MCP của phiên |
| `no registered Claude Desktop Code session in its parent ancestry` | Gọi từ Chat/Cowork, hoặc `claude_desktop_config.json` có mục `codex-bridge` trùng tên | Chỉ gọi từ tab Code; không thêm `codex-bridge` vào cấu hình Claude Desktop |
| `create_thread failed: ... did not answer`, `closed before answering`, hoặc hết thời gian chờ | Relay trả lời chậm; task **có thể đã hoặc chưa được tạo** | Không gửi lại. Tìm file phiên chứa brief trong `~/.codex/sessions/<năm>/<tháng>/<ngày>/`; mã thread nằm cuối tên file. Có file thì đọc bằng `read_codex_thread` hoặc đọc thẳng file; không có thì mới gửi lại |
| Task đứng im lâu, thanh bên ghi "Đang chờ phê duyệt" | Codex xin quyền chạy lệnh, thường là đọc ngoài project | Mở task trong Codex Desktop để duyệt hoặc từ chối; lần sau viết brief theo mục 3 (dùng `git show`) |
| Task kết thúc ngay với `workspace routing discovery unauthorized (401)` | Phiên đăng nhập của app Codex hết hạn hoặc lẫn tài khoản | Đăng nhập lại ChatGPT trong Codex Desktop; không đổi tài khoản khi đang có task chạy |
| App báo "Thiết lập Windows chưa hoàn tất" hoặc "Cập nhật sandbox Tác nhân để tiếp tục" | Dựng sandbox hỏng; xem `~/.codex/.sandbox/setup_error.json` | Nếu lỗi là `helper_sandbox_lock_failed` ở `.sandbox-bin`: đổi tên thư mục đó thành bản dự phòng rồi bấm "Thiết lập lại" (đã sửa được như vậy ngày 2026-09-29) |
