# V8.8 — ADAPTIVE STUDENT SURFACE & MOBILE / DESKTOP PARITY
## Bổ sung triển khai dành cho Codex — tối ưu điện thoại, bảo toàn giao diện laptop

**Version:** V8.8 Consolidation & Quality Hardening — Addendum `ASS-MDP-01`  
**Status:** `APPROVED_REQUIREMENTS_FOR_IMPLEMENTATION_PLANNING`; **chưa phải** bằng chứng đã triển khai hoặc đã kiểm thử runtime  
**Applies to:** Student View trên điện thoại, tablet và laptop; các điểm giao với Presenter/Coach  
**Does NOT:** thay thế Master V8.8; tạo lesson engine khác; thay V8.3.2 canonical IR; tự đổi giáo án; giảm chức năng laptop  
**Primary baseline:** `V8_8_CODEX_GUIDE_CONSOLIDATED.md` / `V8_8_CODEX_INTERACTIVE_LESSON_AUTHORING_IMPLEMENTATION_GUIDE.md` (revision Consolidation & Quality Hardening)  
**Related proposal:** `V8_8_MOBILE_FIRST_STUDENT_UX_PROPOSAL.md`  
**Priority:** P0 cho bảo toàn laptop và tương đương năng lực hoàn thành nhiệm vụ; P1 cho tối ưu nâng cao không ảnh hưởng mục tiêu.

> **Cách dùng:** Gửi file này **bổ sung** cho Codex đang làm V8.8. Đây là hợp đồng *giao diện và vận hành theo thiết bị*, không phải bộ sư phạm thay thế. Khi trùng nhau, giữ nguyên các invariant của V8.8; phần này làm rõ yêu cầu về adaptive rendering, khả năng hoàn thành hoạt động và regression test. Không tự suy diễn rằng các chức năng đã có chỉ vì được mô tả ở đây.

---

# 0. LỆNH THỰC THI NGẮN CHO CODEX — ĐỌC TRƯỚC

> Tiếp tục **codebase V8.8 hiện có**. Đọc Master V8.8 và file addendum này; không khởi tạo một dự án song song chỉ để làm giao diện mobile. **Giữ nguyên đầy đủ trải nghiệm Student View trên laptop**, đồng thời làm mobile responsive/adaptive cho điện thoại và tablet dựa trên cùng lesson/session/evidence. Trước code, lập UI inventory và desktop regression baseline, capability matrix theo thiết bị, audit responsive/state và kế hoạch kiểm thử. Triển khai theo diff nhỏ có test. Mỗi hoạt động được bật trong lesson phải hoàn thành được trên điện thoại hoặc có phương án thay thế tương đương về *mục tiêu và bằng chứng học tập*, được GV biết và chấp nhận. Kiểm tra chuyển thiết bị, mất mạng, bản nháp, upload, vai trò nhóm, peer review và ảnh/file. Không được báo Desktop/Mobile/Network E2E PASS nếu chưa chạy thật; nếu thiếu thiết bị hay backend phải báo NOT_RUN/BLOCKED.

---

# 1. QUYẾT ĐỊNH CỐT LÕI — MỘT BÀI HỌC, NHIỀU CÁCH HIỂN THỊ

```text
ONE CANONICAL LESSON
        │
ONE CLASS SESSION / ONE EVIDENCE MODEL / ONE SERVER AUTHORITY
        │
        ├── Student Mobile Adaptive Surface
        ├── Student Tablet Adaptive Surface
        └── Student Desktop Surface (PRESERVE EXISTING BEHAVIOR)

Presenter = shared teaching surface (separate role)
Coach     = teacher decision/operations surface (separate role)
```

**Bất biến:**

1. Không sinh ba bản lesson khác nhau cho ba loại thiết bị.
2. Không nhân đôi question ID, activity ID, bài nộp, rubric, vai nhóm hoặc danh tính HS theo thiết bị.
3. Mobile **không phải** phiên bản “giảm chức năng”; nó là cách **đổi bố cục và phương thức thao tác** để đạt cùng mục tiêu.
4. Laptop vẫn là **Student View hiện hành đầy đủ**; không buộc trở thành giao diện điện thoại phóng lớn.
5. GV vẫn kiểm soát Open/Lock/Reveal/Next/Extend/Reopen; việc HS đổi thiết bị không thay đổi quyền này.
6. `groupEvidence != individualEvidence`; thiết bị dùng chung không tự tạo bằng chứng cá nhân.
7. Không cắt nội dung, bỏ chứng minh/lập luận hoặc biến nhiệm vụ thành MCQ chỉ vì làm trên điện thoại.
8. Không cần cố tái tạo **giao diện pixel-perfect** giữa mobile và desktop; cần **functional/learning-outcome parity**.

---

