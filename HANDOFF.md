# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật**: 2026-08-11 · **Repo**: [`soangiaoan`](https://github.com/congapro60-dev/soangiaoan) · **Branch chuẩn**: `main` · **Production**: https://giaoandewey.vercel.app

Ảnh chụp TRẠNG THÁI HIỆN TẠI, không phải nhật ký — `git log` đã lưu lịch sử tốt hơn.
Trần **150 dòng**: vượt thì cắt mục cũ sang [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md).

---

## 1. Trạng thái hiện tại

**`main` = `ca9158f`.** Chuỗi đỏ #442–#445 đã kết thúc ở #446/#447; trạng thái CI của `ca9158f` chưa xác nhận (máy này không có `gh`).

Các lô gần nhất:

- **Đẩy Drive không cần bot + chọn bài theo PPCT** (lô mới nhất) — bot Railway chết vì hết hạn dùng thử, chức năng đẩy giáo án được dựng lại **thẳng trong trình duyệt**: xin quyền Drive qua Firebase Google login rồi upload thẳng lên Drive API, không thêm hàm Vercel, không giữ secret. Kèm bộ chọn bài từ PPCT đóng sẵn: **684 bài TDS** (khối 6–12, hệ Discover) + **324 bài MOET** (khối 10–12), sinh từ `scripts/build-ppct.mjs`. Unit plan THPT học phần I nạp kèm khi giáo viên tự tick.
- **Phủ kín kiểm thử `firestore.rules`** — 1/17 → 17/17 collection, `npm run test:rules` từ 35 lên **185 ca**. Ba file mới trong `tests/rules/`. Gỡ `test:e2e` khỏi `package.json` (trỏ vào file không tồn tại và bị `.gitignore` chặn). **Phơi ra 3 lỗ hổng rules chưa vá** — xem mục 3, trong đó `adaptiveLessons` là lỗ hổng MỚI phát hiện. Không sửa `firestore.rules` trong lô này: owner chốt phơi trước, vá ở phiên riêng.
- **Giỏ sản phẩm + nối lỗi với công cụ vá** (`e77cf38`) — tab Nâng cấp gộp mọi sản phẩm AI đã sinh vào MỘT file Word thay vì 17 file rời; mỗi tiêu chí chưa đạt có nút dẫn thẳng tới mục menu vá được nó (`fixSuggestions.ts`). `markdownToOoxmlParagraphs` nay dựng được bảng Word thật. **Panel chưa QA trên UI** — cần upload .docx + khoá API.
- **Dự giờ Danielson** (`90c1cb1`) — sửa 2 lỗi thật thấy trên production + thêm 2 tầng làm sạch biên bản. Chi tiết ở mục 2.
- **Rà soát giáo án 2 tầng** (`6b70a71`) — tách `generalStandards.ts` (10 phép kiểm mọi môn, từ `Checklist tự kiểm tra giáo án.xlsx`) khỏi `mathStandards.ts` (22 phép kiểm Toán TDS). Trước đó giáo án Văn/Sử bị chấm bằng tiêu chí Toán. Ghép ở `lessonAudit.ts`.
- **Thư viện nước đi lớp học** (`12f5d0d`) — 14 nước đi vận hành lớp, lọc theo loại kế hoạch qua `apDung`.

## 2. Đang dở / đừng đụng

**Lô dự giờ đã lên `main` (`90c1cb1`, CI xanh).** Gồm `src/lib/dugio/{lamSach,deXuatSuaLoi}.ts` (mới), `excel.ts`, `phanTich.ts`, `DuyetSuaChinhTa.tsx` (mới), `DuGioPage.tsx`.

Bốn thay đổi và lý do — **đừng nới cái nào mà không đọc test kèm theo**:

