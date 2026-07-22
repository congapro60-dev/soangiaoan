# Lessons Learned

> Updated after every correction. Reviewed at session start.

---

## TypeScript

- **setBulkProgress reset must include all fields** — `{ current: 0, total: 0, currentTitle: '' }` not just `{ current: 0, total: 0 }`. Local Vite build passes but GitHub CI (strict tsc) catches it. Always run `npx tsc --noEmit` before committing. *(2026-04-21)*

- **`replace_all: false` fails when string appears twice** — When using Edit tool, if `old_string` matches more than once the edit fails. Add more surrounding context to make it unique. *(2026-04-21)*

## Firebase

- **`browserSessionPersistence` logs users out on tab close** — Use `browserLocalPersistence` (Firebase default) unless logout-on-close is intentional. *(2026-04-21)*

- **Firestore writes need try/catch + user feedback** — Silent failures destroy trust. Always wrap `setDoc`/`deleteDoc` in try/catch and show error toast on failure. *(2026-04-21)*

## React / State

- **Rename in view mode must sync to Firestore** — When updating `data.gradingSessions` via `setData`, also call `persistSession(updatedSession)` to write through to Firestore. Local state update alone is lost on reload. *(2026-04-21)*

- **Bulk loop needs cancel ref reset at start** — Set `cancelBulkRef.current = false` before the loop begins, otherwise a previous cancel bleeds into the next run. *(2026-04-21)*

## Git Workflow

- **NEVER push to `main` without explicit user order** — All development stays on feature branch. Only push to `main` when user explicitly says "push to main" / "merge" / "ra lệnh". The stop-hook warning is not a reason to push to main automatically. *(2026-04-28)*

## Adaptive / Nội dung Toán học

- **MỌI text hiển thị có công thức phải qua `mathText.sanitizeDisplayText()` — CẤM viết regex xử lý công thức mới ngoài `src/lib/adaptive/mathText.ts`** — 8 đợt QA lỗi công thức (E3/E4/E7/F1/F2/F9) đều cùng gốc: nhiều regex chồng nhau không nhận biết vùng `$...$`, chèn `$` vào TRONG vùng math có sẵn → tách đôi công thức. Nguyên tắc module: tokenize math/text trước, transform chỉ chạy trên đúng loại vùng, `assertClean` hậu-kiểm. QA bắt được chuỗi lỗi mới → THÊM golden test vào `mathText.test.ts`, không chỉ vá regex. *(2026-07-07)*

- **Sửa spec hiển thị = sửa CẢ HAI nhánh (bài mới structured + fallback bài cũ)** — F5: đổi nhãn gói Luyện tập chỉ sửa nhánh `practiceSet`, nhánh fallback giữ nhãn cũ → bài tạo trước fix vĩnh viễn trông "chưa fix", user mất niềm tin. Verify phải render cả 2 nhánh. *(2026-07-07)*

- **State học sinh trong localStorage phải scope theo HỌC SINH + có version trong key** — F3: key vở ghi theo máy (`v2-<lessonId>`) làm học sinh phòng tin học thấy vở của nhau, VÀ note cũ "ma" che mất fix mới → QA tưởng fix hỏng, dev tưởng QA sai (lặp nhiều đợt vì F4/F13 đều là bóng ma storage). Đổi format note = bump version key. *(2026-07-07)*

- **Điều hướng tự do (TOC mở khóa) → giá trị dẫn xuất phải render trong `navTo()`, không chỉ ở luồng tuần tự** — F7: điểm Tổng kết chỉ cập nhật trong `finishLesson`, nhảy TOC vào summary thấy 0 điểm. Mở khóa điều hướng thì mọi số liệu màn đích phải tính lại lúc vào màn. *(2026-07-07)*

- **Pipeline sinh học liệu không được nuốt lỗi im lặng** — D6: TikZ fail thì retry 1 lần KÈM thông báo lỗi Kroki cho AI tự sửa; warning phải ghi nguyên nhân gốc (429 vs cú pháp); lỗi relay phải kèm body. Cảnh báo chung chung = không ai sửa được. *(2026-07-07)*