# 2. PHẠM VI VÀ RANH GIỚI

## 2.1. Bao gồm

- Responsive/adaptive Student View theo vùng hiển thị thực.
- M1: Look-up/Remote Response; M2: On-phone Task; M3: Shared Group Workspace.
- QR/PIN/URL join; nhận diện/phiên; bản nháp/submit/reconnect.
- Toán học trên mobile (input, render, zoom, hình, ảnh bài giấy).
- Hoạt động nhóm/peer review, gợi ý, tự học 3 nhánh nếu bài kích hoạt.
- Màn đợi, Attention Handoff, phản hồi, sửa bài, Exit, Self-assessment.
- Chuyển thiết bị và xung đột hai phiên mở đồng thời.
- Accessibility, bảo mật, hiệu năng, kiểm thử thực tế và desktop regression.

## 2.2. Không bao gồm

- Không viết lại canonical IR V8.3.2.
- Không làm mobile app native bắt buộc hoặc phụ thuộc kho ứng dụng.
- Không thay kiến trúc Presenter/Student/Coach.
- Không đổi mục tiêu/câu hỏi/rubric theo màn hình nếu GV chưa duyệt.
- Không xây gamification tổng quát như game engine riêng.
- Không thêm AI runtime tạo bài/nghiệm toán chưa qua kiểm chứng.

## 2.3. Nguồn sự thật khi xung đột

1. Yêu cầu mới nhất của giáo viên đối với lớp/bài cụ thể.
2. Nguồn SGK/tài liệu và lesson đã được teacher-confirmed.
3. Master V8.8 đã hợp nhất — sư phạm, lesson, evidence, authority.
4. Addendum này — **chỉ** cho responsive/adaptive Student UX và thiết bị.
5. Mobile UX Proposal — tài liệu tham khảo/đề xuất chưa khóa.
6. Code cũ — baseline để giữ lại, không phải nguồn quyết định sư phạm.

---

# 3. DESKTOP PARITY — KHÓA BẢN LAPTOP TRƯỚC KHI SỬA MOBILE

Trước khi sửa component dùng chung, Codex phải khảo sát Student View hiện tại và lập **Desktop Behavior Inventory**:

| ID | Tính năng hiện tại | URL/route/component | Hành vi desktop trước sửa | Ảnh/video baseline | Bài test regression |
|---|---|---|---|---|---|
| D-01 | Vào phiên, chọn danh tính | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-02 | Câu hỏi, toán học, visual | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-03 | Nhập/lưu/gửi/sửa | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-04 | Gợi ý, phản hồi, thử thách | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-05 | Nhóm, vai, bài chung | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-06 | Kiểm tra chéo và file ảnh | điền từ repo | điền từ repo | cần ghi | cần tạo |
| D-07 | Exit, tự đánh giá, bước tiếp | điền từ repo | điền từ repo | cần ghi | cần tạo |

**No-regression contract:**
- Không làm mất nút/chức năng hiện có trên laptop.
- Không biến các vùng side-by-side desktop thành một cột mobile nếu màn còn đủ chỗ.
- Không giảm chất lượng đồ thị/hình, math input, preview file, rubric, lịch sử sửa hoặc group controls.
- Không làm keyboard shortcuts, mouse/pointer/scroll/focus hoạt động sai.
- Nếu sửa component dùng chung, regression test trên desktop chạy lại trong cùng pull request.
- Nếu UI desktop thật sự cần thay đổi vì lỗi accessibility/logic đã xác minh: ghi **change proposal** và đánh dấu `NEEDS_TEACHER_CONFIRMATION` trước khi thay; không lén sửa.

**Định nghĩa PARITY:**

```text
same learning goal
+ same authored task and answer/reveal policy
+ same valid evidence collection
+ same grading/feedback semantics
+ same session identity and submission history
+ same teacher authority
≠ same layout, same number of taps, same screen composition
```

---

# 4. ADAPTIVE LAYOUT CONTRACT — DÙNG VÙNG HIỂN THỊ THỰC

## 4.1. Đầu vào quyết định layout

- CSS viewport width và kích thước container chính (ưu tiên container khi có thể).
- Chiều ngang/dọc.
- Không gian do bàn phím ảo chiếm (khi trình duyệt cung cấp thông tin phù hợp).
- `pointer: coarse/fine`, hover và keyboard presence **như gợi ý về thao tác**, không dùng để xác định danh tính thiết bị.
- User override hợp lệ (ví dụ “Chế độ rộng” khi tablet/laptop cửa sổ nhỏ).
- Preferences: chữ lớn, giảm chuyển động, tăng tương phản, hệ điều hành nếu có.

Không dựa duy nhất vào user-agent hoặc tên hệ điều hành.

## 4.2. Các điểm thử bắt buộc (không xem là breakpoint duy nhất)

