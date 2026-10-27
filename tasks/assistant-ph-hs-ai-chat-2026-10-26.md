# Chat AI phụ huynh (Phase 3) — 26/10/2026

## Trạng thái: HOÀN THÀNH, đã test thật 10/10 OK — CHƯA bật cho PH ngoài chủ dự án

## Đã chốt nguyên nhân 503 (27/10 ~16h00) — env trên Vercel bị placeholder `[SANITIZED]`

- Diagnostic getMe trên production log: `http=200 apiOk=false idMatch=false body={"ok":false,"description":"Not Found","error_code":404}`
  → egress Vercel→Zalo tốt, Zalo trả 404 vì URL `/bot[SANITIZED]/getMe` (token 11 ký tự placeholder).
- Gốc rễ: **CLI 59.5.0 sanitize MỌI `vercel env pull`** → mọi bản copy env từ `giaoandewey` sang spai
  (và file `.env.production.local` local) đều là chuỗi `[SANITIZED]` 11 ký tự. Secret-check vẫn pass vì
  curl test cũng gửi chính giá trị sanitized đó. Biến `sensitive` trên Vercel KHÔNG đọc lại được qua API
  (GET `?decrypt=true` không trả `value`) — giaoandewey là sensitive → giá trị gốc mất hoàn toàn.
- Hồi phục spai bằng nguồn local (script `restore-spai-env.mjs`, xoá 22 entry rác + tạo 6 biến thật,
  target production+preview): `FIREBASE_SERVICE_ACCOUNT_KEY` (từ `.agents/firebase-service-account.json`,
  project `smartplan-ai-14200`), `ZALO_BOT_TOKEN` (file `zalo_bot_token.txt`, 84 ký tự — getMe 200),
  `ZALO_BOT_ID` + `ZALO_BOT_ALLOWED_IDS` = bot id, `ZALO_BOT_DUAL_ROLE_USER_IDS` = tài khoản chủ,
  `ZALO_BOT_WEBHOOK_SECRET` = rotate mới → **phải gọi setWebhook lại** (secret cũ Zalo đang giữ không còn khớp).
- Mất: các key AI/grading khác (`GEMINI_API_KEY`, `GRADING_*`, `PH_CHAT_VILAO_KEY`…) — không còn nguồn;
  bot vẫn chạy (menu/link/nộp ảnh OK), nhánh chat tự nhiên rơi vào câu "bận" graceful. Cần user cung cấp lại key nếu muốn bật.
- Bài học: **không bao giờ push env lấy từ `vercel env pull` về lại Vercel** — kiểm tra độ dài giá trị
  trước khi upsert; CLI mới làm hỏng env bằng sanitize im lặng.

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

## GV-1 — vai thầy cô trên bot, phạm vi CHỈ ĐỌC (27/10, nhánh preview)

- Module mới `api/_assistant-ph-hs-teacher.ts` (KHÔNG thêm serverless function — chỉ module import sẵn):
  - Menu `gv`: `lop` (lớp + sĩ số), `chua nop` (bài đang mở + đếm đã nộp/chưa nộp), `web` (URL portal thuần).
  - `notifyTeacherNewSubmission`: push "HS vừa nộp bài" tới mọi bot-link teacher của GV; bỏ qua tài khoản
    vừa nộp (test dual-role) và link khác zalo_bot; lỗi bỏ qua, không chặn trả lời HS, không log PII.
- `_assistant-zalo-bot.ts`: chèn khối lệnh GV TRƯỚC `resolveAnyActor` (resolve link teacher riêng nên
  dual-role dùng được); đổi thứ tự resolve thành PH → HS → teacher để tài khoản test giữ song song
  vai vẫn thấy menu PH/HS cho tin thường; `/help` thêm dòng lệnh thầy cô; câu trả lời ảnh cho GV.
- `_assistant-ph-hs-photo.ts`: hook push sau khi nộp thành công (chayNgam, phụ luồng).
- Luồng liên kết GV KHÔNG cần code: web Cài đặt đã có "Tạo mã liên kết" (mã 1 lần 10 phút) → GV
  nhắn bot `/link CODE` (nhánh `/link` có sẵn) → link teacher + firebaseUid thật.