- **Chọn loại mô phỏng theo ĐÚNG phân môn Toán, không suy từ keyword rời** — Bài Xác suất bị nhét mô hình hình học 3D vì regex bắt cụm "không gian mẫu" thành "không gian" (hình học). Token rời như "không gian", "mặt phẳng", "đường thẳng", "tọa độ" xuất hiện ở nhiều phân môn → đoán loại học liệu bằng chúng là sai bản chất. Nguyên tắc: (1) để AI tự chọn học liệu theo phân môn qua bảng "phân môn → loại học liệu" trong prompt; (2) heuristic code chỉ là fallback BẢO THỦ — chỉ dựng hình học khi có tên hình cụ thể (hình chóp/tam giác/đường tròn…), mơ hồ thì trả undefined; (3) chặn trước các phân môn phi-hình-học (xác suất/thống kê/tổ hợp/giải tích) trước khi xét hình học. Vị trí: `adaptiveFromLessonPlan.ts` `buildDefaultSimulationSpec` + `buildGeometry3DSimulationSpecFromJson` + prompt unit/sim. *(2026-06-24)*

## Firestore Rules

- **Cổng học sinh là link công khai → rule phải cho đọc ẩn danh có điều kiện** — `adaptiveLessons` chỉ `allow read: if request.auth != null` chặn học sinh ẩn danh (quét QR) → cổng "Không tìm thấy bài học". Doc bật cổng (ghi bởi AdaptiveLearningTab) là dạng bọc có `portalEnabled: true`. Fix: `allow read: if request.auth != null || resource.data.get('portalEnabled', false) == true;` (chỉ lộ bài đã bật cổng). Dùng `.get(key, default)` để không lỗi eval khi field vắng. Nhớ `firebase deploy --only firestore:rules`. *(2026-06-24)*

## Workflow / Testing

- **Test bài học phân hóa PHẢI đóng vai học sinh học thật, không chỉ soi DOM** — Đếm số `.sim-frame`/`.vc-gallery` qua DOM KHÔNG phát hiện được: gợi ý/đáp án là placeholder, MathJax không render trong iframe mô phỏng, bước câu hỏi nhồi nguyên khối, nút "Hoàn thành" bị đơ, Vở ghi sai cấu trúc. Phải thực sự: bấm hết nút, đọc nội dung từng gợi ý/đáp án, đi hết các bước/hoạt động, kiểm điều hướng, đọc Vở ghi. Đây là cách user phát hiện 7 lỗi mà 2 vòng test trước (DOM-only) bỏ sót. *(2026-06-26)*

- **Khi viết prompt kiểm thử cho cowork → PHẢI bật dev server trước** — Cowork là sandbox Linux, không chạy được Vite bản Windows (sai platform binary). Tôi chạy trên máy Windows thật nên dùng PowerShell khởi động `npm --prefix "..." run dev` (background, port 3000) TRƯỚC khi đưa prompt, rồi nói rõ "server đã chạy sẵn ở http://localhost:3000, đừng tự chạy". Không bắt cowork tự dựng server. *(2026-06-23)*

## OMML / Word Equation (inject vào docx)

- **`<m:oMathPara>` KHÔNG được đặt trực tiếp trong `<w:tc>`** — Inject `<m:oMathPara>` thay thế `<w:p>` khi placeholder nằm trong table cell → công thức render sai, bị cắt. Cấu trúc đúng trong table cell: `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><m:oMath>...</m:oMath></w:p>`. `<m:oMathPara>` chỉ dùng ở body level (ngoài bảng). *(2026-07-09)*

- **Detect `</w:tc>` phải dùng exact 7 ký tự, không phải 6** — `</w:tc` (6 chars) khớp cả `</w:tcPr>`, `</w:tcMar>`, `</w:tcBorders>` → depth giảm sai, toàn bộ placeholder bị nhầm là "ngoài bảng". Fix: `xml[i:i+7] == '</w:tc>'`. *(2026-07-09)*