| Kích thước vùng Student | Kỳ vọng |
|---|---|
| 320px | Một cột; không tràn ngang; tap target và toán học dùng được |
| 360/375/390/430px | Điện thoại phổ biến, portrait, chữ rõ và submit không bị che |
| 568–932px landscape | Hình được tận dụng; không ép xoay mới làm được nhiệm vụ |
| 600–1023px | Tablet/desktop cửa sổ nhỏ; chuyển đổi vùng nội dung linh hoạt |
| ≥1024px | Giữ workspace laptop đã được xác minh; có thể dùng side-by-side |

Đây là kích thước **kiểm thử**, không phải lệnh `@media` cứng. Không giả định mọi điện thoại đều 390px hay laptop luôn trên 1024px.

## 4.3. Các invariant UI

- Chỉ cuộn ngang **cục bộ và có chỉ dẫn** cho biểu thức/matrix dài; không làm cả trang tràn ngang.
- Nội dung chính thường >=16px trên mobile; không giảm font đến mức khó đọc chỉ để tránh overflow.
- Tap target tối thiểu xấp xỉ 44×44 CSS px khi khả thi; khoảng cách giữa đáp án chống chạm nhầm.
- Nút chính dễ tìm ở cuối tác vụ nhưng **không che** câu hỏi/ô nhập khi bật bàn phím.
- Safe-area cho tai thỏ/thanh home iOS, mobile browser chrome; tránh footer fixed chiếm toàn màn.
- Lỗi/thành công không chỉ diễn đạt bằng màu hoặc animation.
- Screen reader đọc đúng nhãn và trạng thái; bàn phím ngoài truy cập các thao tác chính.
- `prefers-reduced-motion`: không bắt animation mới thấy đáp án, bước giải hoặc thông tin.
- Zoom 200%/chữ lớn không làm mất nút submit hoặc câu hỏi.

---

# 5. THREE STUDENT MODES — CÙNG DATA, KHÁC PRESENTATION

## M1 — NHÌN TV, TRẢ LỜI NHANH (LOOK-UP RESPONSE)

- Presenter có đề và hình lớn.
- Student có 2–6 vùng chọn lớn, **có nhãn/biểu tượng/chữ** chứ không chỉ màu A/B/C/D khi điều kiện học tập cần.
- Nút “Xem lại câu hỏi” hoặc bản tóm tắt/cách tiếp cận khác trên điện thoại: giải quyết trường hợp HS ngồi xa TV, không nhìn rõ, hoặc chỉ có màn cá nhân.
- Chỉ dùng M1 khi dạng nhiệm vụ phù hợp; không suy HS hiểu sâu từ một lựa chọn đúng.
- Khi đã nộp: trạng thái “Đã gửi. Cùng nhìn lên màn hình”, không tự lộ đáp án.

## M2 — LÀM BÀI TRÊN ĐIỆN THOẠI (ON-PHONE TASK)

- Một cột: yêu cầu → dữ kiện/hình → vùng nhập → nút gửi → phản hồi/hint khi được phép.
- Với lời giải dài: cho phép viết giấy và chụp ảnh hoặc nhập theo bước; không bắt gõ văn bản dài.
- Toán ngắn: contextual math keyboard cho mũ, phân số, căn, bất phương trình, cặp tọa độ,...; không ép nhập raw LaTeX.
- Xử lý trường hợp chưa đủ điều kiện cho camera: input chọn tệp/chụp qua picker; không giả định camera trực tiếp qua LAN HTTP.
- Hình quan trọng: mở toàn màn/zoom/pan; tránh crop sai logic Toán.

## M3 — LÀM VIỆC NHÓM (SHARED GROUP WORKSPACE)

Student luôn thấy được bốn phần, có thể là các section/tab hoặc accordion trên phone:

```text
NHIỆM VỤ CHUNG
PHẦN VIỆC CỦA TÔI
TIẾN ĐỘ NHÓM
SẢN PHẨM CHUNG
```

- Nút chọn vai hoặc **“Phân công giúp tôi”**; role-choice hết thời gian → auto theo lesson policy.
- Không hard-code bốn vai hoặc số HS; sử dụng grouping/coverage contracts sẵn có.
- Người làm một phần xong có thể xem nhóm đang thiếu điều gì, không tự sửa phần người khác nếu lesson không cho phép.
- Sản phẩm nhóm giữ đúng ý kiến và mâu thuẫn chưa giải quyết; renderer không tự kết luận toán thay nhóm.
- Cho phép **một điện thoại cho nhóm** khi không đủ thiết bị; khi đó sự đóng góp cá nhân phải gắn `evidenceStrength = GROUP_ONLY` trừ khi có chứng cứ độc lập.

**Mode không phải lesson archetype và không tạo engine riêng.**

---

