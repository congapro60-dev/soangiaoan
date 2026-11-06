# Nghiên cứu game đối thủ: dethiso.vn (Đề Thi Số)

> Nguồn: FB Reel 2254623681763429 (Thầy Dũng Công Nghệ) → cmt tác giả dẫn về `dethiso.vn`.
> Ngày khảo sát: 06/11/2026. Phương pháp: mở trang công khai + đọc bundle JS Next.js (Turbopack) để lấy tên/mô tả game.

## 1. Bối cảnh từ bài đăng FB

- Video: **"Đường Đua Tri Thức — Vừa học vừa chơi"**, quảng cáo cho giáo viên "học sinh uể oải, chán học".
- Comment: "Làm sao để tạo được trò chơi này ạ!" → tác giả: **"Tạo tài khoản free tại dethiso.vn"**.
- Lượng tương tác: 3,9K / 3,6K reactions, 749 cmt → nhu cầu game hoá lớp học rất lớn.

## 2. Danh mục game học tập của dethiso.vn

Lấy từ bundle sidebar giáo viên (`_next/static/chunks/3__oq0ij4e_n1.js`):

| # | Tên game | Route | Cơ chế cốt lõi |
|---|----------|-------|----------------|
| 1 | **Đường đua tri thức** | `/teacher/dua` | Đua xe: trả lời đúng thì xe chạy tiến, sai thì chậm lại. Nhiều xe đua song song trên một đường đua; ai về đích trước thắng. |
| 2 | **Bậc Thang Lên Mây** | `/teacher/may` | Leo thang mây: mỗi câu đúng leo 1 bậc, sai thì tụt. Đích ở trên cùng; có bậc thưởng/nhảy cóc. |
| 3 | **Rung Chuông Vàng** | `/teacher/cards/rung-chuong-vang` | Gameshow "Rung chuông vàng": HS giơ bảng đáp án, sai thì rời sàn, đúng thì trụ lại. Loại dần đến người cuối cùng. |
| 4 | **Vũ Điệu Tri Thức** | `/teacher/tao-dang` | Nhảy theo nhịp: mỗi câu đúng mở khoá một động tác/nhịp; HS lặp lại điệu nhảy. Kết hợp vận động + trả lời. |
| 5 | **Đấu trường RPG** | `/teacher/arena` | Nhập vai: HP/MP/vật phẩm, boss do GV điều khiển (PvE) hoặc PvP. 4 class (Chiến binh/Pháp sư/Cung thủ/Tank), 5 vật phẩm (Khiên/Băng giá/Đảo lượt/50-50/Hồi sinh), combo 3 câu = +1 item. |
| 6 | **Gỡ Bom** | `/teacher/bomb` | Đếm ngược, đội phối hợp cắt dây/giải mã để cứu lớp. Trả lời đúng = gỡ 1 dây, sai = thêm thời gian hoặc nổ. |
| 7 | **Nông trại** | `/teacher/nong-trai` | Mùa vụ theo lịch: HS làm thử thách mỗi ngày để lấy "nước tưới ruộng". Không làm → cây khát → héo → chết. Tích hợp theo tuần/ngày, không phải 1 tiết. |
| 8 | **Zoo-pet** | (sắp ra mắt) | Thú cưng ảo, chăm sóc + học. |
| 9 | **Sinh tồn** | `/teacher/survival` | Sinh tồn: tài nguyên giảm dần, cần trả lời đúng để nhận lương thực/ô-xy; sai thì mất máu/khí. |
| 10 | **Đại dương** | `/game/ocean` | Lặn biển: giải toán để thu thập cá/sinh vật biển, thi đấu với bạn. |

## 3. Cơ chế sư phạm dùng chung (đáng học hỏi)

1. **Phiên ngắn 15–25 phút**: khớp tiết 45 phút, không phải "khoá học dài".
2. **Mã PIN 6 số + HS vào bằng điện thoại**, không cần cài app; GV chiếu TV. Polling 1,5s → nhẹ băng thông wifi trường.
3. **Đảo đáp án theo từng HS** (chống chép), **late join** mặc định tắt.
4. **Streak/combo**: 3 câu đúng liên tiếp → thưởng (điểm ×1,5 hoặc item).
5. **Power-up có giới hạn**: 50/50, đóng băng đối thủ 5s, x2 điểm — tạo chiều sâu chiến thuật.
6. **GV giữ quyền điều khiển**: Kick / Freeze / Revive để xử lý gian lận và công bằng.
7. **Lưu lịch sử 30 ngày** để chiếu lại, xuất Excel báo cáo.
8. **Không dùng điểm game để kết luận năng lực** (họ ghi rõ trong /about) — game chỉ là động lực, đánh giá thật vẫn từ bài kiểm tra.

## 4. Khoảng trống dethiso chưa làm (cơ hội cho SmartPlan AI)

| Điểm yếu của dethiso | SmartPlan AI đã/đang có |
|---|---|
| Game tách rời khỏi **bài học PPCT** — GV phải tự soạn đề riêng cho từng game | 807 bài **bám PPCT 2018** có sẵn concept + hint 4 tầng + visual 2D/3D — cắm game vào là chạy |
| Không có **phân hoá 3 nhánh** (support/core/extension) trong game | Đã có branch support/core/extension cho mọi task |
| Không có **visual toán tương tác** (parabol, đường tròn, xác suất) | 714 visual 2D + 192 khối 3D `KhoiXoay` |
| Game chỉ dùng **trắc nghiệm A/B/C/D** | Có `true_false_4`, `short_answer_4` (chuẩn THPT 2025), tự luận rubric |
| Không có **evidence/passport** gắn với chương trình | Có Lesson Passport, evidence, mastery gate |
| Không có **AI disclosure** | Có policy AI + reflection minh bạch |
| Game **không phân biệt nhóm yếu/giỏi** trong cùng phiên | Có 3 nhánh + hint 4 tầng tự co giãn |