- **Dùng Pandoc để generate OMML thay vì viết tay** — Pandoc convert LaTeX→docx→extract `<m:oMath>` từ document.xml. Quality cao hơn nhiều (handles subscripts, accents, operators, vectors đúng). Chạy: `pandoc eq.md -o eq.docx` rồi unzip và đọc `word/document.xml`. *(2026-07-09)*

- **Namespace `xmlns:m` phải có trong `<w:document>`** — Nếu thiếu thì inject trước: `xml.replace('<w:document ', '<w:document xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ', 1)`. *(2026-07-09)*

- **JS backslash escape trong LaTeX string — 4-backslash rule (CRITICAL)** — Khi viết LaTeX có backslash vào JS string literal qua Python transformation script: dùng `'\\\\vec{n}'` (4 backslash trong Python) → file chứa `\\vec{n}` (2 backslash) → JS runtime đọc thành `\vec{n}` (đúng). Dùng `'\\vec{n}'` (2 backslash trong Python) → file chứa `\vec{n}` (1 backslash) → JS parse `\v` thành vertical tab (U+000B) + `ec{n}` → KaTeX nhận sai input → output `ecn(a;b)` thay vì đúng. Tương tự `\o` bị parse thành `o` (không phải `\o`). Phát hiện: `re.findall(r'\$\\(?!\\)([a-zA-Z])', src)` — nếu có kết quả là bug. *(2026-07-09)*

- **`mathml2omml` là named export, KHÔNG phải default** — `const mml2omml = require('mathml2omml')` → TypeError. Đúng: `const { mml2omml } = require('mathml2omml')`. *(2026-07-09)*

- **KaTeX MathML preprocessing trước khi truyền vào mml2omml** — `mml2omml` không xử lý được `<semantics>` và `<annotation>` từ KaTeX output → throw "Type not supported: annotation". Phải extract chỉ phần `<math ...>...</math>` raw (dùng regex `/<math[\s\S]*?<\/math>/`), loại bỏ `<semantics>`/`<annotation>` trước khi gọi mml2omml. *(2026-07-09)*

- **`<m:chr m:val="⃗"/>` (U+20D7) là OMML đúng — KHÔNG phải bug Unicode** — `mml2omml` tạo ra ký tự combining enclosing upward pointing triangle (U+20D7) trong `<m:acc>` element để biểu diễn vector arrow. Đây là cách đúng của OMML. Kiểm tra "Unicode ngoài OMML" cần exclude các chuỗi `<m:...>` khi đếm. *(2026-07-09)*

- **Pipeline OMML hoàn chỉnh trong build script (không cần inject step)** — Thay vì placeholder → inject, có thể tích hợp toàn bộ pipeline `katex → mml2omml → xml-js → convertToXmlComponent` trực tiếp trong Node.js build script dùng docx library. `convertToXmlComponent` từ docx v9.7.1 nhận xml-js parsed object (`{ type:'element', name, attributes, elements }`) và trả về `ImportedXmlComponent` serializable. Cần `sanitizeOmmlTextNodes()` để escape `< > &` trong `<m:t>` nodes trước khi xml2js parse. *(2026-07-09)*

## Đọc tài liệu vs. đọc code

- **File kế hoạch (`*_plan.md`) KHÔNG phải bằng chứng về trạng thái code — phải grep code trước khi báo cáo "chưa fix"** — Tôi đọc `tasks/adaptive_lesson_fix_plan.md` (viết 2026-06-18) rồi kết luận với user "6 bug adaptive chưa được fix". Thực tế cả 6 đã fix xong từ lâu qua 9 đợt QA (`1aab05a` → `993098a`), nhiều chỗ còn làm sâu hơn plan (blueprint 2 pha ép 1 unit/mục tiêu, `guiding_answers` ngoài `guiding_questions`, registry công cụ ngoài). User phải tự phản biện "tôi tưởng fix rồi chứ?" mới lộ ra. Plan doc mô tả Ý ĐỊNH tại thời điểm viết, không có ai cập nhật lại sau khi làm xong → mặc định coi là STALE. Quy tắc: trước khi nói bất kỳ thứ gì "chưa làm/còn dở", grep ít nhất 1 symbol đặc trưng của mỗi hạng mục trong `src/`, và xem `git log -- <file>`. Nếu chỉ đọc doc thì phải nói rõ "theo tài liệu X, chưa verify code". *(2026-07-22)*