# 6. MATH ON MOBILE — ĐÚNG TOÁN HỌC TRƯỚC ĐẸP

## 6.1. Bài tập Toán phải hỗ trợ cách nộp phù hợp

| Loại bằng chứng | Phone | Laptop | Ghi chú |
|---|---|---|---|
| Chọn/ghép/sắp xếp ngắn | Tap/chọn thẻ | Click/drag | Touch không phụ thuộc hover |
| Nhập số/biểu thức đơn giản | Contextual math keypad | Keyboard/math editor đầy đủ | Chuẩn hóa input không phá nghĩa |
| Lập luận 1–3 câu | Ô nhập rõ, auto-grow | Text/editor rộng | Không bắt nói thay nếu không phù hợp |
| Lời giải dài | Ảnh bài giấy hoặc nhập các bước | Soạn bước/ảnh/tệp | Ảnh là bằng chứng chưa được tự động xác minh |
| Bảng biến thiên/bảng số liệu | Table responsive/chế độ xem | Bảng đầy đủ | Không đổi thứ tự cột nghĩa Toán |
| Hình phẳng | Zoom/chọn điểm/annotation | Workspace đầy đủ | Geometry deterministic |
| Hình không gian | View xoay/pan nếu khả thi, có ảnh/hình chuẩn dự phòng | 3D controls rộng | Hạn chế 3D mobile phải có fallback |
| Đồ thị/hệ miền nghiệm | Zoom, chuyển layer, chọn điểm | Split-view/graph workspace | Không làm biến dạng trục/tỉ lệ |
| Review ảnh/PDF | Toàn màn/zoom, bình luận theo vị trí | Side-by-side | Không sửa ảnh gốc |

## 6.2. Mathematical semantics

- Biểu thức dài bị xuống dòng không được làm đổi phạm vi dấu căn/phân số/ngoặc.
- Đồ thị có tỉ lệ trục và đơn vị đúng; không bóp méo để vừa screen.
- Hình không gian/đường khuất/nét đứt giữ convention.
- Không dùng ảnh AI làm authoritative math diagram.
- Re-render responsive không làm reset tham số mô phỏng, chú thích, lựa chọn điểm, con trỏ hoặc bản nháp.
- Không hiển thị đáp án/layer kiến thức trước trạng thái Reveal được phép.

---

# 7. ATTENTION HANDOFF & STUDENT ACCESS

Tận dụng `LessonExperienceMap` / `AttentionHandoff` đã có; **không tạo hệ điều phối chú ý mới**.

Các trạng thái:

```text
LOOK_UP       — Cùng nhìn màn hình lớn
WORK_DEVICE   — Làm trên thiết bị
WRITE_PAPER   — Làm trên giấy
TALK_PEER     — Trao đổi với bạn
TALK_GROUP    — Thảo luận nhóm
WAIT_REVIEW   — Đã gửi, chờ thảo luận/chốt
```

Yêu cầu:
- Khi chuyển LOOK_UP, giữ draft và có lối **xem lại đề** nếu HS cần trợ năng/không thấy màn chiếu.
- Khi yêu cầu TALK_PEER/GROUP, lời nhắc giao tiếp ngoài đời thật; không ép chat trên máy.
- Khi chuyển lại WORK_DEVICE, quay về đúng vị trí nhập.
- Không chặn người học xem dữ kiện học tập cần thiết chỉ vì teacher focus trên Presenter; tách dữ kiện với đáp án/reveal riêng.
- Mỗi prompt trên giao diện phải là tiếng Việt tự nhiên.

---

# 8. KHÔNG LÀM MẤT BA NHÁNH SAU LUYỆN TẬP

Bảo toàn **Luyện thêm – Thử thách – Khám phá** của mục 27 V8.8, **không nhầm** với 3 nấc luyện tập Cơ bản – Vững chắc – Vận dụng sâu.

Trên phone: 3 thẻ/nút lớn có thể xếp dọc, mỗi thẻ nêu mục đích, thời gian, thao tác và kết quả mong đợi.

- `MORE_PRACTICE`: bộ biến thể đã authored/kiểm toán, không tự bịa đề tại runtime; cho HS chọn củng cố.
- `DEEP_CHALLENGE`: tăng chiều sâu bằng đổi điều kiện/đảo bài/phản ví dụ/chứng minh/khái quát.
- `EXPLORE`: mô phỏng/lịch sử/ứng dụng/biểu diễn khác có nguồn khi phù hợp.

Quy tắc:
- GV có thể mở/đóng; nhánh tùy chọn không được chiếm ngân sách recheck/Exit.
- Đang làm nhánh nào mà GV chuyển pha: lưu trạng thái nhánh, không xóa bài.
- Desktop giữ full branch cards/workspace hiện tại, không buộc theo phone stack.
- Nếu lesson không có một nhánh: **không tạo nút rỗng**; hiện những nhánh đã được authored hợp lệ.

