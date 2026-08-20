# Nghiên cứu & kế hoạch — Giao bài cho lớp, học sinh nộp bài, AI chấm đồng loạt

**Ngày**: 2026-08-20 · **Trạng thái**: bản khảo sát + đề xuất, CHƯA gõ dòng code nào.

Trả lời câu hỏi của owner: *"có làm được không?"* — **Làm được**, nhưng nút thắt không nằm ở code.
Tài liệu này ghi lại (1) app đã có sẵn những gì, (2) thiếu gì, (3) ba ràng buộc cứng, (4) phản biện
về phạm vi, (5) kế hoạch chia lô kèm tiêu chí nghiệm thu.

---

## 1. App hiện đã có gì — bằng chứng trong repo

Khoảng **60–70% động cơ đã tồn tại**. Cái thiếu là bộ xương nối chúng lại.

| Mảnh | Ở đâu | Tình trạng |
|---|---|---|
| Lớp học + danh sách học sinh | `src/components/tabs/ClassesTab.tsx` | Có. Lưu trong `userSettings/{uid}.classes` (một mảng) |
| Giao bài cho lớp | `ClassesTab.tsx::assignExam` | Có, nhưng chỉ là **copy link** đề thi online |
| Học sinh làm bài online | `src/pages/StudentExamPage.tsx` | Có. Vào bằng `/exam/:code`, **gõ tay tên + lớp**, không đăng nhập |
| Chấm trắc nghiệm phía server | `api/exam.ts` + `api/_exam-core.ts` | Có, đây là nguồn tin cậy về điểm |
| Chấm tự luận từng bài | `src/pages/TeacherGradingPage.tsx` | Có, giáo viên nhập điểm + nhận xét tay |
| **Chấm bài từ ảnh/PDF bằng AI** | `src/components/tabs/GradingTab.tsx` + `src/utils/gradingUtils.ts` | **Có, và mạnh**: OCR ảnh qua vision, chấm điểm, điểm mạnh/điểm yếu, kế hoạch cải thiện, chạy song song bằng worker pool, phát hiện chép bài, phân tích cả lớp |
| Học phân hoá + hồ sơ năng lực | `AdaptiveLearningTab.tsx`, `AdaptiveStudentPortalPage.tsx`, `studentLearningProfiles` | Có: chẩn đoán đầu vào → lộ trình riêng → theo dõi mức thành thạo |
| Bảo mật ghi ẩn danh | `firestore.rules` (24 KB, có bộ test emulator) | Có, khá chín |

Nói cách khác: **"máy kiểm tra bài tập về nhà" mà owner mô tả — ném bài vào, đọc, chấm chữa, chỉ ra
mạnh yếu — đã chạy được rồi**. Chỉ khác là hiện *giáo viên* phải tự tải file lên, và kết quả không
gắn với một học sinh cụ thể theo thời gian.

---

## 2. Thiếu gì

1. **Danh tính học sinh.** Hiện học sinh chỉ là **chuỗi tên gõ tay**. Báo cáo lớp khớp bài nộp bằng
   cách so tên lớp viết thường (`ClassesTab.tsx::showClassReport`). Gõ "12A1 " thừa dấu cách là bài
   biến mất khỏi báo cáo. Không có tài khoản, không có mật khẩu, không có "lớp của tôi".

2. **Đối tượng "bài được giao" chưa tồn tại thật.** `ClassAssignment` chỉ là phần tử trong mảng nằm
   trong document cài đặt của giáo viên. Học sinh **không có quyền đọc** document đó, nên không thể
   có màn hình "bài của tôi".

3. **Học sinh không nộp được bài viết tay.** Muốn AI chấm ảnh chụp vở thì hiện phải là giáo viên
   ngồi tải 40 file lên tab Chấm bài.

4. **Không có hồ sơ dọc theo thời gian.** `GradingSession` là các phiên rời rạc. Không có bảng "em A
   đã học gì, yếu chỗ nào, tiến bộ ra sao".

