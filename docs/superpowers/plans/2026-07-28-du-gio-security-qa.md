# Du Gio Security QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa toàn bộ lỗi QA trong nền tảng bảo mật và dữ liệu module dự giờ Danielson.

**Architecture:** Giữ nguyên mô hình quyền hiện có và sửa điều kiện list theo semantics của Firestore Rules. Khóa định danh giáo viên ở tầng database, bổ sung test emulator theo hành vi và khai báo index/type tối thiểu.

**Tech Stack:** Firebase Firestore Security Rules, `@firebase/rules-unit-testing`, Vitest, TypeScript.

---

### Task 1: Tạo lưới hồi quy cho lỗi list và quyền giáo viên

**Files:**
- Modify: `tests/rules/duGio.rules.test.ts`

- [ ] Import `collection`, `getDocs`, `limit`, `query`, `where`.
- [ ] Thêm ca BGH list toàn bộ với `limit(200)` và chạy để xác nhận PASS hiện tại.
- [ ] Thêm ca tổ trưởng list có `where('nguoiDuUid', '==', UID_TO_TRUONG)` và `limit(200)`; chạy để xác nhận FAIL vì rules đang đọc `request.query.where`.
- [ ] Thêm ca tổ trưởng list thiếu `where` và list theo UID người khác; xác nhận DENY.
- [ ] Thêm ca `giao_vien` tạo và sửa biên bản; xác nhận DENY.

Run:

```powershell
$env:PATH = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin;$env:PATH"
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\fix-dugio-qa" run test:rules
```

Expected: ca list hợp lệ của tổ trưởng FAIL trên rules cũ; các ca DENY còn lại PASS.

### Task 2: Khóa schema `gvUid` bằng test

**Files:**
- Modify: `tests/rules/duGio.rules.test.ts`

- [ ] Thêm ca tạo thiếu `gvUid` và chạy để xác nhận FAIL vì hiện rules vẫn cho phép.
- [ ] Thêm ca cập nhật đổi `gvUid` và chạy để xác nhận FAIL vì hiện rules vẫn cho phép.

Expected: hai test dùng `assertFails` đều FAIL trên rules cũ.

### Task 3: Sửa rules tối thiểu

**Files:**
- Modify: `firestore.rules`

- [ ] Thay kiểm tra khóa không tồn tại `request.query.where` bằng `resource.data.nguoiDuUid == request.auth.uid`.
- [ ] Thêm `gvUid` vào `keys().hasAll(...)` khi create.
- [ ] Ghim `request.resource.data.gvUid == resource.data.gvUid` khi update.
- [ ] Chạy `npm run test:rules`; expected toàn bộ ca PASS.

### Task 4: Bổ sung index và Node types

**Files:**
- Modify: `firestore.indexes.json`
- Modify: `scripts/gan-vai-tro.ts`

- [ ] Thêm composite index collection `duGio`: `nguoiDuUid ASCENDING`, `ngay DESCENDING`.
- [ ] Thêm `/// <reference types="node" />` chỉ cho script quản trị để không mở Node globals trong client.
- [ ] Chạy `npm run lint`; expected exit 0.

### Task 5: Verification và bàn giao

**Files:**
- Modify: `tasks/todo.md`

- [ ] Ghi checklist và kết quả thực chạy vào `tasks/todo.md`.
- [ ] Chạy mới `npm run test:rules`, `npm run test`, `npm run lint`, `npm run build`.
- [ ] Rà `git diff --check`, kiểm tra diff chỉ nằm trong phạm vi.
- [ ] Yêu cầu code review độc lập và xử lý mọi lỗi Critical/Important.
- [ ] Commit feature branch, merge vào `main` an toàn khi working tree người dùng cho phép, chạy verification sau merge rồi push `origin/main`.