---

# 9. JOIN / IDENTITY / SESSION — QR KHÔNG PHẢI XÁC THỰC

- QR/PIN/short URL phải dẫn đến URL **thật sự truy cập được từ điện thoại**: LAN IP/hostname dùng được hoặc HTTPS.
- `localhost`/`127.0.0.1` trên Presenter **không hợp lệ** cho mã QR gửi HS.
- Mã phòng để vào **không mặc nhiên xác thực danh tính cá nhân**. Nếu dùng tên hiển thị, giáo viên cần có bước nhận diện/xác nhận phù hợp.
- Hai HS trùng tên không được tự động nhập làm một người; một HS vào lại không được tạo thành hai học sinh trong thống kê.
- Session identity cần có `roomId`, `learnerId`/anonymous roster token đã xác minh, `clientInstanceId`, `serverSessionId`; token/PII không đưa vào URL công khai/log công khai.
- Phân biệt *người dùng* và *thiết bị*: cùng một learner có thể có nhiều client, không làm tăng sĩ số hoặc denominator.
- Late join không tăng hồi tố `completionRequiredSet` của câu đang mở nếu snapshot policy áp dụng.
- Đổi tên thiết bị/browser profile không tự chuyển quyền sở hữu bài cho người khác.
- Phân quyền đọc ảnh/file và feedback đúng chủ bài, reviewer được phân, GV; giới hạn URL tải file và thời gian truy cập.

---

# 10. ONE SOURCE OF TRUTH — CHUYỂN ĐIỆN THOẠI ↔ LAPTOP

## 10.1. Tách 4 cấp dữ liệu

1. **Server-authoritative:** lesson active phase, teacher locks/reveal, assignment, accepted submissions, group membership, versions, reviewer assignment.
2. **Local draft:** nội dung chưa gửi trên từng client; có thể offline, ghi trạng thái rõ.
3. **Pending action:** gửi/đánh dấu/sửa đang chờ xác nhận, có idempotency key.
4. **Transient UI:** vị trí cuộn, panel đang mở, zoom nếu cần; không ghi đè bằng chứng học tập.

## 10.2. Quy tắc tiếp tục ở thiết bị mới

- Khi vào cùng phiên với cùng learner đã xác thực, client mới tải **server version** và draft server-synced nếu hệ thống hỗ trợ.
- **Không hứa chuyển ngay bản nháp chỉ có ở localStorage của thiết bị cũ.** Nếu chưa đồng bộ lên server, thông báo rõ cần đồng bộ trước khi đổi; cho phép copy/export hoặc tiếp tục ở máy cũ.
- Nếu auto-sync draft có trong hệ thống, dùng version/revision để không ghi đè nội dung mới hơn của HS.
- Việc `SUBMITTED` phải ghi lên server với timestamp/version; xem trên máy khác đúng trạng thái đã xác nhận.
- Nếu có hai thiết bị đang chỉnh **cùng một response**, không áp dụng last-write-wins âm thầm. Có thể dùng single-writer lease hoặc optimistic concurrency với conflict UI. Chính sách chọn dựa trên codebase hiện tại, không tự xây engine đồng bộ mới nếu không cần.

## 10.3. Quy tắc xung đột đề xuất (optimistic concurrency)

```text
GET response → serverRevision = 12
PATCH draft with expectedRevision = 12
Server accepts → revision 13
Client B PATCH with expectedRevision = 12
Server rejects CONFLICT → B giữ local draft + hiển thị:
“Bài đã được sửa trên thiết bị khác. Xem cả hai phiên bản trước khi chọn.”
```

Đây là **mẫu hành vi**, không buộc dùng endpoint tên `PATCH draft`. Quan trọng là server không tự ghi đè.

## 10.4. Single Active Question, Teacher Override và gửi trùng

- Không tạo câu hỏi active khác nhau cho cùng learner vì dùng thiết bị khác.
- Server giữ quyền nộp khi hoạt động đã khóa; client đang offline không thể tự nhận là đã nộp.
- Gửi trùng (double tap/retry) dùng idempotency key và server request identity để tránh 2 submissions.
- Không gửi `Saved`/`Đã gửi` trước ACK có thể xác minh. Khi offline, ghi `Lưu trên máy này — chưa gửi lên lớp`.
- Reload/reconnect không làm mất văn bản đang gõ, selection, vị trí thao tác hoặc bài đã nộp.

---

# 11. ẢNH, FILE, PDF, CAMERA VÀ QUYỀN RIÊNG TƯ

