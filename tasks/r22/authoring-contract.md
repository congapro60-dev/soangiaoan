# R22: Hợp đồng soạn học liệu Discover, lớp 10-12, học kỳ I

## 1. Nguồn và ranh giới

- PPCT người dùng cung cấp năm 2026-2027 quyết định tuần, tiết, tên bài, nội dung tiết và điểm kết thúc học kỳ I. Unit Plan chỉ bổ sung mục tiêu; không lấy số tiết/tuần trong tài liệu cũ để thay PPCT.
- `tasks/r22/ppct-hki.json` chốt phạm vi nội dung tuần 1-18 theo các ô kiểm tra cuối HKI: G10 E167:E168, G11 E171:E172, G12 E179:E180. Đây là `inferred_content_boundary`, không phải ngày kết thúc học kỳ chính thức. Trả/chữa bài tuần 19 nằm riêng ở `post_cutoff_feedback`; nội dung mới tuần 19 không thuộc lượt soạn này. Hàm số/phương trình đường thẳng lớp 10, hàm số mũ/quan hệ vuông góc lớp 11, xác suất có điều kiện/phương trình mặt phẳng lớp 12 bắt đầu ngoài cutoff; nguyên hàm/tích phân lớp 12 đã học trước cutoff.
- `tasks/r22/unit-objectives.json` lưu 6 Unit Plan: lớp 10 và 12 năm 2024-2025, lớp 11 năm 2025-2026. Có 52 mục tiêu overview nguyên văn, kèm URL, dòng trích, SHA256; năng lực, câu hỏi định hướng, tiêu chí đánh giá và mục tiêu tuần tách riêng.
- Cả 6 nguồn không ghi mã LO hoặc Must/Should/Could. `r22-*` chỉ là ID nội bộ. Không tạo mã chính thức dạng `T10.*`, `T11.*`, `T12.*`; không ghi mức do tác giả chọn thành phân tầng nguyên văn nguồn.
- `sourceLOexact` giữ cả lỗi chính tả trong nguồn. Có thể diễn đạt mục tiêu tiết học rõ hơn nhưng phải giữ trích dẫn gốc riêng, ghi đây là cụ thể hóa của tác giả theo PPCT. Câu hỏi định hướng không tự trở thành LO nguyên văn.
- Unit II cũ kéo dài sau mốc kiểm tra cuối kỳ. Lọc theo PPCT hiện hành trước khi soạn. Lớp 12 Unit II lặp lại 11 mục tiêu Unit I; không tính thành 11 nội dung mới. Chương V lớp 12 có tiêu đề/câu hỏi về vectơ pháp tuyến nhưng không có LO overview riêng.
- Giữ nguyên 17 gói lớp 11 hiện có và script sinh chúng. Gói mới dùng ID, file riêng; không sửa hash hoặc trạng thái gói đã có.

## 2. Đơn vị soạn và độ phủ

1. Lập một dòng kế hoạch cho mỗi tiết PPCT thuộc HKI, gồm `grade`, `week`, `period`, tên/nội dung nguyên văn, loại tiết, URL/dòng PPCT, mục tiêu nguồn tương ứng, ID gói hoặc ID đề thi.
2. Mặc định một gói cho một tiết. Chỉ gộp hai tiết khi cùng nội dung liền mạch, cùng mục đích và thời lượng thực tế được xác nhận; bảng phủ vẫn phải chỉ rõ từng tiết. Không tự biến hai tiết tách nhau thành một buổi 80 phút.
3. Một tiết nên đo 1-2 mục tiêu cụ thể, vừa thời gian. Không gắn cả LO học phần rộng vào một câu hỏi hẹp rồi coi đã phủ. Phải đối chiếu tất cả phần việc trong nội dung tiết PPCT.
4. Bài hình thành kiến thức cần thao tác/quan sát, giáo viên dẫn dắt và chốt kiến thức; bài luyện tập tập trung sửa lỗi; bài ôn tập kết nối đúng nội dung đã học. Đổi nhãn `purpose` không thay việc biên soạn nội dung.
5. Mỗi tiết `Tự chọn` là game luyện tập tích lũy theo yêu cầu người dùng. Ngân hàng chỉ dùng nội dung đã học tới tuần đó; nếu biết thứ tự tiết trong tuần, loại cả nội dung chưa đến lượt học. Nếu PPCT không đủ thứ tự trong tuần, ghi giới hạn này trong kế hoạch GV, không giả biết lịch thực tế.
6. Ngân hàng tích lũy phải bao quát tập nội dung đã học, nhưng một lượt chơi chọn tập câu vừa giờ. Ghi riêng độ phủ ngân hàng và độ phủ lượt chơi; không tuyên bố một tiết ngắn đánh giá độc lập toàn bộ học kỳ.
7. Có thể dùng ba ngân hàng riêng theo khối, chia tiểu chủ đề và các biến thể số liệu được kiểm. Mỗi tiểu chủ đề cần câu hỏi thực sự khác về kiến thức/cách biểu diễn/lỗi điển hình. Không lặp cùng một câu hỏi chung với tên bài thay thế để đạt số lượng.