1. **Phần I chỉ được thấy giáo án.** `nguonTheoPhan(1, …)` KHÔNG truyền biên bản nữa. Quy định Tổ Toán xếp Domain 1 vào *"ĐÁNH GIÁ HỒ SƠ"*, cả ba luật Domain 1 chỉ nhắc giáo án. Trước đây biên bản được truyền vào "để đối chiếu" là đủ để AI lấy luôn làm minh chứng.
2. **`LUAT_CHUNG` → `luatChung(nguon)`.** Luật cũ cứng nhắc bắt *"trích nguyên văn từ biên bản"* cho MỌI phần. Chỉ gỡ biên bản khỏi Phần I mà không sửa luật này thì AI mất nguồn hợp lệ và trả `null` hàng loạt. Nguồn theo phần nằm ở `NGUON_MINH_CHUNG`.
3. **Ô giờ Excel đọc bằng `.w`, không phải `.v`.** Excel lưu giờ là phân số của một ngày, nên `.v` cho ra `0.5777777777777777` thay vì `13:52` — minh chứng gửi AI mất sạch mốc thời gian.
4. **Hai tầng làm sạch biên bản** (`lamSach.ts` + `deXuatSuaLoi.ts`) — xem mục 3.

**CHƯA QA trên UI thật:** nút *"Soát chính tả bằng AI"* chưa bấm được vì cần đăng nhập Google + biên bản + khoá API. Mới chứng minh trang `/du-gio` nạp không lỗi console. Logic có 40 ca test phủ.

## 3. Cái sắp cắn người sau

- **Ranh giới 3 tầng làm sạch biên bản là ranh giới ĐẠO ĐỨC, không phải kỹ thuật.** Biên bản dự giờ là hồ sơ đánh giá một giáo viên cụ thể.
  - **A — tự động**: bỏ ký tự rác, gộp dòng Excel ngắt giữa câu, gỡ nhãn `GV:/HS:` thừa. Không đẻ nghĩa mới.
  - **B — phải có người duyệt**: sửa chính tả. `locDeXuat()` loại thẳng mọi đề xuất đổi số từ, lệch >2 ký tự/từ, hoặc trích đoạn không có thật trong ô. Đây là hàng rào chặn B trượt thành C khi AI ảo giác. Giao diện **cố ý không tick sẵn** mục nào.
  - **C — KHÔNG LÀM**: điền vào chỗ trống. Ô trống là *dữ kiện* ("người dự giờ không ghi nhận được"), không phải lỗi. Điền vào là mâu thuẫn trực tiếp luật số 3 trong `phanTich.ts`.
  - Test `"chưa" → "chứa"` **cố ý để lọt** bộ lọc B — ghim rõ vì sao B bắt buộc phải có người duyệt.
