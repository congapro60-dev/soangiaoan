# BÁO CÁO QA PRODUCTION — CỔNG HỌC SINH & TẠO SLIDE

**Ngày kiểm thử:** 21/07/2026  
**Môi trường:** `https://giaoandewey.vercel.app`  
**Bản production đã kiểm:** commit `1fce655` (sau khi sửa lỗi deploy Vercel)  
**Mục đích:** Bàn giao cho Claude Code nghiên cứu nguyên nhân, sửa lỗi và chạy lại regression.

> Báo cáo không chứa API key thật. Các key Gemini đã dùng khi QA nên được xoay lại sau phiên kiểm thử.

## 1. Kết luận nhanh

| Hạng mục | Trạng thái | Kết luận |
|---|---|---|
| Deploy production sau khi bỏ relay | PASS sau khi sửa | Commit `1fce655` đã gỡ cấu hình Vercel còn trỏ tới function bị xóa. |
| Ô API key tại cổng học sinh | PASS | Hiển thị đúng, link đúng, lưu được và còn sau F5. |
| Test đầu giờ và phân tuyến | PASS | Hoàn thành test, vào tuyến Nâng cao, Dewey iframe hiển thị bình thường. |
| Chấm ảnh bài làm bằng AI | **BLOCKED / FAIL** | Toàn bộ UI upload/chấm ảnh không thể truy cập trong kiến trúc render production hiện tại. |
| Tạo Slide từ văn bản thô | PASS | Gemini key cá nhân tạo được bản thảo 8 slide. |
| Tải và mở PPTX | PASS | File hợp lệ, render được, không phát hiện overflow. |
| Tiêu đề bìa PPTX | **FAIL nhỏ** | Bìa ghi `baigiang`, không dùng tiêu đề bài học được AI tạo. |
| Số trang preview so với PPTX | **Không nhất quán** | Preview báo 8 trang nhưng PPTX có 9 trang do exporter tự thêm bìa. |

**Trạng thái nghiệm thu tổng:** Chưa duyệt release hoàn toàn vì lỗi chặn ở tính năng chấm ảnh cổng học sinh.

---

## 2. Lỗi còn tồn tại

### ISSUE-01 — P1/BLOCKER: UI upload và chấm ảnh AI không được render

#### Hiện tượng

Sau khi học sinh hoàn thành Test đầu giờ và vào bài học theo tuyến, giao diện chỉ hiển thị bài Dewey trong iframe. Không có worked example dạng React với các thành phần:

- `Chụp/tải ảnh bài làm viết tay`;
- ảnh xem trước;
- nút `Nhờ AI chấm ảnh tham khảo`;
- vùng phản hồi 4 dòng của Gemini;
- thông báo riêng khi thiếu API key.

Vì vậy không thể thực hiện hai test bắt buộc:

1. Có key hợp lệ → Gemini chấm ảnh và trả về 4 dòng phản hồi.
2. Không có key → hiển thị hướng dẫn nhập key thay vì lỗi mơ hồ.

#### Cách tái hiện

1. Mở `/adaptive-portal` trên production.
2. Nhập thông tin học sinh và API key hợp lệ.
3. Hoàn thành Test đầu giờ.
4. Vào bài học theo tuyến và đi tới worked example được cấu hình `responseMode: 'image_upload'`.
5. Quan sát: chỉ thấy bước Dewey dạng nhập văn bản; không thấy upload ảnh hoặc nút chấm ảnh.

#### Bằng chứng kỹ thuật

1. Stage bài học production chỉ render `deweyHtml` bằng iframe:
   - `src/pages/AdaptiveStudentPortalPage.tsx:1141-1152`.

2. Component đầy đủ cho worked example ảnh vẫn tồn tại nhưng không có nơi sử dụng:
   - định nghĩa `InteractiveWorkedExampleCard`: `src/pages/AdaptiveStudentPortalPage.tsx:1215`;
   - nhận biết ảnh bằng `example.responseMode === 'image_upload'`: dòng `1248`;
   - input file: dòng `1284-1296`;
   - nút chấm ảnh AI: dòng `1342-1357`.

