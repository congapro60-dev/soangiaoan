# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật**: 2026-08-03 · **Repo**: [`soangiaoan`](https://github.com/congapro60-dev/soangiaoan) · **Branch chuẩn**: `main` · **Production**: https://giaoandewey.vercel.app

Ảnh chụp TRẠNG THÁI HIỆN TẠI, không phải nhật ký — `git log` đã lưu lịch sử tốt hơn.
Trần **150 dòng**: vượt thì cắt mục cũ sang [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md).

---

## 1. Trạng thái hiện tại

**CI xanh.** `main` = `90c1cb1`. Chuỗi đỏ #442–#445 đã kết thúc ở #446/#447.

Bốn lô gần nhất:

- **Giỏ sản phẩm + nối lỗi với công cụ vá** (phiên này, *chưa push*) — tab Nâng cấp gộp mọi sản phẩm AI đã sinh vào MỘT file Word thay vì 17 file rời; mỗi tiêu chí chưa đạt có nút dẫn thẳng tới mục menu vá được nó (`fixSuggestions.ts`). `markdownToOoxmlParagraphs` nay dựng được bảng Word thật.
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
- **`personalizationCache` cho ghi công khai** (`allow read, write: if true`) — người lạ tính đúng cacheKey là ghi đè được nội dung bài học học sinh đọc. Vá đúng phải thêm `teacherId` vào document. Cần phiên riêng — xem chi tiết ở archive mục 5.3.
- **`lessonPlans` có `allow list: if request.auth != null`** — bất kỳ ai đã đăng nhập đều liệt kê được TOÀN BỘ giáo án của người khác (các luật là OR nên `allow read` chặt hơn không cứu được). `duGio` cố ý không sao chép kiểu này.
- **`firebase deploy --only firestore:indexes` XOÁ index không khai trong `firestore.indexes.json`.** Luôn đọc danh sách CLI hỏi xoá trước khi gõ Y. Thêm query `where(A) + orderBy(B)` là phải khai index cùng lúc.
- **`renderWordCore.ts` chứa đúng 12 byte NUL** làm ký tự mốc giấu công thức. Sửa file này phải đếm lại sau khi ghi.
- **`buildSchoolFormDocx.ts::COL3` phải khớp `toanStyleRules.ts::TOAN_ACTIVITY_COL_RATIOS`** (15/45/40). Lệch một nơi là user thấy sai ở đường xuất kia.
- **Ngưỡng 7000 ký tự của thư viện nước đi là PHANH CHỐNG PHÌNH, không phải giới hạn model.** Đo thực tế: kien_thuc 4477 · dao_nguoc 5619 · luyen_tap 5971. Vượt ~20 nước đi thì **đừng nới tiếp** — đổi cách gửi: gửi "tên + khi nào" của tất cả, "cách làm + vì sao" chỉ cho 3–5 nước đi AI đã chọn.
- **`chấm điểm dự giờ/*.txt` là file THAM KHẢO, không biên dịch.** Đổi đuôi về `.ts` là `npm run lint` gãy.
- **Custom claim `vai_tro` chỉ gán bằng `scripts/gan-vai-tro.ts` hoặc Firebase Console.** App không bao giờ được tự gán — làm thế là tự cấp quyền đọc đánh giá nhân sự.
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
| Quyền truy cập | `firestore.rules` · `firestore.indexes.json` (nguồn sự thật cho index production) |
| Bài học đã rút | `tasks/lessons.md` — **đọc đầu phiên** |

## 6. Lịch sử

Các phiên trước (1.0b → 1.0r), phase Skeleton đã xong, roadmap chưa code, checklist Vercel:
xem [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) và `git log`.

> **Đừng tin file này thay cho việc đọc code.** Tài liệu drift: bản trước còn ghi "module dự giờ CHƯA có UI"
> trong khi UI đã chạy trên production. Xác minh file/dòng còn tồn tại trước khi sửa theo.
