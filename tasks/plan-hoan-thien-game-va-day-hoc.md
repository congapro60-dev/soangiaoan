# Kế hoạch tổng thể nâng cấp Mật Mã Đa Giới

- Phiên bản: 2026-10-08-r5 (r4 + mục 17: trạng thái thực tế và bổ sung).
- Trạng thái: đang triển khai theo r4; xem mục 17.1 để biết đợt nào đã xong. Các mục 1–16 giữ nguyên làm căn cứ.
- Phạm vi lượt này: tổng hợp yêu cầu, kiểm tra nguồn hiện có, thiết kế hành vi, chia đợt và định nghĩa nghiệm thu.
- Site hiện có: https://toan-thpt.cuong-vuviet.chatgpt.site
- Project ID: appgprj_6abd9dee373c81918861834328bbaf0f.
- Kho mã game: C:/Users/ADMIN/.codex/worktrees/6dec/signal-station-site.
- Nhánh kiểm tra: codex/mat-ma-da-gioi; HEAD b21f4c9b2ea9cc26e7b53182f79e027ed6e84cb1.
- Tài liệu này thay thế bản kế hoạch r3; ghi chú phiên trước chỉ là lịch sử.
- Mọi đường dẫn module tương đối dưới đây tính từ kho mã game, trừ khi ghi rõ SmartPlan.

## 1. Kết quả cần đạt

Giáo viên đưa một giáo án/kế hoạch dạy học lên app. App tạo bản tổ chức một tiết bằng game: mục tiêu, cốt truyện, nhiệm vụ, tương tác, thời lượng, phân hóa, luật chơi, ghép nhóm, phân vai, điểm và phần thưởng. Giáo viên xem một bản tổng hợp, chỉnh phần cần thiết và duyệt trước khi mở phòng.

Khi dạy, app tự thực hiện các bước đã duyệt; giáo viên quan sát, chuẩn hóa kiến thức và can thiệp khi cần. Học sinh chơi trong cùng một thế giới, có nhiệm vụ cá nhân, nhiệm vụ chung và tuyến hỗ trợ/thử thách phù hợp.

Kết thúc tiết phải biết mỗi em đã làm gì, làm được độc lập đến đâu, đã nhận hỗ trợ nào và cần học tiếp gì. Không đồng nhất thắng game, làm xong nhiệm vụ và đạt mục tiêu.

### Nguyên tắc 0 — màn chơi chính là bản đồ linh vật (xác nhận ngày 08/10/2026)

Đây là game tương tác trên **bản đồ chiến thuật** (kiểu Heroes of Might and Magic 3/4, Total War): cả lớp thấy cùng một bản đồ địa hình, mỗi em hoặc mỗi nhóm có một **linh vật**. **Lắc xúc xắc thì linh vật đi đúng số ô** trên đường; tới trạm thì gặp nhiệm vụ. Mọi chế độ chơi (nhóm, cá nhân, đôi, sinh tồn, chiếm khu…) đều dùng chung cơ chế này.

**Đơn vị trên bản đồ ở chế độ Học tập là từng cá nhân** (xác nhận 08/10/2026): học là việc của từng em, mỗi em một linh vật, một vị trí, một bằng chứng. Nhóm chỉ xuất hiện trong lúc có hoạt động nhóm, và không thay thế linh vật cá nhân. Khi cần giảm rối (ví dụ 50 em trên TV), gộp theo **vị trí** (nhiều linh vật ở gần nhau thành một chùm có số lượng, phóng to mới tách ra), không gộp theo tổ. Học sinh thấy rõ linh vật của mình; bạn khác chỉ hiện thành bóng nhỏ không tên.

**Chủ phòng toàn quyền chọn chế độ và hình thức chơi** (cá nhân, đôi, nhóm, thi đấu theo tổ, sinh tồn, chiếm khu…), cho mọi loại tiết, không có tổ hợp nào bị ép theo loại tiết (học, luyện tập hay ôn tập). Hệ thống chỉ **gợi ý** dựa vào giáo án gửi lên và mục đích học tập của bài; giáo viên đổi được tất cả. Khi chủ phòng chia nhóm từ đầu để thi đấu thì linh vật và bảng điểm theo nhóm, màn TV gộp theo tổ và học sinh thấy các tổ khác. Mỗi em vẫn có bằng chứng cá nhân riêng. Mặc định khi chưa chọn gì ở chế độ Học tập là từng em một linh vật.

Chế độ Học tập **không phải một ứng dụng làm bài riêng**. Bài dạy chỉ là nguồn **cấp nhiệm vụ, bằng chứng và hỗ trợ** cho các trạm trên chính bản đồ đó. Học sinh vừa chơi vừa học trên cùng một màn hình. Một màn hình dạng danh sách câu hỏi hoặc biểu mẫu, dù có nút xúc xắc bên cạnh, **không đạt** yêu cầu này. Mọi nghiệm thu của P3 trở đi phải thấy linh vật di chuyển trên bản đồ khi lắc xúc xắc.

### Các nguyên tắc đã thống nhất với người dùng

1. Giữ thương hiệu Mật Mã Đa Giới; bỏ tên cũ khỏi trải nghiệm hiển thị, giữ alias cần thiết cho dữ liệu cũ.
2. Hai chế độ chính: Học tập và Luyện tập.
3. Giữ nhóm, đôi, cá nhân; giữ các luật và kỹ năng đã có.
4. Giữ map cổ trang, Lôi Đài Ngũ Ấn và linh vật tỉ võ.
5. Câu hỏi phải nối với cốt truyện; có Toán, logic và hướng mở rộng Văn/Anh.
6. Giáo viên đăng nhập qua trang host tự tạo phòng riêng, không phải xin người dùng cấp vai trò host cho chính mình.
7. Tài khoản chủ hệ thống đúng: cuong.vuviet@thedeweyschools.edu.vn. Quyền quản trị kiểm tra phía server theo danh tính xác thực, không dựa vào email nhập tay.
8. App tự đề xuất cách tổ chức; không bắt giáo viên cấu hình từng hoạt động thủ công.
9. Dạy phân hóa từng cá nhân, có hint/giàn giáo và recheck.
10. Giữ xúc xắc nhưng không để may rủi làm mất nội dung học bắt buộc.
11. Có phó bản sâu hơn cho học sinh đã hoàn thành phần lõi.
12. Thí điểm Toán 11 — Dãy số, Tiết 1 trước khi mở rộng.

### Những chi tiết là đề xuất thiết kế

Tên “Mật Cảnh Tinh Anh”, ngân sách từng chặng, mô hình dữ liệu, bộ luật tương thích, phân công đợt và ngưỡng cảnh báo dưới đây là đề xuất của kế hoạch. Chúng không phải tính năng đã chạy hoặc kết luận từ thí nghiệm lớp học.

## 2. Căn cứ và mức độ xác minh

### Nguồn đã đọc trong luồng

- Giáo án, checklist, yêu cầu Ban Toán và tiêu chí CIS tại C:/Users/ADMIN/Downloads/smart-lesson-plan-ai/các yêu cầu về Toán cần đạt.
- SmartPlan: src/lib/curriculum/yccdToan.ts, src/data/ppct/tds-g11.json, src/data/unitplan/tds-g11.json. Kho tài liệu môn học là nguồn tham khảo; không nhầm với kho game.
- SBT Toán 11 Q1 và gói V8_2_1_11T38_DaySo_SELFHOST.zip: ví dụ Dãy số, bối cảnh hàng ghế và tổ chức tiết 40 phút.
- THTPD05_v0.9.3_REHEARSAL_CANDIDATE.zip: nguyên tắc giữ tư duy người học; đây là tập huấn giáo viên.
- V8_7_1_MASTER_SPEC_PACKAGE.zip: nhịp hoạt động, nhóm/vai, bằng chứng, giàn giáo, chuyển chú ý và ngân sách thời gian. Dùng các nguyên tắc/contract phù hợp; không tự thay toàn bộ runtime game bằng runtime của gói này.
- Bốn bộ slide MVS được đọc ở lượt trước qua email ngày 30/09/2026 bằng tài khoản trường. Nội dung đọc là slide text và notes; không coi mọi hình minh họa/video đã được phân tích.

| Nguồn MVS | Nội dung dùng | Địa chỉ bộ slide |
|---|---|---|
| AI Integration | Human–AI–Human; reasoning, phản hồi, sửa và bảo vệ lựa chọn | https://docs.google.com/presentation/d/1nsNYwAPES_TSA00f0IKUqHc5J09qD-WR3aYOyuGdW6g/edit |
| Visible Thinking | Parts–Purposes–Complexities; Frayer; See–Think–Me–We; I used to think… Now I think… | https://docs.google.com/presentation/d/1YT7GtB8zOPBPeGlKd4wj_mV5ihxwPYN58TY_6IBZ7WI/edit |
| Learning Environments | inquiry, hợp tác có vai, feedback, công nghệ đúng lúc | https://docs.google.com/presentation/d/1BafXmAYxau4E5CdBj084TjeeP_D-WgG2PMDsed4TQ-k/edit |
| Student Agency | Voice, Choice, Ownership, Purpose; mục tiêu, tự đánh giá, bước tiếp | https://docs.google.com/presentation/d/1qRum7maGjiE1L-8cZs6sdTFeXcb6Wdv_rRLibfUBks4/edit |

See–Think–Wonder cũng xuất hiện ở Session 3/4; không gán nhầm đó là routine chính duy nhất của Session 2. Mỗi routine chỉ dùng khi phục vụ bài; không nhồi cả bốn workshop vào một tiết.

### Bằng chứng mã nguồn kiểm tra trong lượt lập kế hoạch

| Thành phần | Nguồn hiện có | Hệ quả cho nâng cấp |
|---|---|---|
| 12 thế giới | lib/product-content.js, public/campaign-data.js | Tái dùng ID/cốt truyện; kiểm ảnh riêng và nội dung thật của từng map |
| Luật game | lib/mode-engine/index.js và rules/ | Tái dùng reducer từng luật, bổ sung adapter bài học |
| Nhóm/thiết bị | lib/mode-engine/roster.js | Đã có roster; cần nhóm tạm theo activity và identity cá nhân bền vững |
| Xúc xắc/trạm | lib/race.js | Trạm 0/8/16/24/32; campaign >=3 có bypass một trạm giữa; phải có policy học tập riêng |
| Hint/recovery | lib/hints.js, lib/recovery.js, app/api/escape/route.js | Có 3 tầng; supportHint mức 3 đặt assisted và tính nửa điểm; không bê policy này vào học tập |
| Công thức | public/app.js: mathText; public/mode-classroom.js | KaTeX đã có; mathText mới nhận inline delimiter; option MCQ ở mode-classroom còn dùng escape text |
| Host/phòng | app/api/hosts/route.ts, app/api/escape/route.js, lib/account-hosts.js, lib/account-room-access.js | Giữ quyền tạo phòng riêng, cách ly phòng và audit |
| Lưu trữ | lib/storage.js, package.json | Game dùng Sites/Cloudflare DB binding và SQL; không mặc định dùng Firebase của SmartPlan |

117/117 tests, typecheck/lint/build và Site version 9 là kết quả được báo ở các lượt trước. Không chạy lại các gate hoặc xác minh production trong lượt lập kế hoạch này. Đầu đợt triển khai phải ghi lại baseline thực tế. tasks/todo.md cũ có trạng thái lịch sử lệch với source, không dùng nó để kết luận tính năng hiện tại chưa có.

Chưa có bằng chứng đã đọc đầy đủ luồng ChatGPT share và danh sách mọi game bên ngoài mà người dùng nhắc. Đưa việc truy xuất đúng danh sách vào backlog nguồn; không tự nhận đã tích hợp các game đó. Không coi mã YCCĐ local là đã đồng bộ với mọi LO/bài giao trên giaoandewey production.

## 3. Cấu trúc sản phẩm và các quyết định giải quyết mâu thuẫn

| Trục lựa chọn | Giá trị | Cách dùng |
|---|---|---|
| Mục đích | Học tập / Luyện tập | Học bài hoặc thực hành kiến thức đã học |
| Loại tiết | Hình thành / Luyện tập theo PPCT / Ôn tập / Hỗn hợp | Quy định chức năng sư phạm cần có |
| Cách vận hành | Game xuyên suốt / Game hỗ trợ vài hoạt động | Cả hai có GV điều hành; tự học sau tiết mở từng bước |
| Luật chính | campaign, duel, zones, survival, escort, treasure, relay, lockdown, merchant | Một luật chính cho session; mini game theo activity đã duyệt |
| Hình thức | Cá nhân / Cặp / Nhóm / Cả lớp | Có thể đổi qua từng activity |
| Thế giới | 12 map hiện có | Bối cảnh/cốt truyện/âm thanh/linh vật |
| Hỗ trợ | Hỗ trợ / Nhiệm vụ chuẩn / Mở rộng | Theo bằng chứng từng mục tiêu, thay đổi được |

- “Hỗ trợ tiết dạy” không phải chế độ thứ ba.
- Luyện tập nhanh giữ gameplay hiện tại; “Tiết luyện tập” cần PPCT, chẩn đoán, dạy lại/chuẩn hóa, kiểm tra cá nhân và kết thúc.
- Không ép mọi tổ hợp luật × hình thức × hoạt động đều hợp lệ. Tất cả luật được giữ trong sản phẩm; Auto Director chỉ chọn tổ hợp tương thích và giải thích phần bị hạn chế.
- Giữ một luật chính để học sinh dễ hiểu; đổi nhóm/cặp/cá nhân và mở mini game ngắn tại các mốc rõ ràng. Không đổi ngẫu nhiên luật của từng em giữa chừng.
- Giáo viên duyệt nội dung và tổ chức trong một luồng xem trước; tự động trong giờ không cần xin duyệt từng thao tác.
- Không dùng bảng xếp hạng chung so điểm thô của những em nhận bài/hỗ trợ khác nhau.
- Không mua quyền tiếp cận kiến thức nền, hint thiết yếu hoặc recheck bằng xu/điểm.
- Tách hỗ trợ đọc đề/phóng to/ngôn ngữ khỏi hint giải bài; hỗ trợ tiếp cận không tự làm mất trạng thái làm độc lập.
- App bảo đảm đường tiếp cận các nhiệm vụ lõi, cơ chế ghi nhận và phát hiện phần chưa đạt; không hứa tất cả học sinh đạt hết LO trong cùng thời gian.

## 4. Luồng giáo viên, học sinh và màn hình lớp

### Trước giờ học

1. Đăng nhập /hosts, tạo bản nháp bài từ DOCX/PDF/Markdown hoặc chọn bài đã duyệt.
2. App đọc văn bản, bảng và công thức; giữ trích đoạn/trang/vị trí nguồn. PDF scan dùng OCR nếu runtime hỗ trợ; vùng không chắc chắn được đánh dấu để sửa.
3. Nhận diện môn/khối/bài, thời lượng, PPCT, mục tiêu, hoạt động, nhiệm vụ, đáp án, sản phẩm, hỗ trợ.
4. Giáo viên bổ sung dữ kiện còn thiếu thực sự cần thiết: thời lượng, sĩ số, số thiết bị, điều kiện lớp; không hỏi lại dữ kiện đã đủ rõ.
5. Auto Director tạo bản tổ chức: map/cốt truyện, luật chính, activity, cá nhân/nhóm, vai, thời gian, hint, điểm/thưởng và phương án khi thiếu giờ.
6. Xem trước nguồn–bản trích–đề xuất, xem như học sinh, xem TV và chạy thử đồng hồ. Sửa từng phần; không phải tạo lại toàn bộ.
7. Duyệt phiên bản cố định; mở phòng, mã/QR, mời cohost/observer nếu cần. Mỗi giáo viên sở hữu phòng riêng.

### Trong giờ học

- GV bắt đầu, quan sát bảng “Cần hỗ trợ / Lỗi phổ biến / Bước tiếp”; có dừng, tiếp, lùi xem, khóa, công bố, gia hạn, mở lại.
- App tự giao nhiệm vụ và gom nhóm theo timeline đã duyệt. Các bước GV chuẩn hóa/công bố đáp án tuân theo reveal policy; hết timer không tự làm lộ đáp án nếu đang khóa.
- HS giữ cùng learner ID khi đổi nhóm; linh vật, hộ chiếu và nháp cá nhân không bị thay bằng tài khoản nhóm.
- Activity nhóm: suy nghĩ cá nhân → phần việc riêng → sản phẩm chung → phản hồi/sửa → chốt điểm/thưởng → câu kiểm tra cá nhân → về tuyến riêng.
- Cả lớp tập hợp ở mốc chốt; học sinh nhanh làm mở rộng trong LO đã học, không phải ngồi chờ hoặc bỏ phần thảo luận chung.
- Màn hình TV chỉ có bối cảnh, nhiệm vụ, sản phẩm được GV chọn và thống kê phù hợp. Chẩn đoán cá nhân/nháp riêng ở bảng GV.

### Sau giờ học

- Mỗi em thấy mục tiêu đã đạt độc lập, làm được khi hỗ trợ, chưa đủ bằng chứng và bài tiếp theo.
- GV xem theo LO, loại lỗi, hint, tiến bộ trước–sau, đóng góp nhóm và recheck cá nhân; xuất CSV.
- Việc học tiếp giữ liên kết đúng lesson/version/session; không xóa dấu vết còn thiếu chỉ vì đóng phòng.
- Không tự biến điểm game thành điểm chính thức hoặc ghi sang giaoandewey/SSM. Nếu cần cầu nối, xác định mapping và phê duyệt riêng.

## 5. Auto Director và điều phối nhóm

### Tự chọn có căn cứ

AI đề xuất từ nội dung; bộ kiểm tra bằng quy tắc quyết định bản tổ chức có hợp lệ. Runtime chạy cấu hình đã duyệt, không phụ thuộc AI gọi thành công ở mỗi lượt.

| Đặc điểm nhiệm vụ | Tổ chức đề xuất | Luật/interaction phù hợp |
|---|---|---|
| Khám phá quy luật, dự đoán–kiểm chứng | Cá nhân → cặp → GV chốt | Campaign, mô phỏng/bảng thử |
| Các mảnh thông tin bổ trợ thật sự | Nhóm, mỗi vai có phần việc | Ghép khóa, kho báu, hộ tống |
| So cách giải hoặc sửa lỗi | Cặp/nhóm nhỏ | Error hunt, compare methods |
| Luyện thuần thục đã học | Cá nhân/cặp | Duel, relay, survival phục hồi |
| Kiểm tra hiểu độc lập | Cá nhân | Cổng recheck bảo vệ khỏi tác động đối thủ |
| Bài mở/cần tranh luận | Cá nhân → sản phẩm chung → sửa | Bảng lập luận, GV xác nhận rubric |

Đầu ra gồm lý do, nguồn dùng, điều chưa chắc chắn, phương án thay thế, ngân sách thời gian và tổ hợp bị cấm. “Độ chắc chắn” không phải xác suất chất lượng AI tự bịa.

### Ghép nhóm, vai và thiếu thiết bị

- Theo người thực sự có mặt, thiết bị, dữ kiện precheck, ràng buộc giáo viên và mục tiêu của activity.
- Nhóm hỗn hợp khi cần chia sẻ cách giải; nhóm cùng nhu cầu khi GV hỗ trợ một vướng mắc chung. Không cố định nhóm “yếu/giỏi”.
- Cho chọn vai 10–20 giây; phân tự động phần còn lại, đổi vai qua các lượt. Thời gian chọn vai nằm trong budget.
- Vai gắn sản phẩm: dựng biểu diễn, kiểm chứng, giải thích, tổng hợp. Không dùng vai chỉ mang tên trang trí.
- Nhóm lẻ/thiếu người: gộp vai, giữ đủ nhiệm vụ; nhóm giữa chừng chỉ tái tổ chức ở ranh giới hoạt động trừ trường hợp vắng người.
- Một em/một thiết bị: nhóm ảo, nháp riêng và sản phẩm chung.
- Chung thiết bị: phiếu/giấy hoặc lượt nộp định danh; người bấm không đại diện bằng chứng cho cả nhóm. GV có thể ghi nhận kiểm tra miệng/giấy.
- Nộp trùng, hai em cùng giữ vai, nhóm trưởng mất mạng: server giải quyết xung đột, lưu phiên bản, chọn người điều khiển mới; không tự sửa nội dung học sinh.
- Khi giải tán nhóm tạm: bảo toàn mọi learner ID, sản phẩm, góp ý, trạng thái và cấp thưởng đúng một lần.

## 6. Phân hóa, lộ trình và thời gian

### Bản đồ học tập

Một map có tuyến lõi và nhánh cạnh từng cổng. LO/prerequisite quyết định thứ tự kiến thức. Số cổng tùy bài, không ép mọi giáo án vào đúng năm câu/trạm cũ.

```text
Cổng kiến thức A
   ├─ hỗ trợ A → thử lại độc lập ─┐
   ├─ nhiệm vụ chuẩn A ──────────┼→ mốc chung → hoạt động nhóm
   └─ đã vững A → mở rộng A ─────┘                 ↓
                                        recheck từng người
                                                 ↓
                                      Cổng kiến thức B
```

Xúc xắc chỉ tác động đoạn di chuyển/sự kiện tùy chọn. Dừng trước cổng lõi kế tiếp; điểm dư lưu lại. Tắt bypass/abandon cổng lõi trong Học tập, kể cả khi dùng boost/double. Rút/hoàn tất đoạn di chuyển khi tới mốc lớp để HS tiếp cận bài; không tặng đáp án hoặc đánh dấu đạt.

Nhịp chung không buộc mọi em đã hiểu xong mới cho cả lớp chuyển. Tới mốc chung, app ghi phần còn thiếu, bảo vệ kiểm tra cá nhân và xếp hỗ trợ; phần phụ thuộc kiến thức nền chưa đủ được hướng dẫn phù hợp thay vì ghi đạt giả.

### Hồ sơ mục tiêu cá nhân

- Theo từng LO: chưa có bằng chứng / đang làm / làm được khi hỗ trợ / đạt độc lập / cần hỗ trợ tiếp.
- Dữ liệu: nhiệm vụ, lời giải/biểu diễn, lần làm, hỗ trợ thực nhận, phiên bản, nguồn nhận định, recheck.
- Câu nhóm chỉ ghi sản phẩm nhóm; không nâng đồng loạt trạng thái cá nhân.
- Tự đánh giá giữ riêng, không đổi thành điểm Toán.
- Phân tuyến bằng loại lỗi và bằng chứng; không theo tốc độ hoặc chuỗi sai đơn thuần.
- Chưa đủ thông tin: đưa câu hỏi thăm dò, không tự kết luận lỗi khái niệm.
- Bằng chứng một buổi chỉ thể hiện mục tiêu đã kiểm tra; không suy ra trình độ toàn môn.

### Ngân sách tiết

Đề xuất pilot 40 phút: 36 phút công việc + 4 phút dự phòng. Bao gồm giao việc, suy nghĩ, trao đổi, chọn vai, nộp, phản hồi, thưởng, ghi vở và chuyển chú ý.

Ba thời gian riêng: thời gian thực của tiết; thời gian hoạt động còn lại; thời gian thi đấu dùng xếp hạng. Skill giảm thời gian xếp hạng không kéo dài tiết thật. Mở hint không cộng phạt trong Học tập; thời gian thực vẫn trôi. GV gia hạn phải nhìn tác động lên quỹ còn lại.

Khi chậm: rút animation/di chuyển, cắt encounter/nhánh nâng cao, giảm lượt trình bày, gộp thảo luận. Bảo vệ chuẩn hóa kiến thức, recheck và exit. Khi hết giờ vẫn chưa đủ evidence, ghi cần hỗ trợ tiếp và giao nhiệm vụ nối tiếp.

## 7. Hint, giàn giáo và giảm dần hỗ trợ

Giàn giáo bao gồm bảng trống, sơ đồ, vật mẫu, câu hỏi dẫn, đổi biểu diễn và ví dụ làm mẫu. Hint là phần hỗ trợ HS chủ động mở trong nhiệm vụ. Không bắt mọi câu đều có bốn hint nếu không phù hợp; mọi nhiệm vụ lõi phải có đường hỗ trợ đủ dùng.

### Ví dụ đúng cùng một nhiệm vụ

Đề: Hàng đầu có 18 ghế, mỗi hàng sau thêm 2. Viết quy tắc tính số ghế hàng n, với n bắt đầu từ 1.

| Tầng | Nội dung được đề xuất |
|---|---|
| H1 | Từ hàng đầu đến hàng n đã có bao nhiêu lần thêm ghế? |
| H2 | Điền bảng hàng 1/2/3 và số lần thêm 0/1/2. Hai cột liên hệ thế nào? |
| H3 | Số ghế = số ban đầu + số ghế thêm mỗi lần × số lần thêm. Điền ba phần rồi kiểm tra hàng 1. |
| H4 | Ví dụ khác: hàng đầu 10 ghế, thêm 3; hàng 4 có 10 + 3 × (4 − 1). Giải thích vì sao có 4 − 1, rồi quay lại bài của em. |

Không đưa công thức cuối của chính đề vào hint. Bước mẫu có thể cho đáp án ví dụ tương tự. Lời giải hoàn chỉnh thuộc phần GV chốt/review đúng thời điểm; không cấm lời giải trong toàn bộ tiết.

### Chính sách hỗ trợ

- Học tập và tiết luyện tập theo PPCT: hint sư phạm miễn phí, không đóng băng, không cắt nửa điểm.
- Thi đấu luyện tập tùy chọn: giữ policy hiện có khi được công bố rõ; điểm thi đấu không chứng minh mastery.
- Hỗ trợ tiếp cận (font/ngôn ngữ/đọc đề) luôn sẵn khi cần; không bị bán trong shop.
- App có thể mời dùng hint khi phát hiện vướng; không tự bung đáp án vì làm chậm. HS được tiếp tục tự thử.
- Hai lần sai là tín hiệu thăm dò, không phải luật bắt buộc hạ độ khó.
- Sau hỗ trợ sâu mà vẫn mắc: gợi đổi biểu diễn, ví dụ tương tự, học kiến thức nền hoặc gọi GV. Không chạy vòng hint vô hạn.
- Khi em tiến bộ: giảm khung gợi ý ở nhiệm vụ tiếp, rồi một câu tương đương tự làm. Thu hẹp hỗ trợ nghĩa là thay nhiệm vụ kế tiếp, không xóa tài liệu tiếp cận cần thiết.
- Recheck đã lộ hint giải bài: ghi supported, cung cấp câu tương đương mới để kiểm tra độc lập khi phù hợp.
- Trạng thái độc lập dựa vào kết quả recheck; dùng hint trước đó không làm em vĩnh viễn mất cơ hội được công nhận.
- Hint nhóm được ghi là đã chia sẻ cho nhóm; hint cá nhân trên thiết bị chung không thể bảo đảm bí mật. Ghi rõ phạm vi người nhận.
- GV xem “vướng ở đâu / đã thử gì / hint nào / gợi ý can thiệp”, không phải đọc toàn bộ nhật ký để tìm em cần giúp.

Sinh hint cùng bản nháp bài, kiểm Toán, nguồn, bậc hỗ trợ và teacher preview. Ưu tiên hint đã duyệt trong giờ; AI unavailable vẫn dạy được. Nếu sau này cho AI phản hồi trực tiếp, chỉ phản hồi có căn cứ vào bài làm, không thay lời giải hoặc tự chốt điểm.

## 8. Điểm, skill, xếp hạng, phó bản và logic

### Ba kết quả độc lập

| Giá trị | Mục đích |
|---|---|
| Hồ sơ LO/evidence | Biết em hiểu và làm được đến đâu |
| Điểm trận/xếp hạng | Luật thắng thua hoạt động tương thích |
| Xu/vật phẩm/phần thưởng | Tương tác game, lựa chọn chiến thuật |

Chi xu không trừ bằng chứng học tập; không đổi xu lấy “đạt LO”. Rank nhóm áp dụng khi cùng nhiệm vụ/rubric có thể so sánh. Bài mở chưa được xác nhận ghi chờ chấm; không tự động xếp hạng chắc chắn từ nhận xét AI.

Trong Học tập, ưu tiên mốc tiến bộ, sản phẩm và mục tiêu cộng đồng; nếu xếp hạng một hoạt động, công bố tiêu chí trước, không phạt em cần hỗ trợ. Thưởng thành viên theo đóng góp đã ghi nhận, không theo số lần bấm. Học sinh vắng/thiếu evidence không tự được cấp thành tích cá nhân từ nhóm.

### Skill hiện có

Giữ Phá băng, Lá chắn, Tiếp sức, Nhiễu, Tối ưu lộ trình, Tiến thêm, Xúc xắc kép trong thư viện gameplay.

- Học tập: bật skill di chuyển/cosmetic/hỗ trợ phù hợp; tắt tác động ngăn em làm bài, đọc hint, recheck hoặc exit. Có thể dùng Nhiễu vào chướng ngại/NPC hoặc mini game được duyệt.
- Luyện tập thi đấu: giữ hiệu ứng đối kháng theo luật phòng.
- Giáo viên thấy preset an toàn cho học tập; không phải tự chỉnh từng skill.
- Auto Director chỉ chọn từ khả năng engine đã nghiệm thu.

### Mật Cảnh Tinh Anh

Tên tạm cho nhánh nâng cao; cổ trang dùng “Tàng Ấn Thâm Cảnh”.

Đã đạt core + recheck cá nhân mới mở; không dựa vào may mắn hoặc nhóm thắng. Có nhiệm vụ phản ví dụ, giải ngược, tạo/đổi mô hình, khái quát; phù hợp kiến thức đã học. Nội dung vượt PPCT gắn nhãn mở rộng và cần GV chọn.

Em đạt sớm ở một chặng làm thử thách sâu hơn của chặng đó, vẫn tham gia mốc lớp. Phó bản lưu nháp và tạm dừng khi GV tập hợp. Thưởng danh hiệu/vật phẩm hoặc điểm nhánh riêng; không đem điểm bài khó cộng vào bảng so sánh mastery toàn lớp.

### Ngân hàng logic

Phân loại theo suy luận điều kiện, loại manh mối, tìm bất biến, đường đi, lịch, ghép ràng buộc, phản ví dụ. Mỗi câu có nguồn/cơ chế, đáp án và chứng minh, điều kiện đủ/thiếu, độ khó, thời lượng, hint, context map.

Logic phục vụ LO môn học được tính evidence tương ứng. Logic giải trí không gắn LO đặt ở encounter/phó bản tùy chọn, có ngân sách. Không chặn kiến thức lõi sau một câu đố không liên quan.

## 9. 12 map, hình ảnh, cốt truyện và âm thanh

| Map | Hướng cốt truyện hiện có | Việc cần hoàn thiện |
|---|---|---|
| Hồ Sơ Thành Phố Ẩn | Điều tra, khôi phục hồ sơ/thành phố | Pilot Dãy số ở khu hội trường |
| Ngũ Ấn Long Thành | Thu hồi ấn tín, mở thành | Cover riêng; Lôi Đài linh vật; Tàng Ấn Thâm Cảnh |
| Nghịch Lý Aurora | Giải vòng lặp, khôi phục mạng lưới | Dữ kiện nhất quán qua các chặng |
| Bí Mật Sau Tiếng Chuông | Khám phá trường Dewey | Chuẩn tên, manh mối và ending |
| Mùa Hội Bên Sông | Sửa guồng nước, khôi phục mùa hội | Tách hình/cảm giác với cổ trang |
| Đảo Khối Lập Phương | Nối đảo, dựng cầu | Cover mới, cảm hứng sandbox |
| Thành Phố Vòng Bo | Khôi phục các tuyến vòng | Vòng bo không loại khỏi việc học |
| Chiến Trường Ngũ Khu | Giữ đường tiếp tế | Chiếm vùng bằng nhiệm vụ có căn cứ |
| Học Viện Hỗn Nguyên | Khôi phục quy tắc | Phòng học/tri thức phù hợp môn |
| Quần Đảo Sinh Tồn | Nước, tiếp tế, hải đăng | Phục hồi, không bỏ học sinh bị thua |
| Đường Đua Thiên Hà | Nối trạm sao, quỹ đạo | Tách tốc độ di chuyển khỏi hiểu bài |
| Mê Cung Mật Mã | Ghép đường ra | Câu logic có nghiệm/đường bù rõ |

