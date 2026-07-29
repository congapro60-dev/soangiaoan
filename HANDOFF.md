# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật gần nhất**: 2026-07-29  
**Repo**: `soangiaoan` — `https://github.com/congapro60-dev/soangiaoan`  
**Branch chuẩn**: `main`  
**Production URL để QA UI**: `https://giaoandewey.vercel.app`  
**Mục đích**: file handoff ngắn gọn cho Cline / Claude Code / Antigravity / kỹ sư tiếp theo. Chi tiết lịch sử cũ đã được nén; nếu cần truy vết đầy đủ hãy dùng `git log`, `git show`, các test report, hoặc lịch sử commit.

---

## 1. Trạng thái hiện tại

### 1.0l Cập nhật phiên 2026-07-29 (chiều) — Dự giờ: ĐỔI MÔ HÌNH QUYỀN + giao diện + Excel theo mẫu trường

**Quyết định của user làm thay đổi nền:** bỏ toàn bộ phân quyền `vai_tro`/BGH/tổ trưởng. **Ai đăng nhập Google cũng tự lập biên bản của mình, chỉ mình đọc; muốn chia sẻ thì bật `isPublic` — y hệt `lessonPlans`.** Tên giáo viên giữ nguyên khi chia sẻ (user quyết, tôi có nêu lo ngại và được bác).

- `firestore.rules`: gỡ `emailTruong/laBGH/laQuanLy/choGVXemBienBan` và cả `duGioGiaoVien`. Còn `match /duGio/` theo `userId` + `isPublic`. **KHÔNG sao chép `allow list: if request.auth != null` của lessonPlans** — kiểu đó cho mọi người đăng nhập liệt kê biên bản riêng của người khác; ở đây mỗi document phải tự thoả điều kiện nên client buộc phải lọc theo `userId` hoặc `isPublic`. ⚠️ **`lessonPlans` vẫn đang có lỗ hổng list đó — chưa sửa, xem mục 6.**
- `firestore.indexes.json`: `duGio` đổi sang `userId+ngay` và `isPublic+ngay`.
- `tests/rules/duGio.rules.test.ts` viết lại — **23 ca**, gồm cả lưới an toàn lessonPlans.

**Nguồn tiêu chí — đã đối chiếu 3 tài liệu, KHÔNG bê nguyên bản nào:**
| Tài liệu | Vai trò |
|---|---|
| `VN_Danielson Framework For Teaching_bản đầy đủ.docx` | **Chuẩn.** 22 thành tố, rubric 4 mức (Chưa đạt/Cơ bản/Tốt/Xuất sắc), + **CÁC THÀNH TỐ CỐT LÕI** và **SUY NGẪM** (19/22 mục có) |
| `Mẫu biên bản dự giờ.xlsx` | Bản **rút gọn 15 cấu phần** trường dùng khi dự giờ (bỏ 2b và cả Phần IV) → giữ ở `BO_DU_GIO`, là mặc định |
| `Nguyên tắc chấm điểm Danielson - Tổ Toán.docx` | **Cách chấm**: ý nghĩa 4 mức, quy tắc điểm lẻ, lượng hóa 3b/3c/3d, quy tắc Phần I, tịnh tiến minh chứng |

`src/data/khungDanielson.ts` sinh từ file .docx chuẩn (tên thành tố khớp chính xác bản dịch của trường). `src/data/nguyenTacChamDiem.ts` tách riêng vì khung nói ĐIỀU GÌ được đánh giá, quy tắc nói CHẤM THẾ NÀO — hai thứ đổi độc lập.

**Hai nguyên tắc công bằng được thực thi bằng code, không chỉ nằm trong tài liệu:**
1. **Điểm lẻ 0,5 = khẳng định có bằng chứng.** Chọn 1,5/2,5/3,5 thì bắt buộc ghi "hành động chạm ngưỡng đã quan sát"; bỏ trống → viền đỏ, `thieuMinhChungChamNguong()` chặn nút Lưu. AI cũng bị ép: đề xuất điểm lẻ mà không nêu được `cham_nguong` thì tự hạ về mức nguyên dưới. *(Tài liệu chỉ nêu tường minh 2,5 và 3,5; 1,5 tôi suy ra cùng công thức và đánh dấu `nguyenVan: false` trong dữ liệu.)*
2. **"Không đánh giá" ≠ 0 điểm.** Là một nút riêng; thành tố đó bị loại khỏi mẫu số chứ không kéo trung bình xuống. Có test khoá: chấm 2/15 mục toàn 4 vẫn ra "Xuất sắc", không thành "Chưa đạt".

**Excel — xuất ra GIỐNG HỆT mẫu trường.** Không dựng file mới bằng SheetJS (bản cộng đồng ghi ra mất sạch màu/viền/độ rộng cột). Cách làm: lấy `public/mau/bien-ban-du-gio.xlsx` làm khuôn, mở như ZIP bằng JSZip và **chỉ thay giá trị ô**, giữ thuộc tính style `s=`; chuỗi ghi dạng `inlineStr` để khỏi đụng `sharedStrings.xml`. Đã xác minh bằng mắt: render LibreOffice → PNG cho thấy logo Dewey, màu nền từng lĩnh vực, toàn bộ chữ rubric, viền đều nguyên vẹn; điểm vào đúng cột; dòng không đánh giá để TRỐNG. Nhớ `compression: 'DEFLATE'` — mặc định JSZip là STORE làm file phình 30 KB → 128 KB.

**Nhập file lên cũng chạy:** `docFileExcel()` đọc cả file mẫu gốc lẫn file do chính app xuất ra (test vòng tròn khép kín). ⚠️ **Chuẩn hóa NFC ngay khi đọc** — Excel lưu tiếng Việt dạng NFD, chuỗi nhìn y hệt nhưng khác byte làm mọi phép so sánh trượt âm thầm (đã tốn một lần debug).

**File mới:** `src/pages/DuGioPage.tsx` (route `/du-gio`, `/du-gio/:id` trong `main.tsx`), `src/components/features/dugio/{BangChamDiem,BangQuanSat}.tsx`, `src/lib/dugio/{types,tinhDiem,docJson,phanTich,excel,luuTru}.ts`, `src/data/nguyenTacChamDiem.ts`, `public/mau/bien-ban-du-gio.xlsx`.

**Verify:** lint 0 lỗi · build PASS · `npm run test` **225/225** (29 ca dự giờ mới) · `npm run test:rules` **23/23** · trình duyệt: route + guard đúng, vòng xuất→đọc lại Excel chạy thật trên dev server.

**Việc còn:**
- ⚠️ **CHƯA deploy rules/index** — bắt buộc, xem 1.0k.
- **Chưa test được màn soạn thảo khi đã đăng nhập** — chế độ demo của app dùng user giả (không có token Firebase) nên `onAuthStateChanged` không thấy user. Cần user đăng nhập Google thật để nghiệm thu luồng lưu/đọc Firestore.
- Nút xuất Word cho biên bản (hiện chỉ có Excel).
- Quy tắc "tịnh tiến minh chứng" mới chỉ hiện nhắc nhở, chưa tự nối sang biên bản lần trước của cùng giáo viên.

### 1.0k Cập nhật phiên 2026-07-28/29 — Module dự giờ Danielson: nền tảng bảo mật + dữ liệu khung

Bối cảnh: thêm module **dự giờ & chấm điểm tiết dạy theo khung Danielson** (BGH/tổ trưởng dự giờ giáo viên, chấm 22 thành tố / 4 phần). Đây là dữ liệu **nhạy cảm nhất hệ thống** — nhận định có tên về đồng nghiệp — nên phiên này chỉ làm nền tảng bảo mật + dữ liệu, CHƯA có UI. Đặc tả gốc: thư mục `chấm điểm dự giờ/` (tên thư mục Unicode NFD — xem `tasks/lessons.md`). Tài liệu vận hành: **`docs/DU_GIO_DANIELSON.md`**.

**Đã làm (Claude, commit `5a988f4` + `35b6dd3`):**
- **Gỡ rò rỉ khoá AI**: xoá khối `define: { 'process.env.GEMINI_API_KEY': ... }` trong `vite.config.ts` — nó nhồi khoá vào **bundle trình duyệt**. Không file nào trong `src/` dùng biến này (chỉ `api/generate-simulation.ts` phía server) nên gỡ là an toàn tuyệt đối. ⚠️ `const env = loadEnv(...)` nay thành biến thừa, để nguyên có chủ đích (không nằm trong scope tsconfig).
- **`firestore.rules`** — CHÈN 85 dòng vào **cuối** block `match /databases/{database}/documents`, giữ nguyên 362 dòng cũ. Ba tầng chặn: `emailTruong()` (bắt buộc `@thedeweyschools.edu.vn` + `email_verified` — vì đăng nhập Google mở cho mọi Gmail), `laBGH()` / `laQuanLy()` theo custom claim `vai_tro`, và biên bản **đóng băng** khi `trangThai == 'da_trao_doi'`.
- **Cờ chính sách `choGVXemBienBan()`** trả `false`: giáo viên CHƯA được đọc biên bản về mình. Đây là quyết định của BGH, không phải quyết định kỹ thuật.
- **`scripts/gan-vai-tro.ts`** — gán claim `vai_tro` bằng Admin SDK, tái dùng đúng thứ tự nạp service account của `api/health/firebase-admin.ts`. **Claim CHỈ được gán bằng script/Console, app KHÔNG BAO GIỜ tự gán.**
- **`src/data/khungDanielson.ts`** — 22 thành tố, rubric 4 mức, `TRONG_SO` (phần 1/2/3 = 0.2/0.35/0.45, phần 4 = 0). Có kiểu `MaThanhTo`/`SoPhan` nên gõ sai mã thành tố là lỗi biên dịch.
- **`tests/rules/duGio.rules.test.ts`** + `vitest.rules.config.ts` + `npm run test:rules` (firebase emulators:exec). `vitest.config.ts` loại `tests/rules/**` để `npm run test` không fail khi máy không có emulator.