## Đóng gói / Chuyển giao phiên làm việc

- **Luôn viết `tasks/session_*.md` sau phiên phức tạp** — File này là "bản đồ" cho phiên mới: file đầu ra ở đâu, build pipeline như thế nào, bug đã fix, vấn đề còn lại. Cả Cowork lẫn Claude Code đều đọc được. Xem ví dụ: `tasks/session_khdh_bai19.md`. *(2026-07-09)*

## UX Patterns

- **API key banner must name the active provider** — Generic "no API key" message is confusing when user has keys for other providers. Check active provider specifically. *(2026-04-21)*

- **Empty states are mandatory** — Every list/grid must handle `length === 0` with icon + message + CTA. Blank space = broken to new users. *(2026-04-21)*

- **File upload needs size guard** — No size limit = browser hangs on large files with no feedback. Default max: 20MB with clear error toast. *(2026-04-21)*

## E2E trong Browser pane (Claude Code)

- **Browser pane không chụp được screenshot nhưng DOM tools vẫn sống** — `computer{screenshot}` timeout 30s liên tục, nhưng `read_page`/`get_page_text`/`javascript_tool`/`form_input` hoạt động bình thường. Đừng bỏ cuộc vì screenshot hỏng; verify bằng text/DOM. Click theo `ref` có thể trượt sau khi UI re-render — click qua JS (`[...document.querySelectorAll('button')].find(...)`) ổn định hơn. *(2026-07-16)*

- **Test AI flow trên localhost cần proxy /api → production** — Vite dev KHÔNG serve Vercel Function trong `api/` → relay 404. Đã thêm `server.proxy['/api'] → https://giaoandewey.vercel.app` trong vite.config.ts. Demo mode + đổi `settings.selectedProvider` trong localStorage (`smart_lesson_plan_data`) là đường vào không cần login. Khi relay/pool chết thật sự, stub `window.fetch` cho `/api/gemini-relay` để E2E toàn pipeline (parse → gate → repair → PPTX) mà không phụ thuộc model. *(2026-07-16)*

## Error UX

- **Catch chung nuốt mất thông báo lỗi có hướng dẫn** — Lỗi chính sách (thiếu API key) throw message tiếng Việt đầy hướng dẫn nhưng user chỉ thấy "Lỗi cấu trúc hoặc kết nối AI" vì catch trong exportUtils hiển thị text cứng. Pattern fix: lỗi policy đặt `err.name` riêng (`MissingApiKeyError`) + export helper `isMissingApiKeyError()`, catch nào hiển thị toast thì surface nguyên văn `e.message` khi match. E2E phải kiểm ĐÚNG text user thấy, không chỉ kiểm console. *(2026-07-21)*

- **Pipeline nhiều bước AI: bước "trang điểm" cuối phải degrade gracefully, không được ném mất thành quả** — Planning → Content → Format đều gọi AI; call thứ 3 dễ dính 429 nhất (quota đã bị 2 call trước ăn). Format throw → user mất trắng giáo án đã sinh + editor kẹt ở placeholder "(Hệ thống đang chuẩn hóa...)". Quy tắc: bước nào chỉ cải thiện hình thức (format/polish/QA-repair) thì lỗi → trả bản trước đó, và mọi placeholder "đang xử lý..." bơm vào editor phải được thay thế trong MỌI nhánh thoát (kể cả catch). *(2026-07-21)*

## Cowork vs. tự làm

- **Tự chạy được thì đừng bảo cowork làm** — Với Browser pane (mở web, click, đọc DOM/network, chạy JS), tôi tự E2E được HẦU HẾT luồng public: cổng học sinh (chỉ mở URL + nhập ô), demo mode giáo viên, kiểm response API bằng fetch. Chỉ cần cowork/user khi thao tác đòi credential thật (Vercel dashboard, đăng nhập Google OAuth, mua/nạp key có tính phí). Đừng mặc định viết prompt cowork cho việc mình làm được. *(2026-07-21)*