- Upload cho phép ảnh, file/PDF khi activity authored; giới hạn dung lượng/MIME và kiểm tra phía server.
- Camera trực tiếp qua `getUserMedia` thường cần HTTPS/secure context; mạng LAN HTTP phải có **file picker** phù hợp và kiểm tra trên browser thật.
- Dùng ảnh chụp giấy là một đường nộp hợp lệ, **không tự suy ảnh đúng Toán** hoặc là sản phẩm cá nhân nếu dùng chung thiết bị.
- File có access control: chủ bài, reviewer được phân, GV; Presenter chỉ xem phiên bản ẩn danh GV đã chọn.
- Không đưa dữ liệu HS/file riêng tư vào public static folder không được bảo vệ.
- Không để ảnh/file upload làm cạn băng thông lớp: nén có kiểm soát, preview nhẹ, tải bản rõ khi cần, không giảm mức đọc của chữ/biểu thức.
- Xóa/giữ dữ liệu theo chính sách nhà trường và vai trò; không tạo các quy tắc lưu trữ tưởng tượng thay nhà trường.
- Khi peer review, nhận xét/annotation ở layer riêng, không sửa file gốc; giữ V1/V2 của lời giải nếu activity yêu cầu.

---

# 12. ACCESSIBILITY + KHÔNG CÓ THIẾT BỊ

- Không ép HS có smartphone cá nhân; hỗ trợ ít nhất `PAPER_FALLBACK` và `SHARED_DEVICE_GROUP` theo chính sách lesson.
- Thao tác kéo-thả có phương án tap-to-select/tap-to-place hoặc nút lên/xuống trên mobile/keyboard; không đòi kỹ năng fine motor ngoài construct.
- Không lấy tốc độ chạm/bàn phím làm điểm Toán, trừ khi tiêu chí đó là mục tiêu được duyệt.
- Có mode chữ lớn/tăng tương phản nếu codebase có; không bắt buộc tất cả cài đặt mới cùng đợt P0, nhưng baseline phải hỗ trợ zoom và accessibility OS/browser.
- Mất TV hoặc không nhìn rõ: HS có thể xem nội dung cần thiết trên điện thoại; thông tin đáp án vẫn theo reveal policy.
- Với hoạt động giấy/thiết bị dùng chung: Coach phải biết evidence ở cấp nhóm/quan sát, **không điền tự động kết quả cá nhân cho từng em**.

---

# 13. CHÍNH SÁCH GAME HÓA — KHÔNG ĐÁNH ĐỔI CHẤT LƯỢNG TOÁN

- Có thể dùng progress, quiz round, âm báo có thể tắt, phản hồi nhanh, mini challenge.
- Không mặc định leaderboard tên HS, hiệu ứng áp lực tốc độ, loại HS chậm hay bảng điểm trò chơi làm điểm môn học.
- Nếu GV bật game mode: xác định mục tiêu đo, thời gian, hỗ trợ khác biệt, điểm game tách với điểm Toán.
- Không tạo thêm `GamificationEngine` để vận hành những thứ có thể xử lý bằng presentation/config hiện hành.

---

# 14. P0 / P1 — KHÔNG XẾP CÁC CHỨC NĂNG BÀI ĐÃ BẬT SANG “KHÔNG CẦN”

## P0 — trước pilot Student View trên phone

- Ghi desktop baseline và test hồi quy.
- M1/M2 mobile hoàn thành nhiệm vụ học cốt lõi, dùng được khi portrait.
- QR/PIN/URL truy cập từ thiết bị khác; nhận diện/trùng tên/late join/reconnect.
- Input ngắn, biểu thức và ảnh bài giấy; math visual có zoom/fallback.
- Đồng bộ server, bản nháp, submit ack, lock/reveal/extend/reopen.
- Attention Handoff và xem lại đề khi cần.
- Chuyển thiết bị và hai phiên chỉnh đồng thời không mất dữ liệu.
- Không thiết bị/mất mạng vẫn có đường học thay thế.
- Các hoạt động **đã kích hoạt trong lesson pilot** (nhóm/peer review/ba nhánh...) phải sử dụng được trên phone hoặc có fallback tương đương đã được GV phê duyệt.
- Regression test laptop + test phone + multi-client.

## P1 — nâng cao nếu không cản lesson đang pilot

- Annotation PDF/ảnh nâng cao, advanced geometry editing/3D controls trên phone, PWA, richer personalization.
- Animation/microinteractions nâng cao, hỗ trợ hiệu năng mạng kém tinh chỉnh.
- Các khả năng chưa có bài nào sử dụng có thể triển khai theo kế hoạch riêng.

**Quan trọng:** `P1` không có nghĩa được bỏ một khả năng đã có trong lesson đang kiểm thử. Nếu thiếu phải `BLOCKED` cho lesson đó hoặc thống nhất phương án fallback.

---

# 15. TEST MATRIX — TỰ ĐỘNG HÓA ĐƯỢC VÀ CÓ BẰNG CHỨNG

