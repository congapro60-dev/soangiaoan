# Tự phục hồi phản hồi JSON khi chấm bài AI — 2026-08-25

## Trạng thái

Thiết kế high-level đã được người dùng duyệt. Tài liệu này khóa phạm vi và tiêu chí nghiệm thu trước khi lập implementation plan; chưa sửa mã chấm bài hoặc dữ liệu production.

## Bối cảnh và vấn đề

Luồng `gradeOne`/`gradeAssignment` gửi ảnh bài làm, đề và đáp án tới Gemini. Model được yêu cầu trả JSON có các trường nhận xét và chi tiết từng câu. Khi một công thức LaTeX chứa dấu gạch chéo ngược chưa được escape đúng, `JSON.parse` có thể ném `Bad escaped character`, khiến submission chuyển sang `error` dù ảnh và bài nộp vẫn còn nguyên.

Hiện repo đã có `responseMimeType: application/json` và `parseLooseJson`, nhưng bộ sửa backslash hiện tại là regex đơn giản. Nó chưa phân biệt đầy đủ escape JSON hợp lệ với lệnh LaTeX bắt đầu bằng `\\u`, `\\f`, `\\t` hoặc chuỗi có nhiều lỗi liên tiếp; vì vậy có thể bỏ sót lỗi hoặc parse được nhưng làm biến dạng công thức. Thông báo lỗi kỹ thuật hiện cũng bị đưa thẳng lên màn hình giáo viên.

## Mục tiêu

1. Tự cứu các lỗi cú pháp JSON có thể xác định chắc chắn, đặc biệt lỗi escape LaTeX, mà không thay đổi nội dung chấm.
2. Tự gọi lại AI tối đa một lần cho lỗi phản hồi rỗng, bị cắt hoặc JSON/schema không hợp lệ.
3. Chỉ commit grade sau khi JSON đã parse và vượt qua kiểm tra cấu trúc/thang điểm.
4. Nếu không cứu được, giữ ảnh, file, submission và grade hợp lệ cũ; không ghi 0 điểm, không tạo submission mới và không làm mất lịch sử.
5. Giáo viên nhận được hướng dẫn tiếng Việt có hành động tiếp theo; học sinh không thấy lỗi kỹ thuật của JavaScript/JSON.
6. Không thêm Vercel Function, không migration, không bulk mutation và không chạm dữ liệu lớp 11 Columbus khi deploy.

## Ngoài phạm vi

- Không dùng một AI khác để tự đoán điểm thay cho kết quả lỗi.
- Không tự duyệt grade đã phục hồi; `teacherApproved` vẫn là `false` như mọi grade AI mới.
- Không sửa nội dung bài làm, đáp án, rubric hoặc công thức sau khi parse thành công.
- Không thay đổi luồng nộp ảnh, nộp bổ sung, chọn lượt hiện hành/lịch sử hay xóa submission.
- Đợt đầu tập trung vào homework grading (`gradeOne`, `gradeAssignment`); các action `practice`, `solveAnswerKey`, `suggestRubric` và `rewriteFeedback` chỉ nhận regression test nếu dùng chung utility, không tự mở rộng hành vi ngoài spec.

## Các phương án đã cân nhắc

### A. Mở rộng regex repair hiện tại

Ít thay đổi và nhanh triển khai, nhưng regex không biết mình đang ở trong chuỗi JSON nào, dễ sửa nhầm `\\\\`, quote hoặc escape hợp lệ. Trường hợp `\\frac` có thể bị JSON hiểu thành form-feed mà không báo lỗi. Không chọn làm giải pháp chính.

### B. Parser sửa cú pháp có trạng thái + schema gate + một lần retry — chọn

Parser quét từng ký tự, chỉ sửa dấu escape bên trong chuỗi JSON; sau đó kiểm tra cấu trúc grade và chỉ commit khi hợp lệ. Nếu không vượt qua, worker gọi Gemini lại đúng một lần với cùng evidence và yêu cầu JSON tối giản. Đây là điểm cân bằng tốt nhất giữa khả năng tự cứu, chi phí, truy nguyên và an toàn điểm.

