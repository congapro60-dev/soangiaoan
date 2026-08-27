# Kế hoạch triển khai — báo cáo theo bài giao và cộng tác giáo viên

## Nguyên tắc

- Làm trong worktree `codex/class-report-collaboration`, không đụng workspace gốc.
- TDD: mỗi hành vi mới có test đỏ trước, sau đó mới viết code tối thiểu để xanh.
- API là ranh giới quyền cho giáo viên cộng tác; Firestore client không được tin UID/teacherId do client tự gửi.
- Không migration dữ liệu production tự động trong change này; dữ liệu legacy được đọc bằng fallback và được bổ sung metadata khi có thao tác hợp lệ.

## Các bước

1. Baseline checkout và ghi spec/plan.
   - Kiểm tra branch, status, scripts, test hiện có.
   - Chạy baseline Vitest/lint/build hoặc ghi nhận lỗi có sẵn.
   - Verify: commit docs riêng, root worktree vẫn nguyên trạng.

2. Nút tạo lại báo cáo.
   - Viết test cho trạng thái zero-submission, refresh deterministic, snapshot lỗi và CSV.
   - Tách helper refresh để component không tự suy diễn số liệu.
   - Thêm trạng thái `idle/loading/ready/error`, timestamp và nút **Tạo báo cáo**.
   - Verify: focused report tests, full Vitest và build.

3. Membership server-side.
   - Thêm type `ClassMemberDoc`/invitation và các field owner tương thích ngược.
   - Viết test helper quyền: owner, co-owner, pending transfer, leave/remove/last-owner.
   - Thêm endpoint list/invite/accept/leave/remove/transfer/list-accessible-classes.
   - Mọi endpoint lấy UID từ Firebase Auth token, normalize email, kiểm tra class membership trong transaction.
   - Verify: API tests với owner/co-owner/non-member và không có write nhầm class.

4. Nối đọc/ghi lớp, bài giao và lượt nộp.
   - Chuyển các đường đọc danh sách lớp/bài giao/lượt nộp của giáo viên sang server-accessible projection.
   - Giữ `teacherId` legacy, ghi `createdBy/updatedBy`, không đổi ID/Storage.
   - Nối quyền collaborator cho giao bài, đổi tên lớp/học sinh/bài giao, xóa có chủ đích.
   - Verify: test quyền và dữ liệu không mất sau reload.

5. Chỉnh điểm và báo cáo.
   - Cho cả owner/co-owner sửa điểm, feedback, teacher note; append history và reset approval.
   - AI regrade lấy quota của actor và dùng class namespace canonical.
   - Report đọc cùng access path cho upload và online, không đếm submission cũ.
   - Verify: lifecycle/API/report tests và regression tests 11 Columbus fixture nếu có.

6. UI quản lý cộng tác và tên.
   - Thêm panel thành viên, invite bằng email, vai trò, accept/leave/remove/transfer.
   - Thêm nút đổi tên có xác nhận/lỗi rõ ràng; không sửa IDs.
   - Hiển thị quyền và trạng thái invitation bằng tiếng Việt chuẩn.
   - Verify: component tests và browser smoke với phiên đăng nhập thật.

7. QA và bàn giao.
   - Chạy `npm test`, `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`.
   - Chạy rules suite phù hợp và browser QA theo guide; gọi Ox Alpha/OpenCode để audit độc lập nếu CLI đã đăng nhập.
   - Ghi evidence vào `tasks/todo.md`/HANDOFF nếu cần; chỉ push main khi có lệnh tích hợp riêng.

## Rủi ro cần chặn

- Không truy vấn Firestore client bằng `teacherId == currentUid` cho lớp cộng tác rồi coi đó là đủ quyền.
- Không đổi `teacherId` legacy để “sửa” quyền, vì sẽ làm mất liên kết dữ liệu cũ.
- Không coi báo cáo đã tạo là bản snapshot persisted; dữ liệu phải tái tính sau thay đổi nguồn.
- Không cho sửa trực tiếp phân bố/tỷ lệ; sửa điểm/nhận xét nguồn rồi tạo lại báo cáo.