5. **Chỗ lưu lớp học sai kiến trúc.** Cả lớp nằm trong một mảng của `userSettings/{uid}`. Mỗi lần
   thêm học sinh là ghi đè cả mảng, và không thể cấp quyền đọc cho học sinh ở mức từng người.

---

## 3. Ba ràng buộc cứng — đây mới là chỗ quyết định

### 3.1. Ai giữ khoá AI, ai trả tiền — nút thắt lớn nhất

Quyết định ngày **2026-07-21** (ghi trong `src/lib/aiProviders.ts:44`): **bỏ hẳn key dự phòng và xoá
luôn relay**. Giáo viên tự nhập khoá, và **học sinh cũng tự nhập khoá riêng**
(`src/lib/adaptive/studentAiKey.ts`).

Hệ quả nếu giữ nguyên mô hình đó:

- Chấm 40 bài ảnh = **40 lượt gọi vision từ trình duyệt giáo viên**. Đóng tab là dừng giữa chừng.
- Học sinh muốn AI phản hồi ngay trong cổng của mình thì **phải tự đi lấy khoá Gemini**. Với học
  sinh phổ thông, và nhất là với "con" trong ý tưởng ban đầu, việc này gần như không xảy ra.

Đây **không phải vấn đề code**. Đây là câu hỏi ai trả tiền, và nó phải được chốt trước khi thiết kế.

> **QUYẾT ĐỊNH 2026-08-20 — owner chốt: dựng lại đường server, khoá dùng chung do owner trả.**
>
> Đảo lại quyết định 2026-07-21, nhưng **giới hạn phạm vi**: đường server mới chỉ phục vụ luồng
> chấm bài và phản hồi cho học sinh. Các luồng soạn giáo án, nâng cấp, dự giờ của giáo viên vẫn
> giữ nguyên "tự nhập khoá của mình".
>
> Ba hệ quả bắt buộc kèm theo, vì owner gánh chi phí token:
>
> - **Chặn lạm dụng là điều kiện bắt buộc, không phải tính năng thêm.** Giới hạn theo lớp, theo
>   học sinh, theo ngày. Bài học cũ đã rõ: cổng mở không kiểm soát vừa cạn quota vừa bị dò quét.
> - **Chỉ tài khoản có danh tính hợp lệ mới gọi được.** Nghĩa là lô 1 và lô 2 phải xong trước lô 3,
>   không đảo thứ tự.
> - **Chấm chạy nền, có hàng đợi.** Đóng tab vẫn phải xong — đây chính là lý do chọn hướng server.

### 3.2. Trần 12 Vercel Function

Đang dùng 7 endpoint thật: `exam`, `export-lesson`, `render-word`, `adaptive-progress`,
`adaptive-progress-profile`, `generate-simulation`, `health/firebase-admin`. Còn dư ít nhất 3 khe.
Đủ cho kế hoạch này nếu gộp endpoint theo action, **không** đủ nếu mỗi việc một file.

### 3.3. Firestore rules là mặt phẳng bảo mật duy nhất, và đang có 3 lỗ hổng đã biết

HANDOFF ghi rõ ba lỗ chưa vá: `personalizationCache` ghi tự do, `lessonPlans` liệt kê được của người
khác, `adaptiveLessons` đọc được của đồng nghiệp. Cho học sinh đăng nhập là **mở rộng bề mặt tấn công
lên nhiều lần**, mà bài nộp, điểm số và nhận xét về một đứa trẻ là dữ liệu nhạy cảm.

Ngoài ra Firebase Auth của dự án hiện chỉ bật **Google + ẩn danh**. Bắt học sinh cấp 2 dùng Gmail là
vừa phiền vừa vướng quy định về tài khoản trẻ em.

---

## 4. Phản biện phạm vi — trong yêu cầu đang có HAI sản phẩm

**Owner đang hỏi:** nâng cấp thành Azota (giao bài cho lớp, học sinh đăng nhập, AI chấm đồng loạt),
và đồng thời làm "máy kiểm tra bài tập về nhà của con".

