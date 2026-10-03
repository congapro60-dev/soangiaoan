# Phase 2 — chủ hệ thống và host theo tài khoản

Phụ thuộc: Phase 1 verification. Đây là plan, chưa runtime.

## Mô hình

- Học sinh vào công khai bằng mã phòng; bearer riêng cho đơn vị chơi như V7.
- Teacher đăng nhập SIWC qua **Sites dispatch**, với `app/chatgpt-auth.ts` đóng vai trò adapter Server Component. Thư viện `lib/access-control.js` nhận `Headers` chuẩn và không chấp nhận danh tính từ body, query, cookie hay local role. Các API route sử dụng `getChatGPTUser` phía server từ header do Sites dispatch. Header do client tự gửi hoặc curl không tương đương bằng chứng Sites dispatch; quyền truy cập **private/public** được thực thi trực tiếp tại hạ tầng Sites trước boundary server.
- Root provision bằng SITE_OWNER_EMAIL và verified SIWC email của chủ Site. Thiếu cấu hình thì fail closed. Không lấy người ghé đầu tiên làm root.
- system_hosts: root/host accountId, revokedAt, createdBy. Host được mời có thể tạo phòng riêng; host không tự cấp system host.
- room_memberships: roomId + stable accountId + owner/cohost/observer, grant/revoke timestamps. Observer chỉ đọc; cohost không được xóa phòng hoặc thu hồi membership.
- invites: hash token, normalized expected email, role, scope, creator, expiry 48h, accepted/revoked. Token một lần; không lưu raw token trong audit; email mismatch/replay/expired trả code rõ.
- Privileged mutation ghi audit nguyên tử, payload đã lọc, không credentials. Audit chỉ ghi khi CAS mutation có meta.changes > 0, hoặc dùng INSERT SELECT có predicate revision trong cùng batch.

## Security và compatibility

Giữ rooms.admin_hash cho phòng chưa claim. Legacy bearer chỉ quản lý đúng phòng của nó; không biến thành root. Claim phòng cũ cần identity + host grant + admin key đúng + room chưa owner; CAS/audit nguyên tử; sau claim rotate admin_hash sang hash server-generated không trả client, vô hiệu bearer cũ. Request legacy bị từ chối nếu room đã owner và actor không có membership hợp lệ.

New account room không trả admin bearer; auth canonical membership, kiểm tra fresh từng request. system_hosts.revokedAt là global lockout override room memberships. Root/owner mới được delete-room hoặc grant/revoke membership; cohost chỉ begin/reset/remove-team/game actions theo policy; observer chỉ read.

## Thay đổi

1. Pure lib/access-control.js permission matrix + extractSIWCUser(headers); lib/host-service.js SQL identity/invite/role/audit. Dedicated /api/hosts route identity/list/invite/accept/revoke/rooms/claim; không làm route auth reserved.
2. Additive D1 tables accounts, system_hosts, room_memberships, host_invites, admin_audit, system_settings; nullable room owner. Migration seeded V7 giữ room/team/skill/community.
3. Escape API admin helper nhận identity membership hoặc legacy admin key. New create-room restricted authenticated host; legacy anonymous path chỉ tồn tại nếu explicit compatibility policy. Board read/write permissions distinct. Audit conditional on successful CAS.
4. Room list filter ownership/membership; root xem all. Không expose hashes, invite tokens, audit payload secrets, expected answers cho anonymous.
5. Teacher dashboard: phòng sở hữu/được giao; root quản lý system hosts; room owner quản lý cohost/observer; invite accept cùng Site. Confirm grant scope, duplicate/replay/revoke rõ.
6. Local preview dùng SIWC mock test context, không API impersonation production. Không đọc cookie/secret.

## Gate

Tests: root/host/cohost/observer/student/anonymous; forged body/query/cookie/header identity denied; pure parser separate from Next adapter; invite mismatch/expiry/one-time/revoke race; concurrent claim/reset; cross-room isolation; old bearer works before claim and fails after rotation; root bootstrap preconfigured; cohost delete/evict denied; revoked system host denied despite room membership; conditional audit only after successful CAS; no secret output. npm test/typecheck/build/lint + seeded migration integration. Browser root/host invitation/dashboard/observer/student screenshots. No commit/push before independent reviews and final gate.