Mọi test cần: `testId`, `deviceViewport`, `precondition`, `actions`, `expected`, `evidence`, `status` (`NOT_RUN|PASS|FAIL|BLOCKED`), `issueRef`.

| ID | Loại kiểm thử | Điều kiện/kịch bản | Kết quả cần có |
|---|---|---|---|
| MDP-01 | Desktop regression | 1366×768 full workflow | UI/logic laptop cũ giữ đúng |
| MDP-02 | Desktop regression | 1920×1080 math & graph | Không tiny island, không lỗi biểu thức |
| MDP-03 | Responsive | 320px portrait | Không tràn ngang toàn trang, vẫn gửi được |
| MDP-04 | Responsive | 360/375/390/430px | Bố cục/tap/typography hợp lệ |
| MDP-05 | Responsive | Tablet dọc và ngang | Tác vụ giữ state, layout hợp lý |
| MDP-06 | Browser | iOS Safari trên máy thật | Nhập, upload, scroll, submit dùng được |
| MDP-07 | Browser | Android Chrome trên máy thật | Nhập, upload, scroll, submit dùng được |
| MDP-08 | Virtual keyboard | Mở bàn phím khi đang gõ | Không che ô đang nhập/nút gửi; không mất cursor |
| MDP-09 | Math | Công thức dài, căn/phân số/ma trận | Nghĩa toán, nhãn, dấu đúng; zoom/fallback |
| MDP-10 | Geometry | Đồ thị và hình không gian | Không bóp méo trục/layer; no-spoiler |
| MDP-11 | Join | QR từ màn Host dùng LAN URL | Điện thoại mở đúng phòng, không phải localhost |
| MDP-12 | Identity | 2 HS trùng tên/1 HS quay lại | Không gộp người khác, không nhân đôi 1 người |
| MDP-13 | Reconnect | Tắt/bật Wi-Fi giữa lúc nhập | Draft giữ; trạng thái gửi trung thực |
| MDP-14 | Duplicate submit | Double tap + retry | 1 submission được chấp nhận |
| MDP-15 | Teacher override | Lock/Extend/Reopen/Reveal | Mọi thiết bị nhất quán, không lộ sớm |
| MDP-16 | Cross-device | Phone → laptop → phone (đã sync) | Bài/feedback/tiến độ giữ nguyên |
| MDP-17 | Conflict | Cùng response mở trên 2 client | Không silent overwrite; có conflict handling |
| MDP-18 | Attention | LOOK_UP → WRITE_PAPER → WORK_DEVICE | Giữ draft, cho xem lại đề, cue rõ |
| MDP-19 | Group | 23/24/25/26/27/28 HS, nhóm 3–5 | Chia nhóm/vai/coverage đúng; phone usable |
| MDP-20 | Shared device | 1 phone/nhóm | Không suy ra mastery cá nhân |
| MDP-21 | Peer review | Ảnh/PDF + tự chọn/auto | Không self-review; feedback đúng chủ bài |
| MDP-22 | Continuation | Luyện thêm/Thử thách/Khám phá | Nhánh thật, giữ state, không chặn Exit |
| MDP-23 | Access | Screen reader/zoom/keyboard | Điều khiển cơ bản dùng được |
| MDP-24 | 30 clients | 25–35 phiên nộp đồng thời | Không mất submit; đo latency/error thực |
| MDP-25 | Host/network | LAN Wi-Fi lỗi, online reconnect | Không báo gửi giả; fallback hữu ích |
| MDP-26 | Privacy | Xem file HS khác ngoài phân quyền | Server từ chối; Presenter không lộ PII |
| MDP-27 | No device | HS dùng giấy/thẻ/thiết bị chung | Cùng mục tiêu cốt lõi, evidence đúng nguồn |
| MDP-28 | Orientation | Phone portrait ↔ landscape giữa task | Không reset bài, visual, hint |
| MDP-29 | Resize | Cửa sổ laptop thu nhỏ | Adaptive theo viewport, không theo OS |
| MDP-30 | Time drift | Upload/group chậm, GV cắt optional | Recheck/Exit/Self-assessment được bảo vệ |

**Chia tầng test:** Unit, Component, Browser, Network/Multi-client, Real Device, Teacher Observation. Mỗi PASS phải kèm evidence thực tế (log, test run, video/screenshot, mã test). 25–35 client mô phỏng **không thay thế** test thiết bị thật. HTTP 200 **không phải** chứng nhận toàn bộ hệ thống.

---

# 16. TRIỂN KHAI THEO DIFF NHỎ — KHÔNG SỬA TẤT CẢ MỘT LẦN

## Bước 0 — Audit baseline (chưa code)