**Câu đó ngầm giả định:** hai thứ là một hệ thống.

**Thực tế chúng khác nhau ở ràng buộc:**

- **Sản phẩm A — lớp học.** Một giáo viên, 40 học sinh. Ràng buộc là danh tính, công bằng khi chấm,
  chống gian lận, bảo mật dữ liệu trẻ em. Đắt nhất ở phần *không phải AI*.
- **Sản phẩm B — máy chấm bài về nhà.** Một phụ huynh, một đứa trẻ. Không cần lớp, không cần chống
  gian lận, không cần đăng nhập phức tạp. Giá trị nằm ở *chất lượng chấm chữa và hồ sơ tích luỹ*.

**Nếu giả định đó sai thì:** ta sẽ xây xong hệ thống lớp học đầy đủ rồi mới phát hiện thứ owner thật
sự thích — cái máy ném bài vào là ra kết quả — vốn đã gần chạy được từ đầu.

**Cách đặt lại vấn đề:** hai sản phẩm dùng **chung một bộ xương** là *hồ sơ học sinh tích luỹ*: học
sinh → bài được giao → bài nộp → kết quả chấm → điểm mạnh yếu theo thời gian. A và B chỉ khác nhau ở
**cửa vào**. Xây bộ xương trước, rồi mở hai cửa.

> **LÀM RÕ 2026-08-20 — owner chốt: một cổng, hai cửa vào.**
>
> Cổng học sinh không phải trang nộp bài, nó là **dashboard cá nhân**: vào là thấy bài được giao,
> bài đã làm, điểm, nhận xét, hồ sơ mạnh yếu, và bài luyện theo mục tiêu.
>
> Điều này giải quyết luôn câu "hai sản phẩm hay một". **"Máy chấm bài về nhà" chính là nút "Nộp bài
> tự do" nằm ngay trong dashboard đó.** Cùng một đường chấm, cùng một hồ sơ. Khác nhau chỉ ở chỗ bài
> đến từ giáo viên giao hay từ chính học sinh ném vào.
>
> Hệ quả: **hồ sơ tích luỹ không còn là việc làm sau**. Nó là thứ dashboard hiển thị, nên mô hình dữ
> liệu ở lô 1 phải có nó ngay từ đầu, không chắp vá sau.

**Câu của owner, ánh xạ sang từng lô:**

| Owner viết | Lô |
|---|---|
| "ném bài vào là nó đọc, chấm chữa" | Lô 3 |
| "lên bài bổ trợ" · "luyện đề theo mục tiêu" | Lô 5 |
| "lưu thông tin tất cả những gì con học — con yếu — con giỏi" | Lô 4 |
| "theo dõi quá trình học" | Lô 2 (dashboard) + Lô 4 |
| "báo cáo cho bố mẹ thầy cô" | Lô 6 |

**Nếu chỉ được làm 20% khối lượng, làm gì để giữ 80% giá trị:** lô 1 → lô 2 → lô 3. Học sinh đăng
nhập, thấy bài, nộp ảnh, nhận điểm và nhận xét. Đó đã là một sản phẩm dùng được. Bốn thứ hoãn được:
bài bổ trợ tự động, luyện theo mục tiêu, báo cáo phụ huynh, chống gian lận.

---

## 5. Kế hoạch chia lô

### Lô 1 — Bộ xương dữ liệu ✅ XONG 2026-08-20 (chưa deploy)

Đưa lớp học ra khỏi `userSettings` thành các collection thật:

- `classes/{classId}` — thuộc về `teacherId`, có `joinCode` để học sinh vào.
- `classes/{classId}/students/{studentId}` — tên, mã HS, mã PIN đã băm.
- `assignments/{assignmentId}` — bài được giao: loại (đề online / nộp ảnh), hạn nộp, lớp nhận.
- `submissions/{submissionId}` — gắn `studentId` + `assignmentId`, chứa ảnh/file và kết quả chấm.
  `assignmentId` để rỗng nghĩa là **bài học sinh tự nộp**, không phải bài được giao.