- **Một minh chứng ĐƯỢC dùng cho nhiều tiêu chí.** Đừng "sửa" thành 1-1. Quy định Tổ Toán dùng "bảng con" làm minh chứng cho **cả 3C lẫn 3D**. Hàng rào đúng là *mỗi tiêu chí phải có ít nhất một trích dẫn nói trúng hành vi của chính nó* — đã ghi trong prompt.
- **Ba chỗ trong lô rà soát giáo án 2 tầng, đừng đụng mà chưa đọc kỹ:** (a) `auditMathStandards` phải giữ nguyên chữ ký lẫn hành vi — cổng sinh giáo án Toán `toanLessonQuality.ts` phụ thuộc vào nó; (b) `detectSubject` **cố ý thiên về Toán**, chỉ tắt lớp kiểm Toán khi giáo án tự khai môn khác — đoán sai chiều này chỉ thừa vài tiêu chí, đoán sai chiều kia làm mất sạch lớp kiểm của một giáo án Toán thật; (c) `differentiation-dimensions` chỉ soi trong cửa sổ ±240 ký tự quanh chữ "phân hóa", bỏ cửa sổ là mọi giáo án đều đậu nhờ chữ "sản phẩm dự kiến" nằm chỗ khác.
- **Quy trình dạy Toán TDS giữ 4 bước** (Trải nghiệm – Hình thành – Rèn luyện, phát triển – Sơ kết) theo `Hướng dẫn soạn giáo án môn Toán.docx`. Ô E6 của Checklist ghi "5 bước" — owner đã chốt theo bản Hướng dẫn, đừng sửa ngược.
- **`FIX_FOR_FINDING` cố ý KHÔNG phủ hết tiêu chí.** 8/26 tiêu chí chưa đạt không có nút vá, và đó là chủ ý: (a) `plan-metadata`/`student-profile` — app không được bịa tên người soạn, ngày, sĩ số lớp thật; (b) nhóm lỗi BIÊN TẬP (`board-content-filled`, `time-continuity`, `no-duplicate-block`, `term-introduced`, `no-internal-instructions`, `expected-products`, `homework-present`, `self-selection-fallback`, `group-model-coherence`) cần sửa TẠI CHỖ trong bài chứ không phải sinh nội dung mới — đó là mục menu "Vá lỗi biên tập" chưa làm, xem lô 3 trong `tasks/todo.md`. Đừng map bừa cho đủ: map sai sinh ra nội dung thừa mà lỗi vẫn nguyên. Test `fixSuggestions.test.ts` khoá mọi id trong bảng phải là tiêu chí và mục menu có thật.
- **Ba lỗ hổng rules CHƯA VÁ, giờ đã có test phơi ra trên emulator** — chạy `npm run test:rules` là thấy. Mỗi ca đánh dấu `[LỖ HỔNG]`, nằm trong `describe` có chữ "lỗ hổng đã biết", cố ý `assertSucceeds` để ghi lại hành vi production hiện tại. **Vá rules xong thì các ca đó đỏ — đó là đúng ý đồ, lật kỳ vọng rồi xoá comment.** Đã kiểm bằng đột biến ngày 2026-08-04: vá thử cả ba thì cả ba ca đều chuyển DENY, tức là chúng có răng thật.
  - `personalizationCache` `allow read, write: if true` — người lạ tính đúng cacheKey là ghi đè được nội dung bài học học sinh đọc. Đây là **chèn nội dung vào bài học của trẻ**, không chỉ là rò rỉ. Vá đúng phải thêm `teacherId` vào document; xem archive mục 5.3. Test: `hocPhanHoa.rules.test.ts` ca 11–13.
  - `lessonPlans` `allow list: if request.auth != null` — bất kỳ ai đã đăng nhập đều liệt kê được TOÀN BỘ giáo án của người khác (các luật là OR nên `allow read` chặt hơn không cứu được). `duGio` cố ý không sao chép kiểu này. Test: `soHuuCaNhan.rules.test.ts` ca 11–12.
  - `adaptiveLessons` `allow read: if request.auth != null || portalEnabled == true` — **không so uid với teacherId**, nên giáo viên bất kỳ đọc được trọn nội dung bài phân hoá của đồng nghiệp, kể cả khi cổng đang đóng. Chưa từng ghi ở HANDOFF trước đây. Test: `hocPhanHoa.rules.test.ts` ca 4.