3. Logic đọc ảnh và gọi Gemini vẫn tồn tại nhưng trở thành dead/unreachable flow:
   - `handleWorkedExampleImage`: `src/pages/AdaptiveStudentPortalPage.tsx:516`;
   - `handleGradeWorkedExampleImage`: dòng `558`;
   - `callStudentGemini` với ảnh: dòng `594-597`;
   - lỗi thiếu key được phân loại riêng: dòng `610-612`.

4. Adapter sang Dewey làm mất semantic của ảnh:
   - `src/lib/adaptive/adaptiveToDewey.ts:289-296` chỉ map worked example thành `prompt`, `inputPlaceholder`, `expectedKeywords`, `feedback`, `formulaToNote`;
   - không truyền `responseMode`, metadata ảnh, rubric hoặc callback/channels để gọi chấm ảnh.

5. Dữ liệu demo thực sự có case ảnh:
   - `src/lib/adaptive/sampleAdaptiveLesson.ts:501` có `responseMode: 'image_upload'`.

#### Nguyên nhân khả dĩ

Kiến trúc cổng học sinh đã chuyển sang Dewey iframe nhưng tính năng image grading vẫn nằm trong component React cũ. Adapter Dewey hiện chỉ hỗ trợ câu trả lời text, nên `responseMode: image_upload` bị hạ cấp âm thầm thành một bước text thông thường.

#### Hướng nghiên cứu/sửa đề xuất

Claude Code cần chọn một nguồn render duy nhất, tránh giữ hai implementation lệch nhau:

- **Phương án A:** mở rộng schema/renderer Dewey để hỗ trợ `image_upload`, sau đó dùng `postMessage` hoặc bridge có kiểm soát để parent React thực hiện upload, gọi Gemini và cập nhật phản hồi;
- **Phương án B:** render worked example ảnh bằng React bên ngoài/đan xen iframe và đồng bộ đúng unit hiện hành;
- bổ sung test chuyển đổi đảm bảo `responseMode: image_upload` không bị mất;
- xóa hoặc nối lại dead component/handlers sau khi chốt kiến trúc.

#### Tiêu chí nghiệm thu

- [ ] Worked example ảnh hiển thị input chụp/tải ảnh trên production.
- [ ] Chọn ảnh hợp lệ thấy preview; ảnh không hợp lệ và ảnh >5 MB có lỗi rõ ràng.
- [ ] Có key hợp lệ: nút chấm ảnh trả đúng 4 dòng `Điểm tham khảo / Nhận xét đúng / Lỗi cần sửa / Gợi ý bước tiếp theo`.
- [ ] Xóa `student-gemini-api-key-v1`: nút chấm ảnh hiển thị hướng dẫn nhập key rõ ràng.
- [ ] Không có key vẫn học, nộp bài text và xem lời giải bình thường.
- [ ] Không phát sinh request tới `/api/gemini-relay`.

---

### ISSUE-02 — P2: Slide bìa và tên file dùng fallback `baigiang`

#### Hiện tượng

Luồng `Tạo Slide nhanh từ Văn bản thô` nhận diện đúng bài **Định lý Pythagore** trong 8 slide nội dung, nhưng file tải về là `baigiang.pptx` và trang bìa chỉ ghi `baigiang`.

#### Cách tái hiện

1. Đăng nhập tài khoản giáo viên.
2. Cài Gemini key cá nhân.
3. Vào `Soạn giáo án` → `Tạo Slide nhanh từ Văn bản thô`.
4. Dán một giáo án có tiêu đề rõ ràng, tạo Slide rồi tải PPTX.
5. Mở trang bìa và kiểm tra tên file.

#### Bằng chứng kỹ thuật

- `TextToSlideModal` chỉ trả `slidesData` về `CreatorTab`, không trả/cập nhật tiêu đề bài:
  - `src/components/modals/TextToSlideModal.tsx:26-31`;
  - `src/components/tabs/CreatorTab.tsx:409-416`.
