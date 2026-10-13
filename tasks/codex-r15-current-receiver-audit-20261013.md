# R15.3 — Bộ nhận GiaoAnDewey hiện hành, 13/10/2026

Đây là audit chỉ đọc. Chưa triển khai API nhập, sửa Rules, kết nối hoặc chuyển dữ liệu HS.

## Bản triển khai đã xác minh

Vercel connector `get_deployment(giaoandewey.vercel.app, withGitRepoInfo=true)` và `get_project(giaoandewey)` trả:

- Domain: https://giaoandewey.vercel.app
- Project: `prj_a8XWghMAaeyt1XK647ZLSGx9aSBH`, tên `giaoandewey`, Vite.
- Production deployment: `dpl_DErfLFfEcSED2fTHaTVpdjUZquHP`, `READY`, source `redeploy`.
- SHA: `a7b7f93b6accf679ed90dbf1c91f1201fa8ce8e3`.
- Branch metadata: `claude/ecstatic-cerf-xk8k2u`; repository `congapro60-dev/soangiaoan`.
- Exact local checkout: `C:/Users/ADMIN/.codex/worktrees/4c87/smart-lesson-plan-ai`. HEAD khớp SHA production; HANDOFF/todo/lessons có thay đổi tài liệu sẵn, giữ nguyên.

`C:/Users/ADMIN/Downloads/smart-lesson-plan-ai` là `feat/toan-final-template@967158b`, nhiều WIP; không dùng làm baseline receiver production. `6dec/smart-lesson-plan-ai@f295a77` có code lớp mới hơn Downloads nhưng chưa phải SHA production. Checkout `v832-canonical@74e8b1f` có V821 và authenticated live-close bridge; không nằm trong deployment vừa xác minh. Không đưa V821 vào bản R15 receiver vì chỉ thấy nguồn local.

## Danh tính và hồ sơ đang dùng

- Roster: `classes/{classId}/students/{studentId}`. `src/lib/classroom/types.ts` có `ClassDoc`, `StudentDoc`, `StudentProfileDoc`.
- HS đăng nhập ẩn danh Firebase; server xác minh mã lớp/PIN rồi ghi `studentLinks/{uid}`. Không truyền PIN sang Site hay bộ nhận.
- `studentId` là ID document roster trong lớp; `code` là mã đối chiếu có thể đổi. Không chứng minh đây là ID toàn trường hoặc ID xuyên năm học.
- `ClassDoc` có `teacherId` namespace dữ liệu cũ, `ownerId`, `originalOwnerId`, `teacherIds`; quyền vận hành có owner/co_owner và trạng thái removed.
- Summary lớp: `studentProfiles/{studentId}`, gồm `topics`, optional `skills`. `studentSkillEvidence` là canonical raw skill evidence server-only.
- Adaptive `studentLearningProfiles`/`adaptiveSessionProgress` tồn tại song song với contract diagnostic/route; không phải đường nhập game tối thiểu. Không bịa `diagnosticAttempt` để phù hợp schema.

## Bộ nhận thủ công tối thiểu

Tái dùng `/api/classroom`, thêm handler file prefix `_` để không tăng số Vercel Function. `vercel.json` production đặt `api/classroom.ts` maxDuration 60 giây; lô nhập phải có giới hạn, không giả định thời gian đủ cho toàn bộ lịch sử.

| File tương đối baseline production | Việc cần làm khi triển khai |
|---|---|
| `api/classroom.ts` | Nối dispatcher action preview/import/list/retract/restore |
| `api/_external-learning.ts` mới | Server validator, permission, mapping, revision, batch, idempotency |
| `api/_classroom-teacher.ts:73` | Tái dùng exported `teacherContext`, Firebase ID token verification |
| `api/_classroom-access.ts:77` | Tái dùng `readClassAccess`, không tự tạo logic owner khác |
| `src/lib/classroom/externalLearning.ts` mới | Contract/version, kiểm file, phân loại preview |
| `src/lib/classroom/teacherService.ts:48` | Tái dùng `callTeacherApi` với phiên GV |
| `src/components/features/classroom/StudentReport.tsx:88` | Mục riêng minh chứng game, teacher-only trước khi có policy công bố |
| `firestore.rules` | Raw external evidence chỉ server đọc/ghi |
| `api/__tests__/external-learning.test.ts` mới | Test API/auth/lifecycle; bổ sung Rules test tương ứng |