- **Comment `firestore.rules:38` đã cũ** — ghi "service lưu document theo lesson.id", nhưng `getAdaptiveLessonDocId = (userId) => userId` (`AdaptiveLearningTab.tsx:142`) cho thấy document id **chính là teacherId**. Rules `get(/adaptiveLessons/$(teacherId))` là đúng; chỉ comment sai. Đừng "sửa" rules theo comment đó.
- **`firebase deploy --only firestore:indexes` XOÁ index không khai trong `firestore.indexes.json`.** Luôn đọc danh sách CLI hỏi xoá trước khi gõ Y. Thêm query `where(A) + orderBy(B)` là phải khai index cùng lúc.
- **Dải tiêu đề `| **I. THÔNG TIN CHUNG** |` viết liền dưới bảng là bẫy của GFM** — không có dòng trống thì `marked` nuốt nó thành MỘT HÀNG của bảng trên, Word dựng ra hàng lệch vào giữa bảng kèm cột rác 120–367 twip. `splitBannerRowsFromTables` (có ở CẢ `src/utils/renderWordCore.ts` lẫn `api/render-word-core.ts`) chèn dòng trống + `| --- |` để nó thành bảng một cột riêng. Đừng gỡ; test ở `api/render-word-core.test.ts`.
- **Bảng thông tin đầu giáo án chia theo cặp nhãn/giá trị** (`infoPairRatios`, nhãn 11%): chia đều 6 cột thì ô tên bài vỡ 5 dòng. Chỉ kích hoạt khi bảng có chữ *Tên bài học / Tuần học / Năm học* và mọi ô nhãn ≤ 16 ký tự, để không đụng nhầm bảng dữ liệu thật.
- **`renderWordCore.ts` chứa đúng 12 byte NUL** làm ký tự mốc giấu công thức. Sửa file này phải đếm lại sau khi ghi.
- **`buildSchoolFormDocx.ts::COL3` phải khớp `toanStyleRules.ts::TOAN_ACTIVITY_COL_RATIOS`** (15/45/40). Lệch một nơi là user thấy sai ở đường xuất kia.
- **Ngưỡng 7000 ký tự của thư viện nước đi là PHANH CHỐNG PHÌNH, không phải giới hạn model.** Đo thực tế: kien_thuc 4477 · dao_nguoc 5619 · luyen_tap 5971. Vượt ~20 nước đi thì **đừng nới tiếp** — đổi cách gửi: gửi "tên + khi nào" của tất cả, "cách làm + vì sao" chỉ cho 3–5 nước đi AI đã chọn.
- **`chấm điểm dự giờ/*.txt` là file THAM KHẢO, không biên dịch.** Đổi đuôi về `.ts` là `npm run lint` gãy.
- **Custom claim `vai_tro` chỉ gán bằng `scripts/gan-vai-tro.ts` hoặc Firebase Console.** App không bao giờ được tự gán — làm thế là tự cấp quyền đọc đánh giá nhân sự.
- **Đẩy Drive chặn phiên ẩn danh là CỐ Ý.** `getDriveAccessToken()` ném lỗi khi `currentUser.isAnonymous`. Nếu để popup Google chạy, `signInWithPopup` thay luôn phiên ẩn danh và cuốn theo dữ liệu app gắn với uid cũ. Scope `.../auth/drive` là scope **hạn chế chưa xác minh**: consent screen đang **In production / External**, người dùng thấy màn hình cảnh báo và có trần **100 người**. Đừng bấm *Back to testing* trong Google Auth Platform — làm thế là chặn đăng nhập Google của mọi người ngoài danh sách test.
- **JSON trong `src/data/ppct/` và `src/data/unitplan/` là dữ liệu SINH RA, đừng sửa tay.** Nguồn nằm ở `Phan phoi va unit plan/` (không commit vì nặng ~8 MB); có PPCT năm mới thì thay file nguồn rồi chạy lại `node scripts/build-ppct.mjs` và `node scripts/build-unitplan.mjs`. `src/data/ppct/ppct.test.ts` canh 26 phép kiểm; nó từng bắt được lỗi thật `Number('')` biến ô số tiết trống thành 0.
- **Đơn vị của bộ chọn là TIẾT, nhưng phải gom nhóm theo bài TRƯỚC rồi mới trải lại.** Giáo án soạn theo từng tiết nên mỗi tiết là một mục chọn (`periodIndex/periodCount`). Nhưng hai thứ chỉ đúng ở mức bài: tên bài (ô gộp trong Excel) và ô "Yêu cầu cần đạt" của PDF MOET (ô gộp trải nhiều tiết, cắt theo tiết thì 11–17% số hàng đứt giữa câu). TDS có lỗ số tiết là đúng: các tiết `Tự chọn / Teacher's choice` không có tên bài nên bị bỏ.
- **Ba cái bẫy khi đọc PDF MOET, đã vá, đừng gỡ.** (a) Trang bìa có bảng thiết bị, cột "Số lượng" chứa `01` nằm đúng dải cột Tiết — không chặn theo dòng tiêu đề "Bài học" thì cả trang bìa thành một bài dài 579 ký tự. (b) Ngay dưới bảng là mục "2. Kiểm tra, đánh giá định kỳ" — không chặn thì tiết cuối nuốt trọn bảng đó. (c) **Số trang cũng là số và cũng ở dải cột Tuần**, nhưng hàng cuối bảng nằm đúng cùng độ cao `y=76` với nó, nên chỉ được cắt chân trang TRONG dải cột Tuần; cắt theo chiều dọc cho mọi cột là mất tiết 80, 122, 135 của khối 10.
- **Tuần của MOET gán bằng công thức `ceil(tiết/5)`, không đọc theo vị trí nhãn.** Nhãn tuần được căn giữa ô gộp nên rơi vào giữa nhóm tiết, đọc theo vị trí là tuần nhảy loạn. Công thức đã đối chiếu với từng nhãn thật trong cả ba file. Script tự kiểm ba tầng lúc dựng: nhãn phải nằm trong khoảng dọc của nhóm, mỗi tuần đúng 5 tiết, và liệt kê thẳng tiết bị thiếu khi lệch — năm sau đổi định mức là gãy ngay chứ không sai âm thầm.
- **KHÔNG tự đoán bài nào thuộc unit plan nào.** Đo ngày 2026-08-11: khớp theo từ khoá tên chương chỉ trúng 34–53% ở học kỳ I mà khớp nhầm 19–26% bài học kỳ II. Ô tick để giáo viên tự quyết, mặc định tắt. Unit plan học kỳ II và bản THCS (PDF vỡ dấu tiếng Việt khi rút chữ) **chưa nạp**.
- **Tiêu đề giáo án phải mang số tiết** (`buildTitle` trong `LessonControls.tsx`): một bài "Mệnh đề" trải 4 tiết, lưu cả bốn cùng tên thì thư viện lẫn Drive không phân biệt nổi. Lấy số tiết mà PPCT tự ghi trong ô nội dung ("Tiết 3: …") vì nó đếm theo cả bài, không reset theo tuần. Tên file trên Drive đi thẳng từ tiêu đề này — `safeFilename` giữ nguyên dấu tiếng Việt, chỉ bỏ ký tự cấm.
- **Tiết "Tự chọn / Teacher's choice" CÓ trong danh sách** (65–78 tiết mỗi khối THPT, THCS không có). PPCT để trống nội dung nên `isElective = true`, yêu cầu soạn chèn sẵn dòng `NỘI DUNG TỰ CHỌN:` để giáo viên điền — đừng để AI tự nghĩ ra nội dung cho tiết này.
- **`auth/user-mismatch` khi đẩy Drive là do trình duyệt nhiều tài khoản**: cửa sổ Google mở bằng tài khoản mặc định khác với tài khoản đang đăng nhập. Đã truyền `login_hint` và dịch lỗi sang tiếng Việt có nêu tên tài khoản đúng. Màn hình "Google hasn't verified this app" thì KHÔNG phải lỗi — Advanced → Continue.
- **Năm học đi kèm dữ liệu PPCT** (`schoolYear` trong mỗi file `src/data/ppct/*.json`, hiện `2026 - 2027`), không viết cứng trong giao diện. Chọn bài xong app tự đặt Lớp và Tuần trên web, đồng thời chèn dòng bắt giáo án điền đúng *Lớp · Tuần học · Năm học* vào các ô sẵn có ở đầu mẫu. Sang năm chỉ cần đổi `SCHOOL_YEAR` trong `scripts/build-ppct.mjs` rồi chạy lại.
- **PPCT chỉ là tư liệu đầu vào.** Owner chốt 2026-08-11: không được đổi bố cục mẫu giáo án người dùng chọn. `buildRequirement()` trong `LessonControls.tsx` gắn sẵn câu ràng buộc giữ nguyên các mục của mẫu — đừng gỡ.
- **Tên thư mục/file tiếng Việt lưu dạng NFD.** Ghép chuỗi đường dẫn trong PowerShell/bash sẽ "không tìm thấy" dù nhìn đúng; phải duyệt bằng `Get-ChildItem` rồi dùng đối tượng file.

