# Chat AI phụ huynh (Phase 3) — 26/10/2026

## Trạng thái: HOÀN THÀNH, đã test thật 10/10 OK — CHƯA bật cho PH ngoài chủ dự án

## Đã làm

- **Model**: `cnt/glm-5.3-flash` qua Vilao (`https://api.vilao.ai/v1/chat/completions`), chuẩn OpenAI SDK.
  80đ/1M vào — 240đ/1M ra, 99% OK. Ghim trong code (`PH_CHAT_MODEL`), KHÔNG đọc env.
- **Key riêng**: `PH_CHAT_VILAO_KEY` (key Vilao `SmartPlan-PhChat`), tách khỏi key chấm bài. Đã set env Preview.
- **Lưu ý reasoning model**: glm-5.3-flash tiêu token cho `reasoning` trước khi sinh `content`.
  Đo thật: max_tokens 50 → content rỗng; 800 → OK. Chốt max_tokens 1200; content rỗng
  + có reasoning_tokens → ném lỗi "AI reasoning-only" → bot trả câu "bận", không gửi tin trống.
- **Chống bịa**: 6 quy tắc bắt buộc trong system prompt; chỉ dùng dữ liệu báo cáo an toàn của đúng
  em đã liên kết (`buildParentSafeReport`); lọc SĐT/mã HS/token khỏi câu trả lời; luôn chốt
  "Nhắn 0 để xem lại menu."
- **Gỡ log chẩn đoán** `[zalo-diag]` (4 chỗ) — RAW body in định danh người gửi ra log.
  Giữ nguyên hành vi: replay nonce → 200, lỗi nonce → 503, lỗi dispatch → câu fallback.

## Test thật (tài khoản Zalo chủ dự án, 26/10)

10 câu qua webhook giả lập, HTTP 200 cả 10, bot trả lời đúng:
- 4 câu chống bịa (hỏi HS khác / điểm chưa có / SĐT thầy / hứa hẹn): không bịa, không lộ.
- Điểm KHÔNG hiện `%`; mọi tin chốt "Nhắn 0 để xem lại menu."
- Gate: tsc exit 0, 177/177 test assistant pass (C1–C10, M1–M12...).

## Bổ sung 26/10 chiều: menu mục 5 theo vai trò (commit `574486a`)

- HS (role=student) mục 5 = "Gợi ý tự học ở nhà" (từ `areasToPractice`, cùng nguồn mục 4),
  không hiện văn bản viết cho người lớn. PH giữ nguyên hành vi cũ.
- Bot xử lý PH và HS chung một nhánh: cùng menu 0–7 + chat AI, dữ liệu theo link của chính em.
- HS không xem được `grade.feedback` qua bot (bản an toàn PH bị lọc mất) — giữ nguyên thiết kế,
  muốn có thì cần bản HS riêng (việc mới).
- Test M13a/b/c; gate 180/180.
- Deploy: `https://giaoandewey-cwkeerdxy-congapro60-devs-projects.vercel.app`, webhook verify `webhook.ok`.

## Gói trau chuốt 26/10 tối (commit `5b7da30`): trình bày + HS feedback + link web

- **Markdown Zalo**: tin menu nhiều dòng gửi `parse_mode: markdown` (in đậm dòng tiêu đề,
  escape `*_~` cho dữ liệu động qua `escMd`). Parse lỗi → tự gửi lại bản thuần đúng 1 lần.
  Tin 1 dòng gửi thuần như cũ. AI trả lời vẫn gửi thuần (an toàn với ký tự AI sinh ra).
- **Typing indicator**: `sendChatAction action: 'typing'` trước khi gọi AI (fire-and-forget).
- **HS xem feedback** (chốt của chủ dự án): `buildParentSafeReport` thêm option `includeFeedback`
  (mặc định false → bản PH giữ nguyên). Bản HS: mục 2 kèm nhận xét GV đã duyệt (~80 ký tự/bài,
  tối đa 5 bài); prompt AI gọi "em" và được dùng feedback đã duyệt trong ngữ cảnh. Feedback CHƯA
  duyệt tuyệt đối không lọt (chỉ lấy từ `validScorePair` = graded + teacherApproved).