### Contract và nguyên tắc

1. Request mang Firebase `idToken` của GV và `classId` đích. Server gọi `teacherContext`, kiểm roster tồn tại và quyền hiện hành trước preview/import/retract/restore. Xác thực lại lúc commit, không tin preview cũ.
2. Mapping: `(sourceSiteId, sourceClassId, sourceMemberId)` tới `(targetClassId, targetStudentId)` do GV duyệt. Tên/code chỉ hiển thị đối chiếu; không tự ghép. Mục tiêu có package namespace/version, optional mapping tới `skillId` trong `SKILL_CATALOG`.
3. `teacherId` dữ liệu lấy từ document lớp; `importedBy` lấy UID phiên server xác minh. Không tin teacherId/ownerId trong JSON. Owner hiện tại và namespace legacy khác nhau phải được giữ đúng.
4. Export schemaVersion/version; record evidenceId ổn định, revision, operation `upsert`/`retract`, nguồn session/package/task/submission/objective, assessed/assisted/kind, thời gian. Không có PIN/token/khóa/URL bài riêng/raw answers mặc định.
5. Collection `externalLearningEvidence` riêng server-only; bản nhập thủ công có nhãn nguồn và người nhập. File JSON không chứng minh server nguồn đã ký hoặc tài khoản nguồn đã được xác minh.
6. Preview mới/cập nhật/trùng/chưa ghép/lỗi; chưa ghép cách ly. Chỉ import sau hành động duyệt riêng. Giới hạn byte/lô/số row; các trường không hợp lệ bị từ chối rõ.
7. Cùng ID/revision là no-op; revision cũ không đè mới; hai bản cùng revision nhưng nội dung khác bị conflict. Retry lỗi giữa chừng không nhân số phiên. Chấm lại/rút nguồn sửa projection theo revision.
8. Chờ chấm, nhóm, TV, trợ giúp giữ loại nguồn; không thành lỗi hay minh chứng độc lập. Không đổi trạng thái game thành masteryEstimate của Dewey.
9. `src/lib/learning/skillMastery.ts:54` coi `source='transfer'` là high-quality vô điều kiện. Không cast mọi minh chứng game thành transfer. Chưa có policy tương đương thì chỉ hiển thị summary riêng, không sửa skills/topics gốc.
10. Xóa batch/mapping là thu hồi mềm với lịch sử và khả năng phục hồi; không xóa homework hoặc profile gốc. Khôi phục kiểm lại quyền và mapping. File GV đã tải ra ngoài không thể tự thu hồi.

## R15.4 — kết nối tự động sau nhập thử

Hai phiên GV xác nhận scope lớp, challenge một lần/hết hạn; token scope tối thiểu xoay/thu hồi. Không ghép bằng email, chia sẻ PIN hoặc Firebase admin key. Đồng bộ server một chiều cursor/revision, retry giới hạn và trạng thái lỗi nhìn thấy. Ngắt kết nối dừng chuyển mới; xóa dữ liệu nhập là thao tác riêng trong Thùng rác.

Chưa chuyển dữ liệu thật; cần lớp đích/mapping được GV chọn và policy giữ dữ liệu trước pilot. Không có ẩn số chặn Site R15.1/R15.2 hoặc JSON export. Bộ nhận phải được triển khai từ baseline production đã xác minh, cô lập checkout; deployment Dewey cần nằm trong phạm vi phát hành được chủ hệ thống duyệt.

## Kiểm chứng cần để nghiệm thu

- API: token sai/ẩn danh, GV khác lớp, co_owner active/removed, đổi ID đích, lớp/HS bị xóa, file giả owner.
- Data: tên trùng, code đổi, chuyển lớp/năm; mã mục tiêu cục bộ trùng; import hai lần, old revision, conflict cùng revision, regrade, retract, restore, mapping sai rồi sửa.
- Rules: client không đọc/ghi raw external evidence; HS chỉ được projection đã công bố của mình.
- Không lấy unit test làm chứng cứ production quyền thật. QA GV/HS phiên thật có phạm vi trước claim kết nối hoàn chỉnh.

Audit không sửa source receiver, Rules, shared plan hoặc dữ liệu lớp; chỉ tạo tài liệu này trong Site worktree theo phân công.