- `studentProfiles/{studentId}` — hồ sơ tích luỹ: mức thành thạo theo chủ đề, kèm **danh sách bài
  làm bằng chứng** cho mỗi chủ đề. Có ngay từ lô 1, vì dashboard ở lô 2 đọc thẳng từ đây.

Kèm rules mới và **test emulator viết cùng lúc**, theo đúng bài học 2026-08-04: test bảo mật xanh ngay
lần đầu là dấu hiệu đáng nghi, phải thử đột biến rules để chứng minh test có răng.

Nghiệm thu: `npm run test:rules` xanh; ca "học sinh lớp khác đọc bài nộp" → DENY; ca "học sinh sửa
điểm của chính mình" → DENY; dữ liệu lớp cũ trong `userSettings` di trú không mất.

**Kết quả thực tế:**

- `tests/rules/lopHoc.rules.test.ts` — 35 ca, chạy trên emulator. Toàn bộ 220 ca rules của repo xanh.
- **Đã kiểm bằng đột biến**: vá hỏng 4 chỗ trong rules → đúng 6 ca chuyển đỏ, gồm cả ba hàng rào
  chính (PIN, bài nộp lớp khác, sửa điểm). Test có răng thật, không phải xanh vì request sai định dạng.
- `src/lib/classroom/` — `types.ts`, `joinCode.ts`, `migrateLegacyClasses.ts`, `classroomService.ts`,
  9 unit test cho phép chuyển và mã vào lớp.
- 5 index mới khai trong `firestore.indexes.json` cùng lúc với query (12 → 17).
- Dải nhắc "N lớp chưa đồng bộ" trong tab Lớp học, có nút chạy phép chuyển. Mảng cũ giữ nguyên.

**CÒN LẠI trước khi dùng được:** `firebase deploy --only firestore:rules,firestore:indexes`.
Chưa deploy thì mọi thao tác lên các collection mới đều `permission-denied` — đã kiểm là app bắt
lỗi gọn, không vỡ. Khi deploy nhớ ĐỌC danh sách CLI hỏi xoá index, đừng gõ Y theo phản xạ.

**Nợ kỹ thuật đã biết:** xoá lớp / xoá học sinh hiện chỉ xoá ở mảng cũ. Sau khi phép chuyển chạy
thật, phải xoá cả document trên Firestore — làm ở lô 2, khi collection mới thành nguồn sự thật.

### Lô 2 — Cổng học sinh: đăng nhập + dashboard cá nhân

Đây là mặt tiền của cả sản phẩm, không phải một trang phụ.

**Đăng nhập** — hai hướng, chọn một (xem mục 6):

- **Nhẹ**: link lớp + chọn tên trong danh sách + mã PIN 4 số do giáo viên phát. Không cần tài khoản
  Firebase, bảo vệ bằng rules theo đúng cách `examSubmissions` đang làm.
- **Nặng**: tài khoản thật, giáo viên tạo hàng loạt, đăng nhập bằng mã lớp + mã HS + mật khẩu qua
  custom token (thêm 1 Vercel function). Đổi lại được quyền chặt hơn và học sinh dùng được nhiều thiết bị.

**Dashboard** — bốn khối, dựng theo phác thảo đã duyệt:

1. **Bài được giao** — chưa nộp, sắp hết hạn, quá hạn. Mỗi bài một nút hành động.
2. **Bài đã chấm** — điểm, nhận xét viết cho học sinh đọc, và bài bổ trợ nếu có.
3. **Hồ sơ của em** — "em đang vững" và "nên luyện thêm", đọc từ `studentProfiles`.
4. **Nộp bài tự do** — cửa vào của luồng "máy chấm bài về nhà", nằm ngay trên dashboard.

Vì học sinh quay lại nhiều lần trên cùng một thiết bị, phiên đăng nhập phải **nhớ được nhưng khoá lại
được**: máy chung của gia đình hoặc điện thoại chuyền tay không được để em này mở ra thấy hồ sơ em kia.

