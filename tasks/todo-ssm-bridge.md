# Plan — Cầu nối SSM (Edufit) ↔ app, Đợt 1: CHỈ ĐỌC

> Khảo sát 2026-09-24. Tách file khỏi `tasks/todo.md` (đang giữ plan Ban Toán dở).
> Quyết định user: hướng B (tiện ích Edge), cả tổ Toán dùng, thứ tự 3 đợt: đọc → báo giảng/BTVN → điểm danh.

## Ranh giới
- Đợt 1 KHÔNG ghi gì lên SSM. Không tin nào tới phụ huynh.
- Vé đăng nhập SSM KHÔNG rời trình duyệt: không gửi lên Vercel, không lưu Firestore, không log.
- Không thêm Vercel function (giới hạn 12).
- Dữ liệu SSM chỉ đọc khi GV bấm; không lưu bản sao điểm LO lên Firestore ở đợt 1.

## Kiến trúc
```
App (giaoandewey.vercel.app, GV đã đăng nhập mail trường)
  │ window.postMessage  {type:'ssm:request', op, params}
  ▼
Tiện ích Edge — content script trên domain app  ──►  service worker
                                                        │ gọi api-ssm.edufit.vn/api/v1|v2|v3
                                                        │ bằng phiên SSM của chính GV (tab SSM đang mở)
                                                        ▼
                                                  trả JSON về app
```
- Tiện ích kiểm mail: mail trên SSM `/profile` phải trùng mail đăng nhập app, lệch → từ chối.

## Việc
- [x] 0. Cơ chế xác thực SSM (đã kiểm thật): `Authorization: Bearer <localStorage access_token>` + header `workspace: <localStorage workspace>`; không cookie. → tiện ích: content script trên ssm.edufit.vn đọc token tại chỗ, service worker gọi api-ssm; token không rời máy, không log.
- [x] 1. `extension/ssm-bridge/` (Manifest V3): `manifest.json` (host `ssm.edufit.vn`, `api-ssm.edufit.vn`, domain app + localhost:3000), `background.js`, `app-relay.js`. Chỉ cho phép danh sách op cố định (GET), không có op tự do.
  - verify: nạp unpacked vào Edge, app thấy tiện ích (ping/pong).
- [x] 2. `src/lib/ssm/ssmBridge.ts`: `ssmRequest(op, params)` (ping = kiểm đã cài) có timeout + lỗi tiếng Việt ("Chưa mở SSM", "Phiên SSM hết hạn", "Mail SSM khác mail app").
  - verify: unit test với bridge giả.
- [x] 3. Kéo lớp + HS: op `teacherClasses`, `classStudents` → `SsmLinkPanel` ở tab Học sinh (GV ghép 1 lần, lưu localStorage theo từng GV — chưa lên ClassDoc); HS khớp theo Mã HS, liệt kê HS lệch/thiếu, KHÔNG tự thêm/xoá.
  - verify: test ghép theo mã; thử thật 11Columbus (26 HS).
- [ ] 4. Kéo điểm TDS theo LO: op `evaluationQuarters`, `classSubjectAssessment` (F1–F4 0%, IA/SE có trọng số) → mục mới trong `StudentReport.tsx` "Đánh giá theo chuẩn đầu ra (TDS)" theo chuẩn thiết kế phiếu IB (SVG thuần).
  - Chưa có dữ liệu thật (mọi lớp 0/4 Quarter) → dựng parser từ mẫu JSON khi Q1 có điểm; trước đó hiện "SSM chưa có điểm quý này".
  - SSM là NGUỒN GỐC; tab TDS Sheet hiện do GV chép tay từ SSM (user xác nhận 2026-09-24).
- [ ] 4b. Đổ điểm SSM → cột `Điểm Quý N` tab TDS (Sheets API v4, quyền Google GV, như sheet-sync BTVN): khớp Mã HS, CHỈ ghi cột Điểm Quý N, không đụng cột công thức/khối hành động, có bảng xem trước ô cũ → ô mới, ô đã có giá trị khác thì hỏi.
  - SSM tự tính điểm TDS quý từ các điểm LO → app LẤY NGUYÊN số SSM đã tính, KHÔNG tự tính lại (tránh lệch công thức). Chưa thấy SSM trả số này ở đâu → tìm khi Q1 có điểm; không có thì dừng, hỏi user, không đoán công thức.
- [x] 5. Phát cho tổ: nút "Tải tiện ích" trong app (`/downloads/ssm-bridge.zip`, sinh lúc build) + 4 bước cài hiện ngay trong khung SSM. Cân nhắc Edge Add-ons dạng ẩn sau khi ổn.
- [x] 6. `npm run build`, `npm test`, `npm run lint` pass; thử thật chỉ-đọc trên SSM.

## Chưa khảo sát (đợt sau)
- Form ghi lịch báo giảng, BTVN (API POST).
- Điểm danh theo tiết (phải xem lúc có tiết đang diễn ra).