## 4. Lệnh nghiệm thu

Đúng hai lệnh CI (`quality_gate.yml`) chạy — **chạy vài file test tự chọn là cách đã làm `main` đỏ 4 lần**:

```bash
npm run lint && npm run test -- --run
```

```bash
npm run build
```

Kiểm `firestore.rules` (cần Java cho emulator, tách khỏi `npm run test` có chủ đích):

```powershell
$env:PATH = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin;$env:PATH"; npm run test:rules
```

Ghi chú: `npm run lint` là `tsc --noEmit`. Cảnh báo chunk lớn của Vite là warning cũ, không phải blocker.

**KHÔNG CÓ lệnh E2E.** `test:e2e` đã bị gỡ khỏi `package.json` ngày 2026-08-04 — nó trỏ vào
`live_dom_test.js` ở gốc repo, file không tồn tại và còn bị `.gitignore` chặn nên không bao giờ
track được. Script trong `.agents/qa/scripts/` đã đánh dấu **legacy / do-not-run-as-gate**:
chúng chiếm Chrome profile cá nhân qua cổng 9222, chạy thẳng vào production và có cơ chế `skip`
in thông báo thành công sau khi bỏ qua bước. Nguồn sự thật về lệnh QA:
[`.agents/qa/QA_TESTING_PROTOCOL.md`](.agents/qa/QA_TESTING_PROTOCOL.md) mục 1.

