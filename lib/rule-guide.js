// Giới thiệu 9 luật ván cho giáo viên trước khi chọn (chủ hệ thống 16/10/2026: "Luật ván ko có giới thiệu gì").
// Cùng nội dung với public/session-rules.js + public/game-setup.js (bản dùng ở phòng game cũ).
export const RULE_GUIDE = Object.freeze({
  campaign: { name: 'Hành trình', how: 'Lắc xúc xắc, tới cổng giải bài, nhận manh mối rồi đi tiếp trên bản đồ.', goal: 'Đi hết các cổng và mở đích.', score: 'Hoàn thành, điểm và thời gian.', suits: 'Mọi loại tiết; làm quen, khám phá từng chặng.' },
  duel: { name: 'Đấu trí', how: 'Hai bạn trả lời cùng vòng; thua một vòng vẫn chơi tiếp.', goal: 'Thi đủ các vòng.', score: 'Đúng trước, nhanh sau.', suits: 'Luyện tập cá nhân hoặc theo cặp.' },
  zones: { name: 'Giữ vùng', how: 'Đội giải đúng để chiếm vùng, rồi chọn giữ hay đánh vùng khác.', goal: 'Tích điểm kiểm soát.', score: 'Vùng kiểm soát, câu đúng, tài nguyên.', suits: 'Nhóm phối hợp, ra quyết định chiến thuật.' },
  survival: { name: 'Sinh tồn', how: 'Giải câu hồi năng lượng trước khi vùng thu hẹp.', goal: 'Trụ qua các vòng.', score: 'Số vòng, mục tiêu, năng lượng.', suits: 'Luyện tập ngắn, nhịp nhanh.' },
  escort: { name: 'Hộ tống', how: 'Giải bài nạp nhiên liệu rồi đưa đoàn xe tiến lên.', goal: 'Đưa đoàn xe về đích.', score: 'Quãng đường, nhiên liệu, thời điểm.', suits: 'Nhóm cân bằng tiến độ và nguồn lực.' },
  treasure: { name: 'Kho báu', how: 'Mở manh mối, chọn nhánh, ghép đủ bộ mã.', goal: 'Hoàn thành các bộ mã.', score: 'Bộ mã, câu đúng, thời điểm.', suits: 'Tìm manh mối, trao đổi cách giải; ôn tập.' },
  relay: { name: 'Tiếp sức', how: 'Người giữ lượt giải phần mình rồi bàn giao cho bạn tiếp theo.', goal: 'Hoàn thành các chặng.', score: 'Chặng, đóng góp từng thành viên.', suits: 'Nhóm cần mọi em đều có lượt làm.' },
  lockdown: { name: 'Mở phòng', how: 'Giải bài cấp điện rồi mở từng phòng.', goal: 'Mở đủ các phòng.', score: 'Số phòng đã mở, thời điểm.', suits: 'Chuỗi nhiệm vụ theo thứ tự.' },
  merchant: { name: 'Thương nhân', how: 'Giải bài kiếm xu, mua vật liệu, hoàn thành hợp đồng.', goal: 'Hoàn thành các hợp đồng.', score: 'Hợp đồng, giá trị tài nguyên, câu đúng.', suits: 'Bài tính toán, lựa chọn, quản lý tài nguyên.' },
  speedway: { name: 'Đường đua tri thức', how: 'Mỗi câu đúng đẩy xe tiến một bước; ba câu liên tiếp thì tăng tốc.', goal: 'Về đích trước các đội khác.', score: 'Quãng đường, thời điểm về đích, chuỗi đúng dài nhất.', suits: 'Ôn tập nhịp nhanh, thi đua giữa các nhóm.' },
  bellring: { name: 'Rung chuông vàng', how: 'Trả lời đúng thì trụ lại trên sàn; sai thì rời sàn và chờ cứu.', goal: 'Là người trụ lại cuối cùng.', score: 'Chuỗi đúng, số câu đúng, thời điểm.', suits: 'Kiểm tra nhanh cả lớp, tạo không khí game show.' },
  bomb: { name: 'Gỡ bom', how: 'Cả đội giải bài để cắt từng dây; sai thì đồng hồ chạy nhanh hơn.', goal: 'Cắt đủ dây trước khi bom nổ.', score: 'Số dây đã cắt, số lần sai.', suits: 'Ôn tập cuối chương, luyện phối hợp dưới áp lực thời gian.' },
  farm: { name: 'Nông trại tri thức', how: 'Mỗi câu đúng là một lượt tưới; đủ nước thì cây lớn qua năm giai đoạn.', goal: 'Đưa cây tới giai đoạn kết quả và thu hoạch.', score: 'Giai đoạn cây, số vụ thu hoạch, số câu đúng.', suits: 'Luyện đều theo tuần, giữ nhịp học ngoài giờ.' },
  arena: { name: 'Đấu trường RPG', how: 'Chọn lớp nhân vật, trả lời đúng để hồi máu và đánh trùm; sai thì mất máu.', goal: 'Hạ trùm trước khi cả đội gục.', score: 'Sát thương gây ra, câu đúng, máu còn lại.', suits: 'Ôn tập theo nhóm, tạo không khí raid boss.' },
});

/** Luật đổi phần trò chơi, không đổi phần học: câu hỏi, chấm, hộ chiếu, nhịp chơi giữ nguyên. */
export const RULE_SCOPE_NOTE = 'Luật chỉ đổi phần trò chơi (cách đi, điểm trò chơi, vùng, tài nguyên). Câu hỏi, cách chấm, hộ chiếu, nhịp chơi và cách vào phòng giữ nguyên.';