## 5. Đề xuất 5 game mới cho SmartPlan AI (ưu tiên theo chi phí/lợi ích)

### Game A — "Đường Đua Tri Thức" (đua xe theo câu đúng)
- **Cơ chế**: 4–6 xe (nhóm/HS) chạy trên đường đua SVG. Mỗi câu đúng = tiến 1–3 ô tuỳ độ khó; sai = đứng yên hoặc lùi 1 ô; combo 3 = tăng tốc ×2.
- **Tận dụng**: đã có `lib/mode-engine/rules/campaign.js` (di chuyển theo bước) + `KhoiXoay` 3D không cần; chỉ cần render đường đua 2D SVG + animation xe.
- **Khác biệt**: gắn trực tiếp Concept của bài đang dạy, không cần soạn đề riêng.
- **Chi phí**: **thấp** — dùng lại engine campaign + thêm 1 component `RaceTrack.tsx`.

### Game B — "Gỡ Bom" (đồng đội giải cứu)
- **Cơ chế**: màn hình có quả bom đếm ngược 5–10 phút + 4 dây màu. Mỗi câu đúng = cắt 1 dây an toàn; sai = đồng hồ tăng 30s; sai liên tiếp 3 = nổ (thua). Đội thắng khi cắt hết dây trước giờ.
- **Tận dụng**: `lib/mode-engine/rules/lockdown.js` (giải mã theo bước) + `escort.js` (đồng đội, tài nguyên).
- **Khác biệt**: áp lực thời gian thật, phù hợp tiết ôn tập cuối chương.
- **Chi phí**: **thấp–trung** — thêm `BombPanel.tsx` + đếm ngược server-side (đã có hạ tầng timer).

### Game C — "Rung Chuông Vàng" (loại trực tiếp)
- **Cơ chế**: cả lớp cùng trả lời; ai sai bị loại khỏi sàn, ai đúng trụ lại. Vòng tiếp tục đến khi còn 1 người. Có "cứu trợ" 1 lần/nửa lớp.
- **Tận dụng**: `buzzer` event đã có (bấm chuông 30s, `lib/community.js` EVENTS `buzzer`) + `mode-engine/rules/survival.js` (loại dần).
- **Khác biệt**: không cần PIN phức tạp — dùng chung phòng lesson hiện có.
- **Chi phí**: **thấp** — chủ yếu mở rộng UI của `ClassEventPanel.tsx`.

### Game D — "Nông Trại Tri Thức" (mùa vụ theo tuần)
- **Cơ chế**: mỗi HS có 1 ô ruộng. Làm bài tập về nhà/bài luyện mỗi ngày → nhận nước tưới → cây lớn dần qua 5 giai đoạn (hạt → mầm → cây → hoa → quả). Bỏ 2 ngày → cây héo, 3 ngày → chết. Thu hoạch cuối tuần → quà/điểm thưởng.
- **Tận dụng**: `mode-engine/rules/merchant.js` (tài nguyên/trao đổi) + lesson assignment có sẵn.
- **Khác biệt**: kéo dài tương tác **ngoài giờ học** — điểm mạnh chưa có trên site hiện tại.
- **Chi phí**: **trung** — cần state bền theo ngày + cron check (có sẵn D1 + session).

### Game E — "Đấu Trường RPG" (nhập vai hạ boss)
- **Cơ chế**: HP/MP/vật phẩm, 4 class, combo item, boss HP 10K–50K. PvE cả lớp đánh boss, PvP đối kháng.
- **Tận dụng**: `lib/mode-engine/rules/duel.js` (đối kháng) + `survival.js` (HP) + shop/vật phẩm của `campaign.js`.
- **Khác biệt**: dùng **câu hỏi theo concept đang học** thay vì đề rời; phân hoá class theo trình độ (Tank cho HS yếu, Pháp sư cho HS giỏi).
- **Chi phí**: **trung–cao** — nhiều UI nhưng engine đã 80% sẵn.

## 6. Thứ tự triển khai đề xuất

1. **Game C (Rung Chuông Vàng)** — rẻ nhất, tái dùng `buzzer` + `survival`, ra mắt trong 1–2 ngày.
2. **Game A (Đường Đua)** — visual đẹp, marketing mạnh (đúng video FB đang viral), tái dùng `campaign`.
3. **Game B (Gỡ Bom)** — tái dùng `lockdown`, áp lực thời gian.
4. **Game D (Nông Trại)** — giữ chân dài hạn, cần thêm cron.
5. **Game E (Đấu Trường RPG)** — nặng nhất, làm sau khi 4 game trên ổn định.

## 7. Cần chủ máy quyết

- Có muốn tôi **bắt tay vào Game C (Rung Chuông Vàng) trước** không? (rẻ nhất, ~1–2 ngày)
- Hay ưu tiên **Game A (Đường Đua)** để bám đúng video FB đang viral?
- Có cần **tạo tài khoản dethiso.vn** để xem trực tiếp UI game (hiện chỉ đọc được bundle JS do chặn đăng nhập)?