**QA bảo mật + vá (Codex, commit `e9486ad` → `3e62a9a`):**
- **`allow list` sai cú pháp** — rule cũ dùng `'nguoiDuUid' in request.query.where`; **`request.query` KHÔNG có thuộc tính `where`** (chỉ `limit`/`offset`/`orderBy`) → rule ném evaluation error, tổ trưởng không list được gì. Sửa thành `resource.data.nguoiDuUid == request.auth.uid` — đúng idiom Firestore: rule `list` chấm trên từng document ứng viên, buộc client phải tự thêm `where`.
- **`gvUid` thành trường bắt buộc** khi tạo, và **bất biến** khi sửa (cùng `gvId`, `nguoiDuUid`) → không thể lập biên bản rồi đổi sang gán cho giáo viên khác.
- Thêm 10 ca kiểm thử (19–28): list có/không lọc, thiếu `limit`, `limit` 201, `giao_vien` tạo/sửa, thiếu/đổi `gvUid`. Tổng **28 ca**.
- `firestore.indexes.json` khai composite index `duGio: nguoiDuUid ASC, ngay DESC`; `firebase.json` thêm key `"indexes"` (trước đó **thiếu** → file index chưa từng được deploy).
- `scripts/gan-vai-tro.ts` thêm `/// <reference types="node" />` (file nằm trong scope `tsc --noEmit`).

**⚠️ Lỗi CHẶN do Claude phát hiện khi review (đã vá cùng phiên):** việc nối `"indexes"` vào `firebase.json` biến `firestore.indexes.json` thành **nguồn sự thật** cho production — mà file đó chỉ khai 3 index trong khi app đang chạy **7 query composite**. `firebase deploy --only firestore:indexes` sẽ coi 4 index còn lại là "thừa" và **hỏi xoá**; trả lời có (hoặc `--force`) là **vỡ ngay Thư viện, Đề đã lưu, Lịch sử chấm bài trên production**. Đã bổ sung đủ 4 index còn thiếu:
`lessonPlans isPublic+createdAt` · `savedExams userId+updatedAt` · `savedExams isPublic+updatedAt` · `gradingSessions userId+createdAt`.
**QUY TẮC MỚI:** thêm bất kỳ `where(A) + orderBy(B)` nào cũng phải khai index vào `firestore.indexes.json`, nếu không lần deploy index kế tiếp sẽ xoá mất index đó (đã ghi `tasks/lessons.md`).

**Hai ca kiểm thử cố ý, đừng "sửa cho xanh":**
- **Ca 8 — canh cờ.** Khẳng định `choGVXemBienBan()` đang tắt. Khi BGH quyết định cho giáo viên xem biên bản, ca này sẽ FAIL. Đó là chủ đích: nó buộc người sửa nhận ra mình vừa đổi **chính sách**, không phải một dòng code. Lúc đó đổi `assertFails` → `assertSucceeds` và ghi lại quyết định của BGH.
- **Ca 17–18 — lưới an toàn.** Khối dự giờ được CHÈN vào file đang phục vụ tính năng chạy thật; hai ca này canh `lessonPlans` không bị chèn hỏng.

**Verify:** `npm run lint` 0 lỗi · `npm run build` PASS · `npm run test` **196/196** · `npm run test:rules` **28/28** trên emulator.

**Việc còn:**
- ⚠️ **CHƯA deploy rules/index.** Push `main` chỉ deploy app qua Vercel, KHÔNG đụng Firebase. Hiện `duGio` chưa có luật nào trên production → mặc định deny, không có lỗ hổng, nhưng cũng chưa dùng được. Chạy `firebase deploy --only firestore:rules,firestore:indexes` và **đọc kỹ danh sách index CLI hỏi xoá trước khi gõ Y**.
- Sau deploy: tab ẩn danh trên `giaoandewey.vercel.app`, console chạy `getDocs(collection(db,'duGio'))` khi chưa đăng nhập → phải `permission-denied`.
- **Bước 7 — UI `DuGioPage.tsx`** (chưa làm): chuyển `thamkhao-giao-dien.jsx.txt` sang Tailwind v4, thêm route + guard `vai_tro`. **Client BẮT BUỘC query đúng dạng** `where('nguoiDuUid','==',uid) + orderBy('ngay','desc') + limit(≤200)` — thiếu `where` hoặc thiếu `limit` là `permission-denied`, không phải rules hỏng.
- Module xuất `src/lib/dugio/xuat.ts` (từ `thamkhao-xuat.ts.txt`) và `src/lib/dugio/phanTich.ts` bọc `callAI`. **Gọi AI phải bỏ tên giáo viên trước khi gửi** — tên chỉ nằm ở Firestore. `callAI` không có tham số `maxTokens`/`system` → phải tự chia prompt theo nhóm 2 thành tố.
- ⚠️ **`firebase-tools` là devDependency nặng** (~300 gói, `package-lock.json` +12.888 dòng) — Vercel cài devDependencies khi build nên build chậm đi. Cân nhắc gỡ và để `test:rules` gọi `npx firebase-tools@15`.
- **`personalizationCache` vẫn `allow read, write: if true`** — xem mục 5.3.

### 1.0j Cập nhật phiên 2026-07-09 — Loại giáo án mới "Giáo án ban Toán" (KHDH kiểu v13)

Bối cảnh: cowork đã tạo file mẫu vàng `KHDH_v13_PT_DuongThang_K10.docx` (161 công thức OMML, banner màu, bảng hoạt động 3 cột, generator tại `outputs/khdh/build_v8_combined.js` — xem `tasks/session_khdh_bai19.md`). Phiên này đưa kiểu KHDH đó thành loại giáo án thứ 4 trong tab Soạn giáo án. Plan đã duyệt: `C:\Users\ADMIN\.claude\plans\pure-meandering-cloud.md`. Nhánh **`feat/toan-lesson-type`** (CHƯA push main — chờ lệnh).

**Pha 1 — loại + UI + prompts (commit riêng):**
- `BuiltinFormat` thêm `'toan'` + `ToanKeHoach` (`kien_thuc | luyen_tap | dao_nguoc`) trong `src/types.ts`; persist 2 field này lên `LessonPlan` khi lưu (mirror vào `currentPlan`, spread điều kiện tránh `undefined` vào Firestore — `useLessonPlanActions.ts`).
- UI `LessonControls.tsx`: picker 2×2 thêm "Giáo án ban Toán"; chọn nó → hiện sub-picker 3 kế hoạch bài dạy; chỉ hỗ trợ Soạn Đơn lẻ (bulk disabled + tooltip; đường bulk là prompt riêng, chưa nối).
- Prompt mới `src/prompts/toanFormats.ts`: `TOAN_COMMON_FORMAT` (hợp đồng cấu trúc: bảng hoạt động `| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |`, mục tiêu 3 hàng Cơ bản/Trọng tâm/Nâng cao + [Bloom:], nhãn Socratic đóng `**[PHÁT HIỆN]**`…, quy tắc `$...$`) + 3 outline kế hoạch + `TOAN_ADDITIONAL_REQUIREMENTS` (few-shot). Chảy qua `templateContext`/`additionalRequirements` — **KHÔNG đụng agents pipeline**. `mathRestrictions` tắt mục II (bảng 3 cột kiểu cũ) riêng cho 'toan'.
- Test hợp đồng: `src/prompts/toanFormats.test.ts` (9 test) — QUY TẮC: đổi chuỗi header bảng/nhãn là VỠ nhận diện style, test sẽ chặn.

**Pha 2 — xuất Word đẹp như v13 (commit riêng):**
- `src/utils/toanStyleRules.ts` (CHỈ DATA): map màu banner theo heading ĐÃ CHUẨN HÓA bỏ dấu (`matchToanBanner` — chịu biến thể output AI, không match → render thường); nhận diện bảng hoạt động (`isToanActivityTableHeader` → cột 1000/4900/3126 của 9026 ≈ 11/54/35%, header `cfe2f3`); bảng mục tiêu tô hàng `D9EAD3/FCE5CD/FFF2CC`; nhãn `[NHÃN]` → bold `1F4E79`.
- `src/utils/renderWordCore.ts`: thêm `styleProfile?: 'toan'` vào `WordRenderPayload`, luồn qua `processTokens`; 3 nhánh guarded (heading→banner table, table→width/fill, strong→màu nhãn). **Mặc định undefined = hành vi y hệt cũ** — có regression test khóa điều này.
- `wordExportA4.ts` tự derive profile từ `currentPlan.builtinFormat` → CreatorTab/ViewPlanModal không phải sửa.
- Test: `src/utils/renderWordCore.toan.test.ts` (6 test) — golden fixture (đếm OMML, fills, gridCol 1017/4985/3180, màu 1F4E79) + regression no-profile (không dính fill toan, E2E8F0 giữ nguyên).

**Verify:** tsc 0 lỗi · 147/147 test · build PASS · preview demo mode: picker + sub-picker + bulk disabled hoạt động đúng.

**Nâng cấp prompt theo bản mẫu thật (commit riêng, cùng phiên):** user chê bản sinh đầu "thiếu rất nhiều thứ" — nguyên nhân: prompt Pha 1 viết từ OUTLINE cấu trúc, chưa nạp logic sư phạm chi tiết của v13. Đã đọc thẳng nguồn v13 (`khdh_final.md` + `build_v8_combined.js` trong sandbox cowork) và viết lại `toanFormats.ts` bám sát: bảng thông tin hành chính 6 cột; mục I đủ 4 phần (✓ năng lực, mục tiêu "Sau tiết học tôi có thể" + bảng 3 mức, phân hóa TB/Khá/Giỏi, tài liệu, **Căn cứ điều chỉnh từ tiết trước**); mốc phút P1–P40 từng hoạt động; 4 pha **BƯỚC 1 KẾT NỐI → 4 CHUẨN HÓA** trong HĐ chính; bộ nhãn đầy đủ 17 nhãn (Socratic + Bloom + NB/TH/VD/VDC — `TOAN_NHAN_RE` nới theo, khớp test); KWLI-Chart, exit ticket format điền, "Đáp án PHT"/"⚠ Lỗi phổ biến" ở cột ghi bảng, nhóm đồng mức, "Phòng chờ Toán học", quiz chuỗi Bloom, quy tắc tranh biện + điểm sao, mindmap 5 nhánh gắn mức, BTVN 4 dòng; few-shot thay bằng TRÍCH ĐOẠN THẬT từ v13. Test hợp đồng viết lại (11 test). LƯU Ý cấu trúc tiết đảo ngược theo v13 = quiz Bloom + dự án mini + tranh biện + mindmap (jigsaw chuyên gia nằm ở PHIẾU 6A/6B/6C — thuộc Pha 3).

**Việc còn:**
- ⚠️ **TODO mirror `api/render-word-core.ts`** (bản server, đường bot-push `/api/export-lesson`): chưa có styleProfile → plan 'toan' đẩy sang bot sẽ render generic. Mirror bằng chính data `toanStyleRules.ts`.
- Nghiệm thu chất lượng NỘI DUNG AI sinh: cần key AI thật, soạn thử cả 3 kế hoạch → xuất Word mở kiểm tra (banner màu, cột 11/54/35%, công thức double-click được).
- Pha 3 (chưa làm): phiếu học tập đi kèm (KWLI/Tic-Tac-Toe/chuyên gia jigsaw) — cân nhắc nối vào nút "Tạo Phiếu học tập" sẵn có; `toanKeHoach` đã persist nên biết loại phiếu nào.
- Bulk mode cho 'toan' (đường bulk :840-918 cần nối templateContext riêng).