- Test mới `assistant-ph-hs-teacher.test.ts` 11 test (parse lệnh có/không dấu, quyền: không link /
  chỉ-PH → chặn; lop/chua nop/web; push đúng đích, loại trừ fromUser, fallback tên).
- Chưa deploy (đợi sau buổi test HS 13h). Chưa có: lệnh ghi nhóm B (duyệt điểm kèm phân tích lỗi),
  nhóm C chặn qua bot.

## Hạ tầng + vá sticker/voice (27/10 chiều — buổi test HS 11Columbus)

- **Nguyên nhân bot im lặng**: webhook trỏ preview bị Vercel Authentication chặn 401 + project
  `spai-assistant-ph-hs` rỗng env. Fix: `vercel project protection disable --sso`; copy 8 env từ
  `giaoandewey` (4 `ZALO_BOT_*` + `FIREBASE_SERVICE_ACCOUNT_KEY` + 2 `GRADING_*` + `GEMINI_API_KEY`)
  sang cả production + preview (không in secret ra log, file pull đã xoá).
- **Deploy mới** `spai-assistant-ph-bi6dsxw9t` (build từ working tree, chứa GV-1); alias
  `zalo-test` đã trỏ sang. E2E `webhook.test` → 401 đúng (thiếu secret); event `gv` kèm secret →
  200 `{"ok":true}`, logs sạch.
- **Docs Zalo Bot xác nhận chỉ có 5 event**: `message.text|image|sticker|voice|unsupported.received`
  — KHÔNG có event "mở chat/follow" nên không thể tự chào khi HS bấm vào bot. HS phải nhắn 1 tin
  bất kỳ; người lạ nhận STRANGER_HINT (guard 1 tin/5 phút).
- **Vá lỗ hổng im lặng**: trước đây sticker/voice/unsupported bị 400 (bot im hoàn toàn — HS mở bot
  gửi sticker là hết phản hồi). Nay chấp nhận đủ 5 event: người lạ → STRANGER_HINT (giữ guard 5 phút),
  đã liên kết → "Bot chỉ xử lý tin nhắn văn bản và hình ảnh. Nhắn 0 để xem menu.", ambiguous → câu
  đa hồ sơ. Event lạ (`message.unknown.received`) vẫn 400. Fix bug reply mặc định bị gửi nhầm khi
  guard chặn (khởi tạo `reply = ''` đầu nhánh).
- **Gate**: bot 76/76 (72 cũ + 4 mới), api/ 86 file 1038/1038, tsc 0 lỗi 2 config. 2 test fail ở
  `src/lib/lessonCompiler/v832/` là lỗi có sẵn của main app, không thuộc vùng bot.

## Phục hồi sau sự cố 503 + key AI chat mới (27/10 chiều)

- Env spai đã hồi phục từ nguồn local qua REST API (6 biến thật, xoá 22 entry rác/junk);
  kiểm chứng bằng list API: FIREBASE 2405 ký tự, TOKEN 84, ID/ALLOWED 19, DUAL_ROLE 20, SECRET 48 hex.
- Key AI chat mới `smartplan-bot-chat-20261027` tạo trên Vilao UI, model `cnt/glm-5.3-flash`
  (đăng ký qua modal + tick đồng ý cảnh báo billing "trừ tiền cả khi output rỗng"; hành vi khi giá
  tăng = "Tiếp tục dùng (tính giá mới)"). Key nạp env `PH_CHAT_VILAO_KEY` (production+preview).
- Test API trực tiếp: 200 + content bình thường (model thinking ~360 token → max_tokens 1200 của
  caller đã đủ).
- **E2E thật qua deployment**: event chat tự do từ chủ dự án → HTTP 200, elapsed 13,2s (chỉ đường
  AI mới mất lâu vậy); Vilao console xác nhận 5 request/25₫ trên key (2 request cuối từ deployment)
  → bot trả lời AI THẬT, không còn tin "bận". Chủ dự án nhận 2 tin AI trong Zalo.
- ⚠️ Key mới `sk-3d64...` đã rơi vào log phiên AI khi tạo trên UI (a11y snapshot) → ROTATE sau buổi test.