Mỗi map có hồ sơ truyện: biến cố → mục tiêu → manh mối → nhiệm vụ → hệ quả → kết thúc; một bảng entity/data để tên, vật phẩm, dữ kiện không tự đổi. Nhiệm vụ giải quyết vấn đề trong truyện; đổi map phải điều chỉnh bối cảnh thật, không chỉ đổi màu.

Kiểm kê manifest ảnh; bổ sung cover riêng cho 7 map hiện dùng SVG; sửa ảnh trùng nếu còn; phân biệt cover và terrain. Hash phát hiện trùng file, người kiểm tra phát hiện giống thị giác/crop; cả hai đều cần. Giữ SVG/2D nhẹ trên thiết bị yếu.

Cảm hứng Roblox/Free Fire/Liên Quân chuyển thành cơ chế sandbox, vòng bo, chiến thuật; hình/nhân vật/âm thanh dùng tài nguyên gốc hoặc quyền sử dụng phù hợp.

Lôi đài và đua thuyền là activity cộng đồng có thời gian dự trù, mở ở ranh giới chặng hoặc do GV gọi, không chen ngang công bố kiến thức/recheck. Giữ vị trí/nháp của HS khi trở lại.

Meme và âm thanh: ăn mừng sửa được lỗi, thắng chặng, phối hợp; không chế giễu câu sai/cá nhân. Tần suất giới hạn, không chồng tiếng; mute riêng nhạc/hiệu ứng, reduced motion, phụ đề/feedback chữ, xử lý autoplay. Meme/animation không che công thức hoặc bắt HS chờ mới được học tiếp.

## 10. Nội dung môn học và pilot Dãy số

### Chuẩn nội dung

- Mã T11.18: nhận biết dãy hữu hạn/vô hạn.
- Mã T11.19: bốn cách cho dãy — liệt kê, công thức tổng quát, truy hồi, mô tả.
- Phân biệt n và u_n là mục tiêu thành phần của gói Dãy số, không tự sửa nguyên văn YCCĐ.
- T11.20 tăng/giảm/bị chặn dành tiết tiếp theo theo PPCT tds-g11-39; tds-g11-38 là Dãy số Tiết 1.
- PPCT local có trường objectives trống; cần kết hợp YCCĐ/giáo án, không suy LO chỉ từ tên tiết.
- SBT có dấu hiệu đề/hướng dẫn lệch ở vài ví dụ theo lượt đọc trước; từng đề/key phải đối chiếu. Không nhập snapshot cũ như nguồn đã đúng.

### Mẫu 40 phút đề xuất

Câu hỏi định hướng: “Làm thế nào mô tả một dãy để người khác xác định đúng số hạng cần tìm?”

Bối cảnh: hội trường thành phố có 25 hàng, hàng đầu 18 ghế, mỗi hàng sau thêm 2. Phân biệt dãy thực tế 25 hàng hữu hạn với mô hình quy luật tiếp tục vô hạn nếu bỏ giới hạn đó. Công thức u_n = 18 + 2(n − 1), miền n=1..25; u_7=30, u_25=66. Đây là đối chiếu số học cho bản thiết kế, chưa phải content pack đã phát hành.

| Hoạt động | Phút lõi | Việc học sinh/GV thực hiện | Bằng chứng và MVS |
|---|---:|---|---|
| Biến cố và mục tiêu | 3 | Quan sát hàng ghế, nêu dự đoán/câu hỏi; GV chốt mục tiêu cùng lớp | Suy nghĩ ban đầu, Voice/Purpose |
| Khái niệm và ví dụ mẫu | 7 | Phân biệt số hàng/số ghế, hữu hạn/vô hạn; GV làm mẫu một số hạng và mô tả bốn cách | Cá nhân ngắn, chuẩn hóa và ghi vở |
| Ghép bốn biểu diễn | 7 | App ghép nhóm; nhận vai, mỗi em kiểm một phần; ghép và giải thích; hiện kết quả/thưởng ngắn | Cá nhân trước nhóm + sản phẩm chung; collaboration |
| Sửa hồ sơ sai | 5 | Cặp phản biện công thức sai 18+2n bằng n=1; sửa, GV chốt | Error hunt; phản hồi/sửa có căn cứ |
| Tuyến riêng | 7 | Support: bảng và ví dụ; chuẩn: đổi biểu diễn; mở rộng: hai quy tắc cùng ba số hạng đầu nhưng khác số sau | Choice, hỗ trợ theo lỗi; giảm dần scaffold |
| Recheck cá nhân | 4 | Dãy mới, nhận diện miền hữu hạn và một nhiệm vụ biểu diễn phù hợp tiêu chí | Kiểm tra độc lập; mỗi LO có evidence cần thiết |
| Exit và việc tiếp theo | 3 | Xem lại dự đoán; nêu điều đổi/giữ và lý do; tự đánh giá, chọn bước tiếp; GV chốt | I used to think… Now I think…, Feed Forward |
| Dự phòng phân bổ trong tiết | 4 | Tổ chức, thiết bị, trao đổi kéo dài; không phải activity thêm | Tổng 36+4=40 |

Không tự gán ngưỡng “2/3 precheck là đủ tự học” khi chưa kiểm nghiệm. Precheck đo kiến thức nền; không yêu cầu HS đã biết toàn bộ kiến thức mới để được vào học.

Đây là lịch thí điểm để rehearsal. Nếu thiếu giờ, giảm phần thưởng/di chuyển và câu phụ; giữ phần chốt và kiểm tra cá nhân. Mức đạt của lớp phải đo trong rehearsal/lớp thật.

### Mở rộng đa môn

Toán trước; Ngữ văn/Anh chỉ thêm sau khi có bài mẫu, bộ sách/khối, LO và rubric môn tương ứng.

- Văn: nhận định–dẫn chứng–lý giải; chấp nhận nhiều cách hiểu có căn cứ, phản biện và bản sửa.
- Anh: nghe/đọc manh mối, trao đổi thiếu thông tin, nói/viết theo tình huống; rubric giao tiếp, không chỉ trắc nghiệm ngữ pháp.
- Cùng dùng timeline/nhóm/evidence/hint; validator và chấm đặc thù từng môn.
- Audio, nói/ảnh bài làm cần kiểm khả năng nhập/lưu/riêng tư; chưa hứa chấm nói hoặc mọi loại file tự động.

## 11. Dữ liệu, backend và giao diện dự kiến

### Thành phần có trách nhiệm rõ

| Thành phần mới dự kiến | Nội dung |
|---|---|
| lib/lesson/schema.ts, validate.ts | Contract, phủ mục tiêu, thời lượng, nguồn, rubric, reveal |
| lib/lesson/import/ | Trích DOCX/PDF/Markdown; nguồn/trích đoạn/công thức; lỗi và review |
| lib/lesson/director.js | Đề xuất/cấu hình tương thích luật, activity, participation, thời gian |
| lib/lesson/runtime.js, passport.js | Timeline chung, tuyến cá nhân, trạng thái bằng chứng |
| lib/lesson/grouping.js, support.js, rewards.js | Nhóm tạm/vai, hỗ trợ, chốt thưởng đúng một lần |
| lib/lesson/serialize.js | Projection GV/HS/TV; giấu answer key/hint chưa mở |
| content/lessons/g11-sequences-p1.json | Gói Dãy số phiên bản cố định có nguồn |
| app/api/lessons/route.ts | Nhập, nháp, duyệt, phiên bản; phân quyền |
| app/api/lesson-sessions/route.ts | Sự kiện tiết học và projection; tái dùng lớp auth/room |
| app/lessons/, app/play/, app/presenter/ | Prep/preview, HS, TV; đường dẫn đề xuất |
| public/math-renderer.js | Render công thức dùng chung ở UI game và lesson |
| tests/lesson-*.test.mjs | Gate contract, runtime, privacy, hỗ trợ, grouping, timing |

Các đường dẫn mới là vị trí dự kiến; kiểm module tương đương trước khi tạo. Tái dùng app/api/escape, lib/mode-engine, lib/room-events, lib/skills, lib/arena-community khi nối gameplay; tránh nhồi toàn bộ logic mới vào public/app.js. Không cần rewrite framework toàn app.

### Các thực thể

- LessonDraft/SourceReference: bản gốc, đoạn trích, trường chưa chắc chắn, revision.
- LessonPackageVersion: LO, prerequisite, activity, đáp án/rubric riêng, hint, nguồn, timer, cốt truyện và người duyệt.
- SessionPlan: phiên bản bài, map, luật chính, mini game, thiết bị, lịch và policy.
- Learner/ParticipationGroup/RoleAssignment: danh tính trong session độc lập với nhóm và thiết bị.
- Evidence/SupportEvent/Passport: bài làm và lịch sử trước–sau; mức hỗ trợ; trạng thái từng LO.
- RewardLedger: activity/learner/group/reward ID; một reward chỉ chốt một lần.
- TeacherOverride/Audit: chuyển pha, gia hạn, điều chỉnh, chấm lại và lý do.

Schema cụ thể bằng kiểu phân biệt: câu khách quan có answer key/checker; bài mở có rubric/look-for, không ép một đáp án duy nhất. Reflection không bắt answer key. Mỗi learning task gắn LO; sự kiện giải trí không được bịa LO để qua validator.

### Đồng bộ và quyền

Server giữ thời gian, điểm, revision, group state và reward. Idempotency gắn action + payload + session/activity/version; request ID trùng nội dung khác phải conflict. Đóng/reset activity không nhận nháp hoặc hint response của phiên cũ. Pause/resume không tự reset deadline; quyết toán điểm không nhân đôi khi reconnect.

Room luôn gắn owner. Host mới chỉ quản lý phòng mình; root quản lý hệ thống; cohost/observer theo quyền phòng. Duyệt lesson không cấp thêm quyền dữ liệu lớp khác.

Công khai Site không đồng nghĩa công khai giáo án gốc, đáp án, nhật ký cá nhân. Token/answer key không nhúng vào client; trình chiếu dùng dữ liệu đã chọn. Bản nháp trước–sau lưu riêng; tổng hợp AI không sửa im lặng lời HS.

### Giới hạn hạ tầng cần xác minh ở đợt đầu

- Khả năng file upload/storage riêng tư, trích Office/PDF/OCR và thời gian xử lý trong Sites runtime hiện tại.
- Model/backend AI được phép gọi, hạn mức/chi phí và timeout; không dùng khóa cá nhân trong client.
- Job dài cần resumable/status/retry theo capability thực; không tự chuyển host sang Vercel/Firebase.
- Nếu import phức tạp chưa hỗ trợ: cho dán văn bản hoặc nhập cấu trúc và duyệt tay, hiển thị rõ vùng chưa đọc được.
- Khi AI hết quota: gói đã duyệt vẫn chơi, draft được giữ, retry có giới hạn và không thu phí trùng.
- Trước dùng tài liệu/dữ liệu HS thật với dịch vụ AI, chốt dữ liệu cần gửi và lưu giữ. Pilot kỹ thuật dùng dữ liệu giả; không tự đăng giáo án lên dịch vụ khác.

## 12. Công thức Toán và chất lượng hiển thị

1. Chuẩn hóa công thức thành rich text có math node ở lớp nội dung; kiểm nguồn Word equation/PDF để không mất chỉ số, dấu âm, căn, miền xác định.
2. Render chung đề, đáp án, MCQ/TF, hint, lời giải, board GV, TV và phó bản bằng KaTeX; không có nhánh chỉ escape công thức.
3. Tách kiểm cú pháp và kiểm đúng Toán: KaTeX render được không chứng minh lời giải đúng.
4. Giữ display/inline và các dạng nhập được hỗ trợ; delimiter lạ hoặc OCR không chắc phải báo, không sửa bằng regex tùy tiện.
5. Giữ font local, MathML, tương phản, zoom và overflow có chủ đích; không cắt phân số/hệ phương trình trên mobile/TV.
6. Bộ mẫu: phân số, căn, truy hồi/cases, vectơ, tổng, chỉ số, dấu âm, tiếng Việt xen công thức; ảnh/hình học do dữ liệu toán xác định.
7. Công thức lỗi là blocker phát hành bài; GV preview phải nhìn thấy vị trí lỗi.
8. Thiếu renderer/fonts: trạng thái rõ và đường dùng phiếu đã kiểm; không nhận fallback chữ thô là “đã đẹp/chính xác”.

Nghiệm thu bằng dữ liệu mẫu + ảnh desktop/mobile/TV và đọc nội dung thật. Source inspection hiện tại chưa đủ chứng nhận toàn bộ công thức production.

## 13. Các đợt triển khai và phụ thuộc

| Đợt | Việc và đầu ra | Cổng nghiệm thu | Phụ thuộc |
|---|---|---|---|
| P0 — Baseline và nền tảng | Snapshot nguồn/DB; kiểm auth chủ phòng và phòng cũ; audit ảnh/Toán; xác minh Sites file/AI/storage; cập nhật baseline | Build/tests hiện tại có log; phương án import/runtime cụ thể; rollback có đường phục hồi | Không |
| P1 — Chất lượng game hiện tại | 12 covers, sửa trùng, story manifest, công thức dùng chung, meme/audio/mute; rà recovery text và policy | Xem từng map, câu/hint/MCQ/TV/mobile; không đổi dữ liệu phòng cũ | P0 |
| P2 — Gói bài mẫu | Schema/validator, LO/prerequisite/evidence, rubric/hint, Dãy số chuẩn nguồn, Experience Map/Attention Handoff, phiếu dự phòng | Content review, answer key, phạm vi T11.18/19, budget và nguồn đều đạt | P0; phối hợp P1 |
| P3 — Chạy tiết học | Timeline, learner ID, hộ chiếu, nhánh support/core, recheck, clock và cổng map; một campaign mẫu | GV→HS→nhóm→cá nhân→kết thúc; không bỏ LO do xúc xắc; honest incomplete | P2 |
| P4 — Hợp tác và game | Dynamic grouping/role hybrid, shared workspace/revision, điểm/thưởng, mini game cổ trang, phó bản | Rejoin/đổi vai/reward exactly once; identity và evidence riêng không mất | P3 |
| P5 — Giáo án thành game | Import, nguồn–bản trích, Auto Director, preview/duyệt một lần, fallback/error job | Giáo án thật → draft → tổ chức phù hợp → sửa → duyệt → chơi; nguồn lỗi bị chặn | P2–P4; spike import tại P0 |
| P6 — Rehearsal và phát hành | Kiểm thử tích hợp, independent review, cold teacher rehearsal, pilot lớp, release/rollback đúng Site | Không còn blocker; bằng chứng local/browser/production tách riêng; teacher acceptance | P1–P5 |
| P7 — Nhân rộng | Nội dung/map/luật còn lại; bài luyện tập PPCT; Toán khác rồi Văn/Anh; danh sách game ngoài xác minh | Mỗi tổ hợp/bài mới có gate nội dung và runtime, không gắn nhãn hoàn thiện hàng loạt | P6 |

Bản kiểm chứng sớm sau P3: một tiết Dãy số dùng gói nhập tay đã duyệt. Bản có đầy đủ luồng người dùng “tải giáo án → tự tổ chức → chơi” chỉ đạt sau P5 và gate P6. Không gọi P3 là hoàn tất mục tiêu tổng thể.

Không gán số ngày chắc chắn khi chưa xác minh import/AI/runtime. Sau P0 lập ước lượng từng đợt bằng khối lượng thực, hạn mức công cụ và gate. Đường găng: contract → pilot runtime → nhóm/evidence → importer/director → rehearsal/release.

### Chia việc và kiểm soát chất lượng

- Nhánh A: media/cốt truyện/audio sau P0.
- Nhánh B: học liệu/LO/hint/rubric độc lập với UI.
- Nhánh C: contract/backend/nhóm/evidence theo schema đã khóa.
- Nhánh D: UI giáo viên/HS/TV và renderer sau contract.
- Reviewer kiểm độc lập: math/content, quyền/phòng, giao dịch/thưởng, browser/pedagogy.

Ưu tiên OpenCode/Antigravity theo chỉ dẫn người dùng và capability/quota thực; không đoán tên model hoặc báo đã giao khi chưa có session. Astra chỉ dùng khi vướng khó thực sự chưa giải quyết được. Không cho hai worker sửa cùng module; mỗi bàn giao ghi file, hành vi, test, giới hạn. Người tích hợp đọc diff, chạy gate; kết quả worker không thay bằng chứng chạy thật.

## 14. Ma trận nghiệm thu và tình huống bất thường

| Ca cần kiểm | Kết quả bắt buộc |
|---|---|
| Host mới đăng nhập | Tạo/quản lý phòng riêng; không cần tự cấp host; không vào phòng người khác |
| Owner/cohost/observer/revoked | Quyền server đúng, revoke có hiệu lực, không bypass bằng token cũ |
| 26 HS, 40 đơn vị theo giới hạn hiện tại | Không mất dữ liệu; đo latency đồng bộ/submit, lỗi và tải thực. 40 thiết bị không mặc định là 40 tổng thành viên |
| Nhóm 1/2/3/4/5, sĩ số lẻ | Vai/nhiệm vụ có đủ coverage; thiết bị không làm mất danh tính |
| Vắng, late, rejoin, đổi thiết bị | Khôi phục đúng người/phase, không ghép lại hỗn loạn hoặc cấp thưởng trùng |
| Hai người sửa/nộp sản phẩm | Conflict/version rõ, giữ nháp, không âm thầm ghi đè |
| Nộp/hint đúng lúc hết giờ/reset | Server chốt theo phase/version; không ghi sang activity khác |
| Xúc xắc/boost/double/bypass | Không vượt core gate; bộ xúc xắc hiện tại có 1..6 theo túi nên test cả các permutation hợp lệ và hành động giả mạo |
| Em đạt nhanh/chậm/cần hỗ trợ | Tuyến phù hợp, không bỏ phần chốt/exit hoặc suy mastery theo vị trí |
| Hint H1–H4 và hỗ trợ tiếp cận | Đúng loại, đúng người, không penalty học tập, không lộ key; recheck xác nhận độc lập |
| Nhóm thắng, một em chưa hiểu | Điểm nhóm giữ; em có trạng thái thật và hỗ trợ riêng |
| Phó bản đang mở khi GV tập hợp | Lưu nháp, tạm dừng, trở về hoạt động chung |
| Bài mở chưa chấm/AI uncertain | Chờ xác nhận, không xếp hạng chắc chắn/auto ghi điểm chính thức |
| Hết giờ | Cắt tùy chọn, exit khả dụng, lưu phần còn thiếu, không fake complete |
| Mất mạng/AI quota/parse lỗi | Thông báo cụ thể, bảo toàn draft, retry có giới hạn, gói đã duyệt và phiếu vẫn dùng được |
| Reload nhiều tab/replay reward | Một ledger entry, không nhân điểm, không đọc dữ liệu người khác |
| Lỗi đề/đáp án | GV thay bằng bản tương đương có version, giữ lịch sử, không phạt HS vì lỗi nguồn |
| Công thức | Không raw delimiter, parse error, sai công thức, cắt khung hoặc lỗi MCQ/hint |
| Meme/âm thanh | Không ngắt giờ suy nghĩ/chốt; mute/reduced motion và autoplay fallback đúng |
| Rollback phiên bản | Session đang chạy dùng package cố định; dữ liệu mới không bị client cũ phá |

Các gate sau mỗi phần code: tests liên quan, npm test, typecheck, lint, build và diff check trên kho game. Không dùng lệnh npm của SmartPlan để kiểm game. Câu lệnh mẫu:

```powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site" test
npm --prefix "C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site" run typecheck
npm --prefix "C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site" run lint -- --quiet
npm --prefix "C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site" run build
```

Browser E2E phải đi hết luồng và đọc nội dung: import → preview → host → HS → hint → nhóm/vai → thưởng → cá nhân → recheck → phó bản → exit → báo cáo. Có ảnh/log, desktop, mobile và màn hình trình chiếu. Xem số lượng DOM hoặc tests unit xanh không đủ.

Cold Teacher Test: giáo viên không tham gia thiết kế đọc hướng dẫn vẫn biết giao việc, quan sát, hỗ trợ, chốt, chuyển và xử lý mất mạng. Pilot ghi thời gian thực, số em có evidence từng LO, recheck đạt độc lập/hỗ trợ/chưa đủ, thời gian chờ và phần bị cắt. Không đặt “100% HS đạt” làm tiêu chí app hoạt động đúng.

## 15. Phát hành, hồi phục và quản lý phạm vi

- Phát triển trên nhánh/worktree phù hợp, giữ phần WIP đang có; không sửa SmartPlan để tiện cho game.
- Migration thêm bảng/field, reader tương thích phiên bản, backup trước thay đổi. Không biến phòng luyện tập cũ đang chạy thành session học tập.
- Feature flag cho chế độ mới/pilot; package đã duyệt bất biến, sửa tạo version mới.
- Phát hành đúng Site/project hiện có; dùng workflow Sites tương ứng, không chuyển nền tảng hosting vì thuận công cụ.
- Bản kế hoạch không phải lệnh deploy. Khi thực thi cần xác định phạm vi phát hành và quyền đã có ở thời điểm đó.
- Nghiệm thu production bằng owner thật, tài khoản host thứ hai và student đúng quyền; kiểm cách ly phòng. Nếu thiếu phiên đăng nhập, ghi rõ gate chưa xác minh.
- Rollback UI/runtime bằng bản trước tương thích, giữ package/evidence/ledger; không xóa kết quả lớp để quay phiên bản.
- Chỉ gọi hoàn thiện khi từng hạng mục có bằng chứng source, tests, UI và nơi đã phát hành.

## 16. Checklist điều hành

### Đã hoàn thành ở lượt lập kế hoạch

- [x] Tổng hợp yêu cầu và các quyết định trong hội thoại.
- [x] Kiểm tra lại module game, stack, branch/HEAD và tài liệu nguồn.
- [x] Giải quyết mâu thuẫn luật chính/mini game, hint/scoring, xúc xắc/LO và finish/mastery.
- [x] Có pilot Dãy số, ngân sách 40 phút, đường hỗ trợ và giới hạn cam kết.
- [x] Xác định đợt, phụ thuộc, module dự kiến, rủi ro và gate.

### Công việc nâng cấp còn phải làm

- [x] P0: baseline và backup local xong; runtime production chưa xác minh.
- [~] P1: renderer và media xong; còn ảnh riêng cho 7 map.
- [~] P2: contract xong; nguồn Dãy số chờ giáo viên duyệt.
- [~] P3: chạy được với 1 học sinh; chưa thử nhiều học sinh/điện thoại.
- [~] P4: nhóm/vai/thưởng/phó bản/Lôi Đài Long Thành xong; các map khác chưa nối.
- [~] P5: tải DOCX/PDF + AI đề xuất + duyệt xong; còn OCR, AI thật, cổng sư phạm.
- [ ] P6: independent QA, rehearsal, pilot và phát hành khi được yêu cầu.
- [ ] P7: nhân rộng nội dung và đa môn theo gate.

Các thông tin chỉ cần chốt trước đúng đợt phụ thuộc: lớp/sĩ số/thiết bị thật để pilot; giáo án mẫu cụ thể cho import; nguồn LO production nếu cần đồng bộ; provider/quota và lưu giữ file; danh sách game bên ngoài chưa truy xuất. Không cản trở việc xây bản thí điểm với dữ liệu giả và nguồn bài đã có.

## 17. Bổ sung r5 (08/10/2026): đối chiếu thực tế và điều chỉnh

Mục này không thay các mục 1–16. Nó ghi lại điều đã làm, điều r4 cần chỉnh theo thực tế, và điều còn thiếu để kế hoạch đủ, đúng và hay. Điều gì chưa kiểm chứng được ghi là đề xuất.

### 17.1 Trạng thái thực tế so với r4

| Đợt | Tình trạng | Bằng chứng / còn thiếu |
|---|---|---|
| P0 | Xong | Backup DB local, baseline test. Còn: xác minh runtime Sites production |
| P1 | Một phần | Hiển thị công thức dùng chung (KaTeX), meme/âm thanh/tắt tiếng/giảm chuyển động có hook riêng. **Còn: 7 map vẫn là SVG sơ đồ**, chưa có ảnh riêng |
| P2 | Xong về mã | Contract + validator + gói Dãy số v1.1. **Còn: nguồn Dãy số chờ giáo viên duyệt** (hai nguồn `teacher_review_required`) |
| P3 | Xong, thử 1 học sinh | Tiết chạy được ở máy local: tạo phòng, học sinh vào, bắt đầu, nộp. **Chưa thử nhiều học sinh, chưa thử điện thoại, chưa chạy hết 9 hoạt động** |
| P4 | Một phần | Có nhóm/vai, Lôi Đài Long Thành, thưởng một lần, phó bản sau recheck. Còn: các map/luật khác chưa nối vào tiết học |
| P5 | Một phần | Tải DOCX/PDF + lưu file gốc riêng tư + AI đề xuất + duyệt từng nguồn. Còn: OCR bản scan, AI thật trên web, chất lượng sư phạm của bản nháp AI |
| P6, P7 | Chưa bắt đầu | |

### 17.2 Chỗ r4 cần chỉnh cho khớp thực tế

- **Ngân sách pilot** (mục 6, 10): bản v1.1 là 36 phút lõi + 2 phút phó bản tùy chọn + 2 phút dự phòng = 40. Bảng ở mục 10 ghi 36 + 4 là bản cũ.
- **Mục 9 (ảnh map)** thiếu quy tắc kỹ thuật, nay thêm:
  1. Ảnh nền 16:9. Router chỉ trả đúng tỉ lệ khi gọi model có hậu tố `-16x9` (1376×768); dùng tham số `size` ra ảnh vuông.
  2. **Không vẽ chữ, số, huy hiệu đánh số vào ảnh.** Lần thử đầu model vẽ số 1–4 dù prompt cấm; số trong ảnh sẽ lệch với cổng thật do app vẽ. Prompt phải cấm tường minh và có bước kiểm bằng mắt.
  3. Đường đi và cổng do app vẽ thành lớp riêng trên ảnh nền, không nướng vào ảnh. SVG cũ đang nướng cả đường và cổng, nên khi thay ảnh phải xem lại lớp phủ.
  4. Nén webp, đề xuất ≤ ~900 KB mỗi ảnh (5 ảnh hiện có 350–850 KB). Ghi `assets-manifest`: model, prompt, ngày, hash; kiểm trùng hash và trùng thị giác.
  5. Cổng nghiệm thu: năm vị trí cổng không bị vật thể lớn che, đọc được trên điện thoại.
- **Quota là rủi ro thường trực** (mục 11): ảnh và AI dùng chung hạn mức qua một router. Quy trình tạo tài nguyên phải chạy lại được (script theo từng map, bỏ qua map đã có), không giả định chạy một lần là đủ.

### 17.3 Chỗ còn thiếu để kế hoạch "đúng"

1. **Chấm đáp án gõ tay theo cách người Việt viết số.** Đã kiểm bằng bộ chấm `numeric_exact`: gõ `1,5` (dấu phẩy thập phân, chuẩn SGK Việt Nam) bị chấm sai; gõ dấu trừ `−3` (U+2212, đúng ký tự công thức hiển thị) cũng sai. **Đã sửa** trong `lib/lesson/schema.js` (nhận `1,5`, `−3`, `–3`, `−1/2`), có test hồi quy. Còn mở, cần quyết định:
   - `3.000` có thể là ba nghìn (cách viết Việt) hoặc ba (cách viết Anh); hiện đọc là 3. Đề xuất: hiện gợi ý "dùng dấu phẩy cho số thập phân" và không tự đoán.
   - `text_normalized_exact`: `hữu hạn.` (dấu chấm cuối) bị sai; `huu han` (không dấu) bị sai. Cần quyết định có nhận không dấu cho từ khóa Toán hay không.
   - Bộ gõ tiếng Việt (Telex/VNI) tạo chữ qua sự kiện `composition`. Cần **kiểm** ô nhập không bị đồng bộ nháp ghi đè giữa lúc đang gõ dấu. Chưa kiểm.
2. **Cổng chất lượng sư phạm cho bản nháp do AI sinh.** Reviewer đã thấy bản nháp hợp lệ về cấu trúc nhưng hint lộ thẳng đáp án và chưa đo hết các khía cạnh của mục tiêu. Đề xuất cổng bắt buộc trước khi giáo viên được duyệt:
   - hint không chứa đáp án của chính nhiệm vụ đó;
   - mỗi mục tiêu có ít nhất một nhiệm vụ độc lập đo đúng khía cạnh, không chỉ nhiệm vụ nhóm;
   - câu recheck tương đương mà không trùng đề đã làm;
   - mọi số liệu trong đề khớp với nguồn đã trích.
3. **Đồng ý gửi nội dung cho dịch vụ AI** (mục 11): trước khi chạy job AI phải có bước giáo viên xác nhận rõ nội dung nào sẽ gửi; không ghi nội dung nguồn vào log. Cần kiểm trong mã trước khi dùng giáo án thật.
4. **Thử tải và thử nhiều học sinh bằng chương trình**, không thử tay: dựng bộ chạy giả lập 26 học sinh vào cùng phòng qua API, đo độ trễ nộp bài và số lỗi. Con số ngưỡng cần đặt theo lần đo đầu, không đoán trước.
5. **Khung màn hình bắt buộc kiểm**: 360×640 và 390×844 (điện thoại), 768×1024 (máy tính bảng), 1920×1080 (TV). Tiêu chí: không cuộn ngang, công thức không bị cắt, nút bấm đủ lớn (đề xuất ≥ 44 px), chữ đọc được từ xa trên TV.
6. **Phát hành an toàn** (mục 15), bổ sung:
   - đẩy ở chế độ riêng tư trước, kiểm bằng owner, host thứ hai và học sinh, rồi mới đổi đối tượng;
   - bản trên link hiện là V7. Migration 0008–0012 và kho file gốc cần chạy đúng thứ tự; trước khi đẩy phải xác nhận các migration chỉ thêm, không xóa hay đổi bảng cũ;
   - ghi sẵn cách quay về bản V7 trước khi đẩy.

### 17.4 Để trải nghiệm "hay" hơn (đề xuất)

- **Mỗi hoạt động kết thúc bằng một nhịp truyện ngắn** gắn với kết quả Toán (ví dụ tìm đúng u₂₅ thì cửa hội trường mở). Giới hạn vài giây, không chặn học tiếp.
- **Chế độ Học tập đấu với "lỗi hệ thống", không đấu với bạn.** Một thanh năng lượng chung của lớp tăng khi cả nhóm lập luận đúng hoặc sửa lỗi. Giữ so điểm đối kháng cho chế độ Luyện tập.
- **Mỗi hoạt động chỉ giới thiệu tối đa một cơ chế game mới.** Tránh học sinh vừa học luật chơi vừa học kiến thức mới trong cùng 7 phút.
- **Thẻ "Hộ chiếu học tập" cuối tiết** cho từng em: đạt độc lập / làm được khi có hỗ trợ / bước tiếp theo, không có xếp hạng, đủ đẹp để em muốn chụp lại.
- **Bảng điều khiển giáo viên có dòng "3 việc nên làm bây giờ"** (em cần hỗ trợ, lỗi phổ biến, việc cần chốt), không bắt đọc cả bảng.
- **Cho thấy phó bản từ sớm** (một cánh cửa còn khóa trên bản đồ) để học sinh có động lực hoàn thành phần lõi.

### 17.5 Thứ tự việc tiếp theo (đề xuất)

1. Chạy thử màn học sinh/TV ở các khung mục 17.3.5, và thử nhiều học sinh (17.3.4).
2. Kiểm gõ tiếng Việt (17.3.1) và quyết định các mục còn mở.
3. Thêm cổng sư phạm cho bản nháp AI (17.3.2) và xác nhận gửi dữ liệu (17.3.3).
4. Tạo ảnh 7 map khi có hạn mức (17.2), gắn lớp đường/cổng và kiểm trên điện thoại.
5. Phát hành riêng tư để kiểm bằng ba loại tài khoản (17.3.6) rồi mới mở rộng đối tượng.