## 3. Tái dùng bộ lắp gói hiện có

Ưu tiên `assembleLessonOutline` trong `lib/lesson/generation-outline.js:22`. Hàm thuần, không gọi AI. Nó tạo IDs, liên kết hai chiều, H1-H4, evidence, budget, mastery policy từ `lesson-outline-v1`. Không cần thêm một bộ lắp gói tương đương.

```js
import { assembleLessonOutline } from '../../lib/lesson/generation-outline.js';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const candidate = assembleLessonOutline(outline, {
  slotMinutes: periodSpec.minutes, subject: 'math', grade: periodSpec.grade,
});
const pkg = candidate.package;
pkg.id = periodSpec.id;
pkg.status = 'draft';
pkg.sourceRefs = periodSpec.sourceRefs;
// Bind each task to its actual cited source; preserve the returned citations.
for (const task of pkg.tasks) {
  const citation = candidate.citations.find(row => row.entityId === task.id);
  task.sourceRefs = periodSpec.sourceIdsFor(citation.segmentId);
  task.metadata = {
    ...task.metadata,
    sourceCitation: { segmentId: citation.segmentId, quote: citation.quote, origin: citation.origin },
    numericReviewRequired: citation.origin !== 'source',
  };
}
pkg.contentHash = hashPackage(pkg);
const validation = validateLessonPackage(pkg);
if (!validation.ok) throw new Error(JSON.stringify(validation.errors));
```

Đây là mẫu lắp gói, không phải script tự chạy: `outline`, `periodSpec` do ngân hàng/công đoạn map PPCT cung cấp. Mỗi `sourceRefs` phải có `{id, kind: 'external'|'repo', locator, label, verification: 'teacher_review_required', hash?}`. Giữ trích dẫn của objective/activity trong tệp đối soát hoặc metadata hợp lệ; bộ lắp chưa tự đưa toàn bộ citations vào package. Không tạo `lesson-source:*` giả để gọi luồng nguồn đã lưu.

`normalizeLessonProposal` trong `lib/lesson/proposal-result.js:40` là mẫu bind trích dẫn và nguồn đã nhập thực; chỉ gọi khi có source envelope thật, có segment và hash hợp lệ. Không cần gọi provider bên ngoài cho công việc R22.

`scripts/content/build-g11-ch2-review.mjs` và `content/lessons/g11-ch2-review.json` minh họa gói đầy đủ 80 phút: 12 hoạt động, các mức luyện tập, recheck, exit, rubric. Script này chạy là ghi lại gói cũ, không import để lấy helper. Không lấy việc mẫu cũ qua validator làm bằng chứng mọi quyết định sư phạm trong mẫu phù hợp bài mới.

### Cấu trúc outline cần tác giả điền

```text
format = 'lesson-outline-v1'
essentialQuestion: một câu hỏi dẫn hướng đúng phạm vi
objectives[]:
  statement, code (ID nội bộ rõ nghĩa), level ('must'|'should'|'could'),
  source {segmentId, quote nguyên văn, origin}, prerequisiteIndexes?;
  scopeSectionId? khi cần map nhiều nội dung
activities[]:
  phase, minutes nguyên dương, participation, objectiveIndexes[],
  studentAction, expectedProduct, teacherLookFor, transition,
  source {segmentId, quote, origin}, budgetRole ('core'|'reserve'|'optional'),
  tasks[]:
    type, prompt, minutes nguyên dương, objectiveIndexes[], participation,
    branch, isCore, requiresFullScaffold, supportRationale,
    inputSchema?, evaluation, hints[1..4],
    source {segmentId, quote, origin}, scopeSectionId?
uncertainties[]: những giới hạn thật, không để lời hứa kiểm chứng sau thay học liệu
```

