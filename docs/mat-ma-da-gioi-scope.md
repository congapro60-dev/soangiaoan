# Mật Mã Đa Giới — yêu cầu triển khai

Người dùng đã yêu cầu triển khai toàn bộ nội dung đã bàn. Baseline: Site V7, commit `8de35dce3850aabcc7fd10c8301abfb8d649234d`, project `appgprj_6abd9dee373c81918861834328bbaf0f`. Giữ đúng Site, Cloudflare Workers, D1 và dữ liệu phòng cũ. Không sửa repository SmartPlan bên cạnh.

## Phạm vi bắt buộc

- Đổi tên hiển thị thành Mật Mã Đa Giới trong trang bắt đầu, metadata, bảng giáo viên, luật, báo cáo và Site title. Giữ khóa lưu trữ và URL cũ tương thích.
- Giữ 5 map hiện có, có cốt truyện và mở đầu/biến cố/kết thúc riêng: Bí Mật Sau Tiếng Chuông (Dewey), Ngũ Ấn Long Thành (cổ trang), Nghịch Lý Aurora (tương lai), Mùa Hội Bên Sông (đồng quê), Hồ Sơ Thành Phố Ẩn (hiện đại).
- Thêm thế giới gợi cảm giác game học sinh quen: Đảo Khối Lập Phương, Thành Phố Vòng Bo, Chiến Trường Ngũ Khu, Học Viện Hỗn Nguyên, Quần Đảo Sinh Tồn, Đường Đua Thiên Hà, Mê Cung Mật Mã. Tạo tài sản riêng; tham khảo cơ chế, không nhập thương hiệu/tài sản game ngoài.
- Tách cách tham gia (nhóm chung thiết bị, cá nhân, cặp 2 người) khỏi luật ván (chiến dịch, đấu đơn, đối đầu khu vực, sinh tồn, hộ tống, săn kho báu, tiếp sức, phòng khóa, thương hội). Từng luật có mục tiêu, tiến trình và xếp hạng thật, không chỉ đổi nhãn.
- Chế độ cá nhân dùng từng người một thiết bị. Đấu đôi mặc định hai người chung một thiết bị, ghi tên cả hai và đổi vai theo chặng. Cá nhân có thể cạnh tranh trong chiến dịch hoặc đấu trực tiếp. Không tự thêm chế độ một người chơi độc lập thay cho đấu đơn.
- 26 học sinh: 13 cặp; nhóm mặc định 3–4 người; phe 4 bên được host phân hoặc cân bằng tự động. Người vào muộn, người lẻ, người rời ván có luật rõ; không xóa học sinh do thua.
- Lôi Đài Ngũ Ấn là nhiệm vụ cộng đồng cổ trang, tồn tại cùng đua thuyền. Trận 75 giây, máy chủ tạo cặp/bye công bằng, câu Toán tạo đòn/khiên/hỗ trợ và chuyển động linh vật vui. Thua vẫn được làm nhiệm vụ, quay lại đúng bài và nhận thưởng đúng một lần. Có đấu đơn, đôi và liên minh phù hợp cấu hình.
- Mini game nội bộ: ghép mật mã, nối/ xoay ống, đồ thị, đường đi tọa độ, cân bằng máy phát/hệ phương trình, sắp dữ liệu thống kê, thuyền, tàu/xe và hộ tống. Cùng chuẩn kết quả và lời giải để host theo dõi. Ưu tiên mở rộng engine có sẵn.
- Meme/âm thanh/animation theo map và tình huống: xúc xắc, bước đi, đúng/sai, hint, đóng băng/phá băng, nhận thưởng, bỏ trạm, dùng skill, mini game, lôi đài, tăng hạng, về đích. Không che đề, không chế giễu; rate limit, hàng đợi phản hồi; nhạc/SFX/meme/hiệu ứng/giảm chuyển động bật tắt độc lập, âm lượng, xử lý hidden tab và autoplay.
- Toán 10–12 là ma trận chính. Công dân số, toàn cầu, liên văn hóa, well-being, thực tế/lý thuyết/lịch sử là ngữ cảnh; mỗi ngữ cảnh cần câu đúng kiến thức, dữ liệu và lời giải thật. Ba dạng: điền số, MCQ, đúng/sai. Năm mức thay dữ kiện/điều kiện, không chỉ thay điểm; công thức KaTeX rõ.
- Khó quá: gợi ý ba tầng, hạ độ khó với phiên bản đề mới và điểm công bố, bỏ trạm giữa sau thời gian tham gia, cổng đầu/cuối có hỗ trợ từng bước và điểm thấp hơn tự giải, xin giáo viên giúp, báo đề lỗi/đổi câu tương đương. Không chồng phạt khiến học sinh hết khả năng tham gia; luyện tập/thi đấu có chính sách gợi ý riêng.
- Lưu nháp cả local/server theo phiên bản đề. Mất mạng/reload khôi phục đúng người và bài. Request id + fingerprint không được chấm/nhận thưởng lặp; cùng id khác nội dung từ chối. Server quyết định deadline; round cũ sau reset bị từ chối.
- Nhiều ô sự kiện có hàng đợi; community pause/resume bảo toàn nháp/cooldown/effects. Gửi bài đúng lúc reset/delete/đổi đề không ghi đè trạng thái. Mục tiêu skill rời phòng không trừ điểm; có giới hạn stun/cooldown/lá chắn và giúp đồng minh.
- Chủ hệ thống là tài khoản thầy; mời giáo viên khác có quyền tạo phòng cho lớp khác và quản lý phòng của họ. Đồng host theo phòng; root cấp/thu hồi, người được mời xác thực và chấp nhận. Vai trò kiểm ở server, thu hồi tức thì, độc lập dữ liệu giữa lớp; audit quản trị. Dùng Sign in with ChatGPT được starter hỗ trợ; không bootstrap chủ hệ thống bằng người vào đầu tiên.
- Bảng giáo viên: phòng sở hữu/được giao, cả map, lượt, vị trí, task/draft live, câu hỏi/đáp án/lời giải/lỗi thường gặp/hint/skill/help/history, phân tích từng học sinh/cặp/đội/phe, điểm và tie-break minh bạch, CSV, reset/xóa nhóm/xóa phòng có xác nhận. Polling 3 giây hiện có là yêu cầu cập nhật; chưa cần Durable Objects.
- Thiết bị yếu dùng 2D tương đương; nâng bản đồ địa hình và Dewey, không gọi minh họa là sơ đồ trường chính xác; 3D chỉ được gọi đã kiểm chứng khi có bằng chứng browser WebGL.

