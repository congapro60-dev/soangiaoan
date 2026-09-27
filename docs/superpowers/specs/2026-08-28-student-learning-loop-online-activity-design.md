# Cổng học tập học sinh và cầu nối hoạt động online — 2026-08-28

## Trạng thái

Đây là master design spec cho việc hoàn thiện vòng lặp học tập của học sinh. Người dùng đã duyệt hướng dùng bài online làm kênh chính, đồng thời luôn có bản PDF/DOCX làm bản sao lưu. Mặc định với câu tự luận/đáp án mở: AI chỉ tạo điểm và nhận xét đề xuất; giáo viên duyệt hoặc sửa thì mới trở thành kết quả chính thức.

Spec này khóa kiến trúc và tiêu chí chấp nhận. Việc triển khai sẽ tách thành các gói nhỏ theo thứ tự, không thực hiện một lần thay đổi lớn có nguy cơ ảnh hưởng dữ liệu lớp học.

## Mục tiêu sản phẩm

Biến dữ liệu bài làm thành một vòng lặp có thể hành động:

1. Hệ thống phát hiện học sinh đang yếu kỹ năng nào.
2. Giáo viên tạo một hoạt động hỗ trợ có mục tiêu cụ thể.
3. Học sinh làm online hoặc dùng phiếu PDF/DOCX.
4. Bài được chấm tự động, AI đề xuất hoặc giáo viên chấm tay.
5. Điểm chính thức và minh chứng đã duyệt cập nhật hồ sơ năng lực.
6. Học sinh, giáo viên và phụ huynh nhìn thấy tiến bộ và bước tiếp theo.

Sản phẩm không được dừng ở việc liệt kê lỗi, chủ đề yếu hoặc khuyến nghị chung chung.

## Bối cảnh code đã xác minh

Nền thi online hiện có:

- StudentExamPage hỗ trợ trắc nghiệm nhiều phương án, Đúng/Sai, trả lời ngắn và tự luận.
- Có giờ mở/đóng đề, đồng hồ, tự lưu, tiếp tục bài đang làm và cảnh báo đổi tab.
- Đáp án không gửi cho học sinh; chấm khách quan thực hiện ở server.
- ExamsTab đã có chấm AI cho câu tự luận, thống kê và xuất Excel.
- Classroom đã có AssignmentDoc.type === 'exam' và examId để liên kết bài giao với đề online.
- Practice đã có skillIds, answer key riêng phía server, attempt và formative evidence.
- Đã có nền xuất Word/LaTeX; PDF/DOCX backup phải được nối vào cùng một snapshot nội dung và QA trực quan.

Các điểm chưa đủ cho vòng lặp hoàn chỉnh:

- Đề online hiện là một luồng độc lập với cổng học sinh lớp; cần liên kết identity, classId, assignmentId và quyền đọc/ghi.
- maxAttempts hiện có kiểm tra phía trình duyệt; bài chính thức phải được giới hạn ở server.
- Câu tự luận có điểm AI nhưng chưa có một màn hình duyệt điểm/nhận xét theo từng câu dùng chung với classroom.
- Báo cáo hiện chưa biến khuyến nghị thành hoạt động được sinh, duyệt, giao và theo dõi.
- Hồ sơ học sinh có lớp skill/mastery nhưng chưa có một timeline hoạt động thống nhất.
- Chưa có luồng báo cáo phụ huynh được kiểm soát quyền.

## Quyết định kiến trúc

### 1. Một nguồn nội dung, nhiều kênh phát hành

Đối với hoạt động mới có cấu trúc câu hỏi, Exam là nguồn nội dung chuẩn. AssignmentDoc là bản ghi giao hoạt động cho một lớp hoặc nhóm học sinh. PDF/DOCX là các bản xuất dẫn xuất từ đúng examId và phiên bản nội dung đó.

Không tạo riêng một đề online và một file Word rồi cho AI sinh lại lần hai. Mọi bản phát hành phải mang:

- contentVersion;
- mã nội dung hoặc hash;
- danh sách skillIds;
- đáp án và rubric của phiên bản đó;
- metadata thời điểm xuất.

Khi đề đã phát hành, chỉnh sửa nội dung phải tạo phiên bản mới. Bài làm cũ vẫn trỏ đến phiên bản cũ và không bị chấm lại âm thầm.