### C. Gửi toàn bộ phản hồi hỏng cho một AI khác để “sửa JSON”

Có thể cứu thêm một số trường hợp, nhưng AI sửa có thể đổi câu trả lời, điểm hoặc nhận xét mà không có bằng chứng. Không dùng trong đợt này; nếu sau này bổ sung, chỉ được dùng như công cụ phục hồi cú pháp rồi vẫn phải qua schema/semantic gate và giáo viên duyệt.

## Thiết kế được chốt

### 1. Luồng xử lý

```text
Gemini response
  -> kiểm tra HTTP và finishReason
  -> parse JSON strict
  -> nếu lỗi: deterministic repair trong chuỗi JSON
  -> parse lại
  -> normalize + validate grade contract
  -> commit AI grade, teacherApproved = false

Nếu một trong các bước phục hồi thất bại:
  -> retry Gemini tối đa một lần cho cùng submission
  -> lặp strict parse -> repair -> validate
  -> nếu vẫn thất bại: restoreClaimIfOwned(status = error hoặc giữ grade cũ)
```

Retry không được chạy cho lỗi xác thực/quyền, quota, không đọc được ảnh, `SAFETY`, `PROHIBITED_CONTENT`, `RECITATION` hoặc assignment không khớp submission. Các lỗi này cần hành động khác, không phải sửa JSON.

### 2. Parser phục hồi cú pháp

Tạo utility có contract rõ, dùng trước hết cho `parseHomeworkGrade`; không thay đổi âm thầm semantics của mọi consumer đang gọi `parseLooseJson`.

Parser phải:

- thử `JSON.parse` strict trước và trả về cùng object nếu JSON đã hợp lệ;
- quét trạng thái `inString` và `escaped`, chỉ can thiệp khi đang ở trong giá trị chuỗi;
- giữ nguyên `\\"`, `\\\\`, `\\/`, `\\b`, `\\f`, `\\n`, `\\r`, `\\t` hợp lệ;
- chỉ giữ `\\u` khi sau đó có đủ đúng bốn ký tự hex; nếu không thì biến dấu `\\` thành literal backslash;
- escape các backslash LaTeX chưa escape như `\\in`, `\\subset`, `\\Rightarrow`, `\\frac`, `\\sqrt`, `\\underline`, `\\text` mà không đụng vào phần ngoài chuỗi;
- đổi control character thô trong chuỗi thành escape JSON tương ứng khi có thể xác định chắc chắn;
- không tự sửa quote chưa escape, dấu ngoặc thiếu, output bị cắt hoặc cấu trúc mơ hồ; các trường hợp này phải đi qua retry;
- trả metadata tối thiểu `parseMode: strict | repaired` và loại repair, không trả raw response ra client.

Không dùng sửa chuỗi kiểu “thay mọi backslash” hoặc regex greedily trên toàn bộ response. Một công thức đã được JSON escape đúng phải giữ nguyên sau round-trip.

### 3. Kiểm tra schema và semantics trước khi commit

Sau parse/recovery, validator kiểm tra:

- kết quả là object, có `score` hữu hạn trong `[0, maxScore]` và `maxScore` theo assignment;
- `feedbackForStudent`, `noteForTeacher`, `strengths`, `weaknesses`, `weakTopics`, `questionResults` có đúng kiểu;
- mỗi question result có số câu, điểm không âm và không vượt `maxScore` của câu;
- không có câu trùng ID/số câu sau normalize và không có giá trị NaN/Infinity;
- nội dung bắt buộc để giải thích/correction/nextPractice vẫn được giữ theo contract hiện có; validator không tự điền nội dung còn thiếu;
- kết quả được tạo với `teacherApproved: false`, sau đó mới gọi `commitAiGradeIfClaimed`.