**Commit**: mặc định `git add -u` + `git add src tasks HANDOFF.md` — liệt kê tay từng đường dẫn đã bỏ sót file và làm đỏ `main`. **Ngoại lệ**: khi có phiên khác đang sửa dở trong cùng cây làm việc thì phải stage có chọn lọc, `git add -u` sẽ cuốn cả việc của họ.

**Push**: repo có `.githooks/pre-push` (bật bằng `core.hooksPath=.githooks`) **chặn push nếu `HANDOFF.md` không nằm trong đám commit sắp đẩy đi**. Commit chỉ đụng `tasks/lessons.md` hoặc `docs/**` được miễn. Hotfix gấp: `git push --no-verify`.

## 5. File/khái niệm cốt lõi

| Việc | Vào đâu |
|---|---|
| Dự giờ Danielson | `src/lib/dugio/*` · `src/data/khungDanielson.ts` · `src/pages/DuGioPage.tsx` · `docs/DU_GIO_DANIELSON.md` |
| Chuẩn/cổng chất lượng giáo án | `src/lib/lessonUpgrade/{lessonAudit,generalStandards,mathStandards}.ts` · `src/lib/toanLessonQuality.ts` |
| Prompt giáo án Toán | `src/prompts/{toanFormats,toanClassroomMoves}.ts` · `src/hooks/useLessonCreator.ts` |
| Xuất Word/PDF | `api/render-word-core.ts` · `src/utils/{wordExportA4,examWordExport,exportUtils}.ts` |
| Nhà cung cấp AI | `src/lib/aiProviders.ts` (BYOK, không còn relay khoá dự phòng) |
| Đẩy giáo án lên Drive | `src/lib/googleDrive.ts` · `src/services/pushLessonToDrive.ts` · `src/components/modals/PushToDriveModal.tsx` |
| Phân phối chương trình | `scripts/build-ppct.mjs` · `src/data/ppct/*` · `src/components/modals/PpctPickerModal.tsx` |
| Unit plan học phần | `scripts/build-unitplan.mjs` · `src/data/unitplan/*` |
| Quyền truy cập | `firestore.rules` · `firestore.indexes.json` (nguồn sự thật cho index production) |
| Bài học đã rút | `tasks/lessons.md` — **đọc đầu phiên** |

## 6. Lịch sử

Các phiên trước (1.0b → 1.0r), phase Skeleton đã xong, roadmap chưa code, checklist Vercel:
xem [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) và `git log`.

> **Đừng tin file này thay cho việc đọc code.** Tài liệu drift: bản trước còn ghi "module dự giờ CHƯA có UI"
> trong khi UI đã chạy trên production. Xác minh file/dòng còn tồn tại trước khi sửa theo.