### 1.0i Cập nhật phiên 2026-07-07 — QA đợt 9: sửa TẬN GỐC 6 gốc bệnh hệ thống (F1→F13)

Bối cảnh: cowork QA đợt 9 trên production (bài conic) → `BAOCAO_QA_BaiHocPhanHoa_2026-07-07.md` (PHẦN A: fix đợt 5–8 PASS gần hết; PHẦN B: 13 lỗi F1–F13; PHẦN D: 6 gốc bệnh D1–D6). Phiên này sửa theo Phần D — không vá riêng bài Conic. Nhánh **`fix/qa-dot9-conic`** (CHƯA push main — chờ lệnh user). Log chi tiết: `tasks/adaptive_qa_bugs.md` mục "ĐỢT 9".

**Đã sửa (tsc 0 lỗi + 131/131 test + build PASS + script render 11/11 PASS):**
- **D1 (F1/F2/F9 — họ lỗi công thức): module DUY NHẤT `src/lib/adaptive/mathText.ts`** — tokenize vùng `$...$`/text, transform chỉ chạy đúng loại vùng (KHÔNG bao giờ chèn `$` vào trong vùng math — gốc lỗi `$a^2 = $b^2 +$ c^2$`); vá `$` lẻ; `assertClean` hậu-kiểm + fallback; **golden tests** `mathText.test.ts` (15 test = chuỗi lỗi thật). `adaptiveToDewey.ts` uỷ quyền toàn bộ (giữ tên hàm `normalizeLatexText`/`cleanOptions`, xoá regex cũ). Pretest React portal (`MathText`/`MathBlock`) sanitize trước `ensureMathWrapped` (gốc F1: option `M\left(...\right)$` → KaTeX đỏ). Builder heading dùng `toPlainText` (F9). **QUY TẮC MỚI: cấm viết regex công thức ngoài mathText.ts; QA bắt chuỗi lỗi mới → thêm golden test** (đã ghi `tasks/lessons.md`).
- **D2 (F3/F4/F13 — vở ghi lộ giữa học sinh):** key `dewey-notebook-v3-<lessonId>-<studentCode>` (trước theo MÁY); truyền `studentCode`: portal → `renderDeweyLesson(content, theme, {studentCode})` → `renderHtmlShell` → `getAdaptiveEngineScript`. F4 xác nhận chỉ là note "ma" storage cũ (code đã đúng từ đợt 8) — v3 tự giải quyết. F13 cần retest sau deploy.
- **D3 (F5):** nhánh fallback đổi nhãn gói `"10/20/30 điểm"` → `"Nhận biết/Thông hiểu/Vận dụng"`. Quy tắc "sửa spec = sửa CẢ 2 nhánh" đã ghi lessons.md.
- **D4 (F7):** `navTo('screen-summary')` render lại `#final-score` mỗi lần vào màn (TOC mở tự do).
- **D5 (F6 — wheel chết trong iframe):** bỏ `html{scroll-behavior:smooth}` + **wheel-rescue listener** trong engine (vùng con tự cuộn thì nhường; còn lại cuộn `scrollingElement` + `preventDefault`, xử lý deltaMode, giữ Ctrl+zoom). ⚠️ cần test chuột thật trên production.
- **D6 (F8/F10/F11 — pipeline nuốt lỗi):** TikZ validate qua Kroki NGAY LÚC SINH + retry 1 lần kèm lỗi Kroki cho AI tự sửa (`checkTikzWithKroki` — `buildTikzKrokiUrl` chuyển sang `krokiRender.ts` thuần, deweyAssets re-export); `visual_cards_failed` ghi nguyên nhân (nhận diện 429); lỗi relay personalization kèm body response.
- **D1#4 (sạch từ nguồn):** `repairMathDeep` (cân `$`, bọc lệnh trần, bỏ qua HTML/URL/TikZ/id) chạy cuối `runAdaptivePipeline` trước khi lưu Firestore.

**Bổ sung cùng phiên — GỐC BỆNH #7 (user chỉ ra): "bản rà soát ĐÃ DUYỆT gần như không được dùng khi sinh bài".**
Luồng builder = "AI rà soát" (`buildAdaptiveReviewPrompt`, đọc 24k ký tự nguồn, ra bản 11 mục giáo viên duyệt) → "Duyệt & tạo cấu trúc" (`runAdaptivePipeline`). Audit phát hiện: blueprint chỉ nhận `reviewedPlan.slice(0,4000)` (mục 5–6 bị cắt), mỗi mảnh chỉ nhận `slice(0,2500)` (thiết kế mảnh đã duyệt ở mục 6 KHÔNG BAO GIỜ tới prompt), assessments/practice KHÔNG nhận bản duyệt (bảng pre-test mục 3 + luyện tập mục 7 đã duyệt bị vứt, AI sinh lại từ đầu) → duyệt phần lớn là hình thức. **Fix:** thêm `getReviewedSection`/`getReviewedUnitBlock` (tái dùng `getSection` sẵn có) — blueprint nhận digest mục 1+5+6 (kèm rule 2b: unit_outline PHẢI theo danh sách mảnh đã duyệt); mỗi mảnh nhận ĐÚNG block "### Mảnh kiến thức" của nó (khớp token tiêu đề, kèm chỉ thị "PHẢI bám sát, chỉ hoàn thiện"); assessments nhận mục 3; practice nhận mục 7. **Regression test** trong `adaptiveFromLessonPlan.test.ts`: mock `callAIFn` bắt prompt, reviewedPlan có mục 2 độn ~4800 ký tự để chứng minh mục 3/6/7 (nằm ngoài 4000 đầu) vẫn tới đúng prompt, và mảnh Elip không nhận nhầm block mảnh Tâm sai. Chất lượng thực tế cần user tạo bài mới nghiệm thu.