## 18. Bổ sung r6 (08/10/2026): quyết định đã duyệt, việc đã làm và việc đang làm

> **Quy tắc làm việc (chủ hệ thống yêu cầu):** mọi thay đổi hay quyết định đã được cân nhắc và thấy ổn phải được ghi vào file này **ngay**, để bất kỳ ai đọc lại (Codex hoặc Claude) biết cái gì **đã làm, đang làm, sẽ làm**. Mục 18.1–18.3 là nơi cập nhật trạng thái; không để quyết định chỉ nằm trong khung chat.

### 18.1 Đã làm xong (Claude, nhánh `codex/mat-ma-da-gioi`, chưa commit, chưa đẩy lên link)

| Việc | Ghi chú |
|---|---|
| Chống xung đột khi 26–50 học sinh cùng vào/nộp | hàng đợi theo phiên (`inTurn`), thử lại có giới hạn, mã lỗi gọn; chạy giả lập `tasks/qa/load-class.mjs`: nộp bài 26/26 (trước đó 1/25) |
| Chấm số kiểu Việt | nhận `1,5`, `−3`, `–3`; có test hồi quy |
| Màn chơi học sinh = bản đồ toàn màn hình | `app/play/page.tsx`: bản đồ chiếm 100%, nhiệm vụ là pop-up (`LessonEncounterSheet`) tự mở khi linh vật tới cổng, nút nổi mở lại |
| Xúc xắc 3D nổi giữa màn hình, linh vật chỉ đi sau khi xúc xắc dừng | `LessonMapStage` |
| Chọn linh vật trước khi vào, **khóa khi tiết học bắt đầu** | lệnh `CHOOSE_MASCOT`, lỗi `MASCOT_LOCKED`; `LessonMascotPicker` |
| Bản đồ vừa khít, không dải đen | 2D phủ kín (cover), lớp ảnh nét `@2x.webp` (5 map), 3D có nền mờ cùng ảnh, thu nhỏ tối đa = vừa khung |
| Góc nhìn: xoay 360° + 3 góc nhìn cài sẵn, tự theo linh vật của mình | `public/lesson-map.html`, `public/strategic-map.js` |
| Bản đồ trên màn giáo viên/TV | giáo viên/TV thấy các linh vật của lớp (tên ẩn trên TV) |
| Cổng kiểm: 557 test, typecheck, lint, build, diff-check đều qua | |

### 18.2 Quyết định đã duyệt ngày 08/10/2026 (chủ hệ thống: "1. Duyệt  2. đồng ý  3. đồng ý")

**Quyết định 1 — Làm lại bản 3D theo kiểu PUBG (thí điểm trên map Ngũ Ấn Long Thành, rồi mở rộng)**
- Lý do: bản 3D hiện tại là *một mặt phẳng ảnh nghiêng* xoay quanh tâm. Người dùng muốn camera **quỹ đạo quanh linh vật** như game bắn súng góc nhìn thứ ba, không phải xoay cả bản đồ như cái đĩa.
- Thiết kế:
  - Camera phối cảnh (perspective) quay quanh **linh vật của em**: kéo ngang = đổi hướng (yaw), kéo dọc = ngước/cúi (pitch, có giới hạn để không chui xuống đất), chụm hai ngón/lăn chuột = gần/xa. Linh vật luôn ở gần tâm màn hình.
  - Địa hình có **độ cao thật** (heightfield) phủ ảnh bản đồ làm kết cấu; có bầu trời, sương xa, đường chân trời.
  - Vật thể 3D (cây, nhà, cổng) dùng tài nguyên miễn phí giấy phép rộng (CC0/MIT); linh vật là thẻ đứng luôn quay mặt về camera.
  - **Bản 2D giữ lại** cho máy yếu / người chọn; tự rơi về 2D khi không có WebGL hoặc khung hình quá chậm.
  - Vẫn giữ nguyên quy tắc: không dải đen ở bất kỳ khổ máy nào; điện thoại, iPad, máy tính.
- Cách làm: thư viện Three.js nạp riêng cho trang bản đồ (không nạp ở các trang khác), module riêng, thí điểm một map; **chỉ mở rộng 11 map còn lại sau khi chủ hệ thống xem và duyệt bản thí điểm**.
- Nghiệm thu: kéo xoay mượt (≥ 30 khung/giây trên điện thoại tầm trung), linh vật không bị che, cổng nhìn thấy được, chuyển 2D↔3D không mất vị trí, bộ test và cổng kiểm vẫn qua.

**Quyết định 2 — Linh vật từ ảnh của học sinh (phương án 1 trước)**
- Phương án 1: ghép khuôn mặt từ ảnh lên một linh vật có sẵn, **xử lý ngay trên máy học sinh** (không gửi ảnh gốc lên máy chủ).
- Mặc định **tắt**; chủ phòng bật theo từng phòng. Giáo viên **duyệt** trước khi các bạn khác thấy; trong lúc chờ, hiện linh vật mặc định.
- Chỉ lưu ảnh đã ghép thu nhỏ (R2/D1, cần migration mới); không lưu ảnh gốc.
- Chọn trước khi vào game, **khóa khi tiết học bắt đầu** (cùng quy tắc linh vật thường).
- Phương án 2 (AI biến ảnh thành linh vật) **chỉ làm sau khi có quyết định về chính sách riêng tư/đồng ý của phụ huynh** vì là ảnh trẻ vị thành niên.
- Không dùng nhân vật có bản quyền (Pokémon, Labubu, Roblox, Free Fire…). Meme/nhân vật "hot" làm bản **nguyên gốc theo phong cách**, không sao chép.

**Quyết định 3 — Đa ngôn ngữ (làm sau khi bản đồ và nhiệm vụ ổn định)**
- Giao diện **100% tiếng Việt** (sửa chữ Anh còn sót: Cockpit, Preview/Live, Director Plan, Approve, shared, CORE, "PHA: EXPERIENCE"…), có nút đổi ngôn ngữ: Anh, Trung, Nhật, Hàn; đổi là đổi **toàn bộ** chữ giao diện, không đổi nửa vời.
- **Không dùng widget Google Dịch** (làm hỏng React, không dịch được iframe bản đồ, làm hỏng công thức Toán, lộ nội dung). Dùng hệ thống i18n riêng + bản dịch nội dung bài do AI dịch ở máy chủ (lưu đệm, giữ nguyên công thức, có bảng thuật ngữ Toán song ngữ, giáo viên soát được).
- Học sinh có thể bật **lớp dịch hỗ trợ** (xem bản dịch song song) để hỗ trợ việc học, tùy chọn.
- 79 mã lỗi máy chủ cần có thông báo theo từng ngôn ngữ; trang `lesson-map.html` cũng đi theo ngôn ngữ đã chọn; font CJK.

### 18.3 Việc còn lại (theo thứ tự)

1. **[XONG BẢN THÍ ĐIỂM — chờ chủ hệ thống xem rồi mới mở rộng] 3D kiểu PUBG trên Ngũ Ấn Long Thành** (Quyết định 1), làm ngày 08/10/2026:
   - Mới: `public/map3d.js` (module ES, camera phối cảnh quay quanh linh vật của em; kéo = xoay/ngước, chụm hoặc lăn chuột = gần/xa, phím mũi tên, +/−, 0; địa hình có độ cao phủ ảnh bản đồ; núi bao quanh, bầu trời, sương, ngày/đêm; cây, đá, nhà, 5 tháp cổng, đá lát đường; linh vật là thẻ đứng quay mặt về camera, có tên, vòng sáng cho linh vật của mình, đi từng ô có nhún bước khi xúc xắc xong).
   - Thư viện: `public/vendor/three/` (Three.js 0.180.0 bản min + LICENSE MIT), chỉ nạp khi bấm 3D ở map thí điểm (nạp lười), `eslint` bỏ qua `public/vendor/**`.
   - Nối vào `public/lesson-map.html`: `PILOT_WORLDS = { historical: true }`; bấm 3D ở map này dùng cảnh mới, các map khác vẫn dùng 3D mặt phẳng nghiêng cũ; tắt bản đồ 2D cũ khi đang 3D để không vẽ vô ích, về 2D thì dựng lại; nút Góc 1–4 (sau lưng / chéo / thấp ngang / nhìn từ trên), thanh xoay 360°, Tìm tôi/Toàn cảnh, Ánh sáng ngày/đêm đều chạy trên cảnh mới.
   - Tự về 2D khi: không có WebGL, mất ngữ cảnh WebGL, hoặc khung hình dưới ~22/giây (đầu tiên giảm độ nét xuống 1x, sau 3 lần đo chậm mới về 2D) và báo bằng chữ.
   - Đã kiểm trên trình duyệt: máy tính 1280×720 và điện thoại 375×812 (không dải đen), xoay quanh linh vật, linh vật đi khi vị trí đổi, 2D↔3D, đêm, không lỗi console. Cổng kiểm: 560 test, typecheck, lint, build đều qua; thêm `tests/lesson-map-3d-pilot.test.mjs`.
   - **Sửa theo phản hồi (08/10/2026): linh vật quá bé khi phóng to/thu nhỏ.** 2D: linh vật tròn, đủ màu (bỏ lọc làm xám), 58 px (50 px trên điện thoại), linh vật của em 94 px (78 px) có vòng sáng nhấp nháy và nhãn tên vàng. 3D: kích thước linh vật và tên tự lớn theo khoảng cách camera (không bao giờ co thành chấm), linh vật của em có cột sáng nhìn thấy từ xa. Quy tắc giữ lâu dài: **linh vật phải nổi bật ở mọi mức thu phóng, trên mọi khổ máy.**
   - **Chủ hệ thống đã xem và khen: "đẹp rồi" (08/10/2026)** — kích thước linh vật 2D/3D được chấp nhận. Chưa có lời duyệt riêng cho việc mở rộng 3D sang 11 map còn lại; muốn mở rộng phải làm bộ vật thể theo chủ đề từng map (cây, nhà, tháp phù hợp) chứ không dùng chung bộ cổ trang.
   - **Sửa theo phản hồi lần 2 (08/10/2026):** (1) cột sáng che mất linh vật → bỏ cột sáng, thay bằng mũi tên vàng nhỏ nhấp nhô phía trên đầu; (2) tên ("Em", tên các em tự đặt) đặt **dưới chân** linh vật, không che mặt — vì sẽ có tùy chọn ghép khuôn mặt học sinh lên linh vật (Quyết định 2), quy tắc: **không vật gì được che vùng mặt/đầu linh vật**; (3) nút "Toàn màn hình" xin chế độ toàn màn hình cho **cả trang game** (bản đồ + xúc xắc + pop-up) thay vì chỉ khung bản đồ, đổi nhãn "Thoát toàn màn hình", và báo bằng chữ khi trình duyệt chặn (iPhone Safari không hỗ trợ; khung xem trước của app Claude cũng chặn nên chưa thử được chế độ thật, cần thử trên Chrome/Safari iPad).
   - **Bản đồ lớp trên Cockpit giáo viên:** thêm thẻ "Bản đồ của lớp" (có tên các em, số em tới cổng, số em chưa chọn linh vật) ngay trên danh sách học sinh. Còn thiếu: lọc/gom cụm theo vị trí, gom theo nhóm khi thi đấu nhóm.
   - **Hạn chế đã biết, cần chủ hệ thống nhận xét:** ảnh nền đang là tranh vẽ nghiêng nên dán lên địa hình thì nhìn từ trên xuống bị méo; vật thể 3D (nhà, cây) đặt thêm lên có thể trùng với nhà/cây vẽ sẵn trong ảnh; chưa đo FPS trên điện thoại thật; tên linh vật lớn quá khi sát camera. Hướng nâng cấp nếu duyệt: tạo ảnh nền nhìn thẳng từ trên xuống (không nướng phối cảnh) cho từng map, dùng mô hình 3D CC0 thay khối thô, đổ bóng.
2. Cockpit giáo viên có bản đồ thật: tên, lọc, gom cụm theo vị trí; TV gom nhóm khi chủ phòng chọn thi đấu theo nhóm.
3. Bộ linh vật đa dạng theo từng map (bản gốc, kể cả phong cách meme) — cần hạn mức tạo ảnh (hết hạn mức đến ≈ 20:50); đổi dữ liệu linh vật thành mô-đun riêng để tên khớp tranh.
4. Ảnh 7 map còn là SVG: tạo ảnh khổ ngang độ phân giải cao + bản dọc cho iPad/điện thoại; ghi `assets-manifest`.
5. Linh vật từ ảnh học sinh (Quyết định 2), sau khi có chỗ lưu (migration mới).
6. Đa ngôn ngữ (Quyết định 3), sau khi 1–4 ổn định.
7. Chụp hình chứng minh xúc xắc rơi và linh vật đi; xem lại hành vi "Tìm tôi"/theo dõi; cân nhắc ép máy chủ bắt buộc chọn linh vật trước khi vào.
8. Các mục cũ chưa làm: OCR, AI thật trên web, cổng sư phạm cho bản nháp AI, xác nhận trước khi gửi nội dung cho AI, thử nhiều học sinh trên máy thật / TV, phát hành riêng tư qua Codex (migration 0008–0012, R2). **Không commit, không đẩy, không triển khai cho tới khi chủ hệ thống yêu cầu.**

### 18.3b Ý kiến và quyết định của chủ hệ thống ngày 08/10/2026 (tối) — đang thực hiện

Chủ hệ thống đồng ý làm thêm Cockpit; duyệt hướng nâng cấp 3D; yêu cầu "tiếp tục cải thiện để đạt được 3D đẹp thực sự". Ba ý kiến:

1. **Nút "Toàn cảnh" và "Toàn màn hình" dễ nhầm.** Phân tích: "Toàn cảnh" = xem cả bản đồ để thấy hết đường đi; "Toàn màn hình" = ẩn thanh trình duyệt. Trong 3D, "Toàn cảnh" đang nhảy về sau lưng linh vật (trùng "Tìm tôi") — là lỗi. Quyết định: đổi tên thành **"Xem cả bản đồ"** (đúng nghĩa, trong 3D lùi camera ra cao nhìn hết đường), giữ **"Tìm tôi"** = quay về sau lưng linh vật; nút toàn màn hình làm thành nút biểu tượng riêng, tách khỏi nhóm nút điều khiển bản đồ, có chú thích.
2. **3D phải kéo thả được để xem bản đồ, không chỉ xoay quanh linh vật.** Quyết định: thêm chế độ **di chuyển (pan)**: nút "Kéo: Xoay / Di chuyển", chuột phải hoặc giữ Shift + kéo = di chuyển, hai ngón trên cảm ứng = chụm để zoom + kéo để di chuyển. Khi đã di chuyển tự do thì camera thôi bám linh vật; "Tìm tôi" bám lại.
3. **Duyệt hướng: nền nhìn thẳng từ trên xuống cho từng map, mô hình 3D chất lượng hơn, đổ bóng.** Quyết định thực hiện: (a) nền địa hình **không nướng sẵn nhà/đường/cổng** — tô màu theo độ cao, độ dốc, nhiễu, sông/hồ có nước, bảng màu riêng từng map; đường, cổng, nhà, cây do 3D dựng nên khớp tuyệt đối với đường đi; (b) mô hình dựng từ khối có chi tiết (chùa nhiều tầng mái cong, tường thành, đèn lồng, cầu, nhà mái cong…) và bộ cây đa dạng; (c) **đổ bóng** theo hướng mặt trời, bóng mềm; (d) nước chuyển động, sương xa. Ảnh nền AI nhìn thẳng từ trên xuống chỉ làm **bổ sung** khi có hạn mức, không còn là điều kiện bắt buộc.
   - Thứ tự: sửa nút (1) → kéo thả (2) → bản đồ 3D đẹp trên Ngũ Ấn Long Thành → xin chủ hệ thống xem → làm cho map khác theo chủ đề từng map.

#### Kết quả thực hiện 3 ý kiến (08/10/2026, tối)

- **Ý 1 (nút):** đã đổi "Toàn cảnh" → "Xem cả bản đồ" (3D: lùi camera ra cao thấy cả đường), "Tìm tôi" quay về sau lưng linh vật; "⛶ Toàn màn hình" tách riêng cuối hàng, nét đứt, có chú thích.
- **Ý 2 (kéo thả):** 3D có nút "Kéo: Xoay quanh / Di chuyển"; Shift hoặc chuột phải/giữa + kéo = di chuyển; hai ngón = zoom + di chuyển; Shift+mũi tên; giới hạn trong phạm vi bản đồ chơi được (không bay ra núi). Kéo đi thì camera thôi bám linh vật.
- **Ý 3 (3D đẹp thật), bản `public/map3d.js` viết lại:** không còn dán ảnh tranh vẽ. Địa hình tô bằng shader (cỏ, đất khô, đá, cát, tuyết nhẹ, đường) theo độ cao/độ dốc/nhiễu; **sông và vịnh có nước** (chuyển động), **cầu gỗ** tự dựng ở chỗ đường cắt sông, **bến đò + thuyền**; **cổng** là mái cổng trên đường (có biển số + tên trạm) + tháp 3 tầng mái cong + tường lũy hai bên; nhà mái cong theo xóm; cây thông/cây tròn/hoa đào/tre; đá; đèn lồng bên đường (sáng ban đêm); **bóng đổ mềm theo mặt trời**; mây trôi; ngày/đêm. Đường và cổng khớp tuyệt đối với đường đi vì cùng sinh từ một dữ liệu. Tự giảm chất lượng (độ nét → bóng → về 2D) khi máy chậm.
- **Chưa làm (còn lại cho Ngũ Ấn Long Thành):** tỉ lệ cây vẫn hơi lớn so với linh vật ở một số góc; núi hai bên còn "mềm" khi nhìn gần; chưa có đo FPS trên điện thoại thật; chưa có âm thanh môi trường (nước, gió).
- **Còn phải làm cho 11 map khác:** mỗi map cần bộ chủ đề riêng trong `THEMES` (bảng màu, sông/hồ, cây, kiểu nhà, kiểu cổng, nhịp cầu, hiệu ứng), sau khi chủ hệ thống duyệt bản Ngũ Ấn.

### 18.3c Phản hồi vòng 3 của chủ hệ thống (08/10/2026, tối) — ghi ngay, đang xử lý

1. **"3D xấu quá, ko thể làm chuyên nghiệp như game xịn hiện nay à?"** — Nhận xét đúng: bản hiện tại là khối hình tự dựng bằng mã, không phải tài sản nghệ thuật thật. Hướng nâng cấp đã chọn: mô hình 3D thật (glTF, giấy phép CC0/MIT), vật liệu PBR, ánh sáng môi trường (IBL/HDRI), nước có bọt và phản chiếu, hậu kỳ (khử bóng tối góc, bloom đèn lồng, sương thung lũng, chỉnh màu, nghiêng-dịch chuyển kiểu bản đồ chiến dịch), cây đung đưa theo gió. Có giới hạn trung thực: trình duyệt điện thoại chạy được mức "game di động tầm trung", không phải AAA; máy yếu tự tắt hậu kỳ. Chi tiết ở 18.3d.
2. **Xúc xắc phải hiện ngay TRÊN bản đồ, thật nhất có thể, không chỉ ở rìa.** Quyết định: xúc xắc 3D là vật thể nằm **trong cảnh bản đồ** (nổi cạnh linh vật, chạm để ném, lăn xuống đất có bóng, nảy, dừng, rồi hiện số và cửa sổ kết quả ngay tại đó, sau đó linh vật mới đi). Bản 2D có xúc xắc tương tự trên bản đồ phẳng.
3. **Giao diện người chơi và host phải tinh gọn.** Quyết định: bản đồ chiếm toàn màn hình, không còn tiêu đề/khung/thanh nút lớn; điều khiển gom thành một cụm biểu tượng nhỏ; mọi thứ phụ nằm trong một menu. Host: màn điều hành theo "việc cần làm ngay" thay vì bảng nút. Chi tiết ở 18.3e.
4. **Hoạt động kiểm tra (ví dụ đề Toán 11 GHKI thi thử 01 ngày mai).** Câu hỏi: đưa lên game hóa cho HS được không, tổ chức thế nào? Phân tích ở 18.3f.

### 18.3d 3D "chuyên nghiệp": thiết kế nâng cấp (đang làm, theo pha, chủ hệ thống xem sau mỗi pha)

Mục tiêu thẩm mỹ: **"mô hình thu nhỏ" kiểu bản đồ chiến dịch** (Total War: Three Kingdoms, Townscaper, Dorfromantik): ánh sáng và hậu kỳ giàu, màu hài hòa, sống động, không giả vờ là AAA. Giới hạn trung thực: trình duyệt điện thoại ≈ game di động tầm trung; có 3 mức chất lượng, máy yếu tự giảm.

- **Pha A — ánh sáng và hậu kỳ:** ánh sáng môi trường (IBL), khử tối góc (GTAO), phát sáng đèn (bloom), chỉnh màu, vignette, nghiêng-dịch chuyển nhẹ (tilt-shift) cho cảm giác mô hình thu nhỏ, sương xa theo độ cao. Cần importmap + thêm bộ hậu kỳ của Three.js vào `public/vendor/three/addons`.
- **Pha B — mặt đất thật:** vật liệu PBR miễn phí bản quyền (CC0, Poly Haven): cỏ, đất, đá (triplanar trên dốc), cát, đường lát; biến thiên vĩ mô chống lặp; nước có Fresnel, bọt bờ, phản chiếu trời.
- **Pha C — cây cối:** tán lá bằng nhiều thẻ lá có kết cấu, đung đưa theo gió, cỏ và hoa rải theo cụm, ruộng bậc thang trên sườn đồi.
- **Pha D — công trình:** chùa/cổng/nhà mái cong có kết cấu gỗ, ngói, vữa; cầu vòm, hàng rào, bậc đá, cờ phấp phới, đèn lồng.
- **Pha E — sự sống:** cánh hoa bay, đom đóm ban đêm, khói bếp, chim, thuyền trôi, dân làng đi lại, đèn hoa đăng trên sông.
- **Nguồn tài nguyên:** chỉ dùng CC0/MIT, ghi `public/vendor/ATTRIBUTIONS.md` (tên, nguồn, giấy phép, ngày tải). Không dùng hình ảnh có bản quyền.
- **Nghiệm thu:** chủ hệ thống xem từng pha; ≥ 30 khung/giây ở mức "vừa" trên máy tầm trung (đo trên máy thật khi có); mọi pha đều có đường lui về mức thấp hơn.

### 18.3e Giao diện tinh gọn: nghiên cứu và tính toán

**Nguyên tắc thiết kế:** (1) bản đồ là màn hình, giao diện chỉ là lớp mỏng nổi lên; (2) tối đa **5 điều khiển luôn hiện** cùng lúc (luật Hick: càng nhiều lựa chọn càng chậm); (3) **một nút chính duy nhất** đổi nhãn theo ngữ cảnh; (4) cử chỉ thay nút (chụm = zoom, kéo = xoay, hai ngón = di chuyển, chạm đúp = về linh vật); (5) cái phụ gom vào một menu "⋯"; (6) vùng chạm ≥ 44 px, chữ ≥ 16 px, nằm trong tầm ngón cái; (7) không văn bản hướng dẫn thường trực — chỉ gợi ý một lần.

**Màn học sinh (điện thoại/iPad/máy tính), từ cũ → mới:**
- Cũ: tiêu đề lớn + dòng mô tả + 8–10 nút + hàng góc nhìn + thanh trượt + dòng thông tin dưới đáy ≈ 20 phần tử, chiếm ~40% màn hình.
- Mới: **thanh trạng thái góc trên trái** (linh vật + "Cổng 2/5 · còn 6 bước"); **cụm điều khiển bản đồ góc trên phải** chỉ 3 nút (⌖ Tìm tôi, 🗺 Xem cả bản đồ, ⋯ Menu); **nút chính giữa-đáy** đổi theo ngữ cảnh ("🎲 Lắc" → "Đang đi…" → "Vào cổng" → "Làm nhiệm vụ"); **nút nhiệm vụ góc dưới trái** có chấm báo. Menu "⋯" chứa: 2D/3D, ngày/đêm, kéo xoay/di chuyển, toàn màn hình, ngôn ngữ, trợ giúp, thoát. Tổng cộng luôn hiện: **4–5**.

**Màn giáo viên (host), thiết kế bố cục:**
- **Thanh trên cùng**: mã phòng lớn (chạm để chép) · số HS vào/sẵn sàng · đồng hồ · trạng thái · **một nút chính đổi theo trạng thái** ("Mở phòng" → "Bắt đầu" → "Tạm dừng/Tiếp tục" → "Sang hoạt động tiếp" → "Kết thúc").
- **Khu giữa**: bản đồ lớp (chiếm phần lớn); chạm một linh vật mở thẻ học sinh (tiến độ, bài làm, bằng chứng, nhánh Core/Support).
- **Ngăn bên phải, 3 thẻ**: **Cần chú ý** (tự xếp ưu tiên: HS kẹt, lỗi sai chung, bằng chứng chờ chấm, vắng) · **Học sinh** (bảng tìm kiếm/sắp xếp) · **Hoạt động** (dòng thời gian, việc kế tiếp).
- **Cài đặt phòng/Studio/Xuất dữ liệu**: gom sau một nút "Cài đặt", không nằm trên màn điều hành.
- Mục tiêu đo được: số nút luôn hiện giảm từ ~40 xuống ≤ 12; thao tác thường gặp (bắt đầu, tạm dừng, xem ai kẹt, chấm bằng chứng) ≤ 2 chạm.
- Thực hiện theo đợt, vì `lesson-dashboard.tsx` dài 5.549 dòng: đợt 1 thanh trên + ngăn "Cần chú ý" + bản đồ lớp (xong phần bản đồ); đợt 2 gom nhóm các thẻ cũ vào 3 thẻ; đợt 3 dọn Studio.

### 18.3f Hoạt động "Kiểm tra" — phân tích từ đề Toán 11 GHKI thi thử 01

**Đề mẫu (đã đọc đủ 6 trang):** 90 phút; **Phần I** 12 trắc nghiệm một đáp án (3 đ, nhiều câu có hình đồ thị/hình học không gian); **Phần II** 4 câu đúng/sai, mỗi câu 4 ý a–d (4 đ); **Phần III** 4 bài tự luận (3 đ, có chứng minh hình học). Đề **không kèm đáp án**. Đáp án đề xuất do AI giải để GV đối chiếu: `tasks/exams/toan11-ghki-thithu-de01-dap-an-de-xuat.md`.

**Trả lời "đưa lên game hóa được không?": ĐƯỢC, nhưng phải là chế độ riêng, không nhét vào tiết học thường.** Thiết kế:

1. **Nguyên tắc trung thực của điểm:** điểm = chỉ từ bài làm. Game chỉ là **lớp đi cùng**: hành trình trên bản đồ, linh vật, đồng hồ, hộ chiếu kết quả. **Không gợi ý, không xếp hạng đúng/sai công khai, xúc xắc không ảnh hưởng điểm và không khóa câu hỏi.** Phân biệt hai loại: **thi thử/kiểm tra thường xuyên** (đề này là "thi thử" — cho phép phản hồi và phần thưởng sau bài) và **kiểm tra chính thức** (khóa chặt hơn, kết quả chỉ GV thấy).
2. **Luồng cho HS:** vào bằng mã → chọn linh vật (khóa khi bắt đầu) → phòng chờ → GV bấm bắt đầu → đồng hồ chạy → **bảng câu hỏi** (ô số 1–20, màu: chưa làm / đã làm / đánh dấu xem lại) → mỗi câu là một cửa sổ đủ lớn để xem hình → lưu nháp liên tục → nộp bài (xác nhận) hoặc tự nộp khi hết giờ → "Hộ chiếu kết quả". Bản đồ là **thanh tiến độ sinh động**: mỗi câu trả lời xong tặng 1 lượt lắc xúc xắc (linh vật tiến lên, cho vui, có nút "lắc nhanh"); ba Phần = ba vùng/cổng (Phần I 12 trạm, Phần II 4 trạm lớn, Phần III 4 "ải").
3. **Chấm điểm:** Phần I tự chấm (0,25/câu). Phần II tự chấm theo **thang THPT 2025** (1 ý = 0,1; 2 ý = 0,25; 3 ý = 0,5; 4 ý = 1,0) — game hiện chưa có bộ chấm từng phần này (chỉ có đúng-hết-hay-không), cần thêm. Phần III **tự luận**: HS viết ra giấy rồi chụp ảnh nộp (hoặc gõ), GV chấm theo thang bước; sau này AI gợi ý điểm cho GV duyệt (SmartPlan đã có chấm AI).
4. **Chống gian lận hợp lý:** đảo thứ tự câu và đáp án theo từng HS (trừ câu có "cả A và B…"), đếm số lần rời tab và báo GV, khóa quay lại khi đã nộp, mã phòng + tên không trùng, GV có thể cộng thời gian/cho nộp lại. Không dùng giám sát xâm lấn (webcam).
5. **Màn GV khi thi:** lưới HS (đã vào, đang làm xx/20, đã nộp, số lần rời tab, thời gian còn), nút cộng giờ, nộp hộ; sau thi: bảng điểm, **phân tích theo câu** (câu nào sai nhiều), phân tích theo mục tiêu (Lượng giác / Dãy số / Quan hệ song song), xuất CSV, danh sách bài tự luận cần chấm.
6. **Dùng lại cái đã có:** trong game đã có bộ chấm `choice_exact`, `numeric_exact`, `text_normalized_exact`, `representation_match` (đúng/sai) và phần "bằng chứng" do GV chấm. **SmartPlan (Firebase) đã có hệ thống thi trực tuyến đầy đủ**: 4 loại câu (trắc nghiệm, đúng/sai kép, trả lời ngắn, tự luận), `tfScoringMode: thpt2025`, đảo câu, giờ làm bài, mật khẩu, số lần làm, canh rời tab, chấm AI tự luận, bộ đọc đề PDF.
7. **Hai phương án cho ngày mai (09/10):**
   - **A (khuyến nghị, an toàn): thi bằng SmartPlan** — đã chạy thật, đúng định dạng đề này. Game chưa được phát hành lên link (bản trên link vẫn là V7, phát hành phải qua Codex, cần chạy migration 0008–0012) và chế độ Kiểm tra chưa xây. Rủi ro mất bài của HS khi thi là không chấp nhận được.
   - **B: thi bằng game** — chỉ khi (1) xây xong chế độ Kiểm tra MVP, (2) phát hành riêng tư qua Codex, (3) diễn tập với ≥ 5 máy thật. Không kịp một cách đáng tin cậy trước ngày mai.
   - **Đề xuất lộ trình:** mai thi bằng SmartPlan; trong tuần xây "Chế độ Kiểm tra" cho game **nhận đề theo đúng định dạng SmartPlan** (xuất/nhập JSON), diễn tập, rồi dùng cho lần sau.
8. **Việc phải xây (theo đợt):** đợt 1 — mô hình dữ liệu "gói kiểm tra" + bộ chấm từng phần (có test); đợt 2 — màn làm bài của HS (bảng câu hỏi, hình, lưu nháp, hết giờ); đợt 3 — màn GV theo dõi và chấm tự luận; đợt 4 — hành trình trên bản đồ + hộ chiếu kết quả; đợt 5 — nhập đề từ SmartPlan/PDF; đợt 6 — diễn tập và phát hành.

#### Kết quả vòng 3 (08/10/2026, tối) — ý 2 (xúc xắc trên bản đồ) và ý 3 (giao diện tinh gọn, phía học sinh)