Schema lỗi là lý do được phép retry một lần, nhưng không được tự hạ điểm, tự thêm câu hoặc coi mảng rỗng là bài đúng.

### 4. Retry có giới hạn

- Một submission chỉ có tối đa hai lần gọi model trong cùng một request: lần đầu và một retry.
- Retry dùng cùng ảnh/đề/đáp án/evidence, prompt grading cùng phạm vi, nhiệt độ thấp và yêu cầu trả JSON thuần; không gửi lại nguyên văn raw JSON hỏng để tránh prompt injection và tăng kích thước.
- Nếu lần đầu chỉ hỏng cú pháp nhưng deterministic repair đã parse và validate thành công thì không gọi retry.
- Quota tính theo một nhiệm vụ chấm, không nhân đôi số submission; chi phí provider có thể tăng tối đa một lần cho ca lỗi đó.
- Không retry vô hạn qua client hoặc refresh trang. Nút `Chấm lại bằng AI` là một request mới, vẫn chịu claim token và quota hiện tại.

### 5. Trạng thái, lịch sử và dữ liệu hiện có

- Thành công ở strict hoặc repaired/retried: ghi grade như bình thường, luôn chưa duyệt.
- AI lỗi sau cả hai lần: giữ nguyên ảnh/file/text/submission; nếu đã có grade hợp lệ thì giữ grade và trạng thái grade hiện hành theo lifecycle hiện tại; nếu chưa có grade thì giữ `status = error` với thông báo thân thiện.
- Không ghi `submissionGradeHistory` cho một lần chấm chưa commit; retry cùng worker không tạo lịch sử trùng.
- Ghi metadata phục hồi tối thiểu ở trường tùy chọn `gradingRecovery` của grade: `{ mode: 'syntax_repaired' | 'retry_recovered', retryCount: 0 | 1, repairKinds: string[] }`. Trường này chỉ được tạo khi có phục hồi; JSON strict thành công không cần thêm metadata. `projectStudentSubmission` phải bỏ trường này; giáo viên có thể thấy nhãn “AI đã tự phục hồi định dạng” khi cần đối chiếu.
- Không thay đổi `fileUrls`, `attachments`, `textContent`, `supplementOf`, revision lineage hoặc evidence profile trong nhánh lỗi.

### 6. Thông báo người dùng

Thay lỗi thô `Bad escaped character...` bằng nội dung phù hợp:

- Giáo viên: “AI gặp lỗi định dạng khi đọc kết quả chấm. Bài và ảnh vẫn được giữ nguyên; hệ thống đã tự thử phục hồi. Thầy/cô có thể chấm lại bằng AI hoặc sửa điểm bằng tay.”
- Học sinh: “Bài đã được nhận nhưng kết quả chấm chưa hoàn tất. Em chưa cần nộp lại ảnh; thầy/cô sẽ chấm lại hoặc kiểm tra bài.”
- Nếu tự phục hồi thành công, hiển thị trạng thái bình thường và nhãn teacher-only “Đã tự phục hồi phản hồi AI”; không làm học sinh lo lắng bằng chi tiết kỹ thuật.

Log server chỉ ghi error category, finishReason, parseMode, retryCount, model và submissionId đã rút gọn/băm; không ghi toàn bộ ảnh hoặc raw response chứa bài làm vào client.

## File và ranh giới dự kiến

- `src/utils/jsonRepair.ts` hoặc utility mới: parser stateful và metadata.
- `src/lib/classroom/gradingPrompt.ts`: parse/normalize/validator cho homework grade; prompt retry nếu cần.
- `api/grade-homework.ts`: phân loại lỗi, retry một lần, giữ claim/lifecycle/quota an toàn.
- `api/_grading-core.ts`: giữ finishReason gate và truyền metadata lỗi có cấu trúc nếu cần.
- `src/lib/classroom/types.ts`, `api/classroom.ts`, `AssignmentPanel.tsx`: thêm `gradingRecovery` optional, nhãn phục hồi ở màn hình giáo viên và loại trường này khỏi student projection; không đổi các field grade học sinh đang nhận ngoài copy lỗi.
- Không thêm route/serverless function mới, không sửa Firestore rules/indexes và không chạy migration.