**Việc còn (người/vòng sau):**
- User ra lệnh merge/push → deploy → **retest thủ công**: F6 (lăn chuột thật), F13 (học sinh mới, vở sạch), F3 (2 mã học sinh cùng máy → vở độc lập).
- **Nghiệm thu E9 Phần 2 + E10 vẫn cần TẠO BÀI MỚI** (bài conic cũ đi nhánh fallback).
- **Quota Gemini 429** (Lỗi #3 vận hành) — nguồn của F8/F10 — vẫn cần nâng billing key production.

### 1.0h Cập nhật phiên 2026-06-30 — QA bài học phân hoá vòng 3 (bài "Ba đường Conic", đợt 5→8)

Bối cảnh: user tiếp tục học thử + tạo bài mới (conic) → loạt lỗi mới. Log đầy đủ: **`tasks/adaptive_qa_bugs.md`**. Tất cả đã sửa + tsc sạch + verify script, push main.

**Đợt 5 (`ce006c3`):** D1 khôi phục **4 tầng gợi ý** Luyện tập (trước nhồi cả 5 ô = lời giải → sai 1 lần lòi đáp án); D2 mở khoá toàn bộ mục lục.
**Đợt 6 (`62c499a`):** D3 thêm hình minh hoạ vào Luyện tập & Vận dụng (hết toàn chữ).
**Đợt 7 (`236bf86`):** D4 hoạt động "học xong sớm còn dư giờ" (bài nâng cao + vận dụng + đọc + link tìm kiếm YouTube; nút "Hoàn tất sớm").
**Đợt 8 (`92f3780`→`6307e16`):** E1–E10 trên bài conic:
- **E6** (NGHIÊM TRỌNG) chấm sai mặc định A → `resolveCorrectIndex` (so phương án thô, hết lệ thuộc chuẩn hoá). **E7** option raw markdown → `stripInlineMarkdown`. **E3** option thiếu `$` → `ensureMathDelimiters`. **E4** `^2` thô → `convertBareCarets`→unicode. **E5** vở ghi mục II đánh số 1.2.3. **E1/E2** TikZ `\n` literal + builder hết ảnh đỏ (nhúng SVG đã xác thực). **E8** Vận dụng chỉ nhúng sim KHỚP đề (token đặc trưng). **E9** redesign Luyện tập 3 gói **Nhận biết/Thông hiểu/Vận dụng** (4 MCQ×5đ / 2 Đúng-Sai chấm từng phần 1·2.5·5·10 / 2 ngắn + 1 tự luận 2 tầng tự chấm) + đúng cũng hiện lời giải + bỏ "Olympia"; thêm `PracticeSet`+bước sinh `buildPracticePrompt` (bài cũ fallback quick check). **E10** prompt sim mảnh đơn giản/đẹp hơn.
- **Cần bài MỚI để nghiệm thu:** E9 (3 gói + tự luận), E10 (sim), chất lượng công thức/hints (E3/E4/E6 render-time áp ngay cả bài cũ). E9 tốn thêm 1 lần gọi AI → cần quota.

### 1.0g Cập nhật phiên 2026-06-29 — QA bài học phân hoá vòng 2 (đóng vai HỌC SINH học thật, đợt 1→4)

Bối cảnh: user trực tiếp học thử bài phân hoá (trên `giaoandewey.vercel.app`) → phát hiện loạt lỗi mà test DOM-only bỏ sót. Toàn bộ log lỗi + trạng thái: **`tasks/adaptive_qa_bugs.md`**. Đã sửa hết, mỗi đợt commit riêng, đã push main.

**Đợt 1–2 (commit `1aab05a`):** A7 nút "Hoàn thành hoạt động" đơ (formula nhồi onclick → vỡ JS → chuyển sang `data-notebook-formula`); A4 bỏ "bước khổng lồ" (bỏ blob, mỗi guiding question 1 bước); A3/A6 thêm `guiding_answers` (đáp án thật) + bỏ practice placeholder; A5 vở ghi = `knowledgeConclusion`.

**Đợt 3 (commit `1fa824f`):** B6 Vở ghi cấu trúc **I.Mục tiêu / II.Nội dung / III.Luyện tập / IV.Vận dụng / V.Tổng kết** (`renderNotebook` 5 mục + `addNote(content, section)`); B5 xuống dòng bước (CSS `white-space:pre-line`); B2 mô phỏng full-width (engage gỡ khỏi cột 2, height 600); B3 GỠ `injectSimRuntime` (lộ mã) + prompt sim CẤM LaTeX→Unicode; B1 engage 1 tình huống (blueprint ép `reality_check_message` cùng bối cảnh `story_hook`); B4 prompt sim đơn giản theo SGK.

**Đợt 4 (commit `006a8dd`):** C1 `formatStepLines` mở rộng (tách trước Gọi/Ta có/Sau khi/Áp dụng/Suy ra/Vậy/Kết luận) + ép AI xuất mỗi bước 1 dòng `\n`; C2 TikZ chỉ nhúng **SVG hợp lệ** (loadDeweyAssets fetch Kroki, loại 400/body lỗi → bỏ ảnh, nhúng inline); C3 Olympia **hàng ngang chọn gói** (`oly-tabs`, bấm mới hiện câu), **bỏ khóa gói** (tự chọn), chia **3–4 câu/gói** (sort độ khó).

**Đợt 7 (commit `236bf86`, đã push):** D4 khôi phục hoạt động **"học xong sớm còn dư giờ"** (trước đây chỉ là khung rỗng: hộp `time-filler-options` chỉ hiện khi HẾT giờ, nút không handler, nội dung placeholder). Nay bỏ hộp chết; thêm `DeweySummary.bonusChallenge` (4 phần: **bài nâng cao + vận dụng thực tế + vấn đề đọc + link YouTube**) + nút "Mình còn thời gian — Thử thách thêm" ở Tổng kết → `revealBonus()`. `adaptiveToDewey` dựng: ưu tiên `lesson.bonusChallenge` (AI), thiếu thì **tái dùng** (ví dụ mẫu khó nhất / extend / storyHook / link TÌM KIẾM YouTube theo tên bài). AI path: `bonus_challenge` trong assessments prompt + `mapBonusChallenge` + `AdaptiveLesson.bonusChallenge` (pipeline). Portal iframe thêm `allow-popups` để mở link YouTube. *(File: `adaptiveToDewey.ts`, `adaptiveFromLessonPlan.ts`, `adaptive/types.ts`, `dewey/{types,template,htmlShell,adaptiveEngine}.ts`, `AdaptiveStudentPortalPage.tsx`. Verify: tsc sạch + render PASS.)* Tái dùng thấy ngay mọi bài; nội dung AI riêng chỉ ở bài mới.

**Đợt 6 (commit `62c499a`, đã push):** D3 Luyện tập & Vận dụng hết **toàn chữ** — thêm hình minh hoạ. `DeweyAdaptiveQuestion.illustrationHtml?`/`DeweyExtendStory.illustrationHtml?` + template `.question-figure`/`.extend-figure`; `adaptiveToDewey` **tái dùng** TikZ SVG (`tikzSvgByUnitId`) gắn vào câu ĐẦU mỗi mảnh ở Olympia (chỉ "một số câu", không trùng), Vận dụng ưu tiên **iframe mô phỏng** của một mảnh (`simulationHtmlByUnitId`) → không có thì hình TikZ; degrade an toàn khi thiếu asset. Render-time → áp dụng cả bài cũ (miễn có TikZ/sim hợp lệ); bài mới sinh đủ học liệu mỗi mảnh (rule 17) nên phong phú hơn. *(File: `adaptiveToDewey.ts`, `dewey/{types,template,htmlShell}.ts`, prompt rule 17. Verify: tsc sạch + render PASS — 2/6 câu có hình, Vận dụng dùng sim.)*

**Đợt 5 (commit `ce006c3`, đã push):** D1 khôi phục **4 tầng gợi ý** ở Luyện tập (trước đó `toAdaptiveQ` nhồi cả 5 ô = cùng lời giải → sai 1 lần lòi bài chữa). Nay: `AdaptiveQuestion.hints?`/`QuestionJson.hints?` (AI sinh 3 gợi ý tiến dần, rule 6b trong prompt); `toAdaptiveQ` map 4 tầng phân biệt, **tầng 1 luôn là nhắc lý thuyết, KHÔNG lộ đáp số**, solution chỉ hiện ở sai lần 4; thiếu hints AI thì `synthesizeHintTiers` tự tách lời giải theo bước (fallback áp dụng NGAY cho bài cũ). D2 **mở khóa toàn bộ mục lục từ đầu** (`template.ts` `locked:false` mọi mục) — học sinh tự do chuyển phần, không khóa tuần tự. *(File: `adaptiveToDewey.ts`, `adaptiveFromLessonPlan.ts`, `types.ts`, `dewey/template.ts`. Verify: tsc sạch + script render PASS — 4 tầng phân biệt, tầng 1 không chứa đáp số, TOC 0 mục khóa.)*

**File chạm chính:** `src/lib/adaptive/{adaptiveToDewey.ts, adaptiveFromLessonPlan.ts, deweyAssets.ts, types.ts}`, `src/lib/dewey/{template.ts, htmlShell.ts, adaptiveEngine.ts}`.

**Verify:** `tsc --noEmit` sạch mỗi đợt; script tsx render + đóng vai học sinh bấm thật trên localhost (A7 hết đơ, chuyển màn OK). Render-time (vở ghi, Olympia layout, xuống dòng) áp dụng cả bài cũ; nội dung (C1 chất lượng, C2 tikz, engage sim, công thức sim) cần **TẠO BÀI MỚI**.

**Việc còn / cảnh báo:**
- **Quota Gemini 429** (`gemini-3.1-pro` free_tier=0) → sinh bài chậm, đôi khi sót câu/hình. **Cần nâng billing/quota key production** (vận hành, không phải code).
- Cần user nghiệm thu lại trên bài MỚI sau deploy: công thức sim (Unicode, hết `$` thô), TikZ hết ảnh đỏ, lời giải xuống dòng, Olympia 3–4 câu/gói.
- Bài CŨ publish trước fix `portalEnabled` cần publish lại mới mở cổng ẩn danh (xem 1.0d).
- **Bài học CÁCH TEST:** phải đóng vai học sinh học thật (bấm hết nút, đọc gợi ý/đáp án, đi hết bước), KHÔNG chỉ đếm DOM — ghi ở `tasks/lessons.md`.

### 1.0f Cập nhật phiên 2026-06-26 — QA bài học phân hoá: sửa 6 lỗi khi học sinh học thật

Bối cảnh: user đóng vai học sinh học thật từng bước (không chỉ soi DOM như các vòng cowork/Antigravity trước) → phát hiện 7 lỗi mà test DOM-only bỏ sót. Chi tiết: `tasks/adaptive_qa_bugs.md`. Bài học chính render qua iframe Dewey nên hầu hết fix là **render-time → áp dụng cả bài cũ lẫn mới** (reload là thấy); riêng A1/A3/A5 chất lượng cao cần **sinh bài MỚI**.

**Đã sửa (commit `1aab05a`, đã verify bằng cách đóng vai học sinh bấm thật trên localhost):**
- **A7 (CHẶN) — nút "Hoàn thành hoạt động" đơ:** `formulaForNotebook` (có xuống dòng/`\` LaTeX) bị nhồi vào `onclick` → vỡ chuỗi JS → SyntaxError → bấm không ăn. Fix: chuyển sang `data-notebook-formula` trên `<section>` (template.ts); `completeKnowledgeUnit(unitId, button)` đọc note từ dataset (adaptiveEngine.ts). Verify: bấm thật → panel kết luận hiện, "Sang hoạt động tiếp theo" chuyển màn OK.
- **A2 — MathJax không render trong iframe mô phỏng:** thêm `injectSimRuntime()` (htmlShell.ts) nhồi MathJax + MutationObserver (typeset lại khi slider đổi DOM) vào srcdoc mọi `sim-frame` (unit + engage). Áp dụng cả bài cũ.
- **A4 — 1 bước nhồi nguyên khối câu hỏi:** bỏ `buildSocraticRouteExplanation` (blob); explanation theo tuyến nay SẠCH; mỗi guiding question = 1 bước ngắn riêng.
- **A3 — gợi ý/đáp án bước "Thử và sửa" rỗng:** thêm `guiding_answers` (AI sinh, cùng index guiding_questions) → mỗi câu dẫn dắt có đáp án/gợi ý THẬT; prompt cấm lặp lại câu hỏi.
- **A6 — gợi ý luyện tập là placeholder:** bỏ `makePracticeTask` placeholder (`practiceTasks: []`); luyện tập thật nằm ở Olympia/quick check.
- **A5 — Vở ghi sai cấu trúc:** `formulaForNotebook` = `knowledgeConclusion` (chốt kiến thức) thay vì cắt cụt explanation; bỏ ghi chú "Song ánh" cứng trong `submitPreTest` (sai cho bài không phải song ánh).
- **A1** — mô phỏng khởi động sinh từ storyHook (đã làm ở `4768c8a`; bài mới có).
- types.ts thêm: `LearningRouteContent.guidingAnswers`, `KnowledgeUnit.hookQuestion`, `KnowledgeUnit.knowledgeConclusion`.

**Bài học về CÁCH TEST (đã ghi `tasks/lessons.md`):** phải ĐÓNG VAI học sinh học thật (bấm hết nút, đọc gợi ý/đáp án, kiểm điều hướng, đọc Vở ghi) — KHÔNG chỉ đếm DOM (sim-frame/gallery). 2 vòng test DOM-only trước bỏ sót A3–A7.

**Việc còn:** user tạo 1 bài MỚI (sim BẬT) để nghiệm thu chất lượng A1/A3/A5 (cần API; quota Gemini 429 làm chậm — Lỗi #3 vận hành). Nâng quota key production.

### 1.0e Cập nhật phiên 2026-06-26 — Tích hợp Trợ lý Nâng cấp Giáo án (Pha 0 & 1)

**Đã hoàn tất Pha 0 & Pha 1 theo kế hoạch `eduplan_integration_plan.md`**:
- **Pha 0**: Đã tạo "cửa vào" cho tính năng từ thẻ Card trong tab **Công cụ AI** (`internalAction: 'lesson-upgrade'`). Đã thêm route `lessonUpgrade` vào `App.tsx` và thêm menu "Nâng cấp giáo án" vào `Sidebar.tsx`.
- **Pha 1**: 
  - Khởi tạo kiến trúc phân rã: `LessonUpgradeTab.tsx` (UI router), `useLessonUpgrade.ts` (State).
  - Tích hợp **LLM #1 (Phân tích giáo án)** (`analysisPrompt.ts`): Nhận diện đúng JSON Khung Cố Định.
  - Cấu hình 17 lựa chọn nâng cấp (`menu.ts`) chia theo 5 nhóm rõ ràng.
  - Type-checking và Build hoàn toàn PASS.
- **Pha 2**:
  - Triển khai **LLM #2 (Sinh sản phẩm)** cho 4 mục tái dùng ngay: E (Phiếu học tập), F (Câu hỏi đánh giá), L (Rubric), Q (Phân hóa).
  - Tách riêng logic Prompt vào `productPrompts.ts` không làm phình `worksheetUtils.ts` hiện tại.
  - Xây dựng UI render kết quả chuẩn `ReactMarkdown` hỗ trợ bảng biểu, Toán học (MathJax) đầy đủ kèm nút Copy/Làm lại.
- **Pha 3**:
  - Tạo kho tri thức sư phạm (Knowledge Base) tĩnh để chống Hallucination tại `src/lib/lessonUpgrade/knowledge/`.
  - Các module đã tích hợp: Khung năng lực số (NL số), Năng lực AI (AI Literacy), Phương pháp/Kỹ thuật dạy học tích cực, Kịch bản trò chơi tương tác.
  - Mở khóa 4 mục chuyên sâu: G (Năng lực số), H (Năng lực AI), I (Phương pháp dạy học), J (Trò chơi học tập).

- **Pha 4 & 5 (Hoàn thiện)**:
  - Bổ sung toàn bộ Prompt cho 9 tùy chọn còn lại (A, B, C, D, K, M, N, O, P) vào `productPrompts.ts`.
  - Mở khóa toàn bộ 17 Menu chức năng trên UI.
  - Tích hợp thành công **Xuất file Word (.docx)** bằng cách gọi lại thư viện Native OMML hiện có (`exportToWordA4`), cho phép tải xuống sản phẩm nâng cấp kèm theo công thức Toán học chuẩn chỉnh để giáo viên sử dụng ngay.

### 1.0d Cập nhật phiên 2026-06-24 — Sửa "bài học phân hoá toàn chữ" + Xem trước hình/mô phỏng

Bối cảnh: bài học phân hoá sinh ra hay "toàn chữ", mất hình minh hoạ & mô phỏng. Đối chiếu với 2 bài Gemini Canvas (`docs/BAOCAO_DoiChieu_App_vs_Gemini.md`, `docs/BAOCAO_CUOI_GuiClaudeCode_SuaLoi.md`) → gốc bệnh KHÔNG phải thiếu khả năng vẽ hình mà là **đứt mạch render** giữa 2 đường (cổng React vs HTML Dewey trong iframe) và template Dewey bỏ qua các slot hình.

**Đã làm (merged to main):**
- **Pipeline đa lượt chống "toàn chữ"** (`47ceab0`): Blueprint → Visual Cards → Assessments → từng Unit, mỗi bước cô lập lỗi (fail 1 bước không vỡ cả bài), có cảnh báo chất lượng. Sửa `repairJsonString` cho `\uXXXX`.
- **Nối hình & mô phỏng vào bài Dewey** (`0ea1b20`): `template.ts` render `step.illustrationHtml` + `unit.simulationHtml` (iframe sandbox); `adaptiveToDewey.ts` map `visualCards`→gallery khởi động, `simulationSpec.html.srcDoc`→`simulationHtml`, thêm tham số `assets` (HTML Firestore + URL tikz theo unitId); portal `loadDeweyAssets` pre-fetch. CSS gallery/sim ở `htmlShell.ts`.
- **Sinh mô phỏng tương tác vanilla-JS** (Gemini-style, xuất HTML thô không bọc JSON → hết lỗi escape), có sanitizer + `options.generateSimulations`; **checkbox bật/tắt** ở builder (`af497e2`).
- **TikZ → Kroki** (`tikz/svg`) nhúng `<img>` trong `illustrationHtml`.
- **Sửa nhầm phân môn Toán** (`62be030`): bài Xác suất từng ra mô hình 3D vì regex bắt "không gian mẫu". Sửa 3 lớp: prompt có bảng "phân môn → loại học liệu"; heuristic code bảo thủ (chặn xác suất/thống kê/giải tích trước, chỉ dựng hình học khi có tên hình cụ thể); guard cả đường AI tự phát `simulation_3d`.
- **Mở cổng học sinh ẩn danh** (`62be030`): `firestore.rules` cho đọc `adaptiveLessons` khi `portalEnabled==true` (học sinh quét QR không cần đăng nhập). ⚠️ **CẦN `firebase deploy --only firestore:rules` để có hiệu lực** — chưa deploy.
- **Xem trước trong builder trước khi xuất bản** (`27f0332`): panel "Hình ảnh & mô phỏng đã sinh" (gallery + `AdaptiveSimulationBlock` từng mảnh, render cả 3D + HTML, + ảnh TikZ) và nút "Xem trước bài học" mở modal render HTML Dewey từ bài trong bộ nhớ (chưa cần lưu). Prompt rà soát bắt buộc khai báo "Học liệu trực quan (LOẠI + MÔ TẢ)" mỗi mảnh. Tách `src/lib/adaptive/deweyAssets.ts` dùng chung.

**Đã kiểm thử:** build TS sạch nhiều lần; script tsx render Dewey ALL PASS; cowork + Antigravity E2E xác nhận hình/mô phỏng hiện trong iframe bài học, MathJax đẹp, mô phỏng tương tác thật, console sạch.

**Vòng QA production (`docs/BAOCAO_KiemThu_Production.md`) + sửa lỗi tiếp:**
- `firestore.rules` **đã deploy** (Antigravity, project `smartplan-ai-14200`).
- **CI strict tsc** bắt lỗi `vite build` bỏ qua → nhớ chạy `npx tsc --noEmit` trước khi push (`a9bf73e`). Thêm `imageDataUrl?` vào type `visual_cards`.
- **Lỗi #1 (chặn): bài Builder publish thiếu `portalEnabled`** → học sinh ẩn danh 403 dù rules đúng. `AdaptiveLessonBuilderPage` lưu unwrapped qua `saveLessonToFirestore` (khác luồng cũ `AdaptiveLearningTab` ghi wrapped có `portalEnabled`). Fix (`a832207`): `saveLessonToFirestore` ghi `portalEnabled = (status==='published')`. ⚠️ Bài đã publish TRƯỚC fix phải **publish lại** mới có field.
- **Lỗi #4 (UX): preview kẹt mảnh #1** — gỡ khối `LessonSimulationViewer` ngoài iframe ở màn `dewey-lesson` (nó luôn kẹt `currentUnitIndex=0`); mô phỏng từng mảnh đã nằm đúng trong iframe (`.unit-simulation`). (`a832207`)
- **Lỗi #2 (TikZ Kroki 400 ~1/3):** `buildTikzKrokiUrl` validate bắt buộc môi trường `tikzpicture`, tự gỡ double-escape, thiếu env → trả '' (bỏ ảnh thay vì vỡ). (`a832207`)
- **Lỗi #3 (vận hành, KHÔNG phải code):** quota Gemini free_tier=0 cho `gemini-3.1-pro` (429) → sinh bài chậm, sót vài câu/hình. Cần nâng billing/quota key production.
- **Phóng to gallery màn chào** (`e5f3c7f`): 4 ảnh khởi động full-width 2×2, tỉ lệ 3:2 không cắt, chữ to (áp dụng mọi bài).
- **Khớp nội dung ↔ hình ở màn KHỞI ĐỘNG**: trước đây màn Khởi động trong bài tái dùng 4 ảnh tổng quan của màn chào → lệch với storyHook cụ thể. Fix: pipeline sinh **mô phỏng khởi động riêng TỪ storyHook** (`buildEngageSimulationPrompt`, gated theo `generateSimulations`) lưu vào `preparation.engage.interactiveSimHtml`; `adaptiveToDewey` render iframe mô phỏng này ở màn Khởi động và KHÔNG tái dùng gallery; bỏ placeholder dial "?". Gallery tổng quan chỉ còn ở màn chào (React) + panel preview builder. (Khớp chuẩn "Bước 1 Khởi động = hoạt động tương tác gây bế tắc".)

**Việc còn (cho phiên sau):**
- Publish lại 1 bài qua Builder → chạy **E2E trọn 5 bước cổng học sinh ở phiên ẩn danh** (Olympia 3 gói → Tổng kết → kiểm ghi `adaptiveSessionProgress`). Đây là phần cowork chưa đi hết do Lỗi #1.
- Nâng quota Gemini để hết 429.

### 1.0c Cập nhật phiên 2026-06-22 — Tài liệu Chức năng Web (11 File Tiếng Việt)

- **Mô tả:** Đã hoàn thành 100% việc biên soạn và cam kết 11 file tài liệu kỹ thuật viết bằng tiếng Việt mô tả cấu trúc, cách hoạt động, luồng dữ liệu và kịch bản QA chi tiết cho từng tab chức năng của hệ thống.
- **Vị trí lưu trữ:**
  - Danh mục tài liệu: `docs/features/` (gồm các tệp từ `01-dashboard.md` đến `11-templates-skeletons.md`).
  - Đặc tả Thiết kế: `docs/superpowers/specs/2026-06-22-features-documentation-design.md`.
  - Kế hoạch Thực hiện: `docs/superpowers/plans/2026-06-22-features-documentation.md`.
- **Mục đích sử dụng:** Giúp các Agent AI thế hệ tiếp theo hoặc kỹ sư mới nắm bắt nhanh chóng cấu trúc component, hooks, DB schema, logic phân tích prompt AI, kịch bản QA thủ công và các lỗi (bug) lịch sử từng được xử lý để tránh xảy ra lỗi regression (lỗi lặp lại).

### 1.0 Cập nhật phiên 2026-06-19 — Text-to-Slide Automation & Đối chiếu Roadmap AI

Bối cảnh: review bản kế hoạch `ai_features_integration_plan.md` (do Antigravity soạn). Kết luận đối chiếu với code thật:

- **Text-to-Slide Automation** (Phase A) — luồng dán văn bản thô → AI sinh cấu trúc slide JSON → preview → xuất PPTX. KHÔNG đụng pipeline giáo án (`Coordinator.ts`), tái dùng 100% engine `downloadPPTX` cũ.
  - Mới: `src/components/modals/TextToSlideModal.tsx` — modal nhập text độc lập.
  - Sửa: `src/utils/exportUtils.ts` — thêm `generateTextToSlideData()` (prompt + parse JSON, có guard `slidesData[0].type === 'walt'`).
  - Sửa: `src/components/tabs/CreatorTab.tsx` — nút "Tạo Slide nhanh từ Văn bản thô" (chế độ single), feed kết quả vào `slidePreview` + `SlidePreviewBoard` sẵn có.
  - Đã runtime test thành công bằng bot_test.js và verify bằng file PPTX xuất ra.

- **Model Delegation cho FormatAgent** (Phase B) — Ép sử dụng các model tiết kiệm chi phí (`gemini-2.5-flash`, `claude-haiku-4-5-20251001`, `gpt-4o-mini`) trong `FormatAgent.ts` thông qua tham số `modelOverride`. callAIStream được nâng cấp để chấp nhận param này.

- **Tích hợp GeoGebra** (Phase C) — Thêm engine `geogebra` vào `DiagramRenderer.tsx` và `LessonContentBoard.tsx` (nhận diện block ```geogebra). Render an toàn bằng cách tạo iframe srcDoc với sandbox hạn chế (`sandbox="allow-scripts allow-pointer-lock"`), không sử dụng `allow-same-origin` tránh nguy cơ XSS.

- **Export GeoGebra ra Word** (Phase D) — Thêm hàm `rasterizeGeogebraToPng` trong `krokiRender.ts` sử dụng cơ chế postMessage liên miền. Iframe GeoGebra tự xuất PNG base64 gửi ngược về trang chính, sau đó chèn trực tiếp ảnh PNG (`ImageRun`) vào luồng tạo file Word trong `renderWordCore.ts`.

- **Typecheck & Build**: Đã chạy build thành công 0 errors, toàn bộ 4 Phase đều đã sẵn sàng merge/commit.

**Làm rõ roadmap (tránh "đập đi xây lại" thứ đã có):**
- **AI Grading (Mục 5 trong plan) ĐÃ TỒN TẠI**, không cần làm mới. Code thật: `src/components/tabs/GradingTab.tsx` + `src/utils/gradingUtils.ts` (`callAIWithVision`, chấm theo rubric, batch/smart grading, plagiarism, class analysis).
- **Delegation Architecture (Mục 1 trong plan) KHÔNG áp dụng cho Planning/Content** — đã thử và revert phiên 2026-06-17 (xem 1.0 cũ bên dưới). Nếu tối ưu chi phí, chỉ an toàn ở FormatAgent.
- **GeoGebra (Mục 3) phụ thuộc HTML Sandbox (Phase 3A) chưa code** — nhúng applet AI-sinh trực tiếp vào DOM = rủi ro XSS. Phải có sandbox iframe trước (xem mục 5.1).

### 1.0b Cập nhật phiên 2026-06-17 & 2026-06-18 — Khôi phục Pipeline Giáo án & Điều tra Lỗi Worksheet

#### Đã hoàn tất (merged to main)

**Khôi phục pipeline soạn giáo án về bản ổn định (3 bước)**

Bối cảnh: Phiên trước Anti thêm Critic/Fix agent và bỏ FormatAgent (commit `8897a66`). Pipeline mới gây ra các lỗi nghiêm trọng trên production: nội dung giáo án bị lặp, lộ thẻ `<lesson_content>` XML, bảng vỡ format. Claude thử restore FormatAgent (commit `6c399b3`) nhưng bỏ luôn `onStreamChunk` → app trắng màn hình khi đang soạn. Đã revert (`ebb0c79`), sau đó khôi phục đúng cách trong phiên này.

**3 file đã sửa:**
- `src/lib/agents/Coordinator.ts`: Đổi lại pipeline `Planning → Content → Format` (bỏ Critic/Fix). Bỏ `FAST_MODEL_MAP` — Planning dùng cùng model với Content để đảm bảo chất lượng dàn ý.
- `src/lib/agents/ContentAgent.ts`: Khôi phục prompt cũ dùng thẻ `<draft_content>` (không phải `<lesson_content>`), tập trung chiều sâu chuyên môn — FormatAgent lo phần format.
- `src/components/tabs/CreatorTab.tsx`: Khôi phục `<SimulatedProgress />` hiển thị % real-time khi loading, text "Hệ thống AI đang xử lý... X%" + "Vui lòng không đóng trang này".

**Lý do không thêm Critic/Fix trở lại**: Critic/Fix là ý tưởng đúng nhưng phải đặt giữa Content và Format (không thay thế Format). Chưa implement vì cần test cẩn thận. Pipeline hiện tại ổn định.

#### ✅ Đã fix thêm trong phiên 2026-06-18 (merged to main)

**P0 — Phiếu tại lớp bảng vỡ khi xuất Word** — ĐÃ SỬA (`src/utils/worksheetUtils.ts`):
- **Nguyên nhân đã xác định**: Prompt cũ sinh bảng **3 cột** ("Bài tập | Lựa chọn A | Lựa chọn B"). `getCellWidth()` trong `renderWordCore.ts:275` chia 30%/30%/40% → cột "Bài tập" chỉ ~2.7cm, quá hẹp → chữ xếp dọc, file 30 trang toàn bảng vỡ.
- **Cách fix**: Đổi prompt sang **bảng đúng 2 cột** — tiêu đề bài tập đặt trên dòng heading `**Bài X: [đề bài]**`, bảng bên dưới chỉ gồm Cột A (45%) và Cột B (55%). Thêm lệnh cấm tường minh "TUYỆT ĐỐI KHÔNG tạo bảng 3 cột" kèm ví dụ mẫu trong prompt.

**P1 — BTVN thiếu cấu trúc "Cốt lõi & Chinh phục"** — ĐÃ SỬA (`src/utils/worksheetUtils.ts`):
- **Nguyên nhân đã xác định**: Prompt cũ chỉ liệt kê 4 loại câu hỏi đánh số 1/2/3/4 liên tiếp → AI sinh số thứ tự lộn xộn, không có phân hóa 2 mức.
- **Cách fix**: Cập nhật prompt theo đúng cấu trúc đã thiết kế:
  - **I. NHIỆM VỤ CỐT LÕI** (8 điểm — bắt buộc): Trắc nghiệm (6 câu) + Đúng/Sai (2 câu, 4 ý mỗi câu) + Trả lời ngắn (2 câu)
  - **II. GÓC PHÁT TRIỂN NĂNG LỰC** (9-10 điểm — tự chọn): Tự luận vận dụng cao (2 câu thực tế đời sống)

#### ✅ Đã fix thêm trong phiên 2026-06-18 (commit `5e2fa49`)

**3 lỗi TypeScript sẵn có** — ĐÃ SỬA (build & `tsc --noEmit` đều PASS, 0 errors):
- `src/components/features/testing/MathOcrUploader.tsx` — gỡ prop `zoom` không hợp lệ
- `src/components/tabs/TestingTab.tsx` — bổ sung `settings`, `showToast` khi dùng `MathOcrUploader`
- `src/utils/promptBuilder.ts` — sửa import type `Settings`

(Lưu ý đường dẫn: `MathOcrUploader.tsx` nằm ở `features/testing/`, `promptBuilder.ts` ở `utils/` — KHÔNG phải `features/creator/` hay `lib/` như một số tài liệu cũ ghi sai.)

#### Tồn đọng — CHƯA fix

**P3 — Gemini API quota**:
- Trong phiên test local, Gemini free tier bị hết quota (lỗi 429 RESOURCE_EXHAUSTED + 503 UNAVAILABLE). Đây là lý do soạn giáo án thất bại khi test, không phải lỗi code.
- Giải pháp: Nâng lên Gemini paid tier hoặc dùng API key khác khi test nặng.

---

### 1.1 Cập nhật phiên 2026-06-15 & 2026-06-16 — Hoàn tất Native OMML Export, Fix Markdown & Lập Workflow Mới
- **Quản trị rủi ro & Workflow Agent**:
  - Đã thêm Superpower Skill mới tại `.agents/skills/strict-approval-workflow/SKILL.md`.
  - **Quy tắc mới bắt buộc**: Mọi Agent trước khi code sửa lỗi/thêm tính năng phải phân tích 4 yếu tố (Rủi ro, Ảnh hưởng chéo, Ưu điểm, Nhược điểm) và **CHỜ** user phê duyệt bằng "magic word" (vd: "code đi") mới được phép viết code.
- **Nâng cấp Kiến trúc Export Word (Native OMML)**:
  - Loại bỏ hoàn toàn cơ chế cạo HTML/DOM cũ kỹ gây vỡ công thức Toán, giải quyết dứt điểm lỗi file Word rỗng khi không mở tab Preview.
  - Tích hợp thành công lõi render Word Native OMML (`renderWordCore.ts` sử dụng `mathml2omml` và `katex`) từ repo `edu-lesson-automation`.
  - Các tệp xuất Word giờ đây biến đổi trực tiếp Markdown/LaTeX thành Equation chuẩn của Microsoft Word (cho phép giáo viên chỉnh sửa số liệu, phương trình 100%).
- **Chuyển đổi hoàn toàn kiến trúc Export sang Local-first**:
  - Loại bỏ sử dụng API Server (`exportLessonViaAPI`) cho xuất Word/PDF, giải quyết triệt để lỗi Timeout 502/504 với giáo án dài (như mẫu Claude).
  - In PDF tại trình duyệt (`window.print()`) kèm clone thẻ DOM, xử lý `@media print` CSS cô lập nội dung, bảng PDF tỷ lệ vàng 3-3-4.
- **Xử lý Crash và Nâng cấp PPTX**:
  - **Xóa mã độc:** Xóa triệt để các thuộc tính `anim: { type: 'fade' }` không hợp lệ gây crash tiến trình `pptxgenjs`. Dọn dẹp dead code `renderFormulaToBase64`.
  - **Prompt Mới:** Cải tiến Prompt AI để tự động tách bảng 3 cột của giáo án, đưa hoạt động GV/HS xuống mục "Speaker Notes".
  - **Regression:** Bổ sung tham số kích thước `w, h` vào thuộc tính `addImage` trong `exportUtils.ts` để sửa lỗi Type Regression. Sửa lỗi thiếu field `cognitiveLevel` trong interface `ExamQuestion`.
- **Ổn định hệ thống sinh Bài học phân hoá (Adaptive Lesson)**:
  - **Regex cạo rác JSON**: Viết hàm bóc tách an toàn để loại bỏ các thẻ Markdown dư thừa (```json) trước khi `JSON.parse` trong các luồng `useLessonCreator`, `adaptiveFromLessonPlan`, và `personalizationEngine`, chống nổ Crash triệt để.
  - **Nới lỏng Schema (Fault-tolerance)**: Hạ cấp toàn bộ các rule Validation khắt khe (phải có đúng 5 câu pre-test, 3 mục tiêu...) từ `error` xuống `warning` trong `validateAdaptiveContentJson`. Từ nay hệ thống sẽ tận dụng kết quả AI và không còn "chặn đứng" toàn bộ bài học khi thiếu vài trường phụ.
- **Vá lỗi Hiển thị Markdown & Image Rendering (Hotfix)**:
  - Cập nhật hàm `cleanMarkdownOutput` để tự động chèn dòng trống trước bảng, cứu sống các giao diện bảng Markdown bị AI sinh thiếu dòng trống.
  - Tích hợp `krokiRender.ts` vào `renderWordCore.ts` để rasterize tự động các khối TikZ, Mermaid và thẻ `<svg>` thành ảnh PNG (`ImageRun`) khi xuất file `.docx`. Việc xuất Word không còn bị in ra mã code thô của sơ đồ nữa. Placeholder chỉ hiển thị khi có sự cố lấy ảnh.
  - Sửa lỗi sập giao diện (regression) từng khiến mã TikZ bị tuột ra ngoài bảng. Mọi đoạn code TikZ nay được gộp đúng vào trong ô của bảng bằng `<br/>`.
- **Nâng cấp Hệ thống Phiếu học tập & Bài tập về nhà (Worksheets)**:
  - **Sửa lỗi định dạng & thiết kế**: Đã loại bỏ hoàn toàn tính năng xuất phiếu học tập sang `.doc` (HTML cũ gây vỡ công thức Toán). Cả 2 loại phiếu (Tại lớp & Về nhà) nay đều xuất thẳng ra chuẩn `.docx` (dùng `exportToWordA4`) đảm bảo công thức Toán OMML hiển thị sắc nét.
  - **Prompt AI sư phạm chuẩn 2025**:
    - *Phiếu tại lớp*: Bắt buộc phân rã nội dung bài tập thành bảng 2 cột phân hóa (Cột A: Scaffolding có gợi ý từng bước; Cột B: Bỏ trống hoàn toàn cho học sinh tự bơi). Kèm theo khung WALT/WILF, khoảng trống dài `...............` để điền tay, và Vé ra cửa.
    - *Bài tập về nhà*: Bắt buộc xuất theo đúng ma trận 2025 (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận), kèm FAQ, lỗi sai thường gặp, đáp án chi tiết.
  - **Cập nhật UI Soạn thảo & Thư viện**: Đã loại bỏ nút "Hướng dẫn ôn tập" cũ và thay bằng 2 nút tách biệt "Tạo Phiếu học tập" và "Tạo Bài tập về nhà" trên thanh `CreatorToolbar` và màn hình `ViewPlanModal`.
- Các thay đổi này đã được test qua (`npm run test` 58/58) và chuẩn bị merge lên `main` thành công.

### 1.1 Kết luận nhanh
- Đã giải quyết toàn bộ 8/8 lỗi Export URGENT do người dùng báo cáo (PPTX, DOCX, PDF, Bài học phân hoá).
- Đặc biệt, DOCX đã hỗ trợ xuất Image thay vì mã code thô đối với các khối đồ họa TikZ/Mermaid/SVG.
- Hệ thống Export nay cực kỳ ổn định, an toàn và nhanh gọn (hoàn toàn chạy offline trên máy khách).
- Clone Template / Markdown Skeleton đã hoàn tất qua **Phase 2A → 2E**.
- Từ Phase 3A trở đi vẫn là **kế hoạch chưa code**.

### 1.2 Quy ước phối hợp
- Cline/code agent: audit code thật → code lát cắt nhỏ → chạy build/test → cập nhật HANDOFF → commit/push khi người dùng yêu cầu.
- Quy ước workflow mới từ người dùng: sau khi đã code/sửa ở local và cần đưa thay đổi lên repo, ưu tiên cập nhật trực tiếp lên `main`/merge vào `main` luôn; không giữ thay đổi ở nhánh phụ/PR lâu nếu người dùng không yêu cầu review riêng.
- Anti/Antigravity: QA độc lập/manual review. Không tự coi QA thủ công là xong nếu chưa có report Anti.
- Scope hiện tại chỉ cam kết **Markdown Skeleton**: heading / bảng / placeholder. Không hứa giữ 100% layout DOCX như font, margin, header/footer/logo.
- Draft/save trong quá trình AI sinh nên dùng soft validation. Export/final-save dùng confirm/hard warning; chỉ hard-block khi nội dung rỗng hoặc cấu trúc hỏng tới mức không export được.

---

## 2. Các phase Skeleton đã hoàn tất

### 2.1 Phase 2A — Clone Template / Skeleton MVP
**Mục tiêu**: lấy cấu trúc mẫu ở mức heading / bảng / placeholder và đưa vào prompt AI.

**Đã làm**:
- Thêm `src/lib/documentSkeleton.ts` với parser HTML/Markdown/text cho heading, bảng, placeholder.
- Mở rộng `TemplateFile.skeleton` trong `src/types.ts`, backward-compatible với template cũ.
- `src/utils/fileUtils.ts`: upload `sample`, `lesson_doc`, `test`, `matrix` tự sinh skeleton khi có text.
- `TemplatesTab.tsx` và `TestingTab.tsx`: preview skeleton MVP.
- `useLessonCreator.ts` và `examUtils.ts`: inject `MARKDOWN SKELETON BẮT BUỘC GIỮ` vào prompt.
- Soft validator sau khi AI sinh giáo án/đề.

**QA Anti**: PASS static review, build/typecheck, prompt integration, UI localhost, backward compatibility.

### 2.2 Phase 2B — Reliability & UX Hardening
**Mục tiêu**: tăng độ tin cậy validator và hiển thị rõ cho user.

**Đã làm**:
- Sửa đếm bảng từ đếm dòng có `|` sang nhận diện **cụm bảng liền kề** (`countMarkdownTableClusters`).
- `validateMarkdownAgainstSkeleton` trả về issue có cấu trúc: `level`, `type`, `message`.
- Có validation score 0.0–1.0.
- UI hiển thị issue theo badge/màu; preview read-only rõ hơn.
- Thêm `src/lib/documentSkeleton.test.ts` cover table cluster, structured issues, empty output, guardrail cases.

**Verification gần nhất**: unit tests, build, typecheck/lint, local/prod smoke và Puppeteer e2e đều PASS theo báo cáo phiên 2026-06-11.

### 2.3 Phase 2C — Manual Skeleton Editor
**Đã làm**:
- Thêm `recalculateSkeletonFromMarkdown` để parse lại skeleton sau khi giáo viên sửa markdown.
- Thêm handler state `updateTemplateFileSkeleton` trong `useAppState.ts`, truyền qua `App.tsx` xuống `TemplatesTab.tsx`.
- `TemplatesTab.tsx`: textarea edit skeleton, nút Lưu / Hủy / Khôi phục tự động.
- `TestingTab.tsx`: checkbox dismiss warning, reset sau mỗi lần sinh kết quả mới.
- Build PASS.

### 2.4 Phase 2D — Export / Final Save Guardrails
**Đã làm**:
- Thêm `getSkeletonGuardrailDecision` trong `documentSkeleton.ts`.
- Luồng quyết định: error → block; warning → confirm; draft → soft.
- `CreatorTab.tsx`: guardrail cho xuất PDF / Word / LaTeX.
- `TestingTab.tsx`: guardrail cho lưu Thư viện / tải PDF / xuất Word / xuất LaTeX.
- `guardrailUtils.ts` hỗ trợ xác nhận bằng SweetAlert2.
- Build/test PASS.

### 2.5 Phase 2E — RAG / Worksheet từ PDF-DOCX & Context Budget
**Đã làm**:
- Thêm `src/lib/contextBudget.ts` với `truncateToContextBudget(text, maxLength)` mặc định khoảng 30.000 ký tự.
- `useLessonCreator.ts`: cắt gọn `lessonDocs`, `distContent`; toast cảnh báo nếu bị cắt; prompt tách `<format_skeleton>` và `<reference_context>`.
- `examUtils.ts`: cắt gọn requirement dài và `testContent` trong audit mode.
- Build/test PASS.

---

## 3. File/code quan trọng cần biết

### Skeleton / template / guardrail
- `src/lib/documentSkeleton.ts`: parser, validator, scoring, table cluster, guardrail decision, recalc skeleton.
- `src/lib/documentSkeleton.test.ts`: unit/regression tests cho skeleton.
- `src/lib/contextBudget.ts`: cắt gọn context dài.
- `src/types.ts`: `TemplateFile.skeleton` và các type liên quan.
- `src/utils/fileUtils.ts`: đọc file upload và sinh skeleton.
- `src/utils/examUtils.ts`: prompt/validate đề thi.
- `src/utils/exportUtils.ts`, `src/utils/guardrailUtils.ts`: export và confirm guardrail.
- `src/hooks/useLessonCreator.ts`: prompt giáo án, validation, context budget.
- `src/hooks/useAppState.ts`: cập nhật skeleton vào state/Firestore.
- `src/components/tabs/TemplatesTab.tsx`: preview + manual editor skeleton.
- `src/components/tabs/TestingTab.tsx`: upload đề/matrix, skeleton warnings, dismiss, export guardrails.
- `src/components/tabs/CreatorTab.tsx`: export guardrails cho giáo án.

### Adaptive learning / student portal
- `src/pages/AdaptiveLessonBuilderPage.tsx`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/lib/adaptive/*`
- `src/lib/dewey/*`
- `firestore.rules`

### Module dự giờ Danielson (xem `docs/DU_GIO_DANIELSON.md`)
- `firestore.rules` — khối `MODULE DỰ GIỜ` ở CUỐI file (helper `emailTruong`/`laBGH`/`laQuanLy`/`choGVXemBienBan`, `match /duGio/`, `match /duGioGiaoVien/`)
- `firestore.indexes.json` — **nguồn sự thật cho index production** kể từ khi `firebase.json` có key `"indexes"`; thiếu khai báo = deploy sau sẽ xoá index đó
- `src/data/khungDanielson.ts` — 22 thành tố, rubric, trọng số
- `scripts/gan-vai-tro.ts` — gán claim `vai_tro` (chỉ chạy tay, app không tự gán)
- `tests/rules/duGio.rules.test.ts` + `vitest.rules.config.ts` — 28 ca, chạy bằng `npm run test:rules`
- `chấm điểm dự giờ/thamkhao-giao-dien.jsx.txt`, `thamkhao-xuat.ts.txt` — **file tham khảo, KHÔNG biên dịch**; giữ đuôi `.txt`, đổi lại `.ts` là `npm run lint` gãy

### Export/renderer/AI provider
- `api/render-word-core.ts`
- `src/utils/wordExportA4.ts`
- `src/utils/examWordExport.ts`
- `src/lib/gemini.ts`
- `api/gemini-relay.ts`
- `src/lib/aiProviders.ts`

### QA docs/tools
- `QA_TESTING_PROTOCOL.md`
- `.agents/skills/qa-testing/SKILL.md`
- `live_dom_test.js`

---

## 4. Verification commands nên chạy

```bash
npm run test
npm run build
npm run lint
npm run test:e2e
```

Kiểm thử `firestore.rules` (cần Firestore emulator → cần Java; PATH đôi khi chưa vào session hiện tại):

```powershell
$env:PATH = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin;$env:PATH"; npm run test:rules
```

Ghi chú:
- `npm run lint` trong repo hiện chạy TypeScript typecheck (`tsc --noEmit`).
- `npm run test` **cố ý loại** `tests/rules/**` để không fail trên máy chưa cài emulator; rules chạy riêng bằng `test:rules`.
- `test:e2e` dùng Puppeteer và cần dev/prod target sẵn sàng tuỳ cấu hình script.
- Vite chunk-size warning là warning cũ, không phải blocker nếu build exit code 0.

---

## 5. Roadmap tiếp theo

### 5.1 Phase 3A — Dynamic Simulation/Game HTML Sandbox (chưa code)
**Chỉ bắt đầu khi Skeleton/RAG đã ổn định.**

Yêu cầu an toàn bắt buộc:
- HTML/JS do AI sinh phải chạy trong `<iframe sandbox="allow-scripts">`.
- Không dùng `allow-same-origin` nếu không có lý do rất rõ.
- CSP nghiêm ngặt; không cho AI truy cập localStorage/sessionStorage/API hệ thống.
- Không chèn HTML/JS AI sinh trực tiếp vào DOM app chính.

Đề xuất lát cắt MVP:
1. Tạo renderer sandbox độc lập cho simulation HTML.
2. Thêm sanitizer/allowlist tối thiểu.
3. Test XSS regression.
4. Chỉ sau đó mới tích hợp vào lesson builder/student portal.

### 5.2 Phase 3B — SlideJ/PPTX, Handwriting, Offline/SCORM (chưa code)
Rủi ro chính:
- SCORM cần manifest XML chuẩn và test trên Moodle/Canvas trước rollout.
- PPTX/SlideJ cần xác định rõ renderer/export library, tránh phụ thuộc layout DOCX.
- Handwriting/OCR cần budget token/file-size và chính sách lưu dữ liệu học sinh.

### 5.3 `personalizationCache` — lỗ hổng ghi công khai (chưa vá, cần phiên riêng)

`firestore.rules` hiện để `match /personalizationCache/{cacheId} { allow read, write: if true; }` — **bất kỳ ai trên Internet, không cần đăng nhập, đều ghi đè được**.

Vì sao nghiêm trọng: `src/lib/adaptive/personalizationEngine.ts` dựng cacheKey = `${lesson.id}__${lesson.updatedAt}__${route}__${weakObjectiveIds}`. Mọi thành phần đều **đoán được** — `lesson.id` nằm trong URL cổng công khai, `updatedAt` đọc được từ `adaptiveLessons` (rule cho phép ẩn danh đọc khi `portalEnabled`), `route` chỉ có 3 giá trị, `weakObjectiveIds` liệt kê được. Người lạ tính đúng cacheKey rồi ghi đè **nội dung bài học mà học sinh sẽ đọc**. Không phải rác vô hại — là nội dung giảng dạy giả.

Vì sao không vá nhanh được: rule muốn kiểm "cache này thuộc bài đang bật cổng" thì phải `get()` sang `adaptiveLessons`. Nhưng **doc id của `adaptiveLessons` là `teacherId`**, còn `lesson.id` chỉ là field bên trong — cacheKey không chứa `teacherId` nên rule không có đường tra ngược. Vá đúng = **thêm `teacherId` vào document cache** (sửa cả `personalizationEngine.ts`), deploy code + rules đồng thời, và xử lý cache cũ thiếu field sẽ bị từ chối ghi.

Lớp chắn tạm gần như không rủi ro (client hiện tại đã ghi đúng 3 field này nên luồng học sinh ẩn danh không đổi) — **chưa áp dụng, chờ quyết định**:

```
allow read: if true;
allow create, update: if request.resource.data.keys().hasOnly(['lesson', 'createdAt', 'expiresAt'])
                      && request.resource.data.createdAt is number
                      && request.resource.data.expiresAt is number
                      && request.resource.data.expiresAt <= request.time.toMillis() + 8 * 24 * 60 * 60 * 1000
                      && request.resource.data.lesson is map;
allow delete: if false;
```

Chặn được bơm field lạ, doc vô hạn hạn dùng và xoá cache hàng loạt; **không** chặn được kẻ tấn công có chủ đích tính đúng cacheKey. Bản đầy đủ có `teacherId` phải làm ở phiên riêng, sau khi đọc kỹ luồng học sinh ẩn danh.

---

## 6. Nợ kỹ thuật / rủi ro còn cần chú ý

- ⚠️ **`lessonPlans` có `allow list: if request.auth != null`** — vì `list` là một nhánh của `read`, luật này cho BẤT KỲ ai đã đăng nhập liệt kê TOÀN BỘ `lessonPlans`, kể cả giáo án riêng tư của người khác (`allow read` chặt hơn ở dưới không cứu được, các luật là OR). Chưa sửa vì ngoài phạm vi phiên dự giờ, và sửa thì phải rà lại mọi query đang gọi. `duGio` cố ý KHÔNG sao chép kiểu này.
- ⚠️ **`firebase deploy --only firestore:indexes` xoá index không khai trong `firestore.indexes.json`.** Luôn đọc kỹ danh sách CLI hỏi xoá trước khi gõ Y. Thêm query `where(A) + orderBy(B)` mới thì phải khai index tương ứng.
- ⚠️ **`personalizationCache` cho ghi công khai** (`allow read, write: if true`) — chi tiết ở mục 5.3.
- ⚠️ **`firebase-tools` nằm trong devDependencies** (~300 gói) → Vercel cài khi build, build chậm đi. Cân nhắc gỡ, dùng `npx firebase-tools@15` cho `test:rules`.
- **Custom claim `vai_tro` chỉ được gán bằng `scripts/gan-vai-tro.ts` hoặc Firebase Console.** App KHÔNG BAO GIỜ được tự gán claim — làm thế là tự cấp quyền đọc đánh giá nhân sự.
- DOCX fidelity cao vẫn chưa thuộc scope Skeleton: header/footer/logo/font/margin có thể lệch.
- Build warning chunk lớn vẫn tồn tại; nên tối ưu sau khi các flow chính ổn định.
- Firestore rules/localStorage fallback không thay thế được backend security đầy đủ cho dữ liệu nhạy cảm.
- File upload TestingTab lịch sử có giới hạn ở một số luồng; cần QA bằng tài liệu thật.
- Export Word/PDF với SVG/LaTeX/native equation vẫn có các giới hạn cũ, xem test regression liên quan `wordExportA4` và exam export.

---

## 7. Production/Vercel checklist khi có lỗi

- Domain đúng: `https://giaoandewey.vercel.app`.
- Nếu API save lỗi:
  - GET trả 405: bình thường nếu route chỉ nhận POST.
  - POST 400: kiểm tra payload thiếu field.
  - POST 403: kiểm tra quyền/classCode/session.
  - POST 404: kiểm tra route Vercel/root directory.
  - POST 500: kiểm tra env vars Firebase Admin và logs Vercel.
- Vercel cần đúng Root Directory, env vars Firebase, Git settings và deployment mới nhất.

---

## 8. Lịch sử nén các mốc lớn trước Skeleton

- 2026-06-10: đánh giá chiến lược tích hợp — nên ưu tiên ổn định Skeleton trước game/simulation/SlideJ/offline.
- 2026-06-10: hoàn thiện Phase 2, tích hợp NVIDIA NIM và tối ưu performance.
- 2026-06-09: xử lý nợ kỹ thuật, cập nhật UI Phase 2 và dữ liệu thật cho lớp học.
- 2026-06-08: server-side Word/PDF export, visual aids, custom API, progress bar AI, UI/UX theo Google Stitch + Smart Matrix/AI Co-pilot.
- 2026-06-04: export giáo án Word/PDF theo “Mẫu claude”.
- 2026-05-30/28/27: hotfix QA cổng học tập phân hoá, batch fixes, GitHub Actions typecheck/dependencies, Firebase undefined, kiến trúc Hybrid PA2+PA1+PA3.
- 2026-05-25: refactor “Soạn đề kiểm tra”: DOCX import giữ ảnh/base64, Word `.docx` thật, UI A4, SVG prompt, PDF/print tối ưu.
- 2026-05-20: P0/P1/P2/P3 QA fixes, retest regression fixes và direct testing fixes.
- 2026-05-14: e2e production cho cổng học sinh, xác minh API save/progress và cấu hình Vercel.

---

## 9. Prompt ngắn cho agent tiếp theo

```text
Đọc HANDOFF.md trước. Trạng thái hiện tại:
- Pipeline soạn giáo án đã ổn định: Planning → Content → Format (3 bước). KHÔNG thêm Critic/Fix mà không test kỹ. KHÔNG áp Delegation/model-rẻ cho Planning/Content (đã revert).
- Build & typecheck PASS, 0 lỗi TypeScript. 3 lỗi TS cũ đã fix ở commit 5e2fa49 — đừng fix lại.
- Text-to-Slide vừa thêm (working tree, chưa commit) — CẦN test runtime bằng Gemini paid key trước khi tin tưởng.
- AI Grading ĐÃ CÓ SẴN (GradingTab.tsx + gradingUtils.ts) — đừng tạo mới.
- GeoGebra cần HTML Sandbox (Phase 3A) làm trước — chưa code.
- Gemini free tier hay bị 429 khi test nặng — dùng paid key.
- Phase 2A–2E Skeleton đã hoàn tất; Phase 3A trở đi chưa code.
- Module DỰ GIỜ Danielson: đã xong nền tảng rules/claim/dữ liệu (28 ca test xanh), CHƯA có UI (bước 7) và CHƯA deploy rules/index. Đọc `docs/DU_GIO_DANIELSON.md` trước khi đụng vào.
- KHÔNG "sửa cho xanh" ca 8 (canh cờ chính sách) và ca 17–18 (lưới an toàn lessonPlans) trong `tests/rules/duGio.rules.test.ts` — đọc comment trong file trước.
- Thêm query `where(A) + orderBy(B)` thì PHẢI khai index vào `firestore.indexes.json`, nếu không lần deploy index kế tiếp sẽ xoá mất index cũ.
QUAN TRỌNG: audit code thật trước khi tin HANDOFF/plan — tài liệu có thể drift. Xác minh file/dòng còn tồn tại trước khi sửa.
Quy tắc: code lát cắt nhỏ, chạy npm run build, cập nhật HANDOFF, commit/push khi người dùng yêu cầu. KHÔNG bao giờ xóa onStreamChunk khỏi ContentAgent.
```