Nghiệm thu: học sinh mở link trên điện thoại, thấy đúng bài và hồ sơ của mình, không thấy của bạn
khác; đăng xuất rồi vào lại phải nhập PIN; giáo viên thu hồi quyền một em thì em đó mất truy cập ngay.

### Lô 3 — Nộp bài bằng ảnh + AI chấm đồng loạt

- Học sinh chụp ảnh bài viết tay, upload lên Firebase Storage. Đường này đã có sẵn trong
  `AdaptiveStudentPortalPage`.
- Giáo viên bấm "Chấm cả lớp" → **một Vercel function mới** nhận danh sách bài nộp, dùng khoá dùng
  chung của owner, chấm chạy nền rồi ghi kết quả vào `submissions/{id}`: điểm, điểm mạnh, điểm yếu,
  hướng cải thiện.
- **Tách logic chấm ra dùng chung**, theo đúng cách `api/_exam-core.ts` đang làm với `api/exam.ts`:
  prompt và bộ đọc kết quả trong `gradingUtils.ts` phải là một nguồn sự thật cho cả đường client cũ
  lẫn đường server mới. Không chép prompt sang hai nơi — bài học `schoolFormLayout` đã trả giá cho việc đó.
- **Đường thứ hai — học sinh tự nộp bài** ("máy chấm bài về nhà"): cùng function, cùng prompt, chỉ
  khác là `assignmentId` rỗng và người gọi là học sinh chứ không phải giáo viên.
- **Chặn lạm dụng nằm ngay trong function này**: đếm lượt theo lớp, theo học sinh và theo ngày, từ
  chối khi vượt ngưỡng. Đường học sinh tự nộp là đường **dễ đốt tiền nhất** — một đứa trẻ chụp 50 tấm
  ảnh trong một buổi tối là chuyện bình thường — nên ngưỡng riêng của nó phải chặt hơn đường lớp học.

Nghiệm thu: một lớp 5 học sinh giả lập, nộp 5 ảnh, bấm một nút rồi **đóng tab** — quay lại vẫn thấy
cả 5 có điểm và nhận xét; một bài lỗi mạng thì 4 bài kia vẫn xong và bài lỗi hiện trạng thái `error`
để chấm lại; gọi vượt ngưỡng thì bị từ chối và có thông báo tiếng Việt rõ ràng.

### Lô 4 — Hồ sơ học tập tích luỹ

- Mỗi lần chấm xong, rút điểm yếu thành **thẻ chủ đề** gắn vào `studentProfiles`, **kèm bài làm
  làm bằng chứng**. Không có bằng chứng thì không được ghi vào hồ sơ.
- Khối "Hồ sơ của em" trên dashboard chuyển từ dữ liệu giả sang dữ liệu thật.
- Trang giáo viên: tiến độ theo thời gian, chủ đề yếu lặp lại của cả lớp.

Nghiệm thu: sau 3 bài nộp, hồ sơ chỉ đúng chủ đề yếu **lặp lại**, không phải mọi lỗi vặt; bấm vào một
chủ đề yếu thì xem được đúng những bài làm đã tạo ra kết luận đó.

### Lô 5 — Bài bổ trợ và luyện theo mục tiêu

- Từ chủ đề yếu trong hồ sơ, sinh bài luyện — **tái dùng động cơ phân hoá đã có**
  (`personalizationEngine.ts`, `diagnosticEngine.ts`) chứ không viết mới.
- "Luyện theo mục tiêu": học sinh hoặc phụ huynh chọn đích (vd. kiểm tra giữa kỳ), hệ thống xếp
  thứ tự chủ đề cần luyện.

Nghiệm thu: em yếu "phương trình đường thẳng" nhận đúng bài về chủ đề đó, không nhận bài ngẫu nhiên.

### Lô 6 — Báo cáo cho bố mẹ và thầy cô