### 2. Không tạo hòn đảo dữ liệu thứ tư

Không thêm một kho câu hỏi khác chỉ cho bài bổ trợ. Dùng adapter để hợp nhất ba nguồn hiện có:

- bài giao ảnh/file và SubmissionDoc;
- đề online và ExamSubmission;
- practice set/attempt.

Ở lớp giao diện, cả ba được chiếu thành một StudentActivityView có trạng thái, mục tiêu, lần làm, điểm và bước tiếp theo. Ở lớp lưu trữ, dữ liệu cũ vẫn nằm ở collection cũ để giảm rủi ro migration.

### 3. Phân biệt mục đích hoạt động

Mọi hoạt động mới phải có một purpose:

- practice: luyện tập formative, có thể làm lại, không tự biến thành điểm chính thức;
- remediation: bài bổ trợ nhắm vào một hoặc vài kỹ năng yếu;
- assignment: bài giáo viên giao có hạn nộp và theo dõi hoàn thành;
- assessment: bài kiểm tra chính thức, có chính sách số lần làm và thời gian nghiêm ngặt.

Không dùng cùng một chính sách điểm cho cả bài luyện và bài kiểm tra.

### 4. Điểm chính thức có nguồn và vòng đời

- Câu khách quan được chấm xác định theo đáp án và chính sách điểm.
- Câu mở có thể nhận điểm AI đề xuất, chấm tay hoặc sửa tay.
- Với bài có câu mở, tổng điểm chỉ là provisional cho đến khi giáo viên duyệt các phần cần duyệt.
- Hoạt động chỉ có câu khách quan có thể thành official ngay theo policy automatic của server. Hoạt động mixed chỉ official phần khách quan; tổng điểm còn provisional cho đến khi câu mở được duyệt. Policy teacher_review giữ toàn bộ kết quả ở provisional.
- Kết quả official luôn có nguồn chấm, cách phê chuẩn và thời điểm. teacherApproved === true chỉ dùng cho phê chuẩn của giáo viên; automatic policy phải ghi approvalMode riêng và không giả mạo người duyệt.
- Mỗi sửa điểm, xóa điểm, chấm lại hoặc đổi đáp án tạo history; không xóa bài làm hoặc file gốc.
- Projection cho báo cáo lấy bản chính thức mới nhất theo policy, nhưng vẫn giữ toàn bộ lịch sử để đối chiếu.

## Contract dữ liệu bổ sung

Các field dưới đây là optional để đọc được dữ liệu legacy. Không đổi tên hoặc xóa field hiện có.

### Metadata hoạt động trên AssignmentDoc

Thêm nhóm field tương thích:

- purpose?: 'practice' | 'remediation' | 'assignment' | 'assessment';
- deliveryMode?: 'online' | 'file' | 'both';
- skillIds?: string[];
- sourceReportId?: string;
- gradingPolicy?: 'automatic' | 'mixed' | 'teacher_review';
- contentVersion?: string;
- exportBundle?: { status, contentVersion, studentPdfUrl?, studentDocxUrl?, teacherKeyPdfUrl?, teacherKeyDocxUrl?, generatedAt?, contentHash? };
- targetStudentIds?: string[] khi bài chỉ dành cho nhóm hỗ trợ;
- createdBy, updatedBy tiếp tục dùng theo quyền lớp hiện có.

answerKey, rubric, gradingInstructions vẫn là dữ liệu giáo viên/server, không xuất trong StudentAssignmentView.

### Metadata trên Exam

Thêm optional:

- purpose;
- contentVersion;
- parentExamId? cho bản sao phiên bản;
- skillIds?: string[];
- sourceReportId?;
- exportBundle?;
- isImmutableAfterPublish?: boolean.

Exam.questions tiếp tục là canonical content của phiên bản. Các đề cũ không có field mới vẫn mở và chấm theo logic cũ.

### Metadata trên ExamSubmission

Thêm optional:

- classId?;
- assignmentId?;
- studentId?;
- attemptNumber?;
- activityPurpose?;
- gradeState?: 'provisional' | 'pending_teacher_review' | 'official';
- gradingSource?: 'automatic' | 'ai' | 'teacher' | 'mixed';
- approvalMode?: 'automatic_policy' | 'teacher';
- teacherApprovedAt?;
- supersedesSubmissionId?.