## Deploy hiện tại

- Preview: `https://spai-assistant-ph-7nexdrwdz-congapro60-devs-projects.vercel.app` (READY, 27/10 tối —
  chứa A1–A3 fix QA + GV-1 + vá sticker/voice + diagnostic + env đủ 7 biến gồm `PH_CHAT_VILAO_KEY`
  **+ fix first-contact 27/10 tối**: (1) người lạ nhắn `/start` hay lệnh `/` bất kỳ → nhận STRANGER_HINT
  qua guard 1 tin/5 phút (trước đây im lặng 200); (2) người lạ gửi ảnh → nhận STRANGER_HINT (trước đây
  im lặng); (3) nới parser PIN: không prefix + PIN 4 số → mặc định HS, HS nhắn gọn `R6RCFC <PIN>`
  link được luôn (trước đây bắt buộc prefix "học sinh" — nguyên nhân chính HS không link được))
- **Rotate key AI 28/10**: key cũ `sk-3d64…` (smartplan-bot-chat-20261027) đã **thu hồi vĩnh viễn**
  (gọi thử → 401). Key mới `smartplan-bot-chat-20261028` (`sk-36d6…3e7c`) đã đăng ký `cnt/glm-5.3-flash`
  (80₫/240₫, tick đồng ý billing "output rỗng vẫn tính phí") → env Production + Preview → deploy
  `h8xsqgsvs`. Xác minh: gọi thẳng Vilao với key mới trả lời đúng (129 in / 102 out).
  Toàn bộ file secret trên máy đã xoá (`zalo_bot_token.txt`, `zalo_webhook_secret.txt`,
  `zalo_preview_secret.txt`, `VILAO-KEYS.md`, `spai-env-backup.md`, script test tạm).
  Webhook không secret → 401 đúng. Lưu ý: env `PH_CHAT_VILAO_KEY` giờ là type **Sensitive**
  (thêm mới qua CLI), `vercel env pull` trả `[SANITIZED]` — bình thường, không dùng để khôi phục.
- Alias: `zalo-test.congapro60-devs-projects.vercel.app` → deployment `7nexdrwdz` /
  `dpl_2j2R8YvEph14Cy799ZHYrk5MNeFC`. ⚠️ Lần trỏ đầu (27/10 tối) CLI tạo nhầm alias
  `zalo-test.vercel.app` (domain khác) trong khi domain team VẪN trỏ `kqixbxy52` — chỉ phát hiện
  nhờ test hành vi (guard doc không ghi). Đã trỏ lại bằng full domain + xoá alias lạc. Bài học:
  sau `alias set` PHẢI xác minh bằng test hành vi trên đúng URL webhook, ping 200 không đủ.
  Đã xác minh: người lạ giả `/start` → bot ghi `lastStrangerReplyAt` mới nhất → code mới live.
- Webhook Zalo: URL không đổi nên KHÔNG cần setWebhook lại; `getWebhookInfo` xác nhận đúng URL.
- ĐÃ GỠ `ZALO_BOT_ALLOWED_USER_IDS` — ai cũng nhắn được bot, link vẫn cần mã lớp + PIN đúng.
  Lệnh `đổi vai` chỉ dành cho `ZALO_BOT_DUAL_ROLE_USER_IDS=6428d37c9d35746b2d24` (chủ dự án).
- Vault key: `C:\Users\ADMIN\AppData\Local\Temp\opencode\VILAO-KEYS.md` (đã append key mới);
  backup env: `...\spai-env-backup.md`. Giữ `zalo_webhook_secret.txt` tới khi buổi test xong.

## Việc còn lại (bật cho PH thật)

1. Dọn test: xoá link/test của chủ dự án khỏi `channelLinks`, xoá file token `.txt`.
2. Gỡ/đổi `ZALO_BOT_ALLOWED_USER_IDS` (hoặc bỏ env để mọi người đã liên kết dùng được).
3. Trả webhook về production URL sau khi merge code vào production.
4. Tạo lại token Zalo (token đã nằm trong file `.txt` + lịch sử chat).
5. Xoá nhánh/alias preview.