1. Tìm Student route/pages/components và shared component với Presenter/Coach.
2. Lập Desktop Behavior Inventory có evidence.
3. Kiểm kê hoạt động đang được lesson thực tế dùng; ưu tiên bài Toán 10 Ôn tập chương II và thêm 2 lesson archetype khác khi có trong repo.
4. Lập capability matrix Phone/Tablet/Laptop/Presenter/Coach.
5. Ghi thiếu hạ tầng: server session/identity, draft sync, upload, sockets, test devices.
6. Nêu phần cần teacher confirmation, không mặc định đã có backend đầy đủ.

## Bước 1 — Layout + join + access

Responsive surfaces, QR/PIN, input, keyboard, zoom, read-back prompt, attention handoff. Chạy MDP-01…12 trước khi mở rộng.

## Bước 2 — Sync + state + file

Session authority, local/server draft contract, submit ack, idempotency, reconnect, 2-device conflict; chạy MDP-13…18, MDP-25…26.

## Bước 3 — Feature parity theo lesson thật

Group, peer review, continuation branches, hint ladder, challenge/visual. Chạy MDP-19…22.

## Bước 4 — Regression + pilot gate

Chạy test trên real device + desktop, 25–35 simulated clients, offline fallback, privacy; giải quyết block trước thí điểm.

**Nguyên tắc:** Không viết lại application stack nếu có thể cải tiến component/adapters hiện hành. Với component chưa tồn tại, báo là việc phải xây; không claim PASS vì prototype static render.

---

# 17. DELIVERABLES CODEX PHẢI BÀN GIAO

1. `DESKTOP_BASELINE_INVENTORY.md` — trước/sau và screen evidence.
2. `DEVICE_CAPABILITY_MATRIX.md` — Phone/Tablet/Laptop; ghi fallback cho tác vụ chưa hỗ trợ trực tiếp.
3. `IMPLEMENTATION_PLAN.md` — file/component cụ thể, owner contract, risks, migration, rollback.
4. `STUDENT_SURFACE_DIFF.md` — thay đổi UI/interaction, không thay đổi logic học tập.
5. `MDP_TEST_REPORT.md` — 30 test cases, status đúng sự thật, logs/screenshots.
6. Ảnh/screencast demo ít nhất ở 390px, tablet, 1366×768 nếu công cụ cho phép.
7. Danh sách `BLOCKED / NEEDS_TEACHER_CONFIRMATION` và đường triển khai tiếp theo.

Không được báo “đã hoàn thành” nếu chỉ có UI mock mà chưa có session/submit/reconnect/lock/teacher override hoạt động thật.

---

# 18. DEFINITION OF DONE

Bản Student Surface chỉ đạt `MOBILE_DESKTOP_PARITY_READY` khi:

```text
[ ] Desktop Behavior Inventory có baseline và không regression ngoài các thay đổi được GV duyệt
[ ] Mobile làm được các tác vụ core đã kích hoạt trong các lesson pilot
[ ] Đổi thiết bị và hai phiên cùng mở không làm mất dữ liệu hay ghi đè im lặng
[ ] State/submit/lock/reveal/sync nhất quán giữa Presenter/Student/Coach
[ ] QR/PIN/URL hoạt động thực từ phone trên mạng mục tiêu
[ ] Math typography/graphics/zoom/input/ảnh đúng và không lộ đáp án
[ ] Group/peer/3 branches/hint nếu kích hoạt: usable hoặc fallback được GV duyệt
[ ] No device / network fallback vẫn đạt mục tiêu cốt lõi
[ ] Responsive + iOS Safari + Android Chrome + laptop browser test thực
[ ] Multi-client, privacy, offline/reconnect có bằng chứng thực
[ ] Teacher/observer review trên 3 archetypes khi tuyên bố triển khai đại trà
```

Nếu chưa chạy, giữ `IMPLEMENTED_UNVERIFIED` hoặc `BLOCKED`, **không** suy từ code review sang `PASS`.

---

# 19. CHỐT PHẠM VI VERSION

**Tên triển khai:** `V8.8 — Adaptive Student Surface & Mobile/Desktop Parity Addendum`.

- **Không nâng phiên bản** chỉ vì responsive design.
- **Không thay Master Guide**; đây là một companion addendum, cần tích hợp bằng reference/canonical ownership phù hợp.
- **Không xóa các tính năng V8.8 có sẵn** (Experience Map, Attention Handoff, MVS/CIS assessment, Presenter, collaborative group, peer review, three pathways, core/reserve).
- **Desktop giữ trải nghiệm hiện hành; Mobile cải thiện khả năng truy cập.**
- Handoff hoàn chỉnh là: **Master V8.8 hiện hành + file addendum này + repository hiện hành + lesson fixtures**. Không giao mobile addon như thể nó là toàn bộ đặc tả V8.8.