## Cổng nghiệm thu

- Không mất chức năng V7 và dữ liệu phòng cũ. Migration thêm bảng/cột, không xóa dữ liệu cũ.
- Kiểm thử engine, ma trận, skill, mode, arena, auth/revoke/isolation, idempotency, deadline/reset, community pause/resume, migrations và 26 phiên đồng thời.
- Build zero lỗi TypeScript; UI walkthrough thực sự cho học sinh và host, desktop/mobile/reduced motion/mute/2D fallback. Phân biệt mô phỏng 26 phiên với 26 thiết bị vật lý.
- Review plan độc lập trước code, review diff độc lập sau code; sửa finding major/critical trước publish.
- Publish vào đúng Site, giữ audience hiện có; chứng minh version/deployment terminal thành công. Không nhận toàn bộ hoàn thành từ một suite hẹp.

## Triển khai theo lát

Lát 0: sửa test loader Windows và entrypoint test/typecheck; chứng minh baseline cũ. Lát 1: campaign/branding, cốt truyện, media/accessibility; contract modes. Lát 2: root/host invite/memberships/audit, giữ admin token phòng cũ. Lát 3: recovery/nháp theo phiên bản đề và idempotency/events. Lát 4: luật mode gameplay và minigames. Lát 5: arena riêng cùng schema/time/pause/reward test. Lát 6: teacher UI và analytics. Lát 7: source/runtime/browser verification, tài sản bản đồ, independent review, deployment và completion audit toàn bộ.

Các lát là thứ tự công việc; phạm vi cuối không giảm khi một lát đã xong.

## Contract bổ sung sau review

Tài liệu này là canonical. Prompt thực thi chỉ nhắc lại, không thay phạm vi. Tên map/campaign chính thức là mục 8 ở trên; legacy title có thể dùng khi đọc dữ liệu ván cũ. Capacity 26 là quy mô lớp cần chứng minh; giữ upper bound 40 đơn vị chơi như V7. Mỗi đơn vị nhóm/cặp có roster tên học sinh để đếm người và đổi vai. Người lẻ có thể chơi cặp 1 người được hiển thị rõ, không mất lượt mặc định; host ghép lại chỉ giữa các nhiệm vụ. Người vào sau khi community mở nhận spectator view và tham gia lượt chính sau sự kiện, không hưởng reward của sự kiện chưa tham dự. Host có thể chuyển người rời cặp; giữ kết quả cặp.