Khi học sinh vào từ cổng lớp, studentId, classId và assignmentId phải được server suy ra từ phiên học sinh; không tin tên/lớp do trình duyệt tự gửi.

### Activity view dùng chung

Adapter trả về tối thiểu:

- định danh và tiêu đề;
- loại hoạt động và purpose;
- skill/mục tiêu;
- hình thức online/file;
- hạn nộp;
- trạng thái hiện tại;
- số lần đã làm;
- điểm provisional và điểm chính thức nếu có;
- feedback an toàn cho học sinh;
- hành động tiếp theo.

Không lưu thêm một bản sao lâu dài của view này nếu có thể tính lại từ nguồn.

## Luồng sử dụng hoàn chỉnh

### Giáo viên tạo bài bổ trợ từ báo cáo

1. Trong báo cáo, giáo viên chọn một lỗi/chủ đề/kỹ năng.
2. Bấm Tạo hoạt động hỗ trợ.
3. Hệ thống đưa dữ liệu làm căn cứ: tỷ lệ sai, nhóm học sinh, câu nguồn, kỹ năng, mức độ.
4. AI tạo một bản nháp có mục tiêu, hướng dẫn, câu hỏi, đáp án, rubric và phiếu thoát.
5. Giáo viên sửa nội dung, điểm, nhận xét mẫu và đối tượng nhận.
6. Hệ thống tạo cùng một snapshot cho online và PDF/DOCX.
7. Giáo viên xem trước cả hai, rồi bấm Duyệt và giao.
8. Bài xuất hiện trong dashboard học sinh và ma trận tiến trình lớp.

AI không tự giao bài, không tự ghi điểm chính thức và không tự kết luận một học sinh yếu chỉ từ một tín hiệu mơ hồ.

### Học sinh làm bài online

1. Từ cổng lớp, học sinh thấy mục Cần làm, Luyện theo mục tiêu và Đang tiến bộ.
2. Bấm vào hoạt động để xem mục tiêu, hướng dẫn, thời lượng và hạn nộp.
3. Bài bắt đầu bằng identity phiên học sinh hiện tại; không yêu cầu gõ lại tên tùy ý.
4. Câu trả lời được tự lưu; mất mạng có thông báo và có thể tiếp tục.
5. Học sinh nộp một attempt. Retry mạng không tạo attempt trùng.
6. Câu khách quan được chấm tự động. Câu mở chuyển sang AI đề xuất hoặc chờ giáo viên theo policy.
7. Học sinh nhìn thấy trạng thái rõ: đang chấm, chờ giáo viên, điểm tạm thời, điểm chính thức hoặc cần làm lại.
8. Nếu được phép, học sinh xem lại từng câu, nội dung câu hỏi, câu trả lời của mình và nhận xét; không thấy answer key riêng tư trước thời điểm được phép.

### Học sinh dùng PDF/DOCX

PDF/DOCX phải được sinh từ cùng snapshot với online. Phiếu học sinh không chứa đáp án; bộ teacher key/rubric là file riêng. Học sinh vẫn có thể chụp nhiều ảnh hoặc tải PDF/Word nộp lại qua luồng classroom hiện có.

### Giáo viên chấm online

Màn hình duyệt bài online dùng chung nguyên tắc với classroom:

- xem toàn bộ câu hỏi và câu trả lời;
- xem điểm tự động và điểm AI đề xuất;
- sửa điểm từng câu;
- sửa nhận xét từng câu và nhận xét tổng;
- đánh dấu cần xem lại;
- duyệt kết quả;
- chấm lại sau khi sửa đáp án/rubric;
- xem lịch sử thay đổi.

Không dùng thao tác sửa answer key để giả lập sửa điểm học sinh.

### Hồ sơ và tiến trình

Sau khi có kết quả phù hợp policy:

attempt/grade → approved evidence → skillBridge → StudentProfileDoc.skills + legacy topics → StudentActivityView/report

Practice formative được ghi với trọng số thấp hơn. Bài chưa duyệt không tạo kết luận năng lực chính thức. Evidence phải idempotent theo submissionId hoặc attemptId.

Dashboard học sinh cần cho biết:

- kỹ năng đang vững;
- kỹ năng đang hình thành;
- kỹ năng cần hỗ trợ;
- xu hướng tăng/giảm;
- hoạt động đã làm và điểm tương ứng;
- mục tiêu hiện tại;
- hoạt động tiếp theo;
- thời điểm cập nhật và nguồn minh chứng.

