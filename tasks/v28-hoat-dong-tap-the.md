# V28 — Hai hoạt động tập thể trong tiết: 1 bắt buộc + 1 tuỳ chọn

> Yêu cầu của user 23/10/2026: trong 1 giờ học theo tiến trình phải có **1 hoạt động tập thể BẮT BUỘC** mà mọi thành viên phải tham gia; sau đó nếu cả lớp cùng qua một mốc thì có **thêm 1 hoạt động tập thể TUỲ CHỌN** (người chơi được quyền tham gia hoặc không).

## 1. Hiện trạng (đã kiểm code v27, file:line)

- **Chỉ có 1 sự kiện lớp** và **không bắt buộc**:
  - `lib/lesson/self-pace.js:131-145` `questGateIndex` — mốc = activity luyện tập ở **~giữa tiết** (phases `practice/formation/guided`, có task đóng).
  - `lib/lesson/self-pace.js:147-151` `initClassQuest` — tạo `{gateIndex, activityId, eventType, status:'pending'}`.
  - `lib/lesson/self-pace.js:153-159` `questProgress` — đếm thành viên đã qua mốc; **cả lớp qua mốc** → mở sự kiện (`runtime.js:458-486` `CLASS_EVENT_OPEN`).
  - Tham gia bằng "Bấm chuông" (`ClassEventPanel.tsx:66-67`). ⚠️ **QA r028 (tối 23/10) đã bác giả thuyết "tự đóng ổn định"**: đếm ngược chỉ chạy client (rAF) — tab HS nền → không tick → server **kẹt `open`** cho tới khi có command mới; tab active lại → client lấy state `open` từ server → render live lại "Còn … giây" (chi tiết: `tasks/qa-v27-checklist.md` — finding sự kiện lớp). V28 bắt buộc thêm **server-side auto-expiry**. **Cập nhật 24/10 (probe server)**: path expiry đã có (`runtime.js:687-688`) và sự kiện tự đóng được — nhưng `classQuest.status` **không bao giờ rời `"open"`** khi sự kiện đóng (`closeClassEvent` `runtime.js:228` + handler `CLASS_EVENT_CLOSE` `:1156` không đụng `classQuest`) → cockpit mãi "🎯 Đang chơi", play ẩn banner quest, ghost panel treo. Yêu cầu v28 chi tiết (3 điều kiện) ghi ở checklist — same file.
- Chưa có cơ chế 2 sự kiện/tiết; `state.classQuest` là object đơn.

## 2. Thiết kế mục tiêu (đã chốt với user 23/10)

| | Sự kiện 1 — bắt buộc | Sự kiện 2 — tuỳ chọn |
|---|---|---|
| Vị trí trong tiến trình | Giữ nguyên mốc giữa bài (cổng luyện tập giữa tiết) | **Cổng cuối tiết** |
| Điều kiện mở | Cả lớp qua mốc (như hiện tại) | Cả lớp qua cổng cuối tiết |
| Tham gia | **Bắt buộc: cả lớp bị ép vào hoạt động luôn** — mọi việc đang làm **đóng băng và bảo lưu**, hết hoạt động thì tiếp tục | Tự nguyện, có nút "Bỏ qua" |
| Hết hạn | Đóng khi mọi thành viên đã tham gia (GV có nút "Kết thúc sớm" dự phòng cho HS vắng/trễ) | Tự đóng, không đánh dấu ai |
| Loại | Giữ "Bấm chuông" | **Loại khác Bấm chuông** — cụ thể hoá khi làm (đề xuất: vote cả lớp / đấu đội / câu hỏi nhanh toàn lớp) |

> Chốt "bắt buộc" của user: *"mặc định cả lớp bị ép vào hoạt động đó luôn, các hoạt động khác đang làm sẽ được đóng băng và bảo lưu để sau hoạt động tập thể sẽ được tiếp tục"*.

Cơ chế đóng băng và bảo lưu:
- khi sự kiện bắt buộc mở: chặn lắc xúc xắc + chặn nộp task thường (UI đã khoá tự nhiên bằng overlay sự kiện; bảo đảm state `selfProgress/diceTrack/drafts` không bị ghi trong lúc đóng băng),
- đồng hồ deadline tiết PAUSE trong suốt sự kiện (đang có sẵn — giữ nguyên),
- sau khi sự kiện đóng: HS quay lại đúng cổng/card đang làm, deadline chạy tiếp như không có gì (không cộng thêm thời gian ngoài window sự kiện đã PAUSE).

## 3. Việc cần làm (nhánh mới trong worktree, sau QA v27)

1. **Mô hình dữ liệu**: `state.classQuest` → `state.classQuests: Array` (2 phần tử trở lên); giữ backward-compat khi đọc (event đang mở giữa tiết không mất khi deploy giữa lúc chơi — cân nhắc migration nhẹ hoặc chỉ áp cho tiết mới).
2. **self-pace.js**: `questGateIndex` tách thành hàm chọn theo *thứ tự mốc* (`questGateIndex(pkg, slot)`) — slot 0 = giữa bài, slot 1 = **cổng cuối tiết**; `initClassQuest(state, eventType, slot)`.
3. **runtime.js**: mở sự kiện theo mốc tương ứng; `CLASS_EVENT_OPEN` thêm `slot`; sự kiện bắt buộc **không tự đóng theo thời gian** mà đóng khi đủ thành viên tham gia (hoặc lệnh GV).
4. **serialize.js**: `questProgress` trả mảng quest cho GV + HS; cockpit GV hiện 2 dòng sự kiện (pending/open/closed + tỷ lệ tham gia từng sự kiện).
5. **ClassEventPanel.tsx**: dòng điều khiển cho tuỳ chọn ("Tham gia" / "Bỏ qua — không ảnh hưởng điểm"); nhãn rõ ràng cho bắt buộc ("Hoạt động tập thể bắt buộc — cả lớp cùng vào"); nút "Kết thúc sớm" phía GV.
6. **Verify**: build sạch; QA 2 HS mô phỏng (1 tham gia sớm, 1 chậm) → sự kiện bắt buộc giữ lớp cho tới khi đủ người; đóng băng/bảo lưu đúng (tiến độ + bài làm khôi phục); sự kiện cuối tiết mở đúng mốc, "Bỏ qua" không lỗi.

## 4. Đã chốt với user (23/10/2026)

- Bắt buộc = cả lớp bị ép vào hoạt động, đóng băng + bảo lưu công việc đang làm, xong thì tiếp tục.
- Mốc mở sự kiện 2 (tuỳ chọn) = cổng cuối tiết.
- Sự kiện 2 dùng loại hoạt động khác "Bấm chuông" (loại cụ thể: đề xuất phương án khi triển khai).

## 5. Ràng buộc

- KHÔNG đụng `lib/exam/**`.
- Thống nhất với nốt nhịp sự kiện sẵn có: PAUSE deadline +2 phút, rAF của panel cần tab hiển thị (bài học QA rAF đã ghi).
- **Server-side auto-expiry là điều kiện tiên quyết** (QA r028): server phải tự đóng quest khi xử lý bất kỳ command nào đến sau deadline (kể cả SAVE_DRAFT/heartbeat), không dựa vào rAF client; HS tab nền dài rồi quay lại không được gặp lại window mở. Với sự kiện bắt buộc (đóng băng cả lớp) càng nghiêm ngặt: trạng thái đóng băng phải sống sót qua tab nền/reload.
- Làm sau khi vòng QA v27 chốt + phòng QA dọn sạch.