| Luật ván | Mục tiêu/tiến trình | Xếp hạng |
| --- | --- | --- |
| Chiến dịch | 32 ô, khóa đầu/cuối bắt buộc, trạm giữa theo lịch cân bằng | Về đích hợp lệ, điểm còn lại, thời gian điều chỉnh |
| Đấu đơn | Các cặp đấu cùng chủ đề/mức, chấm theo vòng đồng thời; thua tiếp tục vòng sau | Điểm trận, số câu đúng, thời gian hợp lệ |
| Chiếm khu vực | 4 phe chiếm/giữ các mốc bằng câu đúng, lượt phòng thủ và mục tiêu chung | Điểm kiểm soát theo vòng, câu đúng, tài nguyên |
| Sinh tồn | Vùng hoạt động thu hẹp theo đồng hồ, năng lượng giảm và nhiệm vụ phục hồi | Vòng hoàn thành, mục tiêu, năng lượng; không loại vĩnh viễn |
| Hộ tống | Tiến trình đoàn xe/thuyền phụ thuộc sửa đường/năng lượng qua bài Toán | Quãng hộ tống hoàn thành, tài nguyên bảo toàn, thời gian |
| Săn kho báu | Mở manh mối và chọn tuyến để thu bộ mã/kho báu | Bộ kho báu hợp lệ, câu đúng, điểm/thời gian |
| Tiếp sức | Roster đổi người điều khiển theo chặng; tất cả hoàn thành phần việc | Chặng đã bàn giao hợp lệ, điểm, thời gian |
| Phòng khóa | Chuỗi phòng tương tác, mở bằng mã/ống/đồ thị/logic | Phòng đã mở hợp lệ, điểm, thời gian |
| Thương hội | Tài nguyên nhận qua Toán, giao dịch công bố giá và nhiệm vụ đầu tư | Hợp đồng hoàn thành, tài nguyên ròng, câu đúng |

Auth: SIWC identity do Sites dispatch cấp; không tin role/email trong body. Root chỉ bind từ định danh/cấu hình chủ hệ thống đã xác minh, không người truy cập đầu tiên. Host được root cấp quyền tạo phòng riêng; room owner có thể thêm đồng host phạm vi phòng; người bị revoke bị từ chối request kế tiếp (không cache quyền). Ván cũ chỉ admin key hợp lệ được claim vào tài khoản được phép. Root không tự đọc cookie/token người dùng. Mỗi privileged mutation có audit row nguyên tử cùng mutation. Invite có expiry, một lần accept đúng danh tính, replay và đổi email body bị từ chối.

Recovery: downgrade chỉ giảm level hiện tại, tăng questionRevision và xóa/reset draft tương ứng với thông báo trước; ghi history, điểm giảm theo level, không cho farming thưởng. Guided gate đầu/cuối yêu cầu tự hoàn thành bước cuối và báo mức điểm hỗ trợ. Practice hint không đóng băng và giảm điểm câu; competitive hint không cộng dồn stun từ đối thủ trong lúc đang được hỗ trợ. Phạt xếp hạng không trừ đồng hồ vật lý 30 phút. Cooldown/đóng băng liên tiếp có giới hạn và cửa trợ giúp để tiếp tục. Community pauses được cộng gộp và không overlap; dùng cùng gameNow cho deadline/effects/cooldowns, lưu log có wall time riêng.

Media: tối thiểu 13 event categories ở phạm vi trên có text reaction và SFX riêng phù hợp map. Tối đa một reaction mỗi 2 giây; toast không che input, có chế độ tắt meme riêng. AudioContext chỉ resume sau gesture bật âm thanh; master/SFX/music độc lập, volume 0–100%, hidden tab suspend nhạc và không phát backlog khi quay lại. Reduced motion dùng OS preference mặc định, UI override và không animation chiến đấu/marching khi bật. Điều khiển thiết yếu keyboard được, focus visible, state text không phụ thuộc màu/âm thanh, WCAG AA contrast.

Acceptance evidence: tests/branding-story.test.mjs cho tên/campaign parity/report cũ; tests/media.test.mjs cho categories/settings/rate limits; browser walkthrough có screenshot và console/audio state. test/access-control và integration cho root/invite/accept/revoke/cross-room/legacy/audit. tests/arena cho deterministic seed/odd bye/75s/timeout/concurrent answer/reward once/pause compose. tests/recovery cho questionRevision/draft mismatch/guided gate/teacher help/worst stacked effects. tests/modes cho objective/progression/rank khác nhau từ cùng fixture, 26 cá nhân/13 cặp/phe 7-7-6-6/late/leaver. Migration tests chạy seeded baseline 0000→0005 rồi migration mới, giữ nguyên dữ liệu. Npm test chạy VM flag với exact normalized storage path; typecheck dùng --incremental false để không sinh artifact. Browser WebGL screenshot và context probe chỉ chứng minh trên thiết bị test; mô phỏng không thay bằng chứng lớp 26 thiết bị.