- **Link web portal**: nhắn `web`/`link`/`website` → bot gửi link thuần (URL render được):
  PH `https://giaoandewey.vercel.app/ph/<joinCode>`, HS `/lop/<joinCode>`; mục 6 có dòng hướng dẫn.
  Link phải gửi qua `sendStyled(..., false)` — không qua `output()` (hàm này che mọi URL).
- Test mới: M14a–d, C11a–c, zalo-bot markdown + fallback + link thuần.
- Gate: tsc exit 0, **189/189** test assistant, 52/52 test phụ thuộc parentSafeReport.
- Deploy: `https://giaoandewey-p2j10m5kl-congapro60-devs-projects.vercel.app`, webhook `webhook.ok`.
- Cần test Zalo thật: menu in đậm, mục 2 HS có nhận xét, nhắn `web` nhận link bấm được.

## Việc 4 — HS nộp bài bằng ảnh qua bot (26/10 tối, code + test xong)

- **Luồng**: HS nhắn 8 → chọn bài giao (tối đa 5 bài chờ nộp) → gửi ảnh (≤3 ảnh, ≤10MB, phiên 10 phút) →
  nhắn `xong` → tạo submission khớp luồng web → `gradeOneSubmission(mode 'quick')` chạy nền (`chayNgam`) →
  tin điểm qua Zalo. PH gửi ảnh/lệnh chấm → đúng 1 câu "chức năng của học sinh".
- **File**: `_assistant-ph-hs-photo.ts` (MỚI), `_assistant-zalo-send.ts` (MỚI: escMd/sendStyled/sendTyping),
  `grade-homework.ts` (export + `budgetMs`/`marginMs` — web không truyền → nguyên vẹn), `_assistant-zalo-bot.ts`
  (event `message.image.received`), `_assistant-ph-hs-menu.ts` (mục 8 chỉ HS), `vercel.json` (maxDuration 90).
- **An toàn**: chỉ role student; không exam/online/khóa nộp; chặn nộp trùng khi đang submitted/grading;
  quota trừ NGAY khi bắt chấm (`bumpQuota`), câu từ chối y hệt web; Ảnh đẩy Storage
  `accepted-homework/<classId>/<studentId>/` + download token — URL khớp `prepareActorFiles` web.
- **Gate**: tsc 0 lỗi (cả 2 config); full suite **4657/4661** pass — 4 fail CŨ v832 (hash mismatch, không liên quan);
  build pass. Test mới: photo 23 test, bot +11, menu M15a–d.

## Chặn 2 vai + lệnh "đổi vai" cho tài khoản test (26/10 đêm, code + test xong)

- **Bài toán**: production chặn 1 Zalo chỉ giữ 1 vai; tài khoản test của chủ dự án được giữ
  SONG SONG link PH + HS để kiểm thử cả 2 luồng, đổi qua lại ngay trong chat.
- **Production — chặn trong `linkByPin`** (`_assistant-ph-hs-link.ts`): sau parse, TRƯỚC guard PIN
  (không tiêu lượt thử): query link active của tài khoản, có vai KHÁC (teacher không có `role` →
  tính qua `role ?? 'teacher'`) → trả `roleConflict` + câu hướng dẫn liên hệ thầy cô. Query `existing`
  được chuyển lên trên và tái dùng cho phần idempotent (bỏ 1 query trùng).
- **Test — allowlist env** `ZALO_BOT_DUAL_ROLE_USER_IDS` (phân tách dấu phẩy): `dualRoleAllowed(userId)`
  miễn chặn 2 vai cho tài khoản trong danh sách.
- **Lệnh `đổi vai`** (`_assistant-zalo-bot.ts` dispatch, TRƯỚC `resolveAnyActor`): normalize bỏ dấu +
  gộp khoảng trắng (như parsePhotoCommand), chỉ nhận diện khi `dualRoleAllowed` → `switchBotRole`:
  query TẤT CẢ link → target = parent đang active ? 'student' : 'parent'; chưa từng link vai target →
  câu hướng dẫn nhắn PIN; transaction bật link vai target + tắt vai còn lại (chỉ flip `active`,
  không tạo/xoá doc); KHÔNG đụng link teacher. Tài khoản ngoài danh sách nhắn "đổi vai" → rơi về
  luồng thường như tin tự do.