`phase`: `experience`, `formation`, `guided`, `practice`, `recheck`, `exit`, `reflection`.
`participation`: `whole_class`, `individual`, `pair`, `group`.
`branch`: `shared`, `support`, `core`, `extension`.

Assembler yêu cầu mỗi activity có ít nhất một task. Activity `reflection` mặc định thành `reserve` nếu không ghi `budgetRole`. Nó đặt `transitionMinutes=0`, `prerequisites=[]`, `rubric` rỗng; tác giả phải điền/chỉnh phần cần dùng trước khi tính hash. Mặc định objective là `must`, không phải phân tầng lấy từ nguồn. `title`, `week`, `period`, `purpose`, `metadata` không được tự thêm ở cấp đầu package; lưu trong catalogue/manifest.

## 4. Điều kiện đủ cho một gói học

| Thành phần | Yêu cầu |
| --- | --- |
| Identity | `schemaVersion:'1.0.0'`, ID duy nhất, `version` SemVer, `status:'draft'`, `subject:'math'`, đúng grade; hash bằng `hashPackage(pkg)` sau lần sửa cuối. |
| Mục tiêu | Statement đúng nội dung tiết, có nguồn; prerequisite không vòng; mức là quyết định thiết kế được ghi rõ nếu Unit Plan không phân tầng. |
| Mở đầu | Mỗi LO có precheck/initialThinking; không dùng điểm nhóm thay hiểu biết cá nhân. |
| Học/luyện | Mỗi LO có minh chứng học/luyện thực; giáo viên có câu hỏi dẫn dắt, chốt kiến thức, lỗi cần quan sát và sản phẩm cụ thể. |
| Phân hóa | Hoạt động formation/practice cá nhân có ba nhiệm vụ song song cùng LO, cùng quỹ giờ: support/core/extension. Không bắt học sinh làm cả ba. |
| Support | H1 nhắc dữ kiện; H2 gợi chiến lược; H3 mở bước đầu; H4 ví dụ tương tự khác số. Không lộ đáp án; không phạt thời gian/điểm/đóng băng. |
| Core | Có ít nhất một gợi ý và `supportRationale`; không đánh dấu `isCore:true` cho nhánh support/extension. |
| Recheck | Mỗi LO có task cá nhân, đề khác task đã học/luyện, branch shared; không reflection. |
| Exit | Task cá nhân thứ hai, đo đúng LO; không gắn hàng loạt LO vào câu hỏi không kiểm chúng. |
| Mastery | Ít nhất hai task cá nhân độc lập khác ID mỗi LO; nguồn được phép: individual_recheck/independent_recheck/exit. Group product, map/race position, group score không được tính. |
| Thời gian | Tổng core/reserve/optional/transition không vượt slot; từng tổng bằng tổng activities cùng vai trò. Trong activity: shared minutes + max(support,core,extension) không vượt activity minutes. |
| Giữ độ khó | `objective.level`, nhánh nhiệm vụ và điểm game là ba khái niệm khác nhau; không coi điểm thưởng cao là chứng cứ vận dụng. |
| Bài mở | Rubric có criteria và lookFor cụ thể, đáp án/mốc quan sát do tác giả kiểm. Pending teacher assessment không ghi đúng hoặc mastery. |

Một gói 40 phút nhỏ thường cần một precheck, một phần dẫn dắt/chốt, một bộ ba nhiệm vụ song song, recheck và exit. Phân bổ thời gian theo nội dung; không nhân mẫu cứng cho mọi môn bài. Nếu không đủ thời gian để đánh giá hai lần từng mục tiêu, thu hẹp đúng phạm vi tiết hoặc tách gói, không bỏ kiểm tra bắt buộc.

Validator chỉ ép đủ H1-H4 khi `isCore && requiresFullScaffold`; yêu cầu support đủ bốn tầng vẫn phải tự kiểm. Validator kiểm cấu trúc liên kết, không chứng minh câu hỏi đo đúng LO hoặc gợi ý diễn đạt khác không lộ đáp án.