- Khi tải, `CreatorTab` dùng `props.currentPlan.title || 'baigiang'`:
  - `src/components/tabs/CreatorTab.tsx:103`.
- Exporter dùng cùng tham số `title` cho cả bìa và tên file:
  - bìa: `src/utils/exportUtils.ts:477-487`;
  - tên file: `src/utils/exportUtils.ts:601`.

#### Nguyên nhân khả dĩ

Luồng tạo nhanh không có giáo án hiện hành với `currentPlan.title`, đồng thời kết quả AI chỉ trả mảng slide. Vì vậy download luôn rơi về fallback `baigiang` dù slide đầu tiên đã có tiêu đề phù hợp.

#### Hướng sửa đề xuất

- Đổi contract của luồng tạo nhanh thành `{ title, slides }`; hoặc
- suy ra title an toàn từ metadata AI/slide nội dung đầu tiên trước khi gọi `downloadPPTX`;
- vẫn giữ `baigiang` làm fallback cuối cùng khi hoàn toàn không có title.

#### Tiêu chí nghiệm thu

- [ ] Bìa dùng tiêu đề bài học thực tế.
- [ ] Tên file được slug/sanitize từ tiêu đề bài học, không mặc định `baigiang.pptx` khi input có tiêu đề.
- [ ] Tiêu đề dài vẫn co font hoặc xuống dòng an toàn, không overflow.

---

### ISSUE-03 — P3/UX: Preview báo 8 trang nhưng PPTX có 9 trang

#### Hiện tượng

UI báo `Bản thảo Slide (8 trang)`, trong khi file PPTX render thành 9 trang: 1 bìa do exporter tự thêm + 8 slide nội dung.

#### Bằng chứng kỹ thuật

- Preview nhận và đếm mảng `slidesData` gồm 8 slide nội dung.
- `downloadPPTX` luôn gọi `pptx.addSlide()` tạo bìa trước khi duyệt nội dung: `src/utils/exportUtils.ts:477-478`.

#### Đề xuất

Chọn một cách diễn đạt nhất quán:

- UI ghi `8 slide nội dung + 1 trang bìa`; hoặc
- đưa bìa vào preview/count; hoặc
- không tự thêm bìa khi dữ liệu AI đã bao gồm cover.

#### Tiêu chí nghiệm thu

- [ ] Số trang UI và số trang thực tế được giải thích rõ, không gây hiểu nhầm.
- [ ] Không xuất hiện hai trang bìa nếu AI sau này sinh cover trong `slidesData`.

---

### ISSUE-04 — P3/QUALITY: Slide xuất ra chủ yếu là văn bản, thiếu hình minh họa

#### Hiện tượng

File QA mở và trình chiếu được, nhưng 8 slide nội dung đều dùng bố cục bullet đơn giản; không có hình minh họa được chèn vào slide. Đây không làm hỏng tiêu chí kỹ thuật hiện tại, nhưng chất lượng trình chiếu còn thấp so với kỳ vọng về bài giảng trực quan.

#### Ghi chú nghiên cứu

- Kiểm tra xem `visualSuggestion` hiện chỉ được ghi vào speaker notes hay có pipeline lấy/tạo ảnh thật.
- Không tự động chèn ảnh ngoài nếu chưa có quy tắc bản quyền, nguồn ảnh và fallback rõ ràng.
- Đây là cải tiến chất lượng, không nên chặn bản sửa ISSUE-01 và ISSUE-02.

---

## 3. Lỗi đã gặp và đã được sửa

### RESOLVED-01 — Deploy Vercel fail vì còn tham chiếu function đã xóa

#### Hiện tượng

Deploy commit `85b5a88` lỗi gần như ngay lập tức. Endpoint `api/gemini-relay.ts` đã bị xóa nhưng `vercel.json` vẫn còn cấu hình cho function này.

#### Sửa đã áp dụng