- **Test mới**: link +6 (roleConflict chặn PH→HS không tiêu lượt; teacher link cũng chặn; allowlist
  giữ 2 vai song song; switch 2 chiều giữ teacher; chưa link vai target; chưa link gì) + bot +4
  (3 biến thể `đổi vai`/`Đổi VAI`/`doi  vai` cho allowlisted; fall-through khi không allowlisted).
- **Gate**: vitest 2 file **103/103**; full suite **4667/4671** (chỉ 4 fail CŨ v832); tsc 0 lỗi 2 config;
  build pass. Deploy preview + env `ZALO_BOT_DUAL_ROLE_USER_IDS=6428d37c9d35746b2d24` (preview).
- `scripts/doi-vai-bot.ts` (MỚI, fallback ops cần service account — chưa dùng được vì Vercel redact
  `[SENSITIVE]`; phương án chính là lệnh `đổi vai` trong chat).

## Nộp hộ — HS gửi bài hộ bạn cùng lớp (27/10, code + test + deploy xong)

- **Chốt với chủ dự án**: HS xác định "nộp hộ ai" bằng GÕ TÊN bạn (bot tra danh sách lớp; trùng tên →
  `chọn <số>`); KHÔNG dùng PIN của bạn (biết PIN = đăng nhập luôn vai bạn). GV thấy trên web qua
  field `assistBy` + badge "HS nộp hộ" ở cột Lưu ý (title kèm tên bạn nộp hộ).
- **Luồng**: `nộp hộ` → hỏi tên → gõ tên (bỏ dấu vẫn khớp; tên gọi = đuôi họ tên) → khớp 1: liệt kê bài
  chờ CỦA BẠN ĐÓ → `nộp hộ <số>` mở phiên assist → gửi ảnh ≤3 → `xong` như thường. `0` hủy (menu);
  tin tự do giữa luồng do `assistFreeTextReply` chặn, không rơi vào AI chat; ảnh gửi giữa luồng bị chặn.
- **File**: `_assistant-ph-hs-photo.ts` (pre-session `assistState`/`targetCandidates`/`assist`, 0-match tên
  được xử lý; `finishPhotoSession` mọi kiểm tra/quota/submission theo target; Storage theo target),
  `_assistant-zalo-bot.ts` (dispatch kind mới + hook tên tự do), `_assistant-ph-hs-menu.ts` (mục 8 nhắc
  `nộp hộ`), `types.ts` + `_classroom-teacher.ts` (`assistBy` projection), `AssignmentPanel.tsx` (badge).
- **Dữ liệu**: submission `studentId` = EM ĐƯỢC NỘP HỘ; `submittedBy.studentId` = NGƯỜI GỬI THẬT;
  `assistBy: { studentId, name, via: 'zalo_bot' }`; quota 5 bài/em/ngày trừ của em được nộp hộ.
  Tin điểm gửi máy NGƯỜI NỘP HỘ kèm "của <Tên>"; em được nộp hộ xem điểm qua bot của em (mục 2).
- **Gate**: vitest 2 file **106/106**; full suite **4684/4688** (chỉ 4 fail CŨ v832); tsc 0 lỗi 2 config;
  build pass. Test mới: photo +12 (assist đầy đủ + self regression), bot +6 dispatch.
- Test phát hiện & sửa: khi tên KHÔNG khớp bạn nào, code cũ văng TypeError (`matches[0]` undefined) —
  đã thêm câu mời gõ lại.
- **QA fix A1–A3 (27/10, trước giờ HS test)**: Codex rà Phase 1–2 trên lineage khác
  (`feat/assistant-ph-hs-zalo` = `5f12682`, merge-base `8ae51ef`) nên không chạm được tính năng nộp hộ;
  tự fix trên `preview/zalo-live-test`:
  - **A1 — race nộp trùng + quota ngoài transaction**: dời check "đang chờ chấm" + đọc/trừ quota VÀO
    `runTransaction` (cùng pattern `reserveQuota`); 2 HS nộp hộ cùng bạn cùng lúc → tx sau bị retry,
    đọc lại thấy bài đã nộp → chặn. Không bao giờ tạo trùng submission hay trừ lệch hạn mức.
  - **A2 — `nộp hộ` đè mất phiên nộp thường đang dở**: `assistStartReply` chặn khi phiên thường đang
    CÓ ảnh (báo "xong để máy chấm, hoặc 0 để hủy"); phiên assist dở / chưa có ảnh thì đè vô hại (giữ
    đường hồi phục "nhắn nộp hộ để làm lại").
  - **A3 — wording dẫn nhầm người nộp hộ**: tin hoàn tất + tin điểm + câu chặn nộp trùng khi có assist
    không còn bảo "nhắn 2" (kết quả thuộc tài khoản bạn được nộp hộ) — dẫn "tài khoản của <Tên>".
  - **Gate**: photo tests 39/39 (34 cũ + 5 mới: race 2 HS, A2 ×3, A3), bot 72/72, tsc 0 lỗi 2 config,
    build pass. Báo cáo Codex về `periodicIds` không cần áp: nhánh này `menuSectionText` có đúng 1
    caller production, luôn truyền `periodicIds` thật từ `loadParentReportBundle`.