## 5. Câu hỏi, dữ kiện và Toán

- Task kín dùng checker hiện có: `numeric_exact`, `text_normalized_exact`, `choice_exact`, `multi_choice_exact`, `representation_match`, `ordering_exact`, `classification_exact`. Không nhúng code kiểm đáp án tùy ý.
- Numeric answerKey phải là số hữu hạn, sai số checker `1e-9`; nhận dấu phẩy thập phân/phân số đầu vào nhưng không tính biểu thức như `2*15`. Nêu đơn vị và quy tắc làm tròn khi cần. Không dùng checker này cho biểu thức tổng quát hoặc tập nghiệm nhiều cách viết; chọn đáp án hay rubric phù hợp.
- Choice có `inputSchema.options:[{id,label}]`; answerKey dùng ID, không nhãn. Ghép/thứ tự/phân loại phải đủ miền ID và có một nghĩa rõ ràng.
- Open/reflection chỉ có `evaluation.rubric:{criteria,lookFor}`, không `checkerId`/`answerKey`.
- Bài tự soạn dựa trên mục tiêu dùng `origin:'generated'` hoặc `adapted`; mọi số liệu/phương án/đáp án phải tự giải và kiểm. Không dùng `origin:'source'` với câu tự tạo hoặc trích rộng để hợp thức hóa số liệu không cùng bài.
- Công thức hiển thị dùng delimiter LaTeX rõ ràng ở prompt, option/card, title/body, sản phẩm và lời GV. Giữ đúng phân số, dấu âm, điều kiện xác định, đơn vị, hữu hạn/vô hạn; kiểm KaTeX và màn hình thật. Không dò regex để đoán toàn bộ plain math.
- Biến thể luyện lại phải có prompt khác, inputSchema và evaluation đầy đủ; tối đa 16 biến thể/task. Biến thể số không thay độ phủ tiểu chủ đề.

## 6. Vai giáo viên, học sinh và Khám phá

- Mở tiết từ bảng trắng/TV chờ/thiết bị chờ; nêu rõ GV giao việc, HS làm trên thiết bị/vở/bảng, lúc dừng và chốt. Nội dung đủ cụ thể để GV dạy ngay, không chỉ ghi "GV chọn bài phù hợp".
- GV quyết định START/NEXT, phân hóa, trợ giúp và sự kiện. Game đi theo tiết; sự kiện không lấn recheck/exit. Dự phòng tối thiểu 3 phút mới có sự kiện theo `teacherSetupAvailability`.
- Copy HS dùng tiếng Việt rõ, xưng `em`; không lộ mã LO, Must/Should/Could, provenance, hash hoặc nhãn quản trị. Những thông tin này thuộc màn GV/metadata. Mỗi lần chỉ hiển thị một câu/thẻ với nút chuyển dễ dùng, không nhồi toàn bộ ngân hàng vào màn chơi.
- Khám phá là phần đọc đa chiều thư giãn, không câu hỏi/options/phản tư bắt buộc, không evidence/mastery. Giữ nguồn riêng cho GV, không trộn trivia thành mục tiêu bắt buộc.
- Giới hạn runtime hiện tại: `lib/lesson/teacher-setup.js:12` chỉ mở Khám phá khi code là `T11.18`, `T11.19`, `SP-G11-W6-P38-MUST`; `lib/lesson/exploration.js` chứa ba thẻ Dãy số, quỹ 120 giây. Không gán giả các mã đó cho bài khác. Muốn triển khai Khám phá môn bài mới cần nội dung mới được đối soát và thay đổi runtime riêng; không tự tuyên bố đã có trong package.
- `Tự chọn` cần ngân hàng câu ôn tích lũy được viết thật và map đúng nguồn. Chọn bản đồ/luật không tự tạo học liệu hoặc chứng minh nội dung đủ.

## 7. Tiết kiểm tra và trả bài