- Một trang tóm tắt cho mỗi học sinh: đã làm gì, tiến bộ ra sao, đang vướng đâu, nên làm gì tiếp.
- Xuất PDF bằng đường xuất đã có sẵn trong repo.
- **Hai bản văn cho cùng một dữ liệu**: bản cho học sinh đọc và bản cho người lớn đọc. Cách viết
  "em nhầm dấu ở câu 5" khác hẳn "em này chưa vững quy tắc dấu khi thay toạ độ".

Nghiệm thu: phụ huynh mở link chỉ thấy con mình; báo cáo không chứa câu nào không truy được về một
bài làm cụ thể.

---

## 5b. Ràng buộc xuyên suốt — đây là hồ sơ đánh giá một đứa trẻ

Cái đang xây không phải bảng điểm. Nó là **hồ sơ tích luỹ về năng lực của một đứa trẻ**, do AI viết,
và bố mẹ lẫn thầy cô đều đọc. Repo này đã trả giá một lần cho đúng loại vấn đề đó ở lô dự giờ
Danielson. Ba hàng rào chuyển thẳng sang đây:

- **Điểm AI là đề xuất, không phải kết luận.** OCR một trang vở viết tay chụp thiếu sáng sai là
  chuyện thường. Sai một bài thì chỉ mất một điểm; sai rồi **ghi vĩnh viễn vào hồ sơ** thì thành
  "em này yếu phần đó" và sai đó tự nhân lên qua bài bổ trợ. Vì vậy vào hồ sơ phải qua cửa giáo
  viên duyệt, hoặc ít nhất phải sửa lại được và luôn hiện bài làm gốc.
- **Mọi kết luận phải truy được về bằng chứng.** Không ghi "em yếu hình học" nếu không chỉ ra được
  bài nào dẫn tới nhận định đó. Ô trống là dữ kiện, không phải chỗ để AI điền cho đầy.
- **Cùng một dữ liệu, hai cách viết.** Học sinh đọc bản của mình mỗi ngày. Bản cho trẻ nói về việc
  cần làm tiếp; bản cho người lớn nói về mức độ. Đừng đưa nguyên văn bản người lớn cho trẻ đọc.

---

## 6. Ba câu chốt kiến trúc — trạng thái

1. **Ai trả tiền AI khi chấm cả lớp?** → **ĐÃ CHỐT 2026-08-20**: dựng lại đường server, khoá dùng
   chung do owner trả, phạm vi giới hạn ở luồng chấm bài. Chi tiết ở mục 3.1.
2. **Học sinh vào bằng cách nào?** → *Giả định đang dùng*: link lớp + chọn tên trong danh sách + PIN
   4 số, không tạo tài khoản Firebase. Owner chưa bác. Đổi sang tài khoản thật sau này rẻ, vì lô 1
   đã tách danh tính học sinh thành document riêng.
3. **"Bài" là gì?** → *Giả định đang dùng*: ảnh chụp bài viết tay là đường chính, đề trắc nghiệm
   online là đường phụ đã có sẵn.
4. **Cổng học sinh là gì?** → **ĐÃ CHỐT 2026-08-20**: dashboard cá nhân, không phải trang nộp bài.
   Kéo theo việc hồ sơ tích luỹ phải có trong mô hình dữ liệu ngay từ lô 1. Chi tiết ở mục 4 và lô 2.

---

## 7. Kết luận

Làm được, và không phải làm lại từ đầu — phần khó nhất về AI đã chạy.

Rủi ro thật nằm ở ba chỗ: **ai trả tiền cho AI**, **bảo mật dữ liệu học sinh**, và **cám dỗ xây hai
sản phẩm cùng lúc**. Cả ba đều là quyết định của owner, không phải vấn đề kỹ thuật.

Sau quyết định 2026-08-20, rủi ro số một đổi hình: không còn là "chấm dở dang" mà là **hoá đơn token
của owner**. Vì vậy thứ tự lô không được đảo — danh tính học sinh (lô 1, lô 2) phải xong trước khi mở
đường server chấm bài (lô 3), nếu không sẽ có một cổng mở tiêu tiền của owner mà không biết ai gọi.