## Commits (nhánh feat/assistant-ph-hs-zalo)

### Review A1–A3 đúng nhánh preview/zalo-live-test (27/10)

- Bản staged đã commit `2989e1b`; gate gốc: photo 39 + bot 72 = 111/111, tsc 2 config exit 0.
- A1: doc quota chung (kể cả chưa tồn tại) tạo xung đột transaction để retry; query rỗng riêng lẻ
  không phải bằng chứng. Sửa chặn cả bài đã graded/error, khớp danh sách bài chờ nộp.
- A2: đọc/giữ ảnh khi thay phiên và khi `xong` trong transaction; mã phiên riêng chặn ảnh tải chậm,
  callback tên/chọn và cleanup phiên cũ can thiệp phiên mới. Luồng chưa có ảnh vẫn làm lại được.
- A3: câu chặn trùng nêu rõ `tài khoản của <Tên>`; tin hoàn tất/tin điểm vẫn dẫn đúng tài khoản.
- Thêm 10 regression tests: photo 49 + bot 72 = 121/121 PASS. Mở phiên nộp hộ cũng kiểm mã phiên
  kỳ vọng để callback mở bài cũ không hồi sinh người nhận cũ sau khi hủy/chọn bạn khác.
- API TypeScript exit 0; đang hoàn tất app TypeScript/build và gate sau commit sửa.
- Kiểm bằng FakeDb và mock Storage/AI/Zalo; chưa chạy Firestore emulator hoặc Zalo thật.
  Không push/deploy; trạng thái deploy ghi bên dưới là lịch sử, chưa xác minh trong phiên QA này.

- `121eb17` feat: chat AI PH (glm-5.3-flash qua Vilao)
- `ad35cdd` fix: xử lý reasoning model
- `b2cd474` chore: gỡ log chẩn đoán
- `5fa1979` feat: việc 4 — HS nộp bài bằng ảnh qua bot, chấm AI báo điểm Zalo
- `d46ac63` chặn 2 vai + lệnh `đổi vai` (nhánh `preview/zalo-live-test`)
- `b7f13fc` feat: nộp hộ bạn cùng lớp — gõ tên, badge `assistBy` (nhánh `preview/zalo-live-test`)

## Deploy hiện tại

- Preview: `https://spai-assistant-ph-99uu5906l-congapro60-devs-projects.vercel.app` (Ready, 27/10)
- Alias: `zalo-test.congapro60-devs-projects.vercel.app` (đã trỏ deploy mới 27/10)
- Webhook Zalo: `.../api/assistant?transport=zalo_bot` — verify `webhook.ok`; ping không secret → 401 đúng
- ĐÃ GỠ `ZALO_BOT_ALLOWED_USER_IDS` trên preview (26/10 đêm) — chuẩn bị cho HS cả lớp test:
  ai cũng nhắn được bot, nhưng link vẫn cần mã lớp + PIN đúng. Lệnh `đổi vai` chỉ dành cho
  `ZALO_BOT_DUAL_ROLE_USER_IDS=6428d37c9d35746b2d24` (chủ dự án).

## Việc còn lại (bật cho PH thật)

1. Dọn test: xoá link/test của chủ dự án khỏi `channelLinks`, xoá file token `.txt`.
2. Gỡ/đổi `ZALO_BOT_ALLOWED_USER_IDS` (hoặc bỏ env để mọi người đã liên kết dùng được).
3. Trả webhook về production URL sau khi merge code vào production.
4. Tạo lại token Zalo (token đã nằm trong file `.txt` + lịch sử chat).
5. Xoá nhánh/alias preview.