- Commit: `1fce655 fix(vercel): gỡ api/gemini-relay.ts khỏi vercel.json functions — build đang fail trên prod`.
- `vercel.json` hiện không còn tham chiếu `api/gemini-relay.ts`.
- Production deploy lại thành công và QA tiếp tục được.

#### Regression cần giữ

- [ ] `rg "gemini-relay" vercel.json api src` không còn tham chiếu runtime ngoài tài liệu lịch sử.
- [ ] Vercel production build thành công sau khi xóa function.
- [ ] Các tính năng giáo viên dùng key cá nhân, cổng học sinh dùng key học sinh.

---

## 4. Các phần đã PASS — cần regression sau khi sửa

### Cổng học sinh

- Ô `API key AI (để AI chấm bài & cá nhân hóa)` hiển thị đúng màu tím.
- Link lấy key trỏ tới `https://aistudio.google.com/apikey`.
- Bấm lưu hiện `Đã lưu ✓`.
- F5 vẫn còn key trong input nhờ localStorage.
- Hoàn thành 5 câu Test đầu giờ và vào tuyến Nâng cao.
- Cá nhân hóa bằng key học sinh chạy thành công.
- Dewey lesson iframe hiển thị; không có console error trong luồng đã đi.

### Luồng Slide giáo viên

- Gemini key cá nhân hoạt động.
- Tạo thành công 8 slide nội dung từ văn bản thô.
- File `C:\Users\ADMIN\Downloads\baigiang.pptx` có kích thước 121.466 byte, là ZIP/PPTX hợp lệ.
- Render thành công cả 9 trang.
- Automated overflow test: `Test passed. No overflow detected.`
- Kiểm tra trực quan: không có title bị cắt/tràn, không có text chồng lấn.
- Số bullet trên 8 slide nội dung: `4 / 3 / 4 / 4 / 4 / 3 / 4 / 3`; tất cả không quá 6.
- Không có console error khi tạo và tải file.

---

## 5. Rủi ro bảo mật/vận hành cần lưu ý

1. API key học sinh được lưu trong `localStorage` theo thiết kế. Đây là dữ liệu có thể bị đọc bởi JavaScript chạy cùng origin nếu có XSS. Cần giữ CSP, kiểm soát HTML động và tránh log/snapshot giá trị input.
2. Input `type=password` chỉ che khi hiển thị, không ngăn công cụ DOM hoặc script cùng trang đọc `value`.
3. Các API key thật đã dùng trong phiên QA nên được rotate sau kiểm thử. Không đưa key vào issue, screenshot, commit hoặc log.
4. Nếu một key được phát chung cho cả lớp, cần theo dõi quota/rate limit; đây là rủi ro vận hành chứ không phải lỗi code.

---

## 6. Thứ tự xử lý đề xuất cho Claude Code

1. **ISSUE-01:** khôi phục luồng image upload/grading trong kiến trúc Dewey và thêm test chống mất `responseMode`.
2. Chạy E2E cả hai nhánh có key/không key trên production hoặc preview deployment.
3. **ISSUE-02:** truyền đúng title từ Text-to-Slide sang preview/export.
4. **ISSUE-03:** làm rõ count slide và cover.
5. **ISSUE-04:** đánh giá riêng như cải tiến chất lượng, không trộn vào hotfix.
6. Chạy `npm test` và `npm run build`, sau đó render/kiểm tra lại PPTX.

## 7. Checklist đóng việc

- [ ] ISSUE-01 có test unit cho adapter và test E2E production.
- [ ] Chấm ảnh bằng key thật trả phản hồi 4 dòng.
- [ ] Thiếu key hiện đúng hướng dẫn và không gọi relay.
- [ ] ISSUE-02 có test title/file name cho Text-to-Slide.
- [ ] UI giải thích đúng số slide nội dung và bìa.
- [ ] PPTX mới mở được, không overflow, không slide nào quá 6 bullet.
- [ ] `npm test` pass toàn bộ.
- [ ] `npm run build` không có TypeScript/build error.
- [ ] Vercel preview/production deploy thành công.

