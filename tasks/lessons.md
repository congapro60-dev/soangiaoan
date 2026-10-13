# Điều phối model — 2026-10-07

- 10/10/2026: owner yêu cầu “Cần lịch sử chính xác từ server” cho cảnh báo đứng cổng. Không thay bằng thời gian cockpit mở, đồng hồ lớp hay timestamp chấm bài. Lưu mốc server, trừ pause/arena; phiên cũ thiếu lịch sử ghi rõ chưa có dữ liệu, không hồi tố.

- 10/10/2026: AGENTS mới thay `opencode-first` bằng `dieu-phoi-ai`; skill hiện ở `C:/Users/ADMIN/.claude/skills/dieu-phoi-ai/SKILL.md`. Kiểm model/canary live, giữ quota còn lại `unknown` khi không có số liệu. Review khác hãng chỉ đọc; đánh giá bằng repro/source đầy đủ, không coi số reviewer là bằng chứng. 9Router có thể trả SSE dù `stream:false`; đọc đúng envelope trước kết luận canary/model thất bại. Không in credentials hoặc cấu hình provider đầy đủ.
- Người dùng yêu cầu dùng Claude/GPT trên Antigravity: chọn đúng `9router-local/ag/*`. `cc/*` là tài khoản Claude Code riêng; không suy quota từ tên model hoặc nhóm model chung.
- Trước khi giao việc, xác nhận route cụ thể. Mọi worker/reviewer dùng `ag/*`, không tự gọi subagent có cấu hình `cc/*`; Astra chỉ dùng khi gặp lỗi khó thực sự theo chỉ dẫn người dùng.
- Hạn mức hiển thị trên ảnh không thay bằng chứng lượt gọi thật. Lỗi 429 hoặc reviewer chưa trả kết quả là chưa kiểm chứng, không phải PASS.
- Không khởi chạy CLI thứ hai trên session còn chạy; một writer cho mỗi file. Giữ toàn bộ WIP, không commit/push/deploy khi chưa được yêu cầu.
- Cập nhật trực tiếp từ người dùng: gọi Antigravity qua 9Router, bỏ điều phối OpenCode Desk. Các lượt mới gọi HTTP qua loopback 9Router; Codex đọc/sửa file và chạy kiểm tra. Không tự tạo thêm ứng dụng điều phối.
- Antigravity đã cập nhật Opus 5.5 theo người dùng; danh mục 9Router v0.5.95 hiện còn 4.6. Phải xác minh ID upstream, không coi số quota còn lại là chứng cứ model dùng được; chưa thay danh mục toàn cục bằng tên đoán.