- `lib/lesson/creation-context.js` chỉ nhận purpose `formation|practice|review`; `exam` không phải LessonPackage. Kiểm tra giữa/cuối kỳ dùng luồng `/exams`, `/exam`, API đề thi; đề không có hints hay routine recheck/exit của tiết học.
- `normalizeExamInput` trong `lib/exam/validate.js` dùng `{title,durationMin,settings,questions}` hoặc codes. Câu hỏi: `mc`, `tf`, `short`, `essay`; phải có điểm, dữ kiện, key/rubric đúng. Tối đa 80 câu; API nhận 5-300 phút nhưng wizard chỉ 5-240 phút. Thời lượng phải lấy lịch thực, không suy từ tên bài.
- PPCT có dòng kiểm tra không cung cấp sẵn đề/ma trận. Nếu tự soạn đề, ghi là bản đề mới cần GV duyệt; không mô tả đó là đề chính thức hay đề đã trích từ nguồn. Giữ hành vi chưa mở đề trước giờ, ẩn key/solution, và quyền review hiện hành.
- Tiết trả/chữa bài có thể là gói review với lỗi minh họa tự soạn; không bịa lỗi, điểm hay kết quả lớp thật. Nếu cần chẩn đoán từ bài kiểm tra thật, ghi rõ dữ liệu còn thiếu.

## 8. Kiểm chứng trước tích hợp

1. Đối soát catalogue với mọi dòng PPCT HKI Discover: không thiếu/trùng, đúng loại tiết, tiết kiểm tra tách route, mọi Tự chọn map game tích lũy, không lấy bài sau cutoff.
2. Giải lại mỗi câu/biến thể, kiểm LO thực sự được đo; nhánh độc lập, gợi ý không đáp án, recheck/exit khác câu, giới hạn và đơn vị đúng. Một assert theo đáp án được tính độc lập có giá trị hơn so answerKey với chính nó.
3. Gói mới qua hash/validator, source citation exact check, KaTeX. Ghi SHA trước/sau của 17 gói hiện có để chứng minh không sửa chúng. Danh sách public không chứa answerKey; lấy full package vẫn cần auth.
4. Tests tác động: `lesson-authored-content`, `lesson-contract`, `lesson-new-question-types`, `lesson-generation-outline`, `lesson-source-binding`, `lesson-source-numeric-lists`, `lesson-runtime`, `lesson-session-scope`, `lesson-teacher-setup`, `r17-creation-context`; thêm exam/route tests khi thực sự tích hợp đề thi.
5. Test thư viện hiện hardcode 17 và 8 gói Must; khi root tích hợp catalogue mới, kiểm riêng 17 gói cũ còn nguyên rồi kiểm số gói mới từ manifest. Không sửa assert thành ngưỡng lỏng để qua test.
6. Root chạy lint, typecheck, build, verify:assets và suite giới hạn concurrency; sau đó browser QA thật theo khối/loại tiết, điện thoại/desktop, chọn đáp án/nộp/tiếp câu, công thức, TV/GV. Trạng thái draft/nguồn trích/validator pass không đồng nghĩa đã lưu, được duyệt, phát hành hoặc đã dạy thử.

Kiểm trích dẫn nguồn có thể chạy lại từ repo bằng PowerShell:

```powershell
@'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const data = JSON.parse(readFileSync('tasks/r22/unit-objectives.json', 'utf8'));
assert.equal(data.units.length, 6);
let total = 0;
for (const unit of data.units) {
  const raw = readFileSync(unit.sourceFile, 'utf8'), lines = raw.split(/\r?\n/);
  assert.equal(createHash('sha256').update(raw).digest('hex'), unit.sourceSha256);
  for (const lo of unit.sourceLOexact) {
    assert.equal(lo.statement, lines[lo.reference.location.lineStart - 1]);
    assert.equal(lo.reference.excerpt, lo.statement);
    assert.equal(lo.reference.sourceURL, unit.sourceURL);
    assert.equal(lo.sourceCode, null);
    assert.equal(lo.sourceLevel, null);
    total++;
  }
}
assert.equal(total, 52);
console.log('6 sources, 52 exact objectives: PASS');
'@ | node --input-type=module
```

Phạm vi lượt trích này: tạo `unit-objectives.json` và hợp đồng này; chưa soạn lesson/đề thi, chưa đổi app/catalogue, chưa build hoặc phát hành. Source snapshot và yêu cầu người dùng là bằng chứng; không lấy số lượng template hoặc test xanh làm chứng cứ phủ toàn SGK.