- **Xúc xắc là vật thể TRONG bản đồ** (`public/map3d.js` cho 3D, `public/lesson-map.html` cho 2D phẳng): xúc xắc ngà 3D bo góc, chấm đỏ ở mặt 1 và 4, **nổi cạnh linh vật** với dòng "Chạm để lắc" (chạm thẳng vào xúc xắc là ném); khi lắc: bay lên **xoay trên đầu linh vật** chờ kết quả từ máy chủ; khi có kết quả: **ném xuống đất trước mặt linh vật, nảy hai lần, dừng đúng mặt**, vòng sóng lan ra, **bong bóng "N bước"** hiện ngay tại đó; xong mới cho linh vật đi. Bản 2D phẳng có xúc xắc tương tự giữa bản đồ. Giữ nguyên quy tắc: xúc xắc chỉ di chuyển, không ảnh hưởng điểm học.
- Giao thức: trang cha gửi `dice {phase: idle|rolling|landed, face, steps, canRoll, seq}`; bản đồ gửi lại `lesson-map:roll` (chạm xúc xắc) và `lesson-map:dice-done` (đã dừng). Có đồng hồ an toàn 3,4 giây nếu bản đồ không báo.
- **Một nút chính duy nhất ở đáy** đổi theo ngữ cảnh: "Lắc xúc xắc" → "Đang lắc..." → "Làm nhiệm vụ" (khi tới cổng); phía trên nó là một viên thuốc trạng thái "Cổng 2/9 · Còn 6 bước". Nút "Nhiệm vụ" thành nút tròn nhỏ góc dưới trái.
- **Thanh trên của học sinh**: chỉ còn [ảnh linh vật + tên] … [🔊 chỉ khi chưa bật phản hồi] [🎖 điểm] [👥 nhóm, nếu có] [☰]. Menu ☰ chứa: bật/tắt phản hồi, cài đặt phản hồi, rời phòng. Bỏ: kicker "HỌC SINH", cụm 4 nút phản hồi, chữ "Ví cá nhân:", bộ đếm số lượt lắc.
- **Bản đồ**: bỏ hẳn tiêu đề, dòng hướng dẫn, thanh công cụ 10 nút, hàng "Góc nhìn", thanh trượt 360°, khung thông tin đáy. Còn **ba nút tròn nổi bên phải** (⌖ Tìm tôi, ⛶ Xem cả bản đồ, ⚙ Tùy chọn) và một menu: 2D/3D, góc nhìn, một ngón kéo để Xoay/Di chuyển, phóng to/thu nhỏ, ngày/đêm, toàn màn hình.
- **Đã kiểm trên trang thật** (`/play`, 750×813): lắc thật qua máy chủ, xúc xắc 3D ném và dừng, `dice-done` về sau 2,3 giây, linh vật đi, tổng 3,8 giây/lượt. Cổng kiểm: 563 test, lint, typecheck, build qua.
- **Sửa thêm trong lúc kiểm:** linh vật bị nước trong suốt phủ lên và bị cây che → vẽ linh vật sau nước, thêm "bóng ma" mờ nhìn xuyên qua cây/tường, đặt máy ảnh mặc định xa và cao hơn (38, 48°).
- **Còn lại cho ý 3:** màn giáo viên (host) mới có thẻ "Bản đồ của lớp"; thanh trên + ngăn "Cần chú ý" + gom thẻ cũ là các đợt 1–3 ở mục 18.3e. Bản đồ của giáo viên/TV dùng cùng cụm ba nút.

#### Kết quả vòng 3 (08/10/2026, tối) — ý 1 (3D chuyên nghiệp) và ý 3 (màn giáo viên)

**3D, theo các pha ở 18.3d (mã: `public/map3d.js`, `map3d-post.js`, `map3d-models.js`, `map3d-textures.js`):**
- **Pha A xong — ánh sáng và hậu kỳ:** ánh sáng từ chính bầu trời (IBL, nướng một lần cho ngày/đêm), khử tối góc GTAO, phát sáng (bloom) cho đèn/ánh nắng trên sông, chỉnh màu (bão hòa, ấm sáng/lạnh tối), vignette, **nghiêng-dịch chuyển nhẹ** cho cảm giác mô hình thu nhỏ, mặt trời có quầng sáng, mây trôi, sương đổi theo độ cao máy ảnh (xem cả bản đồ vẫn rõ). Bóng đổ mềm, chỉ vẽ một lần mỗi khung dù có nhiều lượt hậu kỳ.
- **Pha B làm bằng mã, chưa dùng ảnh ngoài:** mặt đất tô theo độ cao/độ dốc/nhiễu + **bốn lớp chi tiết bề mặt tự sinh** (cỏ, đá nứt, đất, đá lát đường, gợn cát) làm sáng-tối và **bump** (đổ bóng li ti), đá triplanar trên sườn dốc, bọt sóng ở bờ, cát ướt. Nước: phản chiếu bầu trời, sóng chuyển động. Đường lát đá khớp tuyệt đối với đường đi (đã sửa lỗi ngược trục).
- **Pha C xong — cây cối:** tán cây tròn mềm (cầu ghép + nhiễu, đổ màu từ tối ở dưới sang sáng ở trên), thông có tầng rủ, tre, hoa đào; **9.000 cụm cỏ + 1.100 bông hoa** theo mảng đồng cỏ; **gió đung đưa** cây, cỏ, hoa; đá gồ ghề.
- **Pha D xong — công trình:** **mái cong thật** (cong lõm, mép cong vút, có viên ngói theo hàng, sống mái và đầu đao), nhà có khung gỗ, cửa, cửa sổ chấn song, bậc đá; **chùa 3 tầng** có cột đỏ, cửa sổ, ban công, tầng mái thu nhỏ và đỉnh tháp nhiều vòng; **cổng** hai cột lớn + hai cột nhỏ, dầm đôi, đấu củng, mái cong; tường lũy có răng cưa; đèn lồng đỏ bên đường (sáng ban đêm); cầu gỗ, bến đò, thuyền.
- **Pha E xong — sự sống:** cánh hoa đào rơi (ngày), đom đóm nhấp nháy và đèn hoa đăng trôi theo sông (đêm), thuyền nan trôi theo sông (ẩn khi chui qua cầu), đàn chim bay vòng, bảy người dân đội nón lá đi lại trên đường.
- **Dải vàng dẫn đường** chạy dọc cả hành trình để nhìn từ xa vẫn thấy đường đi.
- **Ba mức chất lượng** (đầy đủ / vừa / nhẹ), chọn lúc đầu theo thiết bị (điện thoại và máy ít nhân bắt đầu ở mức vừa) và tự hạ khi khung hình chậm; không bao giờ phán xét khi tab đang ẩn. Ở mức nhẹ giảm cỏ, hoa, cây; cuối cùng mới về 2D. Có tham số `?q=0|1|2` để ép mức khi thử, `?debug` để đọc số khung hình.
- **Chưa đo tốc độ trên máy thật.** Khung xem trước trong app Claude chạy ở chế độ ẩn nên chỉ ~1 khung/giây, không dùng để đo. Việc cần làm: chủ hệ thống mở trên điện thoại/iPad/máy tính thật và cho biết cảm giác; tôi sẽ chỉnh ngưỡng.
- **Cần xin phép trước khi làm tiếp (chưa tải gì):** thay các lớp chi tiết tự sinh bằng **bộ vật liệu chụp thật miễn phí bản quyền (CC0) của Poly Haven** (cỏ "leafy_grass", đá "cliff_side", đất "brown_mud_dry", đá lát "cobblestone_05", cát "dense_sand"; 5 ảnh ≈ 4,5 MB, nén xuống ≈ 1 MB); chỉ dùng làm độ sáng/bump chứ không đổi màu, để giữ phong cách mô hình thu nhỏ. Cũng cần xin phép nếu muốn dùng mô hình 3D dựng sẵn (Kenney/Quaternius, CC0).

**Màn giáo viên — đợt 1 (mục 18.3e) xong:** thanh điều khiển duy nhất ở đầu Cockpit: đồng hồ lớn + trạng thái + **mã phòng bấm để chép** (giữ lại sau khi tải lại trang) + "x/y em có mặt" + các nút: "+2 phút" (khi đang diễn ra), **một nút chính đổi theo trạng thái** (Bắt đầu / Tạm dừng / Tiếp tục), "Tiếp theo", nút Lôi Đài (chỉ khi cần), "Mở TV" và menu "⋯" (Khóa nộp bài, Đổi mã TV, Xuất CSV, Kết thúc tiết học, phiên bản). Từ 9–10 nút ở hai hàng xuống còn 4–6 nút luôn hiện. Còn lại: đợt 2 (3 thẻ: Cần chú ý / Học sinh / Hoạt động) và đợt 3 (dọn Studio, Việt hóa chữ Anh còn sót như "Director Plan", "Approve", "Typed Fields").

**Cổng kiểm cuối vòng:** 569 test, lint, typecheck, build đều qua.

### 18.4 Nhật ký thay đổi kế hoạch

- r6 (08/10/2026): thêm mục 18; ghi lại việc đã làm (18.1), ba quyết định đã duyệt (18.2), thứ tự việc còn lại (18.3).
- r6.2 (08/10/2026, tối): ghi phản hồi vòng 3, thiết kế 3D chuyên nghiệp/giao diện tinh gọn/chế độ Kiểm tra (18.3c–f) và kết quả thực hiện (xúc xắc trên bản đồ, 3D pha A–E, cockpit đợt 1).
- r6.1 (08/10/2026): bản thí điểm 3D kiểu PUBG đã chạy trên map Ngũ Ấn Long Thành (18.3 mục 1); chờ duyệt trước khi làm 11 map còn lại.

### 18.5 Vòng 4 (08/10/2026, đêm): phản hồi của chủ hệ thống và chẩn đoán 3D bằng số đo thật

**Bốn ý của chủ hệ thống (ghi nguyên văn ý):**
1. Mai (09/10) muốn tổ chức kiểm tra luôn; muốn **gửi file đề (PDF hoặc Word) lên là hệ thống chuyển thành trò chơi được**.
2. 3D hơi **giật lag**, ảnh hơi **mờ, bị vỡ**. Bản 3D cũ chạy rất mượt, chỉ hơi xấu. → tìm nguyên nhân.
3. Tìm được nguyên nhân/cách sửa thì báo cáo + tạo bản thử; nếu ổn thì **duyệt luôn 11 map còn lại** (điều kiện: bản thử ổn — chưa làm 11 map trước khi chủ hệ thống xác nhận bản thử).
4. Rà lại các chức năng khác theo kế hoạch đã làm đủ chưa.

**Chẩn đoán 3D (đo bằng Chrome thật trên chính máy của chủ hệ thống: Intel Iris Plus Graphics, ANGLE/D3D11, màn 1920×1080 vật lý; công cụ: `?debug` → `window.__map3d.bench()/tune()`; kịch bản đo ở thư mục tạm của phiên, kết quả dưới đây):**

| Cấu hình (map Ngũ Ấn, mức chất lượng 0 = mặc định trên máy ≥3 nhân) | ms/khung | fps |
|---|---|---|
| Như đã giao | **231** | ≈4 |
| bỏ khử tối góc GTAO | 159 | 6 |
| bỏ thêm làm mờ nghiêng-dịch chuyển (tilt-shift) | 117 | 9 |
| bỏ thêm bloom | 113 | 9 |
| MSAA 4 → 0 trên đích HalfFloat | −36 ms | |
| Chỉ cảnh (không bóng, không hậu kỳ, vẽ thẳng ra màn) | 34 | 29 |
| …trong đó **mặt đất (shader nhiễu)** một mình | **≈20 (58%)** | |
| Cảnh mức 2 ở 1536×864 (DPR 1) | ≈22 | 45 |

Kết luận nguyên nhân (theo thứ tự đóng góp):
- **Giật lag:** (a) GTAO ≈72 ms, tilt-shift ≈42 ms, MSAA 4 trên đích số thực 16 bit ≈36 ms, bóng đổ vẽ lại **mỗi khung** ≈34 ms; (b) shader mặt đất tính ~25 lần nhiễu fbm **trên từng điểm ảnh** mỗi khung; (c) nhịp vẽ ngầm 42 ms (24 khung/giây) không khớp nhịp màn hình 60 Hz → rung nhịp; (d) cơ chế tự hạ mức: mỗi lần hạ phải biên dịch lại toàn bộ shader + cấp phát lại đích vẽ → khựng thêm.
- **Mờ/vỡ:** sau khi tự hạ xuống mức 2 thì độ phân giải bị ép về DPR 1 (màn Windows 125–150% bị phóng to lên → mờ), không còn hậu kỳ; cộng với tilt-shift cố ý làm mờ phần trên/dưới khi lùi camera; mặt nạ đường 1024×576 bị phóng to ở khi gần → mép đường vỡ.
- Bản 3D cũ mượt vì chỉ là một mặt phẳng dán ảnh, không có shader/bóng/hậu kỳ.

**Quyết định sửa (đều ghi ngay; thực hiện theo thứ tự):**
1. Bỏ GTAO và tilt-shift khỏi đường vẽ mặc định (AO thay bằng đổ màu đỉnh + bóng đổ); bỏ MSAA trên đích số thực (dùng FXAA nhẹ hoặc vẽ thẳng có MSAA màn hình).
2. **Nướng sẵn màu mặt đất** vào ảnh một lần lúc tải (render-to-texture bằng chính shader cũ, giữ nguyên diện mạo), lúc chạy chỉ tra ảnh + chi tiết lặp (không nhiễu theo điểm ảnh).
3. Bóng đổ chỉ vẽ lại khi cần (khung bóng đổi chỗ/đổi cỡ, căn theo ô điểm ảnh bóng), lượng tử hóa cỡ khung bóng; cắt tỉa theo ô cho cây/nhà.
4. **Độ phân giải thích ứng** liên tục (đổi DPR theo thời gian khung, từng nấc nhỏ, có trễ), thay cho việc hạ mức rồi biên dịch lại; mức chất lượng chọn một lần lúc đầu bằng phép đo nhanh.
5. Nhịp vẽ: theo nhịp màn hình khi có chuyển động; chỉ 30 khung/giây (cách đúng một nhịp) khi chỉ có nước/gió.
6. Mặt nạ đường nâng lên 2048×1152 (hoặc dựng dải đường bằng hình học) để mép đường nét ở khoảng cách gần.
7. Mục tiêu đo được: máy Intel Iris Plus, 1920×1080, mức mặc định: **≥ 30 fps ổn định khi xoay/đi, ≥ 45 fps khi đứng; không mờ ở độ phân giải gốc.** Chỉ sau khi đạt số này mới mở rộng sang 11 map.

#### Kết quả sửa 3D (08/10/2026, đêm) — đã làm, đo lại trên cùng máy Intel Iris Plus

Đã làm (mã: `public/map3d.js`, `map3d-post.js`, `map3d-textures.js`; thử: `lesson-map.html?demo=1`; đo: `node scripts/qa/map3d-perf.mjs`):
1. Bỏ GTAO, tilt-shift, MSAA 4 khỏi đường vẽ; còn: glow ban đêm (mức 0) + chỉnh màu + tone map + FXAA (FXAA chỉ bật khi hình gần nét đầy đủ).
2. **Nướng màu mặt đất** một lần lúc mở bản đồ (ảnh 2048×1152 + mặt nạ 1024×576, bằng chính shader cũ); lúc chạy chỉ tra ảnh + chi tiết lặp. Chi tiết bề mặt (độ tương phản, bump) **mờ dần theo khoảng cách** → hết "vỡ/nhiễu hạt"; bỏ sọc sóng cát; giảm thành phần tần số cao của ảnh chi tiết.
3. Vật liệu cây/nhà/đá/cỏ đổi PBR → Lambert (không phản xạ gương, rẻ hơn nhiều).
4. Bóng đổ vẽ lại **chỉ khi khung bóng đổi chỗ/đổi cỡ** (căn theo ô điểm ảnh bóng, cỡ khung theo nấc 30/42/60/84/120) hoặc 3 lần/giây cho vật chuyển động; không vẽ mỗi khung nữa.
5. **Độ phân giải thích ứng không giật:** cảnh được vẽ vào góc dưới-trái của cùng một đích vẽ rồi phóng lên (đổi nấc không cấp phát lại); đang xoay/đi thì vẽ ở 55–100% theo tốc độ đo được, **đứng yên 0,22 giây thì vẽ lại 100% (nét)**. Đo thật lúc mở (calibrate) để bắt đầu ở độ nét hợp lý. Hạ tính năng chỉ khi đã ở sàn độ nét và <27 khung/giây; về 2D chỉ khi vẫn <20 sau 3 lần.
6. Nhịp: 30 khung/giây khi có chuyển động nền (khớp màn 60 Hz), **15 khung/giây khi đứng yên >3 giây** (đỡ nóng máy/pin điện thoại).
7. Chim ẩn khi camera xa (trước đó thành hình thoi đen to khi xem cả bản đồ).

**Số đo trước → sau (cùng máy, 1536×864 màn 125% = 1920×1080 vật lý):** 231 ms/khung (4 fps) → **26 ms ở nét 100% (38 fps), 60 fps khi xoay (nét tự chọn 65%), 100% khi đứng yên.** 1920×1080 màn 100%: 21 ms; 60 fps khi xoay (nét 75%). Điện thoại giả lập 390×844 ×3: 8 ms, 60 fps (nét 95%). Không lỗi console. 570 test vẫn qua (đã đổi 2 test cho đúng đường vẽ mới và thêm cảnh báo chống đưa GTAO/tilt-shift/MSAA 4 quay lại).
- **Chưa đo:** điện thoại/iPad thật (máy này chỉ giả lập khổ màn; card đồ họa điện thoại yếu hơn Iris Plus 2–3 lần có thể nhưng bộ điều chỉnh sẽ hạ nét/tính năng). Chủ hệ thống thử bằng `/lesson-map.html?demo=1` trên điện thoại (cùng WiFi: `http://<IP máy tính>:5173/lesson-map.html?demo=1`) — khung nhỏ góc trên-trái hiển thị khung/giây, độ nét, mức; có nút ép mức Cao/Vừa/Nhẹ.
- **Việc kế (sau khi chủ hệ thống duyệt bản thử): mở rộng 11 map** — chỉ cần thêm chủ đề trong `THEMES` + bộ vật thể; hạ tầng nhanh đã dùng chung.

### 18.6 Vòng 4 (09/10/2026): chế độ Kiểm tra làm xong bản dùng được, và rà soát kế hoạch

**Quyết định (thay cho 18.3f mục 7-8, vì chủ hệ thống muốn thi bằng game ngay trong ngày):** xây chế độ Kiểm tra thành **hệ thống riêng, nhẹ, độc lập với động cơ bài học** (không dùng gói bài học vì bộ kiểm tra sư phạm của gói không hợp với đề thi: mục tiêu, gợi ý, recheck...). Chỉ dùng chung: danh tính giáo viên, linh vật, công thức KaTeX, bản đồ hành trình. Chỉ cần một migration thêm bảng (0013), không đụng bảng cũ.

**Luồng:** giáo viên vào /exams, chọn file PDF/Word/txt -> hệ thống tìm các câu, **cắt hình từng câu từ PDF ngay trên trình duyệt** (giữ nguyên công thức, hình vẽ; câu nằm giữa hai trang được ghép lại) -> giáo viên điền/dán đáp án và sửa loại câu, điểm, vùng cắt -> "Tạo phòng kiểm tra" -> mã phòng 6 ký tự + link -> mở phòng -> học sinh vào /exam bằng mã, tên, chọn linh vật -> giáo viên bấm bắt đầu (đồng hồ của máy chủ) -> học sinh làm, mỗi lần chọn là lưu ngay lên máy chủ -> nộp (hoặc tự nộp khi hết giờ) -> giáo viên theo dõi trực tiếp, chấm tự luận bằng ảnh, kết thúc, xem bảng điểm + câu nào sai nhiều + tải CSV.

**Điểm (trung thực):** điểm chỉ từ bài làm; game chỉ là lớp đi cùng (linh vật chạy trên thanh hành trình, cổng ba Phần, cờ đích, nút "Bản đồ hành trình" mở bản đồ có linh vật đứng theo tiến độ; **không có xúc xắc, không gợi ý, không xếp hạng**). Phần I: đúng cả hoặc không (0,25/câu theo đề). Phần II: thang THPT 2025 (1 ý 10%, 2 ý 25%, 3 ý 50%, 4 ý 100%). Trả lời ngắn: nhận 1,5 / 1.5 / 3/2 / dấu trừ Unicode. Tự luận: học sinh chụp ảnh (tự thu nhỏ trước khi gửi), giáo viên xem ảnh và cho điểm ngay trên máy.

**Độ an toàn (đã có test):** đáp án không bao giờ gửi xuống học sinh; mỗi câu trả lời là một dòng riêng (upsert) nên 40 em lưu cùng lúc không mất; ghi cũ đến muộn không ghi đè ghi mới; hết giờ + 30 giây thì từ chối, phòng tự khóa và nộp hộ bài chưa nộp; học sinh đóng trang mở lại cùng thiết bị (khóa lưu trên máy) hoặc giáo viên bấm "Cho vào lại" cho thiết bị khác; máy rớt mạng thì giữ trên máy và tự gửi lại; đếm số lần rời trang; sửa đáp án sau khi thi thì điểm tự tính lại; không bắt đầu được nếu còn câu chưa có đáp án (trừ khi giáo viên xác nhận).