Không lưu vô hạn mọi thao tác bàn phím vào hồ sơ. Raw answers nằm trong attempt; hồ sơ lưu summary và evidence có định danh.

### Báo cáo giáo viên và phụ huynh

Giáo viên có:

- ma trận học sinh × hoạt động;
- lần làm, trạng thái, điểm chính thức;
- tiến bộ theo kỹ năng;
- lỗi lặp lại;
- hoạt động hỗ trợ đã giao và tỷ lệ hoàn thành;
- nút tạo báo cáo hoặc tạo hoạt động tiếp theo.

V1 báo cáo phụ huynh là bản tóm tắt được giáo viên tạo/xuất PDF/DOCX hoặc chia sẻ qua cơ chế có quyền. Báo cáo chỉ dùng evidence đã duyệt, gồm điểm mạnh, điểm cần rèn, tiến bộ theo thời gian, hoạt động đã hoàn thành và khuyến nghị cụ thể. Không chứa teacher note riêng tư, answer key hoặc dữ liệu bạn học. Một parent portal/login riêng là pha sau, không âm thầm trộn vào migration lần này.

## Bản backup PDF/DOCX

Mỗi hoạt động có hai bộ xuất:

1. Bản học sinh: đề, hướng dẫn, chỗ làm.
2. Bản giáo viên: đáp án, rubric, hướng dẫn chấm và phiếu thoát.

Yêu cầu:

- cùng contentVersion và contentHash với đề online;
- công thức Toán render bằng pipeline chuẩn, không để lộ chuỗi LaTeX thô;
- tiếng Việt giáo dục được rà soát theo ngữ cảnh;
- A4 không tràn bảng, không mất dòng, không cắt công thức;
- export lỗi phải hiển thị nguyên nhân và nút thử lại;
- file cũ không bị ghi đè nếu nội dung đã thành phiên bản mới.

Chế độ both chỉ được báo ready khi online và hai bộ backup đã tạo/kiểm tra thành công. Chế độ online chỉ dùng khi giáo viên chủ động chọn và giao diện phải nói rõ chưa có backup.

## Error handling và fallback

- AI sinh nội dung lỗi: giữ bản nháp, hiển thị lỗi gốc và cho sửa/thử lại; không giao placeholder.
- AI chấm lỗi: giữ bài ở submitted hoặc pending_teacher_review, không gán 0 điểm im lặng.
- JSON AI hỏng: dùng repair có giới hạn; nếu vẫn lỗi, chuyển giáo viên chấm.
- Export lỗi: không xóa hoạt động hoặc attempt; retry theo đúng snapshot.
- Mất mạng khi làm online: giữ draft cục bộ theo classId + studentId + activityVersion, đồng bộ idempotent khi có mạng.
- Double click nộp: khóa thao tác ở UI và kiểm tra nonce/attempt ở server.
- Đề đóng hoặc vượt số lần: server từ chối; client chỉ hiển thị trạng thái.
- Không đọc được nguồn PDF/ảnh: đánh dấu cần giáo viên kiểm tra, không đoán nội dung câu hỏi.

## Quyền và bảo mật

- Học sinh chỉ đọc hoạt động đã phát hành dành cho mình/lớp mình.
- Học sinh chỉ tạo/cập nhật attempt của chính mình trong thời gian được phép.
- Answer key, rubric, teacher instruction, teacher note và lịch sử grade không đi vào projection học sinh.
- maxAttempts, deadline, identity và assignment membership được kiểm tra ở server.
- Giáo viên cộng tác chỉ thao tác trong phạm vi quyền lớp; chủ sở hữu gốc và quyền kế thừa tiếp tục theo policy lớp đã duyệt.
- Báo cáo phụ huynh phải được tạo từ dữ liệu được phép; link chia sẻ nếu có phải có scope và thời hạn.
- Không thay đổi hoặc xóa dữ liệu bài nộp, điểm, file Storage của 11 Columbus và các lớp khác trong quá trình bổ sung field.

## Tương thích và rollout

Không chạy destructive migration. Rollout theo hướng additive:

1. Tạo type/adapter và đọc được legacy.
2. Nối Exam với AssignmentDoc cho hoạt động mới.
3. Bật attempt online trong cổng lớp với server identity.
4. Nối grade lifecycle và teacher review.
5. Nối skill evidence, dashboard và báo cáo.
6. Bật tạo hoạt động hỗ trợ và export PDF/DOCX.
7. Chỉ sau pilot mới mở parent-safe report/share.

Không thêm Vercel Serverless Function nếu handler hiện có có thể mở rộng an toàn. Không backfill toàn bộ dữ liệu cũ trong một lần; record cũ được map lazy khi được đọc/cập nhật.

## Phương án đã cân nhắc

### A — Dùng Exam làm nguồn nội dung và Assignment làm delivery (khuyến nghị)

Tái sử dụng renderer, parser, chấm server và export hiện có; chỉ bổ sung liên kết, metadata, identity và lifecycle. Ít migration, dễ bảo vệ dữ liệu cũ. Đổi lại cần kỷ luật versioning để không sửa đề đang được dùng.

### B — Tạo collection LearningActivities hoàn toàn mới

Mô hình sạch hơn về mặt lý thuyết, nhưng phải đồng bộ với exams, assignments, practiceSets và lịch sử cũ. Rủi ro duplicate content, nhiều rules và migration. Chưa phù hợp với dữ liệu production đang có.

### C — Giữ ba hệ thống độc lập rồi đồng bộ bằng job

Ít sửa code ban đầu nhưng dễ lệch điểm, lệch file, lệch hồ sơ và khó truy vết khi chấm lại. Không chọn.

## Tiêu chí chấp nhận

1. Một hoạt động mới có thể giao online, xuất PDF/DOCX hoặc cả hai từ cùng một snapshot.
2. Sửa đề sau phát hành tạo phiên bản mới; bài cũ vẫn xem và chấm đúng phiên bản cũ.
3. Học sinh từ cổng lớp vào bài online bằng identity server-confirmed, không thể đổi sang tên học sinh khác.
4. Tự lưu, resume và retry không tạo attempt trùng.
5. Deadline và số lần làm được enforce ở server.
6. Khách quan được chấm xác định; câu mở phân biệt AI đề xuất, chấm tay và điểm chính thức.
7. Giáo viên sửa được điểm và nhận xét từng câu; lịch sử không mất.
8. Học sinh xem được feedback đúng quyền, không thấy answer key/rubric/teacher note.
9. Regrade không xóa evidence cũ và không nhân đôi evidence mới.
10. Bài luyện không tự làm thay đổi điểm chính thức; chỉ kết quả official theo policy automatic khách quan hoặc đã được giáo viên duyệt mới cập nhật mastery authoritative.
11. Báo cáo chỉ sử dụng dữ liệu chính thức theo policy và có nút hành động tiếp theo.
12. Báo cáo phụ huynh không lộ dữ liệu riêng tư của lớp.
13. Export Word/PDF qua gate nội dung Toán và tiếng Việt; có kiểm tra render representative.
14. Existing submissions/grades/files của 11 Columbus và lớp khác giữ nguyên checksum/định danh; không destructive migration.
15. Có unit, component, rules, export regression và authenticated E2E cho ít nhất một lớp test trước khi gọi production-ready.

## Kế hoạch triển khai cấp cao

- Gói 1: activity metadata, versioning và adapter StudentActivityView.
- Gói 2: nối online exam với classroom identity/assignment, server attempt policy.
- Gói 3: teacher grade review và grade lifecycle dùng chung.
- Gói 4: sinh hoạt động hỗ trợ từ report, tạo online + PDF/DOCX.
- Gói 5: skill/mastery, dashboard tiến trình và report hành động.
- Gói 6: parent-safe report, full regression và authenticated E2E.

Mỗi gói có test đỏ trước code, không đụng dữ liệu thật, và chỉ merge khi có build/lint/rules phù hợp. OpenCode không nằm trong quy trình triển khai theo lựa chọn hiện tại của người dùng.

## Kết luận

Đề xuất dùng online làm kênh chính là khả thi và tận dụng được nền hiện có. Điều kiện để đạt chất lượng là không coi online, file, practice và classroom là bốn bài khác nhau: nội dung phải có một nguồn, điểm phải có vòng đời, hồ sơ phải dựa trên evidence đã duyệt, và mọi phiên bản cũ phải giữ nguyên.