## Kiểm thử và tiêu chí nghiệm thu

### Unit/parser

1. JSON hợp lệ không bị thay đổi.
2. Parse được các escape LaTeX thô: `\\in`, `\\subset`, `\\Rightarrow`, `\\frac`, `\\sqrt`, `\\underline`, `\\text`.
3. Giữ nguyên escape JSON hợp lệ và quote/backslash đã escape.
4. Sửa đúng `\\u` thiếu/không đủ hex; không biến công thức thành form-feed/tab/newline ngoài ý muốn.
5. Từ chối quote thiếu, ngoặc thiếu và JSON bị cắt thay vì đoán.
6. Validator từ chối score ngoài thang, kiểu sai, NaN/Infinity, câu trùng và trường bắt buộc bị thiếu.

### API/lifecycle

1. Lần đầu JSON hỏng, deterministic repair thành công: chỉ một lần gọi model, grade được commit, `teacherApproved = false`, có metadata repaired.
2. Repair thất bại, retry trả JSON hợp lệ: grade được commit, retry count bằng 1.
3. Cả hai lần hỏng: submission/ảnh không mất, grade cũ không bị ghi đè, không tạo history/evidence trùng.
4. `SAFETY`, quota, auth, ảnh không đọc được và assignment mismatch không bị retry như lỗi JSON.
5. Claim token, stale recovery, manual edit/delete/approve không bị race với retry.
6. Batch grading vẫn tiến hành được các submission khác; một submission lỗi không làm mất các bài đã chấm thành công.
7. Retry không làm tăng quota submission quá một nhiệm vụ và không tạo duplicate submission.

### UI/E2E và release gate

- E2E có fixture AI trả JSON lỗi rồi JSON đúng, kiểm tra trạng thái chờ → tự phục hồi → grade; fixture cả hai lần lỗi kiểm tra nút hành động và việc giữ ảnh.
- Kiểm tra copy giáo viên/học sinh không lộ `Bad escaped character`, raw response, noteForTeacher hoặc metadata nội bộ cho học sinh.
- Chạy targeted tests, full Vitest, rules, lint, lint:api, build và `git diff --check`.
- Chạy authenticated browser E2E trên fixture riêng/local controlled AI; production 11 Columbus chỉ smoke/read-only sau deploy, không dùng dữ liệu thật làm fixture và không tạo submission thử.
- Chỉ claim production-ready sau khi deployment mới ở trạng thái Ready/Production và QA xác nhận submission/grade hiện có không bị thay đổi ngoài phạm vi.

## Rollback và an toàn dữ liệu

Nếu parser/validator mới gây false negative, revert code về bản trước; không cần migration. Submission và grade cũ vẫn đọc được vì các field recovery đều optional. Không xóa hoặc rewrite dữ liệu production để rollback.

## Quyết định đã khóa cho implementation plan

1. Metadata dùng đúng tên/type `gradingRecovery` ở trên; không tạo collection diagnostics mới.
2. Classifier tách bốn nhóm: `parse/schema` (được repair/retry), `empty/max_tokens` (retry một lần bằng prompt ngắn), `provider/auth/quota` (không retry), và `image/assignment` (không retry, báo hành động dữ liệu).
3. Retry dùng cùng evidence, không gửi raw response hỏng, thêm chỉ dẫn cố định: JSON thuần, không code fence, mọi backslash trong chuỗi phải escape đúng JSON, công thức vẫn giữ LaTeX; retry không thay đổi phạm vi chấm.
4. Dựng fixture raw JSON tối thiểu tái hiện `Bad escaped character` trước khi sửa parser.