- 2026-10-08: 9Router /v1/models confirmed Antigravity routes ag/claude-sonnet-4-6, ag/claude-opus-4-6-thinking, Gemini 3.8 and GPT-OSS; desktop Opus/Sonnet 5.5 labels currently return upstream 404 when guessed as ag/*; verify IDs before use.
- Không tìm kiếm giá trị khóa bằng rg hoặc in toàn cấu hình provider. Đọc khóa vào biến để gọi API; chỉ xuất trạng thái HTTP, tên model và kết quả đã lọc.

- 2026-10-08: khám phá kết nối/quota bằng `/api/providers` và `/api/usage/:connectionId` của service đang chạy. `%APPDATA%\9router\db.json` có thể là bản cũ; thiếu kết nối trong file không chứng minh runtime thiếu Antigravity. Quota trả model ID 4.6 dù ảnh IDE ghi 5.5; giữ hai bằng chứng riêng, không tự đổi alias toàn cục.
- Validator cấu trúc xanh chưa chứng minh hint không lộ đáp án hoặc từng câu đo đủ mục tiêu. Giữ artifact canary, kiểm prompt/key/hint/phân hóa trước duyệt học liệu; repair phải giữ draft đầu khi thay nội dung ngoài phạm vi.
- Khi preview mô tả precheck có hữu hạn/vô hạn, đọc từng nhiệm vụ và miền chỉ số trước kết luận lỗi: bài có thể đang so sánh mô hình thực tế hữu hạn với mô hình mở rộng vô hạn. Không sửa học liệu chỉ từ nhãn hoạt động rút gọn.
- 2026-10-08: local Teacher Studio rehearsal: DOCX trích 6 spans, proposal 95% needs_review, approve bị chặn khi thiếu xác nhận nguồn, Preview room tạo mã B23673, HS QA Student join, Cockpit nhận 1 learner. AI button báo chưa cấu hình; không giả vờ online AI.
- 2026-10-08: QA phát hiện `NEXT` có thể bỏ qua activity đầu khi session `waiting`; chặn ở cả `lib/lesson/runtime.js` và nút Cockpit. Server guard là nguồn đúng, UI chỉ hỗ trợ trải nghiệm.
- 2026-10-08: extension route phải đứng sau recheck và trước exit; sửa fixture v1.1 optional 2 phút, reserve còn 2 phút. `extensionEligibility` kiểm latest individual_recheck assessed, loại assisted/hint/reveal; không dùng final mastery 2 evidence để mở sớm.
- Group product: first correct answer giữ nguyên khi retry; closed group task thiếu checker trả INVALID_TASK; group task đã REVEAL không nhận reward. Full gate sau slice 517/517.
- Copy learner phải phân biệt “đủ điều kiện mở phó bản” với “đạt mastery cuối tiết”; exit vẫn là evidence riêng.
- 2026-10-08: presenter popup/handshake không đáng tin trong IAB; thêm fallback session query không token, server xác thực Site owner/cohost rồi trả projection presenter ẩn danh. Không dùng learner route.
- `lessonMediaEvent` bỏ qua submission `assessmentStatus=pending`; chỉ phát verdict sau teacher assessment. `PlayPage` đọc `result.correct`/`pending`, không phát “đúng” mặc định sau POST.

- 10/10/2026: owner chê cú3D xấu sau technicalgate. Triangle/size/FPS PASS không chứng minh đạt ngoại hình. Lượt sau dựng bảng sprite2D+candidate cùngcamera/light cho owner duyệt trước khi nhân rộng; ghi đúng rig thật vs rootmotion và thất bại dịch vụ, không lấy claimmodel đẹp thay bằng ảnh.

- 12/10: không đồng nhất hoàn tất lát T1–T11 với toàn mục19. Trước claimfullDONE phải mapping từng yêu cầu ảnh/transcript → code/UX/test thực, nhất làA10/trợgiảng/ôn nhiều bài/Jeopardy/3làn; sốtestgreen khôngchứngminh requirementchưađược viết. Kiểm nguồn dự án mẹ trước kết luậnthiếuhọc liệu, PPCTobjectivestrống không phải nguồnYCCĐ.

- 12/10: QA trợ giảng phải đọc gợi ý hiển thị thật; `notAnswer=true` chỉ là metadata. Dãy số `hint-core-1` từng chứa nguyên30/66. Sửa câu dẫn dắt, cập nhật hash và catalogue cùng lúc; không thay package immutable đang chạy.
- 12/10: test sức chứa phải kết hợp lịch sử trợ giảng, bảng/receipt sự kiện và bài nộp150HS; từng tính năng đạt cap riêng không chứng minh state kết hợp an toàn. Không xóa audit hoặc nâng cap để làm xanh kiểm tra.

- 12/10: hai em trên cùng máy có thể cùngtask; controlID/radioname phải dùng `React.useId`, không task.id. Kiểm DOM/SSR hai instance cùng nhiệm vụ, nhãn trỏ đúng một ô; giữ task.id cho business/draftidentity.
- 12/10: sau thay đổiUI làm build đổi entryhash, giữ evidencebackend cũ theo đúnghash; nếu claim ứng viên cuối phải lặp HTTP trên hash cuối hoặc ghi giới hạn module code unchanged. Không gộp seedreducer6310lệnh thành HTTP900/150join mới.

- 12/10: sửa runtime/QA chưa đủ nếu landing/luật còn copy cũ. Kiểm từ trang vào → mãphòng → briefing → map; không ghi30phút hoặc cáchdùngthiếtbị chung khi chưa đọc config. Tách thếgiới/bối cảnh khỏi luật/chếđộcanonical, choHS xemlại luật ngaytrong map.

12/10: QA mãphòng phải dùng giá trị producer thật. Gamecode alphabet2–9 khác lessoncodehex0–F; room-info chung nhận6alphanumeric, vẫn lookupDB và giữ auth/PIN. Test có0/1; kiểm mã thực trên trình duyệt, không chỉ fixtureABC234.
12/10:R8 đóngtab làm mấtsessionStoragejobid dùD1giữnháp. Khôi phục needs_review bằngowner+sourceSHA+parserRevision+extractionHash,khônggọiAI;late response khôngđèqueued/runningmới. Citationrepair chỉbroadengenuinequotechođúngtasknumericerror;countguardchặnthêmhint/entities,cấmorigin/segmentđổi. TruncatedDBcell khôngđủđốisoát; khôngrepairprovenance từpartial.
13/10: Owner thấy u_n/u_3 textthô trong Khám phá sau claimUIpassed. Mọi richtext có Toán(title/body/question/options/teacherpreview/TV) phải explicitLaTexdelimiter và dùng MathText chung. Kiểm ảnh+DOMKaTeXMathML,không chỉ screenshot bố cục. Không regexđoán plainmath hoặc thay câu/số/đápán để sửa format. Testfullrendererđạt không chứng minh componentmới đã dùng renderer.
13/10: Owner chỉra Khámphálàđọcđa chiềuthưgiãn, khôngquestion/options/phản tư. Không thêm assessment chỉ vì muốntrackengagement. HS copy khônglộMust/T11/provenance/admin; metadatađốisoát riêngteacher. QA phảiđốichiếu intendedaudience/workloadvàflow trướcassertfeatureDONE. Teacherfacing nhiềuoptions phải có1proposalauto+buttonsetup trướclaunch, manualdetails sau;khôngnhầm đủchức năng=vừaUX. R10/UIgreenkhôngthaypedagogicalacceptance.
13/10: OwnerchênhiễuHUDbuttonvàscrollnhiềucâu. CópopupkhôngđồngnghĩaUXgọn: kiểmdefaultscreenbuttoncount/stackedauxpanels/tasklist. Onequestion/cardvisible,NextBacknavigationonly,hiddenmountedinputsdraftbeforedebouncekept. Matchingpartsonechecker giữ1task. 2D/3DsameaccessibleUIcanonicalIDs; khônglấyviewportpagewidthPASSthayvisiblecontentfit. Longcontentlocal scrollpreferred overclipping/tinyfont.

13/10 R13: QA màn nhỏ phải đo scrollHeight/clientHeight sau animation, kiểm nút footer luôn thấy; SSR/screenshot lúc transition không đủ. CSS .lesson-button có display làm hidden trigger xuất hiện: cần quy tắc [hidden] rõ ràng. Menu opener bị unmount khi mở dialog phải có focus fallback. Review model là đầu vào: đối chiếu repro; không nhân đôi CTA hoặc bỏ actor key gây lộ nháp giữa HS chỉ để làm xanh review.
