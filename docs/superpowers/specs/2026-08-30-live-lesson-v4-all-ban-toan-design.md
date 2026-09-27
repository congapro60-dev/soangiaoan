# V4 live lesson — bộ 48 giáo án Ban Toán W5–W6

## Trạng thái

- Đã được giáo viên duyệt phương án A để triển khai trong chức năng **Bài học phân hoá** hiện tại.
- Phạm vi tài liệu này là thiết kế triển khai; chưa phải bằng chứng đã chạy trên Vercel hay lớp học thật.
- Phát triển trên worktree riêng; không push/deploy trong lượt này.

## Mục tiêu và ranh giới

Tạo 48 gói bài học V4 tương ứng với `LESSON_SPECS` hiện hành của Ban Toán cho G10, G11, G12 ở tuần 5–6. Mỗi gói phải dùng được cùng kiến trúc ba cổng hiện có:

`GV (điện thoại/laptop) → Firestore realtime → TV công khai + cổng HS`.

Không tạo website mới, không thay layout giáo án Ban Toán, không đưa script GV, dữ liệu cá nhân, câu trả lời thô hoặc kế hoạch hỗ trợ cá nhân lên TV.

Không coi một gói sinh tự động là đã được duyệt nội dung. Gói có thể tồn tại ở trạng thái candidate/draft để QA; chỉ gói qua publication gate mới được launcher cho mở tiết trực tiếp.

## Nguồn chuẩn và provenance

Nguồn nội dung là `LESSON_SPECS` sau khi các enhancement và SBT reference hiện hành đã được áp dụng trong:

- `giao an manus tao/_qa/ban_toan_rebuild/banToanContent.ts`
- `giao an manus tao/_qa/ban_toan_rebuild/g10Content.ts`
- `giao an manus tao/_qa/ban_toan_rebuild/lessonEnhancements.ts`
- `giao an manus tao/_qa/ban_toan_rebuild/aiErrorOfWeek.ts`

Không dùng `pptx_lotK7/lesson-data.json` cũ làm nguồn vì P31 và các trường enhanced có thể đã lệch. Trước khi sinh artifact, harness phải:

1. Đọc nguồn TypeScript hiện hành một lần.
2. Ghi snapshot dữ liệu thuần JSON có kiểm tra cấu trúc, không import đường dẫn tuyệt đối lúc runtime.
3. Ghi provenance gồm nguồn, thời điểm/chế độ sinh và SHA-256 của từng file nguồn.
4. Fail-closed nếu không đúng 48 bài, 16 bài mỗi khối, key trùng, thiếu `kind`, thiếu 2 ví dụ/6 bài tập/2 quick hoặc thiếu AI error.

Snapshot là artifact kiểm soát nguồn, không phải giấy phép bỏ qua review nội dung. SBT reference phải được giữ nguyên ở đúng câu đã gắn; không tự bịa nguồn.

## Mô hình dữ liệu

Mở rộng contract V4 tối thiểu, tương thích V3:

- `lessonMode`: `formation | practice | elective-practice`.
- `sourceKey`: key Ban Toán dạng `10-5-31`.
- `sourceFingerprint`: hash snapshot để phát hiện gói stale.
- `selfChoice`: boolean và, khi true, `choicePolicy` mô tả lựa chọn có giới hạn, common core và common post-check.

Không đặt `languagePreference` vào lesson content hay route năng lực. `languagePreference` thuộc payload/session của HS; `languageSupportPlan` chỉ là nguồn hỗ trợ đã được nhà trường/GV xác minh. Ngôn ngữ không được dùng để suy ra năng lực hoặc tự động chia nhóm.

Adapter V4 dùng một source snapshot và tạo hai đầu ra song song:

1. Runtime contract/definition cho GV–TV–HS.
2. Metadata liên kết bài trong `Bài học phân hoá` và output giáo án Ban Toán.

Binding vào bài Firestore phải dùng `lesson.id` thật ở thời điểm mở phiên, không nhúng ID người dùng vào artifact dùng chung. Lookup ưu tiên `curriculumRef.lessonCode`/source key, rồi alias đã khai báo; không match chỉ bằng tiêu đề gần giống.

## Luồng sư phạm chung 40 phút

Mọi contract có timeline đúng 2400 giây, ID ổn định, và cùng khung thu bằng chứng:

- P00–P05: trải nghiệm/khởi động, phát sinh câu hỏi định hướng.
- P05–P08: HS tự nêu mục tiêu; GV tổng hợp mục tiêu chung trên bảng phụ/TV.
- P08–P15: chẩn đoán ngắn; GV đọc thống kê ẩn danh để chọn can thiệp.
- P15–P23: hình thành hoặc khôi phục công cụ Toán; GV ghi chốt ở bảng lớn, HS ghi vở.
- P23–P27: `THINK → AI → VERIFY` và AI Error of the Week, thay cho micro-check tương ứng, không cộng thêm thời lượng.
- P27–P35: nhiệm vụ M/S/C hoặc lựa chọn có giới hạn; GV duyệt nhóm nếu có grouping proposal.
- P35–P38: quick check chung.
- P38–P40: post-check cá nhân/exit ticket.

Bài `formation` ưu tiên phát hiện và hình thành khái niệm. Bài `practice` ưu tiên chọn chiến lược, sửa lỗi và chuyển giao. Bài `elective-practice` cho HS chọn một trong số nhiệm vụ có rào chắn, nhưng giữ rubric và post-check chung; lựa chọn không phải nhãn trình độ.

AI Error là một hoạt động vi mô có sẵn trong mạch, không thêm slide hay bước độc lập. Nếu card AI error của nguồn là `micro`, adapter phải giữ thời lượng ngắn; nếu thiếu card hợp lệ thì gói không được publish, không tự sinh câu trả lời.

## Phối hợp thiết bị và riêng tư

- TV: chỉ projection allowlist và thống kê tổng hợp ẩn danh; không tên, UID, `studentId`, câu trả lời thô, `value`, `privateReason`, `languageSupportPlan`, `teacherScript`.
- GV: xem script, bảng cần ghi, evidence và nút chuyển cue/duyệt nhóm; giao diện mobile-first để dùng bằng điện thoại.
- HS: chọn ngôn ngữ hiển thị (`vi`, `en`, `ja`, `ko`, `zh`) và chế độ scaffold; tiếng Việt là neo Toán. Glossary chỉ hiển thị mục đã duyệt; thiếu bản dịch không được âm thầm bịa.
- Bảng lớn: nội dung Toán thực sự cần giữ lâu.
- Bảng phụ: câu hỏi định hướng, mục tiêu chung, khung câu/rubric; không viết QR hay chi tiết kỹ thuật.
- Vở: bằng chứng lập luận/kiểm chứng cá nhân; ứng dụng thu tín hiệu ngắn, không thay toàn bộ sản phẩm viết.
- Offline: TV cue, glossary in, board plan, thẻ tuyến M/S/C, AI error key, phiếu grouping thủ công và paper exit ticket phải có đủ trong contract.

## Nhóm và đánh giá

Evidence đi theo dimension (concept, procedure, reasoning, modeling, language access, autonomy/collaboration). Group proposal chỉ là đề xuất cho **một nhiệm vụ cụ thể**, dựa trên evidence đã có; GV phải duyệt, có fallback nếu không đủ cỡ nhóm. Không hiển thị nhãn năng lực cho HS.

Mỗi route dùng success criteria chung; khác nhau ở mức scaffold, không khác chuẩn đích. Mọi grouping đều kết thúc bằng post-check cá nhân để đánh giá lại theo chuỗi:

`assessment → skill gap → nhiệm vụ phù hợp → đánh giá lại`.

## Publication gate

Generated 48 packages phải qua các kiểm tra cấu trúc, source fingerprint, timeline, glossary, AI error, privacy projection và offline readiness. Gói chưa có human content review/đối chiếu nguồn được đánh dấu candidate/draft, không mở live production. P31 hiện có phải giữ compatibility với `getPilotLiveLessonDefinition()` và các test V3.

## Tiêu chí nghiệm thu

1. Snapshot/provenance chứng minh đúng 48 key nguồn hiện hành, không dùng JSON stale.
2. Adapter sinh được 48 contract/definition; 16 mỗi khối; đúng mode và self-choice theo source.
3. Mỗi gói đúng 2400 giây, có common core, M/S/C, common post-check, AI error, glossary 5 ngôn ngữ và offline pack.
4. Contract validator fail-closed; package registry không import file ngoài runtime.
5. P31 vẫn qua test cũ; representative tests cho formation, practice và elective-practice.
6. Launcher/list chỉ mở live khi package match exact source key/alias và publication gate đạt; bài không match báo lỗi có hướng dẫn.
7. Projection TV không lộ PII/private fields qua test allowlist và sanitizer.
8. `npm run lint`, `npm run lint:api`, toàn bộ test liên quan và `npm run build` pass trên worktree.
9. Không tuyên bố browser pilot, staging/Vercel hoặc release production nếu chưa chạy các kiểm tra đó.