**Mã:** lib/exam/{scoring,parse,answer-key,validate,service,http}.js; app/api/exams (+extract cho Word), app/api/exam-play; app/exams, app/exam; components/exam/*; drizzle/0013_exam_rooms.sql; public/vendor/pdfjs (bộ làm việc pdf.js, Apache-2.0). Nhập từ Word đi qua bộ đọc DOCX có sẵn (công thức thành $...$), không lưu file.
**Thử:** 29 test mới (tests/exam-core, tests/exam-service); **diễn tập đầu-cuối bằng Chrome thật** (scripts/qa/exam-e2e.mjs <file PDF>): đọc đề Toán 11 GHKI thi thử 01 -> 20 câu, 20 hình, 10 điểm đúng; dán đáp án; 5 em vào bằng API + 1 em thao tác thật trên khung điện thoại (chọn đáp án, chụp ảnh tự luận, nộp); giáo viên theo dõi, chấm, kết thúc, bảng điểm đúng. Cổng kiểm: 598 test, lint, typecheck, build đều qua.
**Chưa làm / hạn chế:** chưa phát hành (không commit/đẩy); chưa thử trên điện thoại thật; ảnh cắt từ PDF phụ thuộc cách trình bày của đề (cho phép chỉnh vùng cắt từng câu); Word chỉ lấy chữ + công thức, không lấy hình trong file Word; chưa xáo thứ tự câu (đề dạng hình giữ nguyên số câu); chưa có xúc xắc trong chế độ Kiểm tra; chưa có AI gợi ý điểm tự luận.
**Đáp án đề xuất cho đề này:** tasks/exams/toan11-ghki-thithu-de01-dap-an-de-xuat.md (AI tự giải, giáo viên PHẢI đối chiếu); có thể dán thẳng vào ô "Dán đáp án".

#### Rà soát kế hoạch (09/10/2026): đã làm đủ chưa?

| Hạng mục | Tình trạng |
|---|---|
| P0 baseline/backup | Xong (runtime production chưa xác minh) |
| P1 renderer + media | **Chưa đủ:** 5/12 map có ảnh nét @2x; 7 map còn SVG; 3D mới 1/12 map |
| P2 gói bài Dãy số | Xong về mã; nguồn chờ giáo viên duyệt |
| P3 tiết học nhiều học sinh | Có giả lập 26 học sinh (26/26 nộp được); **chưa thử điện thoại/TV thật**; khung 360x640, 768x1024, TV chưa kiểm hệ thống |
| P4 nhóm/luật/Lôi Đài | Xong cho Ngũ Ấn; map khác chưa nối |
| P5 nhập DOCX/PDF + AI | Nhập xong; **chưa có OCR, chưa cấu hình AI thật, chưa có cổng sư phạm (17.3.2) và bước xác nhận trước khi gửi AI (17.3.3)** |
| P6 QA độc lập, diễn tập, phát hành | **Chưa**; nhất là phát hành riêng tư qua Codex (migration 0008-0013, kho R2) |
| P7 nhân rộng nội dung/đa môn | Chưa |
| 17.3.1 chấm số kiểu Việt | Đã sửa 1,5 / dấu trừ; còn mở: 3.000, không dấu, kiểm gõ Telex/VNI |
| 18.3 mục 1 3D | Xong bản thí điểm + đã sửa giật/mờ (18.5); **chờ duyệt rồi mới làm 11 map** |
| 18.3 mục 2 cockpit bản đồ thật | Một phần (thẻ Bản đồ của lớp); chưa lọc/gom cụm; đợt 2-3 (3 thẻ, dọn Studio) chưa; **còn ~51 chỗ chữ Anh chưa Việt hóa** trong lesson-dashboard.tsx |
| 18.3 mục 3-4 linh vật theo map, ảnh 7 map | Chưa (chờ hạn mức tạo ảnh) |
| 18.3 mục 5 linh vật từ ảnh học sinh | Chưa (chờ chỗ lưu + đồng ý) |
| 18.3 mục 6 đa ngôn ngữ | Chưa |
| 18.3 mục 7 hình chứng minh xúc xắc | Đã kiểm trang thật + bản thử demo; cần quay lại bằng thiết bị thật |
| Chế độ Kiểm tra (18.3f) | **Xong bản dùng được (mục trên)** |
| 17.4 ý tưởng trải nghiệm (nhịp truyện, hộ chiếu, "3 việc nên làm") | Chưa (hộ chiếu có phần lõi trong lib/lesson/passport.js, chưa có thẻ đẹp) |

- r6.3 (09/10/2026): thêm 18.5 (chẩn đoán và sửa 3D), 18.6 (Kiểm tra và rà soát).

- r6.4 (09/10/2026, sáng): chủ hệ thống xem bản thử và nói **chữ vẫn mờ so với bản cũ**. Nguyên nhân: tên linh vật và biển cổng là ảnh chữ vẽ trong canvas rồi dán lên cảnh 3D (bị thu nhỏ, làm mịn, qua hậu kỳ nên mờ). Đã sửa: chuyển thành **chữ HTML thật phủ trên canvas** (public/map3d.js: makeLabel, placeLabels), cỡ chữ cố định 13–15 px, nét ở mọi mức thu phóng và mọi độ nét của cảnh; có test chống quay lại. Chưa đổi: bong bóng xúc xắc (ảnh 384x192, đủ nét), linh vật (ảnh tranh, độ nét theo tấm ảnh nguồn).

- r6.5 (09/10/2026, trưa): chủ hệ thống phản hồi thêm hai ý: (1) **hình linh vật, xúc xắc và chữ "Chạm để lắc" còn mờ**; (2) **dãy núi quanh bản đồ xấu, muốn không gian mở**, kéo thả vẫn giới hạn như cũ.
  - (1) Đã sửa: linh vật, mũi tên trên đầu và hai nhãn của xúc xắc ("Chạm để lắc", "N bước") chuyển thành **HTML/CSS** phủ lên bản đồ (cắt từ tấm ảnh linh vật như bản 2D), nét như bản cũ ở mọi độ phân giải; mặt xúc xắc 512 px; thêm bước làm nét nhẹ sau FXAA (chỉ bật khi hình gần nét đầy đủ); **nhãn trùng nhau được ẩn bớt** (tên em trước, rồi biển cổng, rồi tên bạn, gần trước xa sau). Hệ quả: linh vật luôn hiện đầy đủ, không còn bị cây che (bỏ "bóng ma xuyên cây").
  - (2) Đã sửa: bỏ hẳn bức tường núi; **cảnh quan mở 1200x1040 đơn vị** (lưới địa hình dày giữa, thưa dần ra ngoài, cùng số tam giác), đồi thoải, rừng và đồng cỏ phía ngoài, sương mù xa dần (fog far 260) và một dải đồi mờ cuối chân trời; tô màu mặt đất 240x135 đơn vị (nét hơn trước ~1,7 lần). **Giới hạn kéo thả không đổi** (tâm camera kẹp trong khung chơi). Hồ phía tây dời vào trong khung tô màu.
  - Đo lại cùng máy: 25 ms ở nét 100%, 55 khung/giây khi xoay, điện thoại giả lập 60. 599 test.
  - **Phối hợp với luồng Codex** (theo lời chủ hệ thống): bảng sở hữu file và nhật ký ở tasks/coordination.md. Codex nhận: rà soát chế độ Kiểm tra (chỉ đọc), hồ sơ phát hành không đẩy, Việt hóa + cockpit đợt 2-3, cổng sư phạm AI + xác nhận gửi AI, bộ chấm số/gõ tiếng Việt, QA khung màn hình. Claude giữ: 3D, bản đồ, chế độ Kiểm tra.

- r7 (09/10/2026, chiều): chủ hệ thống **DUYỆT bản thử 3D** (cho làm 11 map còn lại) và yêu cầu thêm: (1) bản đồ **rộng hơn**, các đường đi **cách xa nhau** vì lớp ~50 học sinh sẽ chi chít, rối mắt và sợ giật; (2) cơ chế **ẩn linh vật người khác / chỉ hiện linh vật những người được chọn** (và các chế độ lọc tương tự). Chủ hệ thống cũng hỏi vì sao dặn Codex chuẩn bị hồ sơ phát hành khi Codex còn thấy nhiều hạng mục chưa xong: trả lời là hồ sơ phát hành chỉ gồm phần đã làm (Kiểm tra + 3D + phiên học), các hạng mục chưa xong (OCR, 7 map SVG, linh vật ảnh HS, đa ngôn ngữ...) KHÔNG chặn việc thi hôm nay; việc phát hành vẫn chỉ khi chủ hệ thống nói "phát hành".
  - Codex rà soát Kiểm tra và tìm 3 lỗi mức P1 (seq do client đặt có thể khóa câu; ghi đáp án/ảnh sau khi nộp-đóng do check-then-write; CSV công thức độc hại) và 2 lỗi P2 (base64 chưa chặt; chuyển trạng thái phòng không atomic): tasks/codex-exam-review.md. Quyết định: **chuyển quyền sở hữu tạm thời lib/exam/**, components/exam/answer-sync.ts, app/api/exam*, tests/exam-*.test.mjs sang Codex** để sửa ngay (ưu tiên 0), Claude không đụng các file này cho tới khi Codex ghi "exam fixes done" ở tasks/coordination.md; Claude tập trung vào bản đồ 3D (rộng hơn, thưa đường, lọc linh vật, 50 học sinh) rồi 11 map.

- r7.1 (09/10/2026, chiều): đã làm xong hai yêu cầu của chủ hệ thống về bản đồ cho lớp ~50 học sinh (Claude, public/map3d.js, public/lesson-map.html):
  - **Bản đồ rộng hơn**: khung chơi 160x90 → **280x170 đơn vị** (≈ 2,9 lần diện tích); ba làn đường từ cách nhau 7 đơn vị thành ~13 (gần gấp đôi); sông/hồ viết theo khung cũ rồi tự giãn (`frameRiver`, `frameLakes`); lưới địa hình 1,6 đơn vị/đỉnh; tô màu mặt đất 2560 px; mặt nạ đường 2048 px; sương mù và vùng đổ bóng đi theo khoảng cách camera; zoom xa tối đa 330. Cây cỏ dồn về hai bên đường (nơi học sinh nhìn) để không nặng thêm.
  - **Đám đông**: học sinh cùng một ô được **rải quanh ô** (kiểu hoa hướng dương; linh vật của em ở giữa); linh vật nào sắp chồng lên linh vật khác thì **thu thành chấm nhỏ có viền**, chồng nữa thì **gộp vào số "+N"** trên linh vật che nó; lớp đông thì linh vật vẽ nhỏ hơn một chút (tối đa -38%).
  - **Bộ lọc linh vật** (menu ⚙ → "Linh vật trên bản đồ"): Tất cả / **Gần em** (8 bạn) / **Dẫn đầu** (8 bạn) / **Chọn bạn** (danh sách tích chọn + ô tìm tên) / **Chỉ em**. Linh vật của em luôn hiện. Lớp trên 12 em: tự chọn "Gần em" và báo một lần. Có chip ở góc dưới trái "Đang hiện 9/50 linh vật · Đổi". Lựa chọn nhớ trên máy (localStorage). Lọc làm ở trang bản đồ nên cũng áp dụng cho bản 2D; giáo viên/TV (không có linh vật "của em") chỉ có Tất cả / Dẫn đầu / Chọn bạn.
  - Thử bằng `?demo=50` (50 học sinh, phần lớn dồn ở các ô đầu), `&show=all|near|lead|pick|me` để ép chế độ khi đo.
  - Số đo cùng máy (Intel Iris Plus, máy đang chạy nhiều ứng dụng nên dao động): một khung 100% = 21–27 ms với 50 học sinh hiện hết; CPU mỗi khung chỉ +0,3–2,3 ms so với 1 học sinh. 15/15 test của 3D.

- r7.2 (09/10/2026, chiều): **làm xong 3D cho cả 12 thế giới** (chủ hệ thống đã duyệt 11 map còn lại). Cách làm: dữ liệu mỗi thế giới nằm ở `public/map3d-themes.js` (màu đất, nước, sông/hồ, cây, bầu trời ngày/đêm, ánh đèn, sao, sự sống: cánh hoa/chim/người đi đường/thuyền/đèn nước, mật độ cây cỏ, hình dạng địa hình, "đảo" nâng đất quanh đường và đáy biển phẳng); bộ công trình (nhà, tháp cạnh cổng, cổng, tường, đèn, bệ đường, cây riêng, người đi đường) nằm ở `public/map3d-kit-*.js` và đăng ký ở `public/map3d-kits.js`. Tám bộ: citadel (Cổ trang), scifi (Tương lai, Thiên hà, Vòng Bo), city (Hiện đại), campus (Dewey), farm (Đồng quê), tropical (Sinh tồn), blocks (Khối lập phương, Mê cung), academy (Học viện, Ngũ Khu). Thêm thế giới mới = thêm 1 mục theme (+ 1 bộ nếu cần kiểu nhà mới). Xem trước bất kỳ thế giới: `lesson-map.html?demo=8&world=<id>`; chụp ảnh: `node scripts/qa/map3d-shot.mjs <id> ...` (ảnh ở tasks/qa-shots/). Sửa chung cho mọi thế giới: mây mờ dần khi camera lên cao (trước đây che trắng bản đồ ở toàn cảnh), toàn cảnh chừa lề rộng hơn, sương mù xa hơn.
  - Test: `3D worlds` kiểm 12 chủ đề khớp danh sách thế giới của trang, bộ công trình tồn tại, loại cây có trong bộ, người đi đường có mô hình.
  - Codex đã làm xong lô của họ: sửa 5 lỗi Kiểm tra + 6 ca phát sinh (47/47 test), cockpit 3 thẻ + Việt hóa, cổng AI + xác nhận gửi, bộ gõ tiếng Việt, thử migration 0008–0013 trên bản sao, responsive 12 khung (tasks/codex-handoff-20261009.md). Claude đã nhận lại module Kiểm tra và chạy diễn tập `scripts/qa/exam-e2e.mjs` với đề Toán 11 "CAP_NHAT_4_HINH": **đạt mọi bước**.

- r7.3 (09/10/2026, chiều): Codex rà soát 3D (tasks/codex-3d-review.md: 3 P2, 2 P3) và Claude đã sửa hết cùng khe hở ở tháp khối. **Bản đóng băng**: test 646/646, typecheck 0, lint 0, build 0, e2e Kiểm tra đạt.
- r7.4 (09/10/2026, chiều): **chủ hệ thống trả lời "1. Phát hành  2. oke đẹp rồi  3. cho phép"**: (1) lệnh phát hành riêng tư (chỉ chủ site truy cập, chưa mở cho host thứ hai/học sinh); (2) duyệt 12 map 3D; (3) cho phép tải 5 ảnh mặt đất Poly Haven (CC0) và OCR.
  - **Chưa thực hiện được bước phát hành:** hệ thống an toàn của Claude Code chặn Claude gửi lệnh phát hành sang luồng Codex (không nêu lý do). Không lách. Lệnh nằm sẵn ở `tasks/lenh-phat-hanh-rieng-tu-cho-codex.md` để chủ hệ thống dán vào luồng Codex, hoặc cho phép công cụ gửi trong cài đặt. Mã nguồn **giữ đóng băng** cho tới khi Codex ghi "release done".
  - Đã tải (vào thư mục tạm, ngoài mã nguồn): 5 ảnh `leafy_grass`, `cliff_side`, `brown_mud_dry`, `cobblestone_05`, `dense_sand` bản 1k diffuse, tổng 4,1 MB, từ dl.polyhaven.org (giấy phép CC0). **Chưa đưa vào mã** (để không đổi bản đóng băng); làm sau khi phát hành riêng tư xong. OCR: chưa tải, cần nêu rõ tên gói và dung lượng trước (đã tra: `tesseract.js` 7.0.0 Apache-2.0 ≈1,4 MB; `tesseract.js-core` 6.1.2 Apache-2.0, gói ≈30 MB nhưng chỉ giữ 1–2 tệp wasm; dữ liệu tiếng Việt `vie.traineddata` bản fast 0,5 MB từ github.com/tesseract-ocr/tessdata_fast; chờ chủ hệ thống xác nhận đúng các mục này).
- r7.5 (09/10/2026, chiều): chủ hệ thống chuyển lệnh cho Codex (dán `tasks/lenh-phat-hanh-rieng-tu-cho-codex.md`). Codex dừng đúng ở điều kiện sao lưu (công cụ Sites không xuất được D1/R2; ảnh chụp bảng `teams` bị cắt 4 ô dài). **Quyết định của Claude, có căn cứ:** (a) dữ liệu thật rất ít (1 phòng, 6 đội, 8 bảng rỗng); (b) migration 0008–0013 không đổi bảng V7 nào, 0009 chỉ dựng lại các bảng bài học vừa tạo rỗng; (c) V7 `hosting.json` có `r2: null` và không có mã R2, nên chưa có đối tượng R2 nào. => chấp nhận ảnh chụp một phần làm bản sao lưu, ghi rõ trong checklist. Chủ hệ thống tiếp tục dặn: **Codex tự QA, nếu ổn thì mở cho học sinh chơi**. Quy tắc giao Codex: chuyển tạm sang chỉ-chủ-site, phát hành, QA (sổ migration, bảng, 10 bảng V7 giữ nguyên số dòng, trang/tệp tĩnh trả 200, API không đăng nhập trả 401/403 không 500, phòng giả báo "không có phòng", nếu có phiên chủ site thì chạy trọn một bài thi thử tên "[KIỂM THỬ] xóa được"); đạt thì trả lại công khai, không đạt thì giữ chỉ-chủ-site và báo; cách quay về V7 đã ghi sẵn. Việc phát hành sẽ tạo một commit trong kho nguồn của dự án Sites (cơ chế phát hành chuẩn).
- r7.6 (10/10/2026): chủ hệ thống chỉ ra: trong bài kiểm tra thật, mỗi câu đúng/sai là **một ngữ cảnh với 4 ý liên quan**, học sinh **rà soát và đổi đáp án bất cứ lúc nào** trước khi nộp. **Quyết định:** trong lúc làm bài Kiểm tra **không dùng xúc xắc**, không mở chặng theo từng câu, không khóa câu, không bắt làm theo thứ tự (thay đề xuất "lắc sau mỗi câu" ở lượt trước). Giữ đúng màn hiện có: câu đúng/sai hiện thành một khối 4 ý a–d, chọn/bỏ chọn lại tự do; lưới trạm để nhảy tới câu bất kỳ; cờ "xem lại". Bản đồ (nếu thêm) chỉ là **lớp tiến độ thụ động** (linh vật đứng ở trạm của câu đang mở, trạm sáng khi đã trả lời, không có đúng/sai). Phần game (xúc xắc, hành trình, huy hiệu) chuyển sang **sau khi nộp/đóng phòng**: hành trình xem lời giải, phần thưởng trang trí, không đổi điểm. Xúc xắc giữ cho Học tập/Luyện tập/Ôn tập, nơi trạm là nhiệm vụ ngắn độc lập.
- r7.7 (10/10/2026): chủ hệ thống: **hết giờ là trạm đóng**; em làm xong sớm mới có thời gian đi hành trình xem lời giải, nhận huy hiệu, hộ chiếu. Đồng ý phần hết giờ (máy chủ đã tự thu bài theo đồng hồ máy chủ + thời gian ân hạn). **Claude đề xuất chặn lộ đáp án (chờ chủ hệ thống chốt):** em nộp sớm được vào hành trình ngay nhưng chỉ có hộ chiếu, huy hiệu, điểm tổng (nếu GV bật), không có đáp án đúng/sai từng câu và lời giải; **lời giải mở cho mọi em khi phòng hết giờ hoặc GV đóng phòng**, và vẫn xem lại được sau buổi (ở nhà), để em nộp muộn không thiệt.
- r7.8 (10/10/2026): chủ hệ thống duyệt **chống nhìn bài nhiều mức**, làm cả: (1) đảo câu trong từng phần (không đảo thứ tự phần); (2) nhiều mã đề trong một phòng; (3) đảo phương án A–D và ý a–d (chỉ khi tách được, có nút "không đảo" từng câu); (4) đổi số liệu nhân bản đề bằng AI hỗ trợ, máy kiểm lại, GV duyệt từng câu, chỉ khi bật cổng AI. Kèm giao diện gọn và hướng dẫn cho GV khác. Đề Word mẫu: Toan11_GHKI_4_Dang.docx + Huong_dan_cham_Toan11_GHKI_4_dang.docx. Giao Codex: tasks/codex-spec-tron-de.md (yêu cầu Codex phản biện và QA kỹ).
- r7.9 (10/10/2026): Claude nghiệm thu đợt 1–2 của Codex trên bằng chứng (chạy lại 723/723 test, typecheck 0). Việc còn lại giao Codex theo dieu-phoi-ai: hành trình bản đồ sau thi (B6), xem lại từ máy khác bằng mã PIN, GV xóa phòng, chạy lại E2E PDF trên bản cuối, chuẩn bị phát hành (migration 0014–0015, chưa phát hành). Codex tạm nhận lesson-map.html/map3d.js/LessonWorldMap.tsx cho đợt này. Đặc tả: tasks/codex-spec-dot-tiep-kiem-tra.md. Chủ hệ thống hỏi về Blender MCP: xem đánh giá trong chat 10/10.
- r7.10 (10/10/2026): Claude nghiệm thu đợt 3 (chạy lại 752/752 test, typecheck 0, xem ảnh hành trình 3D 1280/375): bản đồ sau thi, PIN xem lại máy khác (8 ký tự, khóa 5 lần sai/15 phút), GV xóa phòng, E2E PDF+Word trên bản cuối, hồ sơ phát hành 0014–0016. Giao Codex sửa 2 lỗi giao diện nhỏ (nhãn trạm che chữ Em; thanh Câu trước/Câu sau che nội dung). Chờ chủ hệ thống: lệnh phát hành và quyền cài Blender MCP.
- r7.11 (10/10/2026): chủ hệ thống: "1. Phát hành 2. cho phép Blender". Phát hành bản 2 lên site riêng mat-ma-da-gioi (vẫn riêng tư, V7 không đổi) qua Codex. Blender MCP: đã gắn vào Codex (uvx blender-mcp 2.0.0, tắt telemetry), tiện ích Blender để ở Downloads/blender-mcp-addon.py cho chủ hệ thống tự cài; thử một linh vật cú 3D theo tasks/codex-spec-blender-linh-vat.md (≤ 300 KB, chậm thêm ≤ 10 % ở 50 em, máy yếu giữ thẻ 2D).
- r7.12 (10/10/2026): chủ hệ thống cho lấy mô hình từ Poly Haven, Sketchfab, Poly Pizza hay nguồn bất kỳ (game học tập, không kiếm tiền). Quyết định: cho phép, kèm sổ ghi công public/models/CREDITS.md và trang ghi công trong game (CC-BY bắt buộc ghi tên tác giả); bỏ giấy phép cấm phân phối lại. Hướng 3D: dùng Blender cho linh vật, công trình, cổng/tháp, cây/đá, xúc xắc; địa hình và đường giữ dựng bằng code theo dữ liệu bản đồ (có thể dùng texture làm từ Blender).
- r7.13 (10/10/2026): Codex phát hành bản 2 lên site riêng (riêng tư, version appgver_53dd846c…, deployment appgdep_6ac9fd9a…, V7 không đổi). Rà soát kế hoạch trước khi làm 3D bằng Blender (bảng 09/10 đã cũ): đã xong 3D 12/12, cổng AI + xác nhận, cockpit 3 thẻ + Việt hóa, Kiểm tra đủ 3 đợt, 2 lần phát hành riêng tư. Còn lại: mở cho học sinh (chờ chủ hệ thống thử), thử thiết bị thật (điện thoại/iPad/TV), OCR PDF scan, ảnh 2D cho 7 map SVG, linh vật theo map/từ ảnh HS, đa ngôn ngữ, nhịp truyện + thẻ hộ chiếu bài học + 3 việc nên làm, bấm linh vật ra thẻ HS/HS kẹt trong cockpit, luật nhóm/Lôi Đài cho map ngoài Ngũ Ấn, GV duyệt nguồn gói Dãy số, nhân rộng bài/môn (P7), AI thật (tắt), xóa nguồn R2 thử.
- r7.14 (10/10/2026): chủ hệ thống: "1. Mở cho học sinh 2. bắt đầu 3. đồng ý 4. đồng ý thứ tự và tải gói OCR Tesseract". Giao Codex: (a) mở site mat-ma-da-gioi công khai cho học sinh (V7 không đổi); (b) làm thử linh vật cú 3D bằng Blender; (c) OCR đề scan (tesseract.js 7.0.0, tesseract.js-core 6.1.2, vie.traineddata fast) theo tasks/codex-spec-ocr-va-cockpit.md T1; (d) bấm linh vật ra thẻ HS + danh sách HS kẹt trong cockpit (T2). Không phát hành bản mới khi chưa có lệnh.

- r7.15 (10/10/2026, Codex): hoàn thành LOCAL owl pilot → OCR → cockpit T2 theo r7.14. Owner sửa OCR thành js7/core7, plainGLB<300KB; đã áp dụng. T2 lấy lịch sử tới cổng chính xác từ server, lưu interval JSON hiện hành, trừ pause/arena/lock/expired; phiên cũ thiếu mốc giữ unknown. Tap2D/3D/chip/cú/+N mở thẻ HS, hỗ trợ5phút mặc định và2recheck sai; TV anonymous. QA50HS giả/desktop1280/1920/reload/threshold/pause/touchdragpinch; full797/797,typecheck0,lint0errors,build0; review độc lập đóngP2. Site đã public nhưng owl/OCR/T2 chưa deploy. Report tasks/codex-cockpit-report.md.
- r7.15 (10/10/2026): Codex xong 4 việc: site mat-ma-da-gioi CÔNG KHAI (/ và /exam 200, API GV 401, V7 không đổi); linh vật cú 3D (Blender, 117 KB, 1974 tam giác, idle/walk/hop, em + 2 bạn gần nhất dùng 3D, còn lại thẻ; đo 50 em lệch -3 %..+0,3 %); OCR đề scan (20/20 câu, 3/3 phần, chỉ tải khi dùng); cockpit bấm linh vật ra thẻ HS + danh sách HS cần hỗ trợ (5 phút hoặc 2 lần kiểm tra lại sai). Claude chạy lại 797/797 test, typecheck 0, xem ảnh cú và cockpit. Ba việc này CHƯA lên site (cần lệnh phát hành).
- r7.16 (10/10/2026): chủ hệ thống chê cú 3D xấu, đồng ý gửi ảnh linh vật lên dịch vụ AI tạo 3D miễn phí ("gửi lên đi, dùng dịch vụ nào free ý"). Giao Codex: (a) 3 ứng viên cú lấy từ mô hình có sẵn (Quaternius/Kenney/Poly Pizza/Sketchfab), (b) tạo 3D từ ảnh cú 2D bằng Hugging Face Space TRELLIS (MIT) và Hunyuan3D (ẩn danh, không tạo tài khoản, không trả phí), dọn trong Blender (≤ 5k tam giác, ≤ 300 KB, hoạt cảnh). Ảnh so sánh ở tasks/qa-owl-candidates/ để chủ hệ thống chọn.
- r7.17 (10/10/2026): chủ hệ thống bảo Claude làm các việc độc lập trong khi Codex làm linh vật. Claude làm mục 17.4: **thẻ Hộ chiếu học tập cuối tiết** cho từng em (Em tự làm được / Làm được khi có hỗ trợ / Bước tiếp theo + một việc nên làm tiếp; không xếp hạng; chỉ hiện khi tiết đã kết thúc) và **"3 việc nên làm bây giờ"** trên màn GV (hỗ trợ em kẹt, lỗi phổ biến nên chữa chung, chấm bài chờ hoặc chốt và chuyển tiếp). 802/802 test. Chưa xem trên trình duyệt. Chưa làm: nhịp truyện (cần nội dung từng bài), ảnh 2D 7 map (đụng map3d.js Codex đang giữ), luật nhóm 11 map, đa ngôn ngữ (lớn, để sau).

### 18.7 CÂU HỎI CHỜ CHỦ HỆ THỐNG TRẢ LỜI (đọc đầu mỗi cuộc trò chuyện, hỏi lại những câu chưa có đáp án)

Chủ hệ thống dặn (10/10/2026): "các câu hỏi ở trước mà tôi chưa trả lời cần đưa vào hỏi tiếp ở cuộc trò chuyện sau". Khi có câu trả lời: ghi đáp án + ngày ngay dưới câu, không xóa câu.

1. Mạch truyện 2 lớp (hồ sơ truyện từng thế giới × nhịp theo loại chặng): đồng ý? Duyệt giọng truyện 2 thế giới mẫu (Hồ Sơ Thành Phố Ẩn, Ngũ Ấn) trước hay viết luôn 12?
2. Họ luật cho 11 thế giới: dùng lại 9 luật đã có trong lib/mode-engine/rules (campaign, duel, zones, survival, escort, treasure, relay, lockdown, merchant) gắn vào tiết học thay vì "4 họ luật" mới (Claude đã đề xuất nhầm là chỉ có Lôi Đài). Đồng ý?
3. Chơi nhóm: lắc xúc xắc xoay vòng (mặc định) hay nhóm trưởng? Tối đa 5 người/nhóm? Đáp án chung cần đa số hay cả nhóm đồng ý? Thời gian nhóm chờ một em ở cổng lõi mặc định 3 phút? Thứ tự làm: kiểu A (mỗi em một máy) → B (máy chung) → thi đấu theo luật → C (chỉ TV)?
4. Giới hạn 26 học sinh trong lib/game-modes.js và lib/mode-engine/roster.js (luật cũ) trong khi lớp tới 50 em: nâng lên 50 khi nối luật vào tiết học?
5. Phân hóa (thiết kế ở r7.18): đồng ý 3 làn đường = 3 nhánh (hỗ trợ / chuẩn / thử thách) với tên theo truyện, câu theo mức Must/Should/Could, cho HS tự chọn làn thử thách? Có cho GV cộng giờ riêng cho từng em trong Kiểm tra?
6. Hoạt động thi đấu ngắn cả lớp (r7.18): chọn những trò nào làm trước (Kéo co, Đánh boss cả lớp, Bấm chuông nhanh, Tiếp sức, Truy tìm kho báu, Ước lượng, Bingo)? Điểm trò chơi không tính vào hộ chiếu: đồng ý?
7. Linh vật 3D: chọn ứng viên khi Codex gửi ảnh so sánh (tasks/qa-owl-candidates/).
8. Phát hành bản có thẻ Hộ chiếu học tập + "3 việc nên làm bây giờ" (+ linh vật mới khi chọn xong): cần lệnh "Phát hành".
9. Duyệt nội dung bài mẫu Dãy số; bật AI thật (mức 4 đổi số liệu); chọn bài/môn để nhân rộng.
10. Thử trên thiết bị thật (điện thoại, iPad, TV lớp) và báo lại.
- r7.18 (10/10/2026): chủ hệ thống hỏi: (a) phân hóa chưa nổi bật; (b) mọi chế độ cần một hoạt động thi đấu ngắn cả lớp (cá nhân hoặc nhóm ngẫu nhiên), hiện có đua thuyền và Lôi Đài, muốn thêm cho phong phú; (c) câu hỏi chưa trả lời phải hỏi lại ở cuộc trò chuyện sau → lập mục 18.7. Claude đề xuất trong chat 10/10 (phân hóa: 3 làn = 3 nhánh, Must/Should/Could, chẩn đoán đầu giờ, vai theo nhu cầu, thi đấu chấp điểm theo mức; sự kiện lớp 3–5 phút). Chờ duyệt (18.7 mục 5–6).
11. Danh sách trang web game bên ngoài ("18 hay 8 game") chủ hệ thống gửi trước đây: Claude và Codex chưa tìm thấy/đọc đủ (plan dòng 85 ghi là backlog). Nhờ chủ hệ thống gửi lại link để tham khảo cho mục hoạt động thi đấu ngắn.

### 18.8 Danh sách câu hỏi chốt (10/10/2026, thay cho 18.7; mỗi câu có mặc định Claude đề xuất)

Nguồn tham khảo đã đọc (10/10): taogametuongtac.vercel.app (EduGame AI, 18 dạng: Trắc nghiệm, Đúng/Sai, Ghép đôi, Điền từ, Sắp xếp, Phân loại, Giải mã từ, Vòng quay, Chọn nhiều, Lật thẻ, Ô chữ, Tìm từ, Ghép câu, Nhân-Quả, Đập chuột chũi, Bắn bóng bay, Jeopardy, Thẻ tốc độ) và gamedoikhangpro.vercel.app (Đấu Trường Tri Thức, 7 game: Đua vịt, Leo núi, Lâu đài, Bắn cung, Lướt sóng, Đua tàu, Đối kháng 2 người cùng máy). Chỉ lấy ý tưởng luật chơi, không chép mã/hình (tác giả Trần Hoài Thanh).

A. Phân hóa và chống lách luật
A1. Mỗi cổng mỗi em làm 1 câu bắt buộc theo làn (hỗ trợ = Must có giàn giáo, chuẩn = Should, thử thách = Could) + câu thưởng tùy chọn; không bắt làm cả 3. [mặc định: đồng ý]
A2. Hộ chiếu mục tiêu: "tự làm được ở mức chuẩn" cần ít nhất 1 câu Should tự làm; làn hỗ trợ chỉ đạt "mức cơ bản". [đồng ý]
A3. Điểm game (sao) theo mức: Must 1, Should 2, Could 3, +1 không dùng gợi ý; câu thưởng có trần mỗi cổng; điểm game không vào hộ chiếu. [đồng ý]
A4. Về đích sớm trong Học tập không phải thắng: em xong sớm làm phó bản / câu nâng cao / trợ giảng cho bạn. [đồng ý]
A5. Câu của mỗi em cố định phía máy chủ (tải lại không đổi câu), có biến thể số liệu khác bạn bên cạnh. [đồng ý]
A6. Sai nhanh liên tiếp (đoán mò) → chờ 10 giây và báo GV. [đồng ý]
A7. Ghi số lần rời tab trong tiết cho GV xem (không cấm được tra cứu). [đồng ý]
A8. Máy gợi ý làn, HS được tự chọn làn khó hơn; 2 câu đúng không gợi ý liền thì mời lên làn trên. [đồng ý]
A9. Tên làn theo truyện, không dùng chữ yếu/giỏi. [đồng ý]
A10. Kiểm tra: GV cộng giờ riêng cho từng em / chữ to? [có]

B. Chơi nhóm
B1. Lắc xúc xắc xoay vòng (mặc định) hay nhóm trưởng? [xoay vòng]
B2. Tối đa người/nhóm? [5]
B3. Đáp án chung cần đa số hay cả nhóm đồng ý? [đa số]
B4. Nhóm chờ một em ở cổng lõi tối đa bao lâu? [3 phút]
B5. Thứ tự làm: mỗi em 1 máy → máy chung → thi đấu theo luật → chỉ TV? [đồng ý]
B6. Nâng giới hạn 26 em của luật cũ lên 50? [có]

C. Mạch truyện và luật
C1. Mạch truyện 2 lớp (hồ sơ truyện thế giới × nhịp theo loại chặng)? [đồng ý]
C2. Duyệt giọng 2 thế giới mẫu trước rồi viết 10 thế giới còn lại? [duyệt 2 trước]
C3. Nối 9 luật có sẵn (campaign, duel, zones, survival, escort, treasure, relay, lockdown, merchant) vào tiết học thay cho "4 họ luật"? [đồng ý]

D. Hoạt động thi đấu ngắn cả lớp (3–5 phút)
D1. Làm trước 4 trò: Kéo co (2 đội), Đánh trùm cả lớp (hợp tác), Bấm chuông / Đập chuột chũi (cá nhân, tốc độ), Leo núi-Jeopardy ôn tập (chọn ô theo mức điểm)? [đồng ý]
D2. Đợt sau: Lâu đài thi đua tổ, Bắn cung, Lướt sóng (combo), Đối kháng 2 người cùng máy, Tiếp sức, Truy tìm kho báu, Ước lượng, Bingo. [đồng ý]
D3. Dạng câu mới cho nhiệm vụ ở trạm: Ghép đôi, Sắp xếp các bước giải, Phân loại, Chọn nhiều đáp án. [đồng ý]

E. Việc đang chờ khác
E1. Chọn linh vật 3D khi Codex gửi ảnh so sánh.
E2. "Phát hành" bản có Hộ chiếu học tập + 3 việc nên làm (+ linh vật mới).
E3. Duyệt bài mẫu Dãy số; bật AI thật (mức 4); chọn bài/môn nhân rộng.
E4. Thử trên điện thoại / iPad / TV thật.

#### Đáp án 18.8 (chủ hệ thống, 10/10/2026)
- A1–A10: đồng ý tất cả. A4 bổ sung: em xong sớm được chọn hỗ trợ 1 bạn trong danh sách "cần hỗ trợ" trên màn hình, đến ngồi làm nhóm đôi với bạn, được tính thêm điểm. Bổ sung mới: **nút "Đổi mức"** khi em chọn một mức mà không làm được thì chọn lại mức phù hợp.
- B11 xoay vòng; **B12 không giới hạn số người/nhóm** (phải có kịch bản nhiệm vụ cho đủ thành viên); B13 đa số; B14 3 phút; B15 đồng ý; **B16 nâng giới hạn lên 70 em**; **B17 mới: thêm chế độ thi đấu theo tổ (chọn từ đầu) và theo lớp (chọn từ đầu)**.
- C17 đồng ý; C18 duyệt 2 thế giới mẫu trước; C19 đồng ý.
- D20, D21, D22 đồng ý.
- E23: **Claude tự chọn linh vật 3D** (sau này HS gửi mặt/hình để ghép vào linh vật). E24: **"Phát hành"** (thẻ Hộ chiếu + 3 việc nên làm). E25: **duyệt bài mẫu Dãy số, bật AI, nhân rộng cho môn Toán**. E26: **chưa code, Claude báo cáo kế hoạch trước**.
- Câu hỏi mới của chủ hệ thống: chỉ dạy/luyện **một phần kiến thức hoặc một/một số dạng bài** trong một bài SGK Toán Kết nối tri thức (không cả bài) thì sao? Trả lời và thiết kế: chat 10/10 (báo cáo kế hoạch r7.19).

#### Câu hỏi mới chờ chốt (sau báo cáo r7.19, 10/10/2026)
F1. "Thi đấu theo lớp" nghĩa là: (a) lớp này đấu lớp khác (bảng xếp hạng giữa các lớp, chơi khác giờ), hay (b) cả lớp là một đội hợp tác đấu "lỗi hệ thống"/đấu máy? [đề xuất: làm cả hai, (b) trước]
F2. Tổ cố định: dùng lại tổ qua nhiều tiết (lưu danh sách tổ của lớp) hay chọn lại mỗi phòng? [lưu theo lớp, sửa được]
F3. Trợ giảng: điểm cộng cho em trợ giảng chỉ khi bạn được giúp sau đó TỰ qua câu kiểm tra; tối đa 1 bạn mỗi lúc; bạn được giúp phải bấm đồng ý? [đồng ý]
F4. Đổi mức: được đổi xuống sau 1 lần làm sai hoặc sau 3 phút; đổi lên lúc nào cũng được; tối đa 2 lần đổi mỗi cổng? [đồng ý]
F5. Bật AI: dùng Gemini qua Google AI Studio (có bản miễn phí; chủ hệ thống tự dán khóa vào cài đặt site, Claude không nhập khóa) hay dịch vụ khác? Bản miễn phí của Google có thể dùng dữ liệu gửi lên để cải tiến, nên chỉ gửi nội dung bài/đề, không gửi tên học sinh. [Gemini, chỉ gửi nội dung bài]
F6. Nhân rộng Toán: thứ tự lớp/chương? [Toán 11 KNTT học kì I trước (đang dạy), rồi 10, 12]
F7. Dạy một phần bài: đồng ý "bản đồ nội dung" mỗi bài SGK = mục → kiến thức → dạng bài (mỗi dạng có câu Must/Should/Could), AI soạn nháp từ SGK, GV duyệt một lần dùng mãi? [đồng ý]
- r7.19 (10/10/2026): ghi đáp án 18.8; báo cáo kế hoạch trước khi code (chủ hệ thống yêu cầu): nút Đổi mức, dạy một phần bài theo SGK KNTT (bản đồ nội dung mục → kiến thức → dạng bài), trợ giảng nhóm đôi, nhóm không giới hạn, 70 em, thi đấu tổ/lớp, bật AI, nhân rộng Toán. Câu hỏi F1–F7 chờ chốt.

#### Đáp án F1–F7 + bổ sung (chủ hệ thống, 10/10/2026)
- F1: làm cả 2 chế độ (lớp đấu lớp khác giờ; cả lớp một đội hợp tác) **+ liên đấu trực tiếp: nhiều lớp cùng thi đấu cùng lúc, mỗi lớp như một nhóm lớn**. F2–F7 và thứ tự các đợt 0–6: **đồng ý hết**.
- Bổ sung: giới hạn người chơi **N mở sẵn** (thực tế 1 khối ~100 em, có thể đông hơn).
- Bổ sung: **HS thấy số sao đạt được ở từng cổng trên bản đồ cá nhân, quay lại làm thêm để tăng sao bất kỳ lúc nào**.
- Hỏi: tích hợp công dân toàn cầu & học tập liên văn hóa, công dân kỹ thuật số, dạy và học chất lượng cao, dạy học trải nghiệm, phản tư, dùng AI trong học tập, 4 giá trị cốt lõi Dewey (hào phóng, đam mê, học tập suốt đời, integrity) đưa vào đâu → thiết kế "lớp giá trị" ở r7.20 (chat 10/10).
- r7.20 (10/10/2026): thiết kế lớp giá trị & năng lực Dewey (5 tầng: nội dung, hoạt động, game, hộ chiếu, giáo viên; mỗi tiết chọn 1–2 tích hợp), liên đấu nhiều lớp (điểm trung bình mỗi em, không cộng tổng), N người chơi (cảnh báo > 100, đo 150), sao từng cổng + quay lại tăng sao (câu biến thể mới, sao lấy lần cao nhất, bằng chứng mới vào hộ chiếu). Đợt 0 (phát hành Hộ chiếu + 3 việc nên làm) giao Codex.
- r7.21 (10/10/2026): chủ hệ thống "đồng ý hết" G1–G6 và gửi nguồn G6: (1) ảnh Nghị quyết 1606-01/2026/NQ/EDG (cập nhật EDUFIT 2032) — 4 giá trị: INTEGRITY (trân trọng lời nói của mình; coi mình là gốc rễ của sự việc; trọn vẹn và hoàn tất), ĐAM MÊ (tự tin khám phá bản thân; kiên trì tìm tòi và trải nghiệm; nuôi dưỡng động lực nội tại; đổi mới sáng tạo để dẫn đầu thay đổi), HÀO PHÓNG (tôn trọng sự khác biệt của mỗi cá nhân; suy nghĩ và hành động vì người khác trước; đóng góp cho cộng đồng xung quanh), HỌC TẬP SUỐT ĐỜI (không ngừng học hỏi; tự học, học hỏi lẫn nhau, lan tỏa tinh thần học tập; dám thử nghiệm để tạo giá trị mới); khẩu hiệu "EDUFIT giáo dục trải nghiệm — tự học, tự giáo dục, tự làm ra chính mình". (2) CIS portal Tây Hồ Tây, mục 3: Tiêu chuẩn năng lực Công dân toàn cầu & Học tập liên văn hóa = 6 vấn đề (công bằng xã hội và bình đẳng; bản sắc và sự đa dạng; toàn cầu hóa và sự phụ thuộc lẫn nhau; phát triển bền vững; hòa bình và xung đột; quyền con người), 5 kỹ năng (thấu cảm; giao tiếp; tư duy phản biện; hợp tác; hiểu sự khác biệt và tương tác một cách tôn trọng), 2 thái độ (tự tin tham gia các hoạt động khác nhau trong cộng đồng; tham gia có trách nhiệm). Thẻ "Công dân Kỹ thuật số" của portal: Claude chưa đọc được (nội dung nằm trong khung nhúng) — cần đọc lại trước khi viết phần CĐKTS. Quyết định: dùng đúng các diễn đạt chính thức này cho huy hiệu giá trị, nhãn bối cảnh và hộ chiếu.
- r7.21b: E23 Claude chọn linh vật: **ứng viên A (Gobkit, CC0, 310 tam giác, 76 KB, có khung xương và hoạt cảnh đứng/đi)** làm nền, đổi màu theo ảnh 2D (nâu/kem/vàng), thêm kính và áo choàng xanh dạng khối đơn giản, mặt trước to phẳng thuận lợi cho tính năng ghép ảnh mặt HS sau này. Lý do: giấy phép CC0 (không cần ghi công), khung xương thật cho bước đi tự nhiên, nhẹ. B/C chỉ chuyển động cả thân. AI tạo 3D miễn phí thất bại (TRELLIS lỗi máy chủ, Hunyuan hết GPU miễn phí). Giao Codex sau khi xong phát hành 3.

## 19. TỔNG HỢP CẬP NHẬT 10/10/2026 (bản chốt, thay thế các đề xuất rời rạc ở r7.6–r7.21)

Nguồn: hội thoại chủ hệ thống ↔ Claude ngày 10/10/2026. Mọi mục dưới đây đã được chủ hệ thống duyệt ("đồng ý hết") trừ khi ghi "chờ".

### 19.1 Khung giá trị và năng lực chính thức của trường (dùng đúng diễn đạt này trong game)

**a) 4 giá trị cốt lõi** (Nghị quyết 1606-01/2026/NQ/EDG, EDUFIT 2032; khẩu hiệu "Giáo dục trải nghiệm — tự học, tự giáo dục, tự làm ra chính mình"):

| Giá trị | Ý chính thức | Hành vi quan sát được trong game |
|---|---|---|
| Integrity | Trân trọng lời nói của mình; coi mình là gốc rễ của sự việc; trọn vẹn và hoàn tất | Cam kết "Em tự làm" trước câu kiểm tra/bài thi và giữ lời; tự khai khi dùng gợi ý/AI; hoàn tất trọn chặng |
| Đam mê | Tự tin khám phá bản thân; kiên trì tìm tòi và trải nghiệm; nuôi dưỡng động lực nội tại; đổi mới sáng tạo để dẫn đầu thay đổi | Chọn làn thử thách, đổi mức lên, làm lại sau khi sai, phó bản tự chọn, cách giải khác |
| Hào phóng | Tôn trọng sự khác biệt của mỗi cá nhân; suy nghĩ và hành động vì người khác trước; đóng góp cho cộng đồng xung quanh | Trợ giảng thành công, góp năng lượng chung của lớp, góp ý tử tế trong nhóm |
| Học tập suốt đời | Không ngừng học hỏi; tự học, học hỏi lẫn nhau, lan tỏa tinh thần học tập; dám thử nghiệm để tạo giá trị mới | Quay lại cổng cũ tăng sao, hộ chiếu cộng dồn, luyện ở nhà |

**b) Dạy và học chất lượng cao** (CIS portal mục 2, Teaching & Learning): cam kết dạy học chất lượng cao bằng phương pháp đa dạng theo triết lý **giáo dục trải nghiệm**, trong **môi trường học tập an toàn**; qua trải nghiệm và **phản tư có trọng tâm**, HS mở rộng kiến thức, phát triển kỹ năng, nuôi năng lực học tập suốt đời và đóng góp cho cộng đồng.
- Triết lý giáo dục trải nghiệm = Experience (tham gia chủ động vào hoạt động học thật, bối cảnh có ý nghĩa) + Focused Reflection (phân tích, đánh giá, kết nối, tổng hợp, so sánh điều đã học). Phương pháp: chu trình Kolb, học qua tìm tòi, mô hình 5E, học theo dự án, Design Thinking.
- 4 đặc trưng: Học gắn với đời sống thực; HS là chủ thể tích cực của việc học; Học qua trải nghiệm và phản tư; Kỹ năng tư duy và tự định hướng phát triển (tư duy phản biện, giải quyết vấn đề, tự học, học suốt đời).
- 5 chiều của môi trường học tập an toàn: Tôn trọng & gắn kết; Văn hóa học tập (kỳ vọng cao, kiên trì, động lực); Môi trường có mục đích (mục tiêu rõ, nề nếp, tối đa thời gian học); Quản lý hành vi HS (kỳ vọng tích cực); Tổ chức không gian vật lý.
- Công nghệ (MRT = Media, Resources, Technology) chọn theo 5 tiêu chí: Gắn với mục tiêu học tập (phương tiện, không phải mục đích); Dễ dùng và ổn định kỹ thuật; Công bằng và tiếp cận được cho mọi HS kể cả nhu cầu đa dạng; An toàn và bảo vệ dữ liệu (GV giám sát, HS dùng có trách nhiệm); Bền vững và mở rộng được. → Dùng 5 tiêu chí này làm cổng nghiệm thu mọi tính năng game.

**c) Công dân toàn cầu & Học tập liên văn hóa** (mục 3): tuyên bố "cung cấp trải nghiệm đa văn hóa và tiếp cận vấn đề toàn cầu; giúp HS phát triển kỹ năng giao tiếp và hợp tác để trở thành nhà lãnh đạo tự tin, thấu cảm, tư duy phản biện, tương tác tôn trọng và hành động có trách nhiệm". Khung năng lực: **6 vấn đề** (công bằng xã hội và bình đẳng; bản sắc và sự đa dạng; toàn cầu hóa và sự phụ thuộc lẫn nhau; phát triển bền vững; hòa bình và xung đột; quyền con người); **5 kỹ năng** (thấu cảm; giao tiếp; tư duy phản biện; hợp tác; hiểu sự khác biệt và tương tác tôn trọng); **2 thái độ** (tự tin tham gia; tham gia có trách nhiệm trong cộng đồng). MHS học CDTC như môn riêng và tích hợp vào các môn khác. Hoạt động ngoài lớp: lễ hội văn hóa (Trung thu, Halloween, Ngày Quốc tế, Hội chợ khoa học, Chợ Tết), dự án cộng đồng/môi trường/tình nguyện.

**d) Công dân kỹ thuật số** (mục 3): tuyên bố "tạo cơ hội học tập và trải nghiệm để phát triển năng lực công dân số; dùng công nghệ an toàn và có trách nhiệm cho học tập, sáng tạo và hợp tác". Tin học lớp 1–8, Công dân số lớp 9–12, tích hợp các môn. **6 chủ đề:** Cân bằng truyền thông & hạnh phúc; Quyền riêng tư & an ninh; Dấu chân số & danh tính; Quan hệ & giao tiếp; Bắt nạt mạng, drama số & ngôn từ thù ghét; Hiểu biết tin tức & truyền thông.

**e) Hạnh phúc (Well-Being)** (mục 4): 5 thành phần liên kết: Sức khỏe thể chất; Sức khỏe tâm lý; Quan hệ tích cực; Năng lực bản thân & tự tin; Ý nghĩa & mục đích.

**f) Mục 5 Others** (hướng dẫn phỏng vấn CIS, Quy tắc đạo đức, lịch thăm CIS): không đưa vào game; game có thể làm minh chứng cho CIS (dạy học trải nghiệm, phân hóa, công dân số).

### 19.2 Lớp giá trị & năng lực trong game (5 tầng)
- **Nội dung:** mỗi dạng bài có nhãn bối cảnh theo đúng tên ở 19.1 (một trong 6 vấn đề toàn cầu; một chủ đề công dân số; trải nghiệm thực tế; AI).
- **Hoạt động:** trạm phản tư (Visible Thinking: "Trước em nghĩ… Giờ em nghĩ…", "Em thấy – Em nghĩ – Em thắc mắc"); trạm AI (GV đặt mức: không AI / AI gợi ý / AI kiểm tra; mặc định không AI; HS ghi "AI giúp gì, em sửa gì"; nhiệm vụ "bắt lỗi AI"); phó bản thực tế (đo, đếm số liệu thật theo chu trình Kolb); nhiệm vụ hai góc nhìn liên văn hóa; nhiệm vụ "kiểm chứng tin" (hiểu biết tin tức & truyền thông).
- **Game:** 5 kỹ năng CDTC gắn vai nhóm (Kiểm chứng = tư duy phản biện; Giải thích/tổng hợp = giao tiếp; Trợ giảng = thấu cảm; làm nhóm = hợp tác; hai góc nhìn = hiểu khác biệt, tương tác tôn trọng); thế giới mang màu văn hóa có ghi nguồn.
- **Hộ chiếu:** mục "Giá trị và năng lực em đã thể hiện" (huy hiệu giá trị chỉ trao theo hành vi quan sát được hoặc GV đề cử; không xếp hạng; không cộng điểm Toán) + dòng phản tư + dòng kết truyện.
- **Giáo viên:** khi soạn, kiểm có câu bậc cao, có cá nhân + nhóm, có phản tư, có ≥1 tích hợp; trong giờ xem tỉ lệ em có bằng chứng; sau giờ "báo cáo chất lượng tiết" (khung Danielson của SmartPlan).
- **Quy tắc:** mỗi tiết chọn 1–2 tích hợp chính (G1); lời cam kết chính trực trước câu kiểm tra và bài thi (G3); liên đấu có bảng "tiến bộ nhất" (G5).
- **Hạnh phúc HS:** không bêu tên em sai trên TV; bảng xếp hạng chỉ có trong trò chơi ngắn; nhắc nghỉ mắt và cân bằng màn hình khi chơi lâu ở nhà; không phạt em thua.

### 19.3 Chế độ Kiểm tra (đã làm, đã phát hành)
Không xúc xắc khi làm bài; hết giờ trạm đóng; nộp sớm được hành trình + huy hiệu + hộ chiếu + điểm tổng (nếu GV bật) nhưng **lời giải chỉ mở khi phòng đóng**; xem lại tại nhà bằng PIN 8 ký tự; tải hướng dẫn chấm Word/PDF; chấm tự luận cạnh biểu điểm + nhận xét; chống nhìn bài 4 mức (đảo câu trong phần, nhiều mã đề, đảo phương án/ý, đổi số liệu bằng AI có GV duyệt); OCR đề scan; GV xóa phòng. Bổ sung đã duyệt: GV cộng giờ riêng / chữ to cho từng em (A10); luôn làm cá nhân; AI luôn tắt.

### 19.4 Phân hóa và chống lách luật (A1–A10, F4)
- 3 làn đường = 3 nhánh (hỗ trợ / chuẩn / thử thách), tên theo truyện; chẩn đoán nhanh đầu giờ gợi ý làn; HS tự chọn làn khó hơn; đúng 2 câu liền không gợi ý thì được mời lên làn trên.
- Mỗi cổng **1 câu bắt buộc theo làn** (Must có giàn giáo / Should / Could) + câu thưởng tùy chọn (có trần). Câu kiểm tra lại ở cổng lõi mức Must.
- **Nút "Đổi mức"**: đổi xuống sau 1 lần sai hoặc 3 phút; đổi lên lúc nào cũng được; tối đa 2 lần mỗi cổng; không trừ điểm; GV thấy lịch sử đổi.
- Hộ chiếu: "tự làm được ở mức chuẩn" cần ≥1 câu Should tự làm; mục tiêu "đạt" cần ≥2 bằng chứng tự làm, trong đó có câu kiểm tra cá nhân.
- **Sao** (điểm chơi): Must 1 / Should 2 / Could 3, +1 nếu không dùng gợi ý; không vào hộ chiếu.
- **Sao từng cổng hiện trên bản đồ cá nhân; quay lại cổng đã qua bất kỳ lúc nào** (kể cả ở nhà) để làm câu biến thể mới; sao lấy lần cao nhất; bằng chứng mới cập nhật hộ chiếu; trong giờ không nhảy cóc cổng chưa học; GV tắt được.
- Chống lách: câu cố định theo em phía máy chủ; số liệu khác bạn bên cạnh; sai nhanh liên tiếp chờ 10 giây + báo GV; ghi số lần rời tab; gợi ý không lộ đáp án; xúc xắc không vượt cổng lõi; về đích sớm không phải thắng.
- **Trợ giảng** (A4, F3): em xong sớm chọn 1 bạn trong danh sách "cần hỗ trợ", bạn phải đồng ý, hai em ngồi làm nhóm đôi; em trợ giảng thấy gợi ý, không thấy đáp án; "sao trợ giảng" chỉ có khi bạn sau đó tự qua câu kiểm tra; 1 bạn mỗi lúc, có giới hạn; hộ chiếu ghi "Em đã giúp bạn X".

### 19.5 Chơi nhóm, tổ, lớp, liên đấu (B11–B17, F1, F2)
- 3 kiểu thiết bị: A mỗi em 1 máy; B mỗi nhóm 1 máy (bấm tên trước khi nhập); C chỉ có TV (giơ bảng). Làm theo thứ tự A → B → thi đấu theo luật → C.
- Xúc xắc thuộc nhóm, **xoay vòng** người lắc; chỉ lắc khi xong nhiệm vụ trạm; người tới lượt vắng >15 giây thì chuyển lượt.
- **Số người mỗi nhóm không giới hạn**, kịch bản co giãn: 2–4 người dùng 4 vai (Phát hiện dữ kiện, Dựng biểu diễn, Kiểm chứng, Giải thích tổng hợp); 5–8 người thêm Người hỏi khó / Người trình bày / Người canh giờ / Kiểm chứng 2, hoặc mỗi em một ý; từ 9 người chia nhóm con 2–3 người rồi ghép. Vai xoay qua từng trạm; 15 giây chọn vai.
- Trạm nhóm: cá nhân nghĩ → làm theo vai → ghép đáp án chung (**đa số** đồng ý) → chấm → câu kiểm tra cá nhân ở cổng lõi; nhóm chờ một em tối đa **3 phút** rồi em đó vào nhánh hỗ trợ.
- Màn hình HS (thanh nhóm, thẻ vai, bản đồ nhỏ, khung nhiệm vụ với bản nháp chung, một nút chính đổi theo ngữ cảnh); TV (linh vật đội, tiến độ, không hiện đáp án); GV (thẻ đội, nhật ký đóng góp, cảnh báo ăn theo).
- **Tổ cố định** chọn từ đầu, lưu theo lớp, dùng lại qua nhiều tiết. **Thi đấu theo lớp**: (a) lớp đấu lớp khác giờ; (b) cả lớp một đội hợp tác; (c) **liên đấu trực tiếp nhiều lớp cùng lúc**, mỗi lớp một đội lớn. Điểm = trung bình mỗi em; có bảng "cao nhất" và "tiến bộ nhất".
- **Giới hạn người chơi N để mở** (cảnh báo khi > 100, đo bằng 150 em giả lập; thực tế 1 khối ~100).

### 19.6 Mạch truyện, luật, hoạt động thi đấu ngắn
- Mạch truyện 2 lớp: hồ sơ truyện từng thế giới (biến cố, mục tiêu, tên riêng, kết thúc, nguồn văn hóa) × nhịp theo loại chặng (hình thành / luyện tập / ôn tập / kiểm tra / hỗn hợp). Câu mẫu có chỗ trống, viết sẵn, không gọi AI lúc học; ≤2 câu, bỏ qua được, sai không bị phạt. Duyệt giọng 2 thế giới mẫu (Hồ Sơ Thành Phố Ẩn, Ngũ Ấn) trước.
- Nối 9 luật có sẵn (campaign, duel, zones, survival, escort, treasure, relay, lockdown, merchant) vào tiết học; nâng giới hạn 26 em.
- "Sự kiện lớp" 3–5 phút chèn vào mọi chế độ. Đợt 1: Kéo co, Đánh trùm cả lớp, Bấm chuông / Đập chuột chũi, Leo núi kiểu Jeopardy. Đợt 2: Lâu đài, Bắn cung, Lướt sóng, Đối kháng 2 người cùng máy, Tiếp sức, Truy tìm kho báu, Ước lượng, Bingo. Tham khảo ý tưởng từ taogametuongtac.vercel.app và gamedoikhangpro.vercel.app (thầy Trần Hoài Thanh), không chép mã hay hình. Câu theo mức của từng em; điểm không vào hộ chiếu; nhóm ngẫu nhiên.
- Dạng câu mới ở trạm: Ghép đôi, Sắp xếp bước giải, Phân loại, Chọn nhiều đáp án (Ô chữ / Tìm từ / Ghép câu để dành cho Văn và Anh).

### 19.7 Nội dung: dạy một phần bài, nhân rộng Toán, AI
- **Bản đồ nội dung mỗi bài SGK Toán KNTT**: bài → mục → kiến thức → dạng bài (mỗi dạng có câu Must/Should/Could + nhãn bối cảnh 19.2). AI soạn nháp từ SGK scan + PPCT + YCCĐ; GV duyệt một lần, dùng mãi.
- Tạo phòng: chọn bài rồi tích chọn mục/dạng → số cổng co giãn; hộ chiếu chỉ ghi mục tiêu đã chọn và cộng dồn qua các tiết; ôn tập chọn được nhiều bài/chương.
- Nhân rộng: Toán 11 KNTT học kì I trước, rồi lớp 10, lớp 12. Bài mẫu Dãy số: **đã duyệt**.
- **Bật AI**: Gemini qua Google AI Studio (có bản miễn phí); chủ hệ thống tự dán khóa vào cài đặt site (LESSON_AI_ENABLED / ENDPOINT / MODEL / API_KEY, chuẩn chat-completions); chỉ gửi nội dung bài/đề, không gửi tên hay bài làm HS; giữ cổng xác nhận. **Chờ chủ hệ thống tạo khóa.**

### 19.8 3D và linh vật
Linh vật nền: ứng viên A (Gobkit, CC0, có khung xương, idle/walk), đổi màu theo ảnh 2D, thêm kính + áo choàng xanh, mặt trước phẳng để sau này ghép ảnh mặt HS (cần chỗ lưu + đồng ý của phụ huynh; thiết kế riêng theo chủ đề "Quyền riêng tư & an ninh"). Dùng Blender MCP; mô hình từ mọi nguồn, có ghi công (CREDITS.md); ≤ 300 KB; chậm thêm ≤ 10 % ở 50 em; máy yếu giữ thẻ 2D. Lộ trình Blender: linh vật → cổng/tháp/xúc xắc → cây/đá → công trình 8 bộ → vân mặt đất; địa hình vẫn dựng bằng code.

### 19.9 Thứ tự làm (đã duyệt)
| Đợt | Nội dung | Ai |
|---|---|---|
| 0 | Phát hành thẻ Hộ chiếu + "3 việc nên làm" (+ owl/OCR/cockpit). **Đang chạy**: Codex sửa 4 lỗi P2 trước khi phát hành | Codex |
| 1 | Bản đồ nội dung bài SGK + dạy một phần bài + bật AI (Toán 11 chương I–II) + nhãn bối cảnh | Claude |
| 2 | Phân hóa (19.4) + sao từng cổng + quay lại tăng sao | Claude/Codex |
| 3 | Chơi nhóm kiểu A + tổ + liên đấu + N người | Codex |
| 4 | Mạch truyện 2 thế giới mẫu → 10 thế giới còn lại (+ bối cảnh văn hóa) | Claude |
| 4b | Lớp giá trị (19.2): phản tư, trạm AI, phó bản thực tế, huy hiệu giá trị, cam kết chính trực, báo cáo chất lượng tiết | Claude/Codex |
| 5 | 4 sự kiện lớp + 4 dạng câu mới | Codex |
| 6 | 9 luật vào tiết học, kiểu thiết bị B và C, sự kiện đợt 2 | khi có quota |
| song song | Linh vật A theo 19.8; nhân rộng bản đồ nội dung Toán | Codex / AI + GV duyệt |

Mọi đợt: test, typecheck, lint, build, review chéo khác hãng, nghiệm thu thêm bằng 5 tiêu chí MRT (19.1b); chủ hệ thống duyệt trước khi phát hành.

### 19.10 Còn chờ chủ hệ thống
- Tạo khóa Gemini (Google AI Studio) và dán vào cài đặt site (Claude hướng dẫn từng bước).
- Thử trên điện thoại / iPad / TV thật.
- Duyệt giọng truyện 2 thế giới mẫu (khi Claude viết xong ở đợt 4).

### 19.11 Hạn mức và ưu tiên cho tuần sau (10/10/2026 tối)
Đợt 0 xong: Codex "release 3 done" (site riêng công khai version 3, 810/810 test; thẻ Hộ chiếu + 3 việc nên làm + cú 3D + OCR + cockpit đã lên site; 4 lỗi P2 đã sửa).
Hạn mức theo ảnh 9Router 21:04: Claude Code tuần còn ~10 % (reset ~15/10 01:00), phiên 5h còn 67 %; 5 tài khoản Codex mỗi cái tuần còn 10–14 %, 5h còn 30–40 % (reset tuần ~15/10 15:55); Antigravity Claude & GPT đã hết (reset ~14/10); Antigravity Gemini 2 tài khoản: 5h còn 99–100 %, tuần còn 41 % (reset ~14/10 13:00).
Phân vai tiết kiệm: Gemini (ag/gemini-3.8-flash-high làm chính, ag/gemini-3.1-pro-low phản biện) code chính qua 9Router; Codex chỉ review chỉ-đọc + phát hành; Claude chỉ viết đặc tả ngắn và nghiệm thu. Ghi "degraded" nếu thiếu review khác hãng.
Ưu tiên để HS chơi tuần sau: (1) nội dung đúng các bài sẽ dạy tuần sau (bản đồ nội dung + chọn một phần bài, chỉ cho các bài đó); (2) bật AI Gemini để soạn nháp; (3) phân hóa lõi: câu 3 mức mỗi cổng + nút Đổi mức + sao từng cổng (chưa làm lại 3 làn trên bản đồ); (4) nếu còn hạn mức: sự kiện lớp Kéo co. Hoãn sang khi hạn mức hồi (sau 15/10): chơi nhóm mới, liên đấu, 9 luật, mạch truyện 12 thế giới, lớp giá trị đầy đủ, linh vật A.
Chờ chủ hệ thống: lớp + bài + số tiết + kiểu tiết tuần sau; thiết bị (mỗi em 1 máy?); tạo khóa Gemini.
- r7.22 (10/10/2026 tối): chủ hệ thống nhắc ảnh nền 7 map còn SVG đơn giản. Claude làm: coverShot() trong public/map3d.js (camera trực giao nhìn thẳng xuống đúng khung chơi 280x170, ẩn linh vật/xúc xắc/mây/chim/sương) + scripts/qa/map3d-cover.mjs chụp world-<id>.webp 1600x900 và @2x 3200x1800 cho cube, ring, zones, academy, survival, galaxy, maze (208–355 KB; @2x 545–1221 KB). Đường 2D khớp đường 3D vì cùng tọa độ 0–100 %. lib/product-content.js đổi ảnh 7 map sang .webp; scripts/generate-world-assets.mjs không ghi đè ảnh không phải SVG; bỏ 7 SVG cũ; cập nhật 2 test. 810/810 test, typecheck 0, lint 0, build 0; kiểm 2D Quần Đảo Sinh Tồn trên trình duyệt. Chưa phát hành (chờ lệnh).

- r7.23 (10/10/2026, Codex): release4cover-onlypublicversion4 thànhcông. Independent810/810/typecheck/lint/build0,12cards+2new2Dmaps375/1280local/prodPASS,14WEBPhashlive. V7/AIoff/dataunchanged. AIWIPmới khôngincluded vì testoriginenvfailedtrongsharedcheckout; Claude sửađợt tiếp. Reporttasks/codex-release4-report.md; rollbackversion3.
- r7.23 (10/10/2026 tối): chủ hệ thống: "Phát hành" (ảnh nền 7 map → giao Codex QA + phát hành bản 4); HS nào cũng có máy riêng; đã có khóa Gemini, muốn ô điền khóa dễ thấy; tạo bài bằng cách gửi giáo án hoặc tự ghi nội dung + yêu cầu; quy tắc mới: **Claude code, Codex QA và phát hành**. Claude làm: (1) khung "🤖 Kết nối AI" chỉ chủ hệ thống thấy, ở đầu trang Bài học và trang Kiểm tra (lib/ai-settings.js, app/api/ai-settings/route.js, components/AISettingsCard.tsx): dán khóa, mô hình mặc định gemini-flash-latest (sửa được), nút Kiểm tra (1 yêu cầu 5 token), Xóa khóa; khóa lưu trong bảng system_settings có sẵn (không cần migration), không bao giờ trả về trình duyệt (chỉ 4 ký tự cuối); biến môi trường LESSON_AI_* vẫn được ưu tiên; các route dùng AI nạp khóa đã lưu. (2) ô "✍️ Hoặc gõ nội dung muốn dạy và yêu cầu" trong thẻ Nhập giáo án: nội dung gõ được lưu như nguồn text/plain trên máy chủ (UTF-8, ≤128 KB) qua importText, rồi dùng nút "Tạo đề xuất tự động" như file Word/PDF. 814/814 test, typecheck 0, lint 0, build 0; đã thử trên trình duyệt: gõ nội dung → tải lên máy chủ → hiện nút tạo đề xuất. Sự cố tự sửa: các lần sửa bằng Python đổi file sang CRLF, đã đổi lại LF.
- r7.24 (11/10/2026): Claude làm đợt 2 phân hóa lõi: (1) "Đổi mức" trong runtime SELECT_BRANCH: tối đa 2 lần tự đổi mỗi chặng (BRANCH_SWITCH_LIMIT), sau khi đã tự chọn mức thì đổi xuống cần 1 lần sai đã chấm hoặc 3 phút (BRANCH_DOWN_AFTER_MS); rời mức được giao lúc đầu thì tự do; chọn lại đúng mức hiện tại bị từ chối. Mức 3 (extension) vẫn mở khi em tự qua câu kiểm tra mức nền không gợi ý (giữ cổng sư phạm cũ, khác A8 một chút: tự chọn lên Mức 2 lúc nào cũng được). (2) Màn HS: thanh "Mức của em" + nút Đổi sang Mức 1 Nền tảng / Mức 2 Chuẩn / Mức 3 Thử thách, số lần đổi còn lại, thông báo lỗi rõ, lời mời lên mức sau 2 câu đúng liền không gợi ý, dòng sao từng cổng (Must 1 / Should 2 / Could 3, +1 không gợi ý; tối đa 4). (3) Lời dặn AI soạn bài: chặng formation/practice cá nhân phải có 3 nhiệm vụ song song support/core/extension cùng mục tiêu, recheck/exit shared mức Must; chỉ soạn đúng phần bài được nêu. Chưa làm: quay lại cổng cũ để tăng sao, sao trên bản đồ 3D/2D. 816/816 test, typecheck 0, lint 0, build 0.
- r7.25 (11/10/2026): Codex giữ bản 5 vì lỗi tranh chấp khi Xóa khóa AI (đọc chậm có thể khôi phục khóa cũ); Claude sửa bằng thứ tự vé (ticket) trong lib/ai-settings.js + test hồi quy; 817/817 test. Luồng Codex cũ quá lớn cho cầu nối → mở luồng Codex mới 01a126e2 để QA và phát hành bản 5 + 6 (phân hóa lõi).
- r7.26 (11/10/2026): Codex giữ bản 5+6 vì 2 lỗi P2 (phản hồi Lưu khóa chậm có thể khôi phục khóa đã xóa; thời gian tạm dừng bị tính vào 3 phút đổi mức). Claude sửa cả hai (đọc lại từ DB sau khi ghi; chỉ tính thời gian hoạt động thực), 2 bài tái hiện của Codex đạt, 817/817 test. Hết hạn mức Claude tuần này (mở lại ~15/10 01:00): Codex biến bài tái hiện thành test, QA và phát hành bản 5+6; lỗi nhỏ rõ phạm vi Codex được tự sửa có test, lỗi đổi hành vi/dữ liệu thì giữ lại cho Claude sau 15/10. Việc tiếp theo khi có hạn mức: quay lại cổng tăng sao + sao trên bản đồ; đợt 3 chơi nhóm; mạch truyện 2 thế giới mẫu (xem 19.9).

### 12/10/2026 — Codex tiếp quản sau Claude
Owner trực tiếp giao thực hiện phần còn lại; chọn mã/PIN theo lớp và truyện kịch tính tối đa2câu. T1–T11 code tích hợp bản ứng viên riêng;1046test,150HS/3228HTTP local,279coreHTTP,rollback0017–19,CC0Gobkit/perf evidence. Phần học liệu chỉDãy số verified;7bàiToán11 làcatalogue draft;niênkhóacầnGVxácminh. Review khác hãng có inconclusive được adjudicate trung thực. T12/production chưa phát hành; gate19.9owner duyệt cuối giữ nguyên. Báo cáo tasks/codex-takeover-report.md + source manifest; V7 và WIP giữ nguyên.

### 12/10/2026 — Sổ chung để Claude quay lại cùng làm

Owner yêu cầu tiếp tục, luôn ghi vào chính file này để Claude hồi quota đọc lại. Đây là nguồn tiến độ chung; không lấy câu trả lời chat làm bằng chứng hoàn tất.

**Đính chính:** T1–T11 đã tích hợp các lát code, chưa hoàn tất toàn mục19. Audit `tasks/codex-plan19-scope-audit-20261012.md`: còn A10 giờ/chữ riêng khi kiểm tra, trợ giảng có đồng ý, ôn nhiều bài/chương, ba làn bản đồ và UX riêng sự kiện (Leo núi Jeopardy), học liệu/AI/nghiệm thu. Latest candidate1047/1047 PASS/typecheck/build0, lint0errors392warnings. Public vẫn nativeversion5; V7nativeversion9 nguyên vẹn. Không phát hành/commit/push khi chưa có duyệt đúng phạm vi.

**Đang làm đợt bù R1:** A10 và trợ giảng, song song khảo sát/chuyển nguồn Toán. Owner đã duyệt hướng này bằng “Tiếp tục đi” sau audit. Rủi ro chính: deadline riêng không được mở lại bài đã nộp, không nới giờ cả lớp; consent trợ giảng không cấp quyền đọc câu trả lời của bạn; thưởng chỉ sau recheck độc lập, replay không nhân thưởng. Mỗi thay đổi có RED/GREEN, test phạm vi, typecheck/lint/build, review khác hãng. Phương án tối thiểu dùng model/state hiện có, chỉ thêm migration khi dữ liệu cần lưu không có nơi đúng.

**Nguồn Toán:** SmartPlan `C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` chỉ đọc. PPCT10/11/12 có298/290/368 dòng, objectives trống; không tự bịa YCCĐ. Unitplan ghi25–26 so PPCT26–27; giữ conflict. Có67fileSpecs, giáo ánDOCX tuần6, `mathStandards.ts`, `toanClassroomMoves.ts`, mẫuBanToán và ma trận đề. Dùng lại câu/lời giải có nguồn; NB/TH/VD khác Must/Should/Could. Giáo án Dãy số local có mục tiêu khác góiSite (tính số hạng/điểm rời rạc so hữu hạn/4biểu diễn), không gán cùng objective chỉ theo tên bài. Giữ nguồn/snapshot/hash/version, học liệu chuyển vào ở trạng thái draft cầnGVduyệt.

**Phân công:** Codex điều phối/tích hợp; workerA10 chỉ exam; workerTutor chỉ lesson trợ giảng; Codex nguồnToán/checklist. Một writer/file. Gemini độc lập review qua9router sau kiểm model sống; Claude chưa gọi khi còn quota limit. Khi Claude quay lại: đọc mục này, audit, `tasks/codex-plan19-r1.md`, `tasks/coordination.md`; kiểm source/git hiện hành trước nhận task. Không sửa SmartPlan, không deployV7, không ghi dữ liệuHS thật hoặc đọc khóaGemini.


#### Tiến độ R1/R2 — Codex đang tích hợp
A10 181tests/typecheck/scopedlintPASS, GeminiPro code reviewPASS; chưabrowser/build/deploy. Trợgiảngruntime75+tests và tích hợpUI/cumulativehộchiếu;reviewGemini tìm quyềnthu hồi saođãtrao thiếu, đãRED/GREENsửa, choGVsửasauCONCLUDE. Nhận xétoptionalchaining/crashvàcumulativesyncchưacóreprotừsource, adjudicatekhôngbỏphiếu. BankToán8tiết80câu24LO;Dãy sốP2draft40min16tasks validatorPASS. Đangchuẩn bị7góituần6bổsung. Jeopardyboard3ôđãsoạn,parentnốipickcommand, khôngđổi11sựkiệnkhác. Cógiớihạn1536KiBstate;đangdedupnhãnôchomục tiêu150em;khôngnângcapmù. Sourcegatescũ1047khôngphảigatemới.R1oldcandidatecầnrefreshsauverify.


#### Gemini owner handoff
Owner12/10yêucầu mở chỗnhậpkey. ĐãmởđúngSitepublic/lessons(tab3), ôAPIpasswordhiện, đểownerselfenter/Lưu/Check. Khôngđọc key/copy trường/APIstoredvalue. Handoffảnhtasks/qa-takeover/gemini-key-handoff.jpg đãche. Chờownerhoàntất; appAIcallthậtchưachạy, khôngđồngnhấtcanary9routerreviewvớiproviderSite. Giữtab này khôngđiềukhiểntronglúcnậpkhóa.


#### Lỗi Gemini NETWORK — nguyên nhân xác minh12/10
OwnernhậpkhóarồiTestNETWORK. Localworkerd táihiệnredirect:errorunsupportedthrowtrướcfetch; manualchạmGoogleHTTP400vớiFAKEkey. Sửa3callAI(kết nối/soạn bài/biến thểđề), khôngđụngkey. Bảnhotfixriêngbaselineproductionc370+5scopedfiles 820/820/typecheck/lint/build0, GeminiProPASS. tasks/codex-gemini-edge-hotfix-report.md. Chờduyệtpháthànhhotfixriêng;R1–R4vẫncục bộ. Khôngđổi/đọckhóathật,dữliệu,V7. Sauhotfix mớikiểmappGooglethậtthôngquaownerUI.


#### Gate tíchhợpR1–R4
Fullsuite đầu1100+tests phát hiện7lỗi test harness(exammapreceive thiếu renderLanes khai báo;2PlayPage mocks thiếuTutorPanel import), khôngđượccoixanh. Đangsửaharness đúngmodule đểkiểmthựcfeature;typechecktíchhợp0. Scopeônmulti unionđãđốisoátsettingsconsentfingerprintstable. R4DTOownbranchonlyTV/peerskhônglộnhánh;corelaneprotectedserver. HotfixGeminiisolated820/820reviewPASSđãxinownerduyệtriêng,chưapháthành.


#### Checkpoint tiếp tục12/10 — trướcQAWorker/CUA
CandidatecôlậpR1–R4 đãrefreshtheo146+scopedpaths,1108/1108testsPASS;typecheck0,isolatedlint0errors393warnings;buildrefreshlabelsđangchạy. A10reviewPASS;Jeopardy+lanesreviewPASS;R3scope/sourceimportreviewPASS(withteacherMathreviewlimit). Tutorreviewblockedgiữraw;findingthu hồi saođãsửa,4claimskhácđã81behavioralchecksphảnchứng,khôngghiPASSgiả. Bank80câu/8tiết24LO và8góidraft40min(cầnGVsource/math/timeboxreview),privateauthenticatedAPI/lesson-content chỉlisttitlekhôngđápánngoàiauth. Bộtestnewscope+source1070? dùnglog1108chínhxác,khôngtựcộng. Chưaproduction/fullAI/máythật.


#### Gemini hotfix — DONE production12/10
Ownerduyệtpháthànhriêng. Nativeversion6/appgver_0358923047e48191a83af7699897167e, commit5a3fd3423974d75d6cff41f51a72ee07688f1fbe, deploymentappgdep_6acc5835e2c88191bc89b5561e00aaa3 succeeded03:47:29UTC/env2/publicsameSite. Chỉ3redirect manual+2testfiles,5files11insertions4deletions;17SQLbytebaseline preserved,nonewDBschema. Full820gate+GeminiProPASS+Workerdrepro. ĐãTestownerUIvớikhóalưu:Kết nốiđược AIđãsẵnsàng;khôngđọc/đổikey. Backup23nonsecrettables2rows;system_settingscókeyđượcbỏqua,giữnguyênD1(nomigration). WorkflowpushthànhcôngnhưngpackagerWSLBashmissing rồiGitBashtarC:colonerror;officialpackagersucceededGitBash/ctarget. Sourcecheckoutriêng clean. Archive/releaseevidence tasks/codex-gemini-edge-archive.json/codex-gemini-edge-release-evidence.json. R1–R4CHƯApublished;V7v9khôngđộng. Nếurollbackhotfixdùngnativeversion5giữnguyênDB,key.

#### Tiếp tục nghiệm thu R1–R5 — 12/10/2026

- Quyền phát hành vừa nhận chỉ áp dụng bản sửa Gemini; đã hoàn tất trên native version 6. R1–R5 vẫn cục bộ, chưa được phát hành.
- R5: thêm cảnh SVG riêng cho 11 sự kiện, giữ bảng Jeopardy; combo lướt sóng mới tăng điểm 10/20/30, sai đặt lại, trạng thái cũ giữ luật cũ. Agent đã báo kiểm tra tập trung; Codex còn kiểm độc lập và build ứng viên.
- Phát hiện tiếp sức: `LEAVE_LEARNER` bị chặn trong sự kiện nên GV chưa đánh dấu vắng để chuyển lượt. Đang sửa với test qua reducer thật; giữ danh sách đóng băng và dấu vết, không tự cho người quay lại tái tham gia.
- Đang rehearsal migration 0017–0020 trên bản sao backup có trước khi nhập khóa; kiểm bảo toàn dữ liệu, rollback và Worker cũ. Không chạm D1 production.
- Đang đo lại state 150 học sinh kết hợp trợ giảng/Jeopardy. Bằng chứng tải cũ chưa đủ chứng nhận tính năng mới dưới giới hạn 1.5 MiB.
- QA trình duyệt cần khởi động lại fixture cục bộ: cổng 5201 hiện từ chối kết nối. Không coi ảnh/lần kiểm trước là bằng chứng phiên mới.
- Chưa đủ để kết luận toàn mục 19 hoàn tất: thao tác bấm chuông, đối kháng hai người cùng máy, AI soạn bài thật, duyệt Toán/niên khóa và thiết bị vật lý còn phải đối chiếu/kiểm riêng. Hình SVG không thay thế cơ chế còn thiếu.
- Khi Claude hồi quota: đọc mục này, audit phạm vi và evidence hotfix; giữ WIP tại worktree 6dec, không sửa SmartPlan, không phát hành nhầm V7.

#### Kết quả nghiệm thu tiếp theo — 12/10/2026

- Ứng viên cô lập R1–R5: **1118/1118 test PASS**, typecheck 0, lint 0 lỗi/393 cảnh báo, build 0. 152 tệp phạm vi khớp byte với nguồn; manifest `tasks/codex-r1-r5-source-manifest.json`. Không lấy tổng test làm bằng chứng hoàn tất toàn mục19.
- R5 cảnh sự kiện/combo/tiếp sức: Codex chạy độc lập 27 kiểm tra tập trung PASS; Gemini Pro qua 9router trả PASS, không finding (`tasks/codex-r5-review.json`, source hashes trong artifact). Bản ghi relay cũ trong evidence agent đã lỗi thời: `LEAVE_LEARNER` nay được GV dùng giữa sự kiện, giữ frozen roster/điểm/absentAt, bỏ qua lượt vắng, không cho rejoin khôi phục lượt. Test host-only, pause, replay, late join và mọi thành viên vắng đều qua.
- CUA native Worker R1/R2: hai HS giả hoàn tất luồng đăng ký cần hỗ trợ → mời → bạn tự đồng ý → chỉ tutor thấy gợi ý; Jeopardy chọn ô20, trả lời, nhận20, ô thành “Đã làm”; GV chỉ thấy tổng hợp. Ảnh `r1-tutor-consent-cua.jpg`, `r2-jeopardy-cua.jpg` trong `tasks/qa-takeover`. Phiên này kiểm bản build trước R5; không gán ảnh đó cho cảnh SVG mới.
- QA thấy nội dung `hint-core-1` Dãy số P1 ghi luôn30/66 dù notAnswer=true. Đã sửa thành dẫn dắt cách thay n, cập nhật contentHash/catalogue; RED xác minh qua projection tutor thật, GREEN18/18. Không thay package đã lưu/đã duyệt hoặc phiên đang chạy; bài dựng mới nhận bản nháp an toàn hơn. Bỏ hardcoded byte snapshot test P2 vì đang sửa P1 có chủ đích; vẫn kiểm không thay P1 trong phép kiểm P2.
- Runtime actual workerd/D1/R2 mới chạy lại **219 HTTP/5 giai đoạn PASS**, không gọi ngoài, integrity/FK tốt (`tasks/codex-r1-runtime.json`). Không phải tải150.
- Migration rehearsal cuối **PASS**: `tasks/codex-r1-migration-2026-10-12T06-05-02-219Z.json`. 0017–0020 bảo toàn dữ liệu/rollback/schema; defaults/CAS A10; Worker c370 chạy vòng đời bài học và đề. Một lần harness cố DELETE package immutable đã FAIL, giữ raw artifact 04-08; sửa harness giữ package/owner giả trong persistence dùng riêng, không bỏ trigger. Backup gốc không đổi, production không chạm.
- **HOLD sức chứa**: `tasks/codex-r1-load.json` là ước lượng state, không phải tải HTTP mới. Baseline150 cuối tiết1,333,791bytes; thêm Jeopardy và150 lịch sử trợ giảng1,442,652bytes;450 lịch sử1,532,652bytes;900 lịch sử1,667,652bytes vượt cap1,572,864. Không nâng cap, không xóa lịch sử. Cần tách audit khỏi state hoặc chứng minh giới hạn khả đạt an toàn, rồi chạy HTTP150 trên ứng viên mới.
- Các agent phụ báo503 kèm429 quota/reset khoảng25phút; Codex tiếp quản kiểm trực tiếp. Gemini Flash canary200 và Pro review200 vẫn sống; không suy quota Claude từ lỗi ChatGPT.
- Còn trước phát hành toàn bộ: đóng sức chứa150, cơ chế riêng bấm chuông/đối kháng2người cùng máy theo mô tả, CUA cảnhR5/ba làn bản mới, AI nguồn→nháp→validator thật, GV duyệt học liệu/niên khóa và thiết bị thật. Tám gói tuần6 là bản nháp, chưa phải thư viện Toán10–12 hoàn chỉnh. Không phát hành R1–R5 bằng quyền hotfixGemini.

#### CUA ứng viên R5 mới — 12/10/2026

- Build mới Worker `ebbe673ebf822fecd4aba1233ff47f1b3336d94f284b6bd476643ae7fc326ef1`, tree `5f2abf2d81d33ce16bdf9f206d7d1934ce4eb04196de1b4e26ba96c9b6a144a2` (browser fixture). Build cuối đã cập nhật catalogue hash; không đổi code sau gate1118.
- CUA cá nhân: GV chọn luật Chiến dịch với Cá nhân; menu bản đồ hiện ba làn. HS bấm làn hỗ trợ, server ghi nhận và UI aria-pressed=true; làn mở rộng disabled khi chưa đủ recheck. Chuyển 3D giữ làn đã chọn. Linh vật3D nhìn gần còn rất lớn; chưa chứng nhận thẩm mỹ/thiết bị thật.
- CUA R5: GV mở Lướt sóng, HS trả lời nhiệm vụ đầu đúng, server10điểm/20m/combo×1; SVG/figcaption khớp trạng thái. Đã quan sát ảnh desktop và375px, scrollWidth360≤375; nút3làn ở375px cao45.33px. Ảnh `r5-surf-native.jpg`, `r5-surf-native-375.jpg`, `r4-native-lanes-375.jpg` trong `tasks/qa-takeover`. Chỉ kiểm sceneSurf và menu/lane3D trực tiếp, không tuyên bố mọi11cảnh/mọi12thếgiới hoàn tấtCUA.
- Ban đầu viewport áp vào tab17 đang selected, tab16 vẫn1280; phép kiểm đó không dùng làm bằng chứng375. Đã sửa thao tác sang đúngtab17 và xác minh innerWidth375; reset viewport khi xong.
- Full test lần đầu1116/1118FAIL sau sửaP1 (catalogue hash cũ +snapshot bytes cố định). Đã cập nhật catalogue binding, giữ phép bất biến P1 trong testP2; chạy lại1118/1118PASS. Không ghi xanh lần lỗi.
- Cleanup QA: khép owned localhost fixture/tab sau lưu evidence, giữ tab Site của owner; không đụng khóa hoặc production data. Tải150 vẫnHOLD; còn các gate khác như trên.

#### Checklist tiếp tục R6 — 12/10/2026

Chủ hệ thống yêu cầu tiếp tục, cập nhật trực tiếp checklist này. Giữ quyền phát hành riêng: chưa phát hành R1–R6.

- [x] R6.1 Sức chứa: nén không mất dữ liệu các phần mới `tutors`, `classEvent`, `lessonMode` bằng stdlib `node:zlib`; giải mã trước reducer/projection. Không nâng cap, không cắt lịch sử, không đổi schema. Kiểm round-trip mọi trường, dữ liệu cũ, dữ liệu hỏng fail-closed, mutation không chia sẻ tham chiếu; nativecodec+rollbackreviewPASS và tảiHTTP150PASS trong phạm vi fixture đã ghi.
- [x] R6.2 Bấm chuông thật: học sinh bấm trước trả lời; claim riêng cho câu hiện tại, hết hạn30giây theo đồng hồ logic; chỉ trả lời đúng mới có điểm. Replay/CAS/pause/expiry/absence an toàn; legacy giữ luật cũ, TV chỉ tổng hợp. Giữ thước đo thời gian từ lúc sự kiện bắt đầu. CUA bấm/hết hạn/trả lời đúng PASS.
- [x] R6.3 Đối kháng hai người cùng máy: hai vùng điều khiển với actor được cấp quyền; không đưa bài riêng/đáp án của người ngoài vào máy. CUA đúng10/sai0 trên hai ô độc lập, ID/nameradio riêng;375pxPASS. Không chứng nhận thiết bị vật lý.
- [x] R6.4 Tải HTTP150 trên Worker mới, gồm900audit,600receipt,150nộp thêm; stress150HINT/150ASSESS/150GET qua. Ghi rõ fixture sinh bằng reducer,HTTP chỉkiểm lưu/đọc/thao tác hiện tại;cap và headroom có giới hạn, không phảiN vô hạn. Buildcuối sửaUIđang lặp lại exacthash307HTTP, evidencebackendtrước giữ nguyên.
- [x] R6.5 Full test1138/typecheck/lint/build0,161tệpmanifest,storage/eventreview độc lậpPASS;CUAbuzzer/duel375/desktop vàGVtổnghợp. TVprojectionprivacy cótest; thiếtbịTV vật lý chưa nghiệm thu. Native219HTTP vàtải307+453HTTP đúngbuilde403e74PASS.
- [ ] R6.6 AI thật nguồn→nháp→validator đã chạy; AI trảnháp bịchặn2lỗinguồnsốliệu. Còn sửa/đốisoát bảnnháp đạt, testmultiR3 trên bảnpháthành sau, chủhệthống/GVduyệthọcliệu,niênkhóa,thiếtbị thật. Khôngtựduyệthay gọi toànplanDONE.

Phân công: Codex codec/service/tích hợp; workerTutor bấm chuông/runtime/UI; workerRuntime tải150 chỉ scriptQA. Một writer mỗi file. Router/models hiện có GeminiFlash/Pro và GPT6.1Sol; trạng thái quota dựa canary từng lượt, chưa suy từ model list.

Tiến độ R6, cập nhật theo bằng chứng:

- [x] R6.1a Tái hiện khả đạt: reducer6310lệnh tạo900lượt trợ giảng theo luật,1500bài nộp,600receiptJeopardy,150lượt thưởng. Rawstate2,082,448bytes vượt cap; chỉ gọntutor vẫn1,887,552bytes nên loại phương án bảng khóa/giá trị. Artifact `tasks/codex-r6-load.json` vẫn là ước lượng, chưaHTTP.
- [x] R6.1b Native `node:zlib` có thật trên workerd: roundTrip và maxOutputLength đều qua (`tasks/codex-r6-zlib-worker.json`). Đã thay codec bảng bằng stdlib; ba phần mới nén riêng, passport/submissions/wallet/identity vẫn JSON cũ. Fixture mới1,451,112bytes, dư121,752bytes; khôi phục exactJSON. Chưa chứng nhận requests tiếp theo.
- [x] R6.1c Test local nativecodec/service37/37: fullaudit/revoke/null/unknownfields/alias/base64/zipbomb/1MiBboundary/durableCAS/corruptfailclosed. Reviewer độc lập bắt lỗi biên1MiB của codec bảng cũ; đã sửa RED/GREEN, rawreview giữ nguyên. Review codec mới đang chạy; PASS codec cũ không thay PASS codec mới.
- [x] R6.2a Bấm chuông code/test37scopedPASS, TTL30giây logic, no pointsforpress, legacydirectanswer. Test transport server tái hiện số giây bị đứng ở GET/replay của HS/TV: đã truyền wallnow vào projection sự kiện, vẫn trừ pause, testGREEN. Không đổi đồng hồ logic thành wallclock trực tiếp.
- [x] R6.3a Hai vùng đối kháng, cặp do trustedactor lấy từ DB máyB đúng2em; loại toàn bộ cặp chồng danh tính và issuer/member đã thu hồi. Payload client vẫn không được gửi pairIDs; domain/UI41scopedPASS, device13/13PASS. Một máy nhiều hơn2em tiếp tục luồng chọn actor thông thường; không giả cặp.
- [ ] R6.4 HTTP150 `--reuse-fixture` chờ build mới rồi chạy: xác minh bytes sau150requests, đầy đủ900audit/600receipts, teacherrevoke và cumulativeownprivacy.
- [ ] R6.5 Gate toàn bộ đang chạy trên159tệp ứng viên cô lập. Sau đó CUA bấm chuông/đối kháng, reviewR6 cuối.

Tiến độ kiểm tra tải R6:

- [x] R6.4a Worker thực nén/giải nén seed150em+900audit+600receipt; lần đầu nộp thêm113/150rồiSTATE_TOO_LARGE. Giữ rawHOLD `tasks/codex-r6-load-first-http-hold.json`; không đổi tiêu chí để làm xanh.
- [x] R6.1d Root fix bổ sung: bỏ6trường lặp trong `openAssessments` **đã chấm** khi khớp canonicalsubmission; giữ feedback/criteria/nonMastery/unknownaudit. Pending giữ đủ mọi trường cho rollbackUI. Đọc lại khôi phục từ canonical. TestSQLiteRED/GREEN38/38; reviewer kiểm c370ASSESS sửađúng→sai→đúng, hoàn/khôi phục thưởng, pendinganswer nguyênvẹn. Nativecodec+service review Gemini200/stop findings[]: `tasks/codex-r6-native-storage-review-2026-10-12T07-37-41-276Z.json`.
- [x] R6.4b Chạy lại cùng tiêu chí:307HTTP/0lỗi,150nộp thêm+150đọc riêng+thu hồi sao+passportcộngdồn PASS. State1,516,229bytes/dư56,635bytes(3.6%),1650submissions,900audit,600Jeopardyreceipts nguyênvẹn. p95=4103ms/concurrency5. Workerhash8fe65361b3546d770a489c73eac5f84977658852665dc8fb326f6c4ae3b8cfb3. `tasks/codex-r6-load.json`. 6310lệnh sinh900audit là reducer, không gọiHTTP; không tuyên bố150joinmới.
- [x] R6.4c Kiểm thêm150HINT/150ASSESS:453HTTPPASS,peak1,528,675bytes,final1,487,429bytes; evidence riêng, không ghi đè307PASS.
- [x] R6.2b CUA bấm chuông máyB: chưabấm không hiện câu riêng; bấm0điểm;30giâyhết câuẩn/lượt mở lại; bấm lại/trả lời đúng mới10điểm. Teacherchỉthấy tổng hợp, thướcđo từđầusựkiện giữ nguyên. Ảnh `tasks/qa-takeover/r6-buzzer-native.jpg`.
- [x] R6.3b CUA hai vùng đối kháng +375px PASS, dùng fixture riêng vì ngân sách3phút đã dùng cho bấmchuông. Không bỏ guardreserve chỉ để mở thêm sự kiện.
- [x] ReviewR6eventrecheckPASS (findings đãrút bằng source/contract); fullreviewINCONCLUSIVE vàboundedBLOCKED cũ giữ raw, không ghi đè.

Kết quả R6 cuối đang chốt:

- [x] R6.4c HINT150+ASSESS150+GET150 bổ sung:453HTTP/0lỗi. Peak1,528,675bytes/dư44,189; cuối1,487,429/dư85,435. Pending150→0, giữassisted=true khi dùnghint,1650sub/900audit/600receipt nguyênvẹn. Artifact `tasks/codex-r6-load-assess.json`, không ghi đè307PASS. Không suy “N không giới hạn” từ150; payloads/queue/futurelargerclass vẫn có cap.
- [x] ReviewR6eventrecheck: Gemini200/stop trảPASS, rút cả3claim bằng contract/test đầy đủ hơn; metric EVENT_START đã duyệt, wrong giữ10s, classEventPausedAt chỉdừng đồnghồbài chính nên không khóa event. `tasks/codex-r6-event-review-recheck.json`; rawblocked/inconclusive giữ nguyên.
- [x] R6.3c CUA bắt lỗi trùngID/radioname khi2em cùngtask; sửa `React.useId` tạiTaskInput controls, business task.id giữ nguyên. RealSSRtestRED/GREEN numeric/open/radio/label;IME mocks bổsunguseId,11focusedPASS. CUA nhập20và99 ở2ô: ID `_r_2_`/`_r_3_`, đúng10/sai0;375pxscrollWidth360, controls44px. Ảnh `r6-duel-native.jpg`, `r6-duel-native-375.jpg`.
- [x] Fullgate saufixaccessibility:1138/1138,typecheck0,lint0errors393warnings,build0;161scopedfilesbyte-match `tasks/codex-r1-r6-source-manifest.json`. Build cuốie403e74b37fa1f91604a4991a832ffb0e6346428d1afad2f67beb0ffcb5be258; HTTP150 đangchạylại đúnghash sau thay đổiUI, evidencehashtrước giữ nguyên, không gọi làexactfinalhashPASSkhi chưa xong.
- [ ] R6.6a AI thật: đã nhập nguồnToán tựsoạn1210bytes, chỉnội dungbài, noHSdata. SourceID4cf5c49d-ba9e-45b6-8afc-cac2fa01a37c/hashf49b2388710d2494f8fb06477ea0c1581642dc7b70634099f06444a5077f1bf3. Đề xuất40phútneeds_review, ownerUIconsent tớiGooglegenerativelanguage.googleapis.com; đãbấmTạobảnnhápbằngAI, đangchờkết quả. Khôngđọc/đổikey, khôngmởlớp/duyệthọc liệu/pháthànhcode. Nativeproductionversion6 chỉkiểmgenerationcơbản, khôngchứngnhậnmultiR3 chưa deploy.

#### R6 checkpoint hoàn tất kỹ thuật — 12/10/2026

- [x] R6.1–R6.5 trong phạm vi kỹ thuật trên:1138/1138test,typecheck/lint/build0,161scopedfilesmanifest;393lintwarningscũ. NativestorageGeminiPASS, eventGeminirecheckPASS, độclậpReactuseIdreviewPASS. Khôngthayappcode saubuilde403e74b37fa1f91604a4991a832ffb0e6346428d1afad2f67beb0ffcb5be258.
- [x] Exactfinalhash307HTTPPASS `tasks/codex-r6-load-final-e403e74.json`;453stressPASS `tasks/codex-r6-load-assess-final-e403e74-retry.json`. Final1,487,425bytes/dư85,439;peak1,528,675/dư44,189. FirstfinalstressUND_ERR/socketHOLDgiữraw, freshcopyretry0error/0transportretry; khôngđổiphépkiểm, khôngđổiHTTPfailurethành200.
- [x] R6.6a Kết nối/provider/consent/result/validator đã chứngminh bằngGemini thậtversion6. Nháp40phút,2LO1/LO2tựđặt,5activities,10tasks,sourcekept. Validatorbáo2ERR_SOURCE_NUMERIC_MISMATCH vì2taskgắnsourcecósốliệukhôngtrongquote; khôngtựphêduyệt/cholưu bản sai. Đãmởnháp trongbiểumẫu, khôngbấmLưuhayDuyệt. Snapshotredacted `tasks/codex-r6-ai-live-ui.txt`,ảnh `tasks/qa-takeover/r6-gemini-real-validator.jpg`. Sourceproductionriêng chỉnộidungToán,khôngHSdata/key;nativeversion6/codekhôngđổi.
- [ ] R6.6b HọcliệuAIđạt cònHOLD: cầnđốisoát2taskcitation/origin,kiểm đápán/rubric/phân hóa/timebox vànguồnniênkhóa. Khôngvôhiệuvalidator hoặc tựgánnguồn để làmxanh. TámWeek6drafts và80câu khôngphảifullToán10–12.
- [ ] Owner nghiệmthu điệnthoại/iPad/TV/lớpthật theo19.1bMRT; GUI375 chỉmôphỏng viewport, khôngthaythiếtbịthật. Linhvật3D gầncamera cònlớn, khôngclaimthẩm mỹPASS.
- [ ] PháthànhR1–R6: chưađượcduyệtriêng. HotfixGemini đã phát hànhversion6; quyềnhotfix khôngmởrộngtựđộng. V7/cácroom/dữliệuHSproductionkhôngđộng. Sauduyệt cầnnativebackup/sourcearchive/migration/deploy/postdeployđúngSite riêng; khôngbỏgate.
- [ ] TiếptụcClaude: đọccheckpointnày+`tasks/codex-r6-report.md`; bảo toànWIP;TaskInput controlIDsuseId cònbusiness task.id;storagecorependingreadablevớiWorker c370,3extrasoldUIkhônghiệnnhưngdữliệuvẫngiữ.

#### Checklist R7 — màn hình vào và luật theo phòng (chủ hệ thống bổ sung12/10)

- [x] R7.1 Sửa trang vào: bỏ nhãn30phút cố định và lời “theo nhóm chung một máy” áp cho mọi phòng; phân biệt phòng game, tiết học có hồ sơ/mãPIN, thiết bị nhóm. Giữ đường vào cũ dùng được, không thay auth bằng tên.
- [x] R7.2 Sau mãphòng hợp lệ, trước vào map: hiện thếgiới/bối cảnh, luật hiện hành, chế độ/thiết bị và thời lượng có nguồn từ server; tóm tắt việc cần làm, hoàn thành, điểm/phạt/hỗ trợ đúng luật. Chưa có phòng không đoán luật từ map.
- [x] R7.3 Trong map: thẻ/toolbar “Luật của phòng này”, nút xem lại; nếu GV đổi luật/chế độ, nội dung cập nhật từ projection mới. Sự kiện tạm thời ghi riêng, không thay luật nền.
- [x] R7.4 Hướng dẫn cả9luật có sẵn, rõ khác biệt cá nhân/cặp/tổ và hộ chiếu bằng chứng cá nhân. TV chỉ tổng hợp, không lộ PIN/keys/peerwork.
- [x] R7.5 Regression cấu hình/timing/XSS, loại pending vsactive staleview, build/test/typecheck/lint,reviewchéo,CUA375/desktop đúngnguồn. Khôngcoi code cục bộ đã sửa là Sitepublic đã sửa.
- [ ] R7.6 Tiếp tục việc đã đồng ý: rà soát2lỗicitation nhápGemini và8họcliệuWeek6, khôngbỏvalidator/khôngtựduyệtnguồnsai. Pháthànhvẫnchờduyệtbảncụthể.

Thiết kế: thếgiới không đồng nghĩa một luật cố định; luật/chếđộ thuộcphòng. Trangđầu giải thích chung; briefing và map đọc cấu hìnhcanonical. Câu chữ dùng choHS, không đưa chi tiếtimplementation vào luồng. Mỗi bước hoàn tất ghi evidence tại đây.

R7 tiến độ kiểm theo mục:

- [x] R7.1code: bỏ30phút cố định ởlanding; rõ đường tiết học/PIN, máy nhóm và hộchiếu. room-info phân loạiphònglesson, chỉmãkhôngcầntên chuyển/play?code; legacyjoin từchối lessonkhôngxác thực bằngtên. RegressionAPI/ngườiẩn danhPASS, khôngđụngkey/dữliệuHS.
- [x] R7.2code: phònggame canonicaltheme/rule/participation/duration từserver;9tóm tắt luật, cáchlàm/mụctiêu/ranking;durationđúngconstantsduel375s,zones300s,survival180s. Khôngsuy luật từmap. Briefingghi Cá nhân/Cặp/Đội tươngứng, khôngép4vai cho2em; tránh lặp2thẻluật.
- [x] R7.3–4code: lessonSessionRules luônhiệntrênmap ngoài taskdialog;summary44pxxemlại, modeparticipationcanonical hiện hành, eventtạmthờiriêng. Publicrulesdialog cậpnhậtkhi canonicalstate thay đổi;landingnew bỏ pendingold, teacherkhôngđọc luậttiming phiênHS.4regressionstate+routing/roomrulesPASS.
- [x] IndependentGeminiR7PASS13sourcehashes tại `tasks/codex-r7-review-recheck-2026-10-12T09-13-18-384Z.json`; sửa3lỗinameprecheck/stalepending/teacherstudentduration từrepro,khôngđổi rawblockedcũ. Điều chỉnhbriefingbỏduplicate/cặp vàduration phútgiây saureview cần verifyUI/source mới.
- [x] R7mathF01/F02/F04 sửa4draft34/35/36/38: cotđiềukiệntừngbài, phânbiệtchu kỳhàmvới bước tậpnghiệmhợp, rubricđúngbài+CâuCould được hỏi, P38nêu giảđịnh+3. F05sửa6precheckrubric36/41 theođúngcâu;59focusedPASS/8validatorhashsourceobjectivesPASS,80quotesgốcgiữ nguyên,bankTS+DOCX khôngđổi. `tasks/codex-r7-math-fix-review.md/.json`.
- [ ] R7mathF03 thời lượng150HS/câu mở: vẫnHOLD nghiệmthuGV; khôngtựchấm lời giải hoặc mởextensiontừpending. Nội dungdraftoptional thêmcâu khôngchứngminh giải kịp2phút. Nămhọc/mãchuẩngiữteacher_review_required.
- [ ] FullgateR7 ứngviênsauphiênchỉnhcuối +CUA375/desktop trangvào→briefing→map đangchạy. Gate1153trướcF05/finalbriefing là lịch sử; khôngchốtcurrent bằng số đó.
- [ ] Gemini nhápproduction2lỗicitation vẫngiữneeds_review; đãđọcđượcdraft nhưngresultJSONtoolbịtruncated,khôngtựđổiorigin/citationkhôngđủbằngchứng. R7khôngpháthànhcode,dữliệuclass thật/V7khôngđộng.


R7 checkpoint tiếp nối — kiểm giao diện cuối:
- [x] CUA trang vào và briefing relay/duel: đúng luật/chế độ/cặp2người, một thẻ luật, duel375s=6phút15giây; tên không cần khi tìm tiết học. 375px tìm tràn mascot396px, CSS2cột sửa còn360≤375. Ảnh `tasks/qa-takeover/r7-landing-375.jpg`, `r7-duel-rules-375.jpg`; fixture localhost dữ liệu giả, không gọiAI.
- [x] ReviewGemini cuối briefing/duration/CSS PASS `tasks/codex-r7-review-final-css-2026-10-12T09-31-40-848Z.json`, hash5tệp khớp. Review này chưa bao gồm sửa regex mới bên dưới.
- [x] CUA bắt thêm mã tiết họcA0F894 bị room-info từ chối: producer tạohex có0/1, regex cũ chỉ2–9. Test nativeSQLite đổi thànhA0F891 RED; regex6ký tựA–Z0–9 GREEN13/13. Không đổi producer/auth/schema, tên không được xác thực tiết học.
- [ ] Sau hai sửa cuốiCSS/regex: fulltest/typecheck/lint/build mới đang chạy; freshWorkerCUA code-onlyredirect/map overlay còn chờ. Không dùng1154PASS trướcregex làm gate cuối.

R7 nghiệm thu kỹ thuật cuối — 12/10/2026:
- [x] Gate sau CSS/regex:1154/1154test, typecheck/lint/build exit0;394warnings, trong đó diceTrack ởPlay làwarning hiện có (không ghi toàn bộ là cũ). `tasks/codex-r7-final-{tests,typecheck,lint,build}.log`; diffcheck0;172tệp byte-match `tasks/codex-r7-source-manifest.json`.
- [x] Gemini finalcopy/CSS PASS5hashes; alphabetPASS2hashes (`codex-r7-review-code-alphabet-2026-10-12T09-34-10-654Z.json`). RED/GREEN nativeSQLite nhận lessoncode0/1, legacyjoinbằngtên vẫn400/0teams.
- [x] CUA finalWorker62b3ed5d: mã69681B khôngtên chuyển/play?code=69681B, prefillđúng, auth/PIN vẫn bắt buộc. Thẻmap375/desktop nhìn thấy, mở/đóng44px,scroll360≤375. Shared trướcactor chờconfig, chọnactor lấycanon; GV quaUI đổicampaign/group→merchant/individual, sharedpoll cậpnhậtnhãn vànội dung3hợpđồng khôngreload/sameworld. `tasks/codex-r7-browser-evidence.json`, ảnh `r7-map-rules-375.jpg`, `r7-map-rules-desktop.jpg`, `r7-shared-rule-changed.jpg`.
- [ ] R7.6 chưafullDONE:5Week6draft đã sửa lỗiToán/rubric; cả8vẫndraft/teacher_review_required;F03timebox/chấm150HS và2citationGemini vẫncầnđốisoát. Khôngđánhxanhbằngvalidatorbypass.
- [ ] R1–R7 chưapháthành. Productionversion6 vẫnchỉhotfixGemini;quyềnhotfix khônggộprelease. Owner/GV nguồn/niênkhóa/họcliệu,thiếtbị/lớpthật,3Dthẩm mỹ vẫnHOLD. Claude tiếp tục từcheckpointnày và `tasks/codex-r7-report.md`; giữWIP/V7/khóa/dữliệu thật.
- [x] R7 finalnative219HTTP/5stagesPASS0external exactentry62b3ed5d/treeab0b9f92; `tasks/codex-r7-native-runtime.json`. GiữR6runtime ở `tasks/codex-r6-runtime-preserved.json`;khônggộpHTTP150hashR6thànhR7. Report `tasks/codex-r7-report.md`.

#### Checklist R8 — tiếp tục theo yêu cầu chủ hệ thống
- [x] R8.1 Khôi phục nhápAI đãlưu sauđóngtab theoowner+nguồn+snapshothash;chỉđọc,khôngrun/regenerate/autoapprove. Productionjobcũ hiệnHOLDfullcandidate doDBtooltruncated/API directbrowserblocked;khôngsuy2citationtừpartial.
- [x] R8.2 Tái hiện/đốisoát numericcitationrepair bịpreservesDraft khóa toàncitation;chỉsửa nếuchứngminh,khôngđổioriginmù/nguồn/đápán/hint ngoàiissue.
- [x] R8.3 F03audit sĩsố150/timebox:taskIDs/Must/Should/Could/tải chấm;phươngánGVđánhgiá cụthể,khôngchứngnhận40phút bằngtestload.
- [x] R8.4 Gatefocused/fulltest/typecheck/lint/build/reviewkhác hãng; cậpnhậthandoff/report. Broadrelease/HVhọcliệu/thiếtbị vẫnchờ.
Thiết kếR8.1 sửa lỗi tồn tại: APIowner-scoped hiệncó GETjob;thêmđọc latestsource khi khôngcòn sessionStorageid,lọcexactsnapshot; reuseeffectcancel/raceguard. Không thêm lịch sửUI/DBschema/dependency hay gọiAI mới.

R8 tiến độ —12/10/2026:
- [x] R8.1code: serverlatest chỉneeds_review/owner/source/SHA/parser/extractionhash;khôngwrites/provider. UI mấtcache/malformedstorage fallbacklatest, khôngoverwritenewrunningdraft/cancelled/stalesnapshot; botão mởnhápngoàiproposepanel. 20jobs/3ASTUI/8route/1nativeD1R2PASS trong44focused. CUA phiênmới tải QA nguồn→nútMởbảnnhápAIđãlưu→formneeds_review,khôngsaveapprove. Fixturelocal seedfullsyntheticdraft,khôngphảihistoricalGemini/fullproviderclaim.
- [x] R8.2code: reproquoteonlybroaden nguồnđúng bịpreservesDraft từchối; chỉ cho taskERR_SOURCE_NUMERIC_MISMATCH mởrộngquote nguyênvăn cùngentity/segment/origin=source. Validatorvẫnchặnquote bịa/sốthiếu; khôngrelabelling. Chặnthêmhint/citation/entities qua countguard;12regressionPASS. ReviewGemini initiallyBLOCKEDrace/count/types đãreprofix; rawcũgiữ. Falseeditorreferencefindingbácbằngdeepclone thực.
- [x] R8.3audit:7gói900manualmastery/tiết150HS;P39=600,tuần8gói=6900. Mỗi8phútgate150manual tối đa3.2s/bài nếuGVkhôngđiềuhành;khôngkhảđịnhbằngload. `tasks/codex-r8-timebox-audit.md/json` cótaskIDs/phươngánAfullscope600/BMustscope300hoặc0closed/phầncầnGVduyệt. Chưađổi8họcliệu. Câu hỏi phạmviMust hayfullscope đãgửiowner; khôngcoipending làduyệt.
- [ ] R8.4fullgatecuối:1171/1171PASS;typecheck/lint0 saubổsunginterfaceparser/path,394warnings;175manifestbyte-match. BuildtrướcPASS, finaltype-onlybuildđangchạy. Gemini fullfunctional +type-recheckPASS `tasks/codex-r8-review-type-recheck-2026-10-12T10-52-36-769Z.json`. CUA local screenshot `tasks/qa-takeover/r8-restore-draft.jpg`.
- [ ] NhápGeminiproductione605… vẫnHOLDfullcandidate;ownerstoredsource1210bytes/hashkhớp, jobneeds_review2numericerrors. DBreadtruncated1687chars;directAPIbrowserblockedclient. Khôngsửa2câukhôngđủbằngchứng;R8restorechưadeploy. KhôngđổiV7/key/HSdata,khôngtựgọilạiAI.
- [x] R8fullgate1171/typecheck/lint/finalbuild0; [ ] CUAfinalhash cầnlặplại:buildtype-onlyđổientry8162→33c9 nênkhônggộp ảnhhashcũ vàoWorkerfinal. Native219đangchạy,finalbrowserfixtuređangkhởilạisauhashmismatchassert,rawfailuregiữ.
- [x] R8.4final1171PASS/typecheck/lint/build0;175sourcebyte-match;exactfinalentry33c9b281/treebe2e2529:219HTTPPASS+nativeownerlatest200/foreign404,CUAkhôiphục→formPASS0external. `tasks/codex-r8-native-runtime.json`, `codex-r8-browser-final-evidence.json`, `qa-takeover/r8-restore-draft-final.jpg`. Hashcũ8162CUAgiữriêng;finalhashassertPASS sau sửa tênfieldharnessbuild→worker.

#### Checklist R9 — chủ hệ thống chọn thêm bảnMust-only
- [x] Ownerchọn“soạnthêmbảnchỉmụctiêuMust;Should/Coulddànhtiếtsau”. Đâyduyệtphạmvisoạnnháp,khôngthayGVduyệthọcliệu hayduyệtpháthành.
- [x] R9.1 Támnhápmới34–41;exactMustsourceobjective/quotes/hashes,giữ8bảnđủcũ. KhônglấyloạibỏobjectiveIds mixedtask làmsoạnscope.
- [x] R9.2 Hai câu recheck/exit cá nhân mới,2evidence/Must;finitecheckerschỉđộngtừphùhợp,chứngminh/viết/hàmtựdo giữmanual. LànHỗtrợ/Chuẩn/Mởrộng cùngMust, khôngmasteryShould/Could.
- [x] R9.3 Bản40phútbudgetcụthể/optionalngắn/dựphòngchuyển riêng;học liệudraft/source/yearteacher_review_required. F03timeboxchấmmở vẫnHOLD,chưađoGVthật.
- [x] R9.4 TíchhợpThưviệnbảnMust-onlynhãnriêng;schema/hash/mathtest/reviewkhác hãng;fullgate/CUA/manifest/nativefinal;report/HANDOFF/checklist cậpnhật.
PhâncôngR9:mathSource38/39;contentworker34–37;regressionworker40/41;rootintegration+review. Tácvụnhápởtasks/review-drafts trước khiđưacontent,khôngwriterchungfile/khôngthaynguồnTS/DOCX.

R9 tiến độ:
- [x] R9.1–2code:8nhápMust-onlymới34–41,16bảnThưviệngồm8đủcũ+8TrọngtâmMust;exactMustobjective/sourceRefs/quotes. 8gốchashkhớpauditR8;TS/DOCXnguồn khôngđổi. MỗiMust2evidence recheck/exitmới;35/38/39/40/41finitechecker,34/36/37manual;pending/assisted/reveal khôngmởphó bản/mastery.
- [x] R9.3draftbudget:40=34core+2optional+2transition+2reserve;3làncùngMust. P39formatnhậndiện/hoànthiệnđịnhnghĩa kếthừapilot,khôngproofclaim;GVvẫnduyệtformat. Manual300/150HS/tiết3gói,closedMust0ở5gói;khôngchứngminhGVchấmkịp40phút. Should/Couldở8bảnđủ/tiếtsau,khôngtựghiđạt.
- [x] Gemini8mathdraftsPASS0findings `tasks/codex-r9-must-gemini-2026-10-12T11-14-56-155Z.json`;8hashescurrentsmatch. Auteurselfcheckmath/validator/hash/source/reducergatePASS scripts34–37/38–39/40–41 saved; khôngdùngselfreviewthayGemini.
- [ ] R9.4final:1172PASS/typecheck/lint/build0,394warnings,183sourcebyte-match;CUA chọnP38hiệnđúng1Must/sourceGVreview/launchdisabled. TìmUIbudgetkhônghiệntransition2; đãsửacopy,buildearlydfb76khôngdùngfinalclaim. Finalbuild/reviewcatalogue+budget/CUA/nativeđangchạy.
- [x] R9.4final:1172/1172/typecheck/lint/build0,394warnings;183sourcebyte-match;GeminiMath8PASS+catalogue/budgetPASS `tasks/codex-r9-catalogue-gemini-2026-10-12T11-20-31-541Z.json`. CUAfinal chọnP38/P34 Must-only,1LO/sourcepending/launchdisabled/time34+2+2+2/375scroll360PASS;native219HTTP5stagesPASS0external exactentrykhớp `tasks/codex-r9-browser-final-evidence.json` và `codex-r9-native-runtime.json`. Earlydfb76ảnh khôngdùngfinalclaim. Report/HANDOFF đangchốt;nhápGeminiproduction2citation/ownerGV/thiếtbị/3D/release vẫnHOLD.
- [x] R9report/HANDOFF/todođã cậpnhật `tasks/codex-r9-report.md`;ownerđãduyệtphạmviMust,chưaduệthọcliệu/pháthànhR1–R9. ChecklistpendingcuốiR8/9chỉnêuviệcthậtcònthiếu,khôngfullplanDONE.

#### Phát hành R1–R9 — chủ hệ thống duyệt12/10
- [x] Owner“phát hành đi”chođúngR1–R9;sitemetadata verified public/owner/version6,khôngđổiaccess/V7/khóa.
- [x] Migration0017–0020backupcopy/rollbackoldWorkerfreshPASS `tasks/codex-r1-migration-2026-10-12T11-31-00-547Z.json`;migrationcũ0000–0016nộidungkhôngđổi(chỉCRLF/LF). Snapshotpre-release23non-keytables:accounts1,source2,job1;jobcelltruncated vàsystem_settingsomitted nênkhôngclaimfullDBbackup. Nativeversion6savedarchive vẫnrollbacksource.
- [x] Releasecheckout riêngofficialsite-workflow từversion6commit5a3fd;666source/183scopedbyte-match c3b1250dworker. Pushedcommitc8064b42400f7b5f96b73774b9a3c0bcec1bfc5d. Officialpackagerlần1WindowsC:tarFAIL, retryTAR_OPTIONS=--force-localPASS;622entries/36,739,738bytes/workerexact/sourceprojectcorrect/noenvkeysDB runtime. `tasks/codex-r1-r9-release-archive.json`.
- [x] ExactfinalWorkerHTTP150reusefixture307HTTPPASS,900history/600receipt/1650sub giữ;state1,516,229bytes/headroom56,635. `tasks/codex-r6-load-r1-r9-release.json`. Khôngcoiseed6310reducercommands làHTTP900/150joinmới. Stress150HINT/150ASSESS/150readđangchạy.
- [ ] NativeSavedversion/deployment/postdeploylanding/rules/16drafts/AIrestore/source/dataretention;chỉchốtpublishedkhinativesucceeded. Fullhumanclass/device/3D/source/year/mathapprovalkhônggộpvàocodepublication.
- [x] Stressfinalexactc3b1250d453HTTPPASS:150HINT/150ASSESS/150read +privateclasspassport;900audit/600receipt/1650sub giữnguyên;0errors/0external. `tasks/codex-r6-load-assess-r1-r9-release.json`. Savednativeversion7 `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_a1cf6e3bf0b081918c4c3dee74ae5ae5` commitc8064b4;đangnativepublish,khôngđổiaccess/key/V7.
- [x] R1–R9 nativepublishedversion7 SUCCEEDED18:47:10VN:deploymentappgdep_6accc8a40fec8191bd73d83f5d1c447f/commitc8064b4/sourceprojectriêng. KhôngSiteV7/accesskeyenvironmentđổi. `tasks/codex-r1-r9-release-evidence.json`,reportcùngprefix.
- [x] PostdeployCUA landingnew/no30fixed/generalrules;16lessons/8Must1LO/40budget/sourcepending/launchdisabled. KhôiphụcGeminioldjob vàoform/sourcehashkept/noAIcall/saveapprove;2numericerrors giờchỉđúng tasks[1]/[3], IDs task-1-2/task-3-1. Ảnhproductionlanding/ai-restore saved.
- [x] NativeDBschema34tables,non-secretrowretention(account/source/jobbounded)PASS,newclass/member/device/session/rooms0;recent10minWorkererror0. Fulljobcell/syssettingskhôngclaimbackupfull;khóakhôngđọc/đổi. RootWIP giữ,V7manifestgiữ.
- [ ] Còn2numericcitationfullquote/origin đốisoát,AIvaliddraft/multi-sourceQA,họcliệuGV/source/year/format/150timebox,physicaldevices/classroom/3Dvisual. KhônggọifullplanDONE. Claudeđọcreportpháthành+checkboxcuối;nativereleaseđãxong khôngdeploylặp.

#### Nghiên cứu Khám phá và vai trò GV — 12/10/2026
- [x] Đọc ZIP V8.8 từ 00_START_HERE_CODEX.md, guide đầy đủ và companion; coi là tài liệu tham khảo, không chạy lệnh triển khai trong ZIP. Đối chiếu hai folder yêu cầu Toán/dự giờ, ảnh người dùng và source game đã phát hành.
- [x] Báo cáo `tasks/bao-cao-kham-pha-vai-tro-gv-v88-20261012.md`: Khám phá mở rộng khác hình thành kiến thức và khác thử thách; thẻ dọc đường, nội dung tiếp cận cho tất cả, may mắn chỉ ảnh hưởng mảnh/quà phụ. Có ví dụ xác suất minh họa riêng, không claim xác suất runtime.
- [x] Có kịch bản GV dẫn dắt 40 phút (34 lõi +2 tùy chọn +4 dự phòng), điểm dừng/chuẩn hóa/vở/recheck, mapping rubric3a–3e theo nguồn thật; phân biệt CIS idea với chuẩn, 1–4/N/A với nửa điểm nội bộ. Không tự chấm GV, không coi game points là mastery.
- [x] Audit hiện trạng: pause/gate/TV/làn đã có; chưa có album Khám phá, teacherAttention/màn chờ kín theo thiết kế. LOCK không dừng deadline; PAUSE không kéo dài giờ học thực. Đã tìm được mẫu Ban Toán ba cột, chưa có DOCX mới được render/nghiệm thu.
- [x] Chủ hệ thống yêu cầu “đưa thử vào game và test xem”; R10 pilot triển khai/QA local bên dưới. Không đồng nghĩa duyệt phát hành hoặc ba gate dạy thật.

#### Checklist R10 — chủ hệ thống yêu cầu đưa Khám phá vào game và thử
- [x] Ownerchoimplementation/QA bảnthử sau nghiêncứu;spec `tasks/codex-r10-exploration-plan.md` frozenpilotDãy số/3thẻ/quàthẩm mỹ/GVwindow120s/attentionpause. Khôngđượclấycodedone=teachready.
- [x] R10.1 Reducer/role/replay/CAS/ownprivacy/cumulativewindow2min/ROLLfound/3fragments/noacademicreward; domain và95nativeHTTP đạt, actualversion7rollback đạt.
- [x] R10.2 Mapmarker2D/3D+HUDsổtay/card/teacherwindow/attention/sharedactor/waitblank/draftpreservation/a11y375; CUA tiếp tục13/10PASS.
- [x] R10.3 Fullgate/source/reviewkhác hãng/load150combined/CUAteacherstudent/API503reconnect/reload/manifest/evidencePASSlocalpilot; khôngOSofflineclaim.
- [x] R10.4 Handoff/report/previewchủhệthốngxem hoàn tất;pháthànhmớichờduyệtbảncụthể. Version7production/V7/key/HSdata giữnguyên.

R10 cập nhật 13/10 (giờ VN):
- [x] Code pilot3thẻ/3marker/album/teacherwindow/attention đã tích hợp; khôngAI/schema/dependency mới, không điểm Toán.
- [x] 1191/1191tests/typecheck/lint/build0;394warnings;189source byte-match. Workerf4dc4dbf/treee55ab6e3. GeminiProrecheckPASS0findings/8sourcehashsame. Rawfinding và adjudication trong report.
- [x] ExactWorker95nativeHTTP trust/shared/claim/replay/expiry/TV/wait/rewardPASS0external. Reward3/3 từ syntheticfound-mask7 có nhãn; CUA1/3 từROLLkhôngseedfragment.
- [x] CUA mở giờ/đọc3thẻ/nhận1/3/ví0/markerđãnhận;pausefullnative/focus/Escape/draft23resumePASS. Viewport375x812/scroll360/nút44pxPASS; chưaclaimthẻmở375.
- [x] Load150combined307+453HTTP/max450fragments/900history/600receipts/1650subPASS. Peak1,541,241<cap1,572,864;headroom31,623;final1,499,991. Retention450/choices cả2pipelinePASS. Khôngcoi6310cachedreducer lànewHTTPjoin.
- [x] R10.2/R10.3 CUA phần còn lại đã PASS ở lượt tiếp tục13/10 bên dưới. Blocker tab30 trước đây đã hết; giữ báo cáo cũ làm lịch sử, không còn chờ owner đóng confirm.
- [x] R10.4 report/HANDOFF/checklist/todo đã cậpnhật `tasks/codex-r10-report.md`; ảnhattention/manifest/native/load/reviewretained.
- [x] Preview/CUA hoàn tất13/10; phát hànhR10 vẫn chờ ownerduyệt19.9 ở checkbox cuối. Local5201/5202fixtureconcluded;khôngdùngproduction/V7/key/HSthật. R1–R9 đãpublishedkhônglặpdeploy.


R10 tiếp tục13/10 —ownerchohủyconfirm:
- [x] Tab30đãđóng/noactivedialog;sổtayhoạtđộnglại. Blocker ởlogtrước đãhết;khôngsửaappcode.
- [x] CUAconcludedread-only/375opencard+scroll/activekeyboardfocus/Escape/sharedHS1=1HS2=0/universalread/sharedpause/waitsharedTV/reload/2D+3Dmarker/GVclosePASS. 3Dvisualkhôngđượcduyệtbởitestmarker.
- [x] LocalAPI503giữdraft23,dismissalertđược;restoreAPIrồisubmitaccepted. KhôngclaimOSoffline/unsavedclose-tab.
- [x] CUAcosmetic3/3ảnh `r10-reward-seeded-demo.png`;explicitseededvisualfixture,khôngdiceprobabilityproof. Nativerewardclaims95checksđãriêng.
- [x] `tasks/codex-r10-browser-final-evidence.json`10checks/9screenshothashes/189sourceunchanged/Workerf4dc4dbf. Report/HANDOFF/todo supersedeoldCUAHOLD. PASS_LOCAL_PILOT,R10.1–4xongphạmvithử.
- [ ] PháthànhR10chờownerduyệt19.9;chưađổiSiteproduction/key/V7/HSthật. Giữreviewtab36localhostreward3/3demo. Humanclass/GV/source/year/150timebox/2Geminioldcitation/3Dvisual vẫnriêng.


#### R11 — rà soát công thức Toán13/10
- [x] Owner phát hiện Khám pháu_ntextthô; chỉ sửa typesetting, giữ nội dung/hình/đápán đã duyệt. ReferencePDF/Word không phải yêu cầu tạo export mới.
- [x] R11.1 Audit math UI/content toàn game/lesson/exam, cần explicitdelimiter+MathText; không regexđoánmath/khôngsửaquotes/input/codemáy.
- [x] R11.2 RED/GREEN3cards/richfields/standardnotation/MathML/XSS;minimumfixnội dungkhôngđổi.
- [x] R11.3 fullgate/reviewkháchãng/candidateexact/CUAdesktop375/shared/nativeclaim95/hashmanifest.
- [x] R11.4 Report/HANDOFF/preview/Claudechecklist;chưareleaseR10+R11.
Plan `tasks/codex-r11-math-plan.md`. Lỗi này supersedevisualR10math claim; phần mechanicsoldPASSgiữtheohashcũ.

R11chốt13/10:
- [x] Ownerduyệtđồngloạttypesetting;5packages46fieldsmarkup (18prompts+2rubric+26fields),3staticcards;semanticSHA/hash/source/evalđượckiểm. Cataloguepilothashtrỏbảnmới. Khôngđổiimmutablelivepackages.
- [x] UIrichfieldsGV/HS/hộchiếu/rubric/feedback+nativeoptionThẻ/NhómreferenceMathText;CSSmathnowrap/scrollsafe+matchingpreviewdướiselect. Input/sourcequotes/JSONkeyskept.
- [x] 1203/1203fulltest/typecheck/lint/build0/394warnings;192manifestbyte-match. FinalWorker548fcf6e/tree972df01e;95nativeHTTP/combinedcapresave/v7rollbackPASS0external. R10load307+453historykhôngclaimrerunR11.
- [x] CUAactualfinal16MathML/9subscript/0error/375scroll360;matchingselect/preview233pxIDkept;standard9notationpreviewfraction/root/vector/integral/trig/matrix/cases/alignedPASSwithlocalSSR/CSS,inline369cuộn310. Desktop/375screenshotskept;oldwrapped/collapsedselectorimagesnotfinalproof.
- [x] IndependentFlashhighPASS0findings/currentfullhash. GeminiPro503twiceunknownquota; rawreviewretained. FalseBLOCKEDtruncatedCSSinputexcerptadjudicated/recheckedcompleterule. `codex-r11-math-layout-recheck-flash-2026-10-13T01-20-16-547Z.json`.
- [x] Report/evidence/HANDOFF/todo/lessonsupdated `tasks/codex-r11-report.md`, `codex-r11-evidence.json`. Previewtab37seededreward3/3typeset. Khóa/dữliệuHS/V7/productionversion7untouched.
- [ ] OwnerduyệtpháthànhR10+R11theo19.9;humanclass/GVsourceyear/format/timebox150/2oldAIcitation/realdevices3Dvisualremainseparate.

#### R12 — owner sửa trải nghiệm Khám phá và hướng dẫn GV13/10
- [x] Owner chốt Khámpháđọcvuithưgiãn,khôngcâuhỏi/nhiệm vụ;sourceadminkhôngchoHS. GợiýGVphảitrướclaunch,cónútsetuptoànbài vàchỉnhtaysau.
- [x] R12.1 bỏquestions/options/choiceHS,3thẻcâuchuyệnđa chiều/MathText;newREADclaimkhôngbàinộp;privateprovenanceGV.
- [x] R12.2 đềxuấtsetupfrompackage+onebutton/manualdetails+normalizer/auth/createatomic/START/hydrate/legacyrollback.
- [x] R12.3 QAaudience/workload+fullgate/review/native/CUAdesktop375/readnostudenttask/teachernewroompersist.
- [x] R12.4 report/HANDOFF/lessons/sharedprogress. R10–11mechanics/mathpassgiữtheohash;pedagogicalclaimsupersededbyR12. Productionunpublished19.9.
Spec `tasks/codex-r12-reading-teacher-setup-plan.md`.

R12chốtlocal13/10:
- [x] 3thẻđọcvuingắn(realworld/accessible;FibonaccihistorycrosscultureMacTutorverified;language/digitalmedia),HS0questions/options/choice/adminT11Must/source;newREAD1tapfragment/noacademicreward. SourceprivateGVdetails. MathTextgiữ.
- [x] Setupbeforelaunchauto1proposal+“Gợi ý thiết lập cả bài”+manualdetails7fields;recheckindividual/taskcontentuntouched;0–2integrations;eventplanonlybudgetguard;sharedmapavailability3points. Strictcreateowner/fingerprint/atomicinit/GETnonreapply/STARTapprovedplanonly,legacyroomsunchanged.
- [x] 1213fulltests/typecheck/lint/build0,394warnings;196sourcebyte-match;Worker911bfd3e/tree393f6b7d. 109nativeHTTP0external,combined150max450fragments+setup+900/600/1650actualresave1,500,176<cap,realv7rollbackbothfieldsPASS.
- [x] CUAHSread0form/admin,false/1fragmentwithoutchoice/desktop375scroll360client305/MathML;CUAGVproposal/manual/launchcreatedroom5190BEdatafake/reloadserverconfigKhoBáuCánhândigital-media/noevent/windowclosed. Preview39reading3/3explicitseeded.
- [x] MainindependentGeminiFlashhighPASS0findings/currentcode. SecondaryattemptsClaude2x503/Pro503/FlashboundarytimeoutunknownnotPASS;additionalreviewdepthdegraded,releaseevidenceexplicit.
- [x] report/evidence/HANDOFF/todo/lessonsupdated `tasks/codex-r12-report.md`,`codex-r12-evidence.json`. R10mechanicmathgreen≠UXsưphạm;R12supersedesoldreflectionstudentdesign.
- [ ] R10–R12publicationowner19.9;additionalproviderreviewifrequired;humanclass/GVsourceyear/format/timebox150/2oldAIcitation/realdevices3Dvisualremain.

#### R13 — một câu/thẻ mỗi popup, map bớt nút
- [x] Owner yêu cầu giảmrốiHUD/giảmscroll/NextBack/2D3D;spec `tasks/codex-r13-game-ui-plan.md`. R12bỏquestionsKhámpháđãxong,ảnhold khôngcoilàregressionbackend.
- [x] R13.1 play/shared1câuvisible+NextBack/draftmounted/identity/khôngđổichecker/evidence.
- [x] R13.2 exploration1thẻ/directmarker+PrevNext/MathText/readclaimgiữ.
- [x] R13.3 HUDoneCTA/menu/toolssecondary/mapgate+discoverylistscollapsed2D3D/auxpanels/modalkeyboard375.
- [x] R13.4 fullgate/review/nativefinal/CUAactual/screenshots/manifest/report/Claudehandoff. Chưaownerduyệtpháthành.

R13 tiến độ: tích hợp đã xong; 1221 tests/109 HTTP đạt trên ứng viên trung gian. QA 375 phát hiện lề body 8px gây cuộn trang và nút hidden bị CSS hiển thị; đã sửa. Build cuối đang kiểm lại, chưa đóng R13.4. Review Flash 03:17 PASS; map menu bổ sung sau đó cần kiểm lại. Không phát hành.

R13 nghiệm thu local: 1222 tests; 39 UI +52 map checks sau chỉnh cuối; typecheck/build đạt; lint 0 lỗi/392 cảnh báo cũ, scoped 0. 201 source byte-match. Native 109 HTTP trên hash cuối 31f903ab69b2a63eae3aa93b3abd902adadc8250d189f3af57d88011fe0dd653; cùng hash máy chủ browser QA. Gemini Flash core/map PASS 0 findings. CUA 375: trang 812/812, 1 câu, nháp 23 qua Next/Back, footer trong màn hình, Escape trả Menu; cổng 2D chạm mở riêng câu luyện. Broad CUA trước hai chỉnh cuối gồm 3D thẻ 2/3, nhận 1 mảnh, pause/giữ nháp, máy chung tách người; không gắn nhầm hash cuối. Báo cáo `tasks/codex-r13-report.md`, bằng chứng `tasks/codex-r13-evidence.json`.
- [ ] Lỗi học liệu cũ ngoài R13: biến thể 12 hàng nhưng label 25 hàng, `content/lessons/g11-sequences-p1.json:337/350`; chưa sửa, chờ chủ hệ thống duyệt riêng.
- [x] Chủ hệ thống duyệt phát hành R10–R13 ngày13/10: “Phát hành trước đi đã, còn lỗi nào thì ghi vào plan để lần sau sửa tiếp”. Đang phát hành; chưa ghi deployed tới khi native thành công.

## Backlog sau phát hành R10–R13 (chủ hệ thống cho để lượt sau)
- [ ] Sửa label biến thể 12/25 hàng tại `content/lessons/g11-sequences-p1.json:337/350`, giữ checker/đáp án hữu hạn; duyệt học liệu trước khi đưa vào lớp thật.
- [ ] Đối soát hai citation số trong nháp Gemini lịch sử; chưa coi nháp đó được duyệt.
- [ ] Duyệt nguồn/năm học/định dạng học liệu; nghiệm thu 150HS/40phút và điện thoại/iPad/TV thật.
- [ ] Duyệt thẩm mỹ3D; cổng3Dcanvas vẫn cảnh quan, chọn bằng menuHTML.
- [ ] Nếu cần giữ nháp chưa lưu qua đổi người/đóngtab trên máy chung, thiết kế riêng; R13 giữ nháp Next/Back và đóngpopup trong cùng người.
