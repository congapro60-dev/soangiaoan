# 🧪 Báo Cáo Kiểm Thử Toàn Diện (QA Assessment Report)

**Dự án**: Smart Lesson Plan AI — Soạn giáo án & Học phân hoá
**Repo**: `congapro60-dev/soangiaoan`
**Commit đánh giá**: `255cc8b` (main, 2026-05-14 hoặc mới hơn)
**Production domain**: `https://giaoandewey.vercel.app`
**Ngày báo cáo**: 2026-05-18
**Tester**: Claude Code (tổng hợp + phản biện báo cáo Antigravity 18/05/2026)

---

## 📋 Hướng dẫn cho VS Code Agent / Claude Code đọc file này

Khi đọc file này để fix lỗi, làm theo thứ tự:

1. **Đọc HANDOFF.md trước** để hiểu kiến trúc tổng thể
2. **Fix theo thứ tự ưu tiên**: P0 → P1 → P2 → P3
3. **Mỗi task có**:
   - File path cụ thể
   - Mô tả lỗi
   - Cách verify sau khi fix
4. **Không skip P0**: Không tiến hành P1+ khi P0 chưa xanh
5. **Sau mỗi fix**: chạy `npm run build` đảm bảo pass, commit + push branch riêng `claude/qa-fix-<task-id>`

---

## 1. 🎯 Executive Summary

| Hạng mục | Đánh giá |
|---------|---------|
| Tổng thể | 🔴 **C- — Chưa sẵn sàng production** |
| Code quality | 🟡 B (modular, type-safe, có defensive code) |
| Architecture | 🟢 B+ (3-tier fallback có ý tưởng tốt nhưng chưa hoàn chỉnh) |
| Production stability | 🔴 D (API routes đang 404 ở production) |
| Data integrity | 🟠 C+ (có lost-update bug tiềm ẩn) |
| UX | 🟢 B (notice tone, timer, fallback message tốt) |
| Test coverage | 🔴 D (không có E2E, ít unit test) |

**Kết luận**: Không release cho học sinh thật chừng nào P0 chưa được fix toàn bộ.

---

## 2. 🔴 P0 — Critical Defects (BLOCK RELEASE)

### [P0-1] Production API routes trả 404

**File liên quan**: `vercel.json`, Vercel Dashboard settings

**Triệu chứng**:
```
GET https://giaoandewey.vercel.app/api/adaptive-progress → 404
GET https://giaoandewey.vercel.app/api/gemini-relay      → 404
```

Đáng lẽ phải trả `405 Method not allowed` (vì handler chỉ nhận POST).

**Tác động**:
- Toàn bộ luồng lưu tiến độ học sinh fail silent
- Rơi vào fallback `localStorage` → học sinh tưởng đã nộp bài
- Sau khi đổi thiết bị → mất dữ liệu vĩnh viễn

**Nguyên nhân nghi ngờ** (xếp theo xác suất):
1. Vercel project Root Directory sai (monorepo `edu-lesson-automation` thay vì `soangiaoan`)
2. Domain `giaoandewey.vercel.app` đang trỏ project cũ/khác
3. Rewrite `/(.*) → /index.html` trong `vercel.json` chặn `/api/*` (tuỳ phiên bản routing engine)
4. Build Logs có TypeScript error trong 1 file `api/*.ts` → toàn bộ functions không deploy

**Action**:
1. Mở Vercel Dashboard → Project Settings → General:
   - Root Directory: để trống (nếu repo `soangiaoan` standalone) hoặc `soangiaoan` (nếu monorepo)
   - Framework: Vite
   - Install: `npm install`
   - Build: `npm run build`
   - Output: `dist`
2. Settings → Git: confirm repo = `congapro60-dev/soangiaoan`, branch = `main`
3. Settings → Domains: confirm domain `giaoandewey.vercel.app` thuộc đúng project
4. Deployments → chọn commit mới nhất → Build Logs → tìm "Serverless Functions"
5. Nếu vẫn 404 sau khi cấu hình đúng: thêm vào `vercel.json`:
   ```json
   "rewrites": [
     { "source": "/api/:path*", "destination": "/api/:path*" },
     { "source": "/(.*)", "destination": "/index.html" }
   ]
   ```

**Verify**:
```bash
curl -i https://giaoandewey.vercel.app/api/adaptive-progress
# Expected: HTTP/2 405
```

---

### [P0-2] Lost Update bug trong `mergeProfileWithExisting`

**File**: `api/adaptive-progress.ts`, dòng ~140-160

**Bug**:
```ts
const existingProfileSnapshot = await profileRef.get();   // ❌ outside transaction
const mergedProfile = mergeProfileWithExisting({ existingProfile, ... });

await db.runTransaction(async transaction => {
  transaction.set(profileRef, mergedProfile, { merge: true });
});
```

Read `profileRef` nằm **NGOÀI** transaction. Hai session ghi đồng thời → lost update.

**Tác động**: Hồ sơ học tập dài hạn (`studentLearningProfiles`) sai dữ liệu tích lũy. Lỗi vô hình — chỉ phát hiện khi audit data sau hàng tháng.

**Action**: Move read vào transaction:
```ts
await db.runTransaction(async transaction => {
  const existingProfileSnapshot = await transaction.get(profileRef);
  const existingProfile = existingProfileSnapshot.exists ? existingProfileSnapshot.data() : null;
  const mergedProfile = mergeProfileWithExisting({ existingProfile, ... });

  transaction.set(db.collection('adaptiveSessionProgress').doc(progressId), { ... }, { merge: true });
  transaction.set(profileRef, { ...mergedProfile, ... }, { merge: true });
});
```

**Verify**: Viết unit test mô phỏng 2 session đồng thời và assert `totalSessions === 2`.

---

### [P0-3] AI dùng placeholder làm mất giáo án

**File**: `src/components/features/creator/FloatingChatWidget.tsx` (hoặc tương đương), prompt đang dùng `<UPDATE_EDITOR>`

**Bug** (từ `agent_patch_problem_report.md`):
- Giáo viên có giáo án 5 hoạt động (~2000 chữ)
- Yêu cầu AI "Bổ sung câu hỏi định hướng vào Hoạt động 1"
- AI viết lại Hoạt động 1 nhưng dùng `*(Giữ nguyên như bản gốc)*` cho HĐ 2-5
- Hệ thống ghi đè → **MẤT 4/5 giáo án**

**Bản vá hiện tại**: "Cấm trong prompt" — KHÔNG đáng tin cậy.

**Action — Đề xuất giải pháp surgical patch (từ agent_patch_problem_report.md)**:

Thay vì `<UPDATE_EDITOR>...full content...</UPDATE_EDITOR>`, dùng:
```xml
<PATCH>
  <FIND>đoạn cần thay thế</FIND>
  <REPLACE>nội dung mới</REPLACE>
</PATCH>
```

Hoặc tạm thời (ít rủi ro hơn):

1. Trước khi apply `<UPDATE_EDITOR>`: kiểm tra `newContent.length / oldContent.length < 0.7` → từ chối, show diff cho giáo viên confirm
2. Lưu version cũ vào `localStorage` key `editor-backup-<timestamp>` trước mỗi lần overwrite
3. Thêm nút "Hoàn tác" 30 giây sau apply

**Verify**: 
- Tạo giáo án 2000 chữ
- Yêu cầu AI sửa 1 hoạt động
- Kiểm tra editor giữ nguyên 4 hoạt động khác

---

### [P0-4] Verify domain đúng

**Vấn đề**: HANDOFF.md ghi `giaooandewey.vercel.app` (hai chữ 'o'), bot Telegram dùng `giaoandewey.vercel.app` (một chữ 'o').

**Action**: 
1. Mở browser cả 2 URL
2. Xác minh URL nào hiện app thật
3. Cập nhật HANDOFF.md cho đúng
4. Đảm bảo Vercel project đúng được test

**Verify**: Document URL chính thức trong HANDOFF.md section 4.1

---

## 3. 🟠 P1 — High Priority

### [P1-1] AI Auto-solve thiếu review gate

**File**: `src/components/modals/AISolveExamModal.tsx`

**Bug**: AI giải đề Toán có thể sai bước trung gian. Nếu giáo viên không kiểm tra → toàn bộ lớp bị chấm sai.

**Action**: Thêm checkbox bắt buộc trước nút "Xác nhận":
```
[ ] Tôi đã kiểm tra kỹ và chịu trách nhiệm với đáp án do AI sinh ra
```
Disable nút "Xác nhận" cho đến khi tick.

**Verify**: Mở modal, không tick checkbox → nút disable. Tick → nút enable.

---

### [P1-2] Rate limit Gemini khi chấm batch

**File**: `src/components/tabs/GradingTab.tsx`, function `gradeAllStudents`

**Bug**: Vòng for chấm liên tục → vượt RPM/TPM Gemini → 429 → đứt giữa chừng → giáo viên không biết bài nào đã chấm.

**Action**: 
1. Implement concurrency limit (3 song song) với `p-limit` HOẶC token bucket
2. Hiển thị progress bar real-time
3. Lưu state "đã chấm" vào Firestore để resume nếu fail

**KHÔNG dùng**: `setTimeout(1500)` đơn thuần — quá chậm và không thông minh.

**Verify**: Chấm 50 bài liên tục → không có 429, hoàn thành 100%.

---

### [P1-3] LocalStorage auto-sync khi online

**File**: `src/pages/AdaptiveStudentPortalPage.tsx` hoặc `src/main.tsx`

**Bug**: Học sinh làm bài offline → lưu localStorage. Khi online lại → không auto-sync → đổi máy là mất.

**Action**:
```ts
useEffect(() => {
  const sync = async () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('adaptive-progress-'));
    for (const key of keys) {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      if (!data) continue;
      try {
        const res = await fetch('/api/adaptive-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) localStorage.removeItem(key);
      } catch { /* still offline */ }
    }
  };
  sync();
  window.addEventListener('online', sync);
  return () => window.removeEventListener('online', sync);
}, []);
```

**Verify**:
1. Tắt mạng → làm bài → kiểm tra localStorage có data
2. Bật mạng → reload trang
3. Kiểm tra Firestore có dữ liệu, localStorage rỗng

---

### [P1-4] Telemetry fallback events

**File mới**: `src/services/telemetry.ts`

**Bug**: Hiện tại fallback localStorage diễn ra silently. Giáo viên không biết tỷ lệ thật.

**Action**: Mỗi lần rơi vào fallback → log vào Firestore collection `fallbackEvents`:
```ts
{ studentId, lessonId, stage: 'api'|'firestore'|'localStorage', timestamp, errorMessage }
```
Dashboard giáo viên có chart "Tỷ lệ lưu thành công 7 ngày qua".

**Verify**: Giả lập API fail → kiểm tra Firestore `fallbackEvents` có record.

---

### [P1-5] Health check Firebase Admin trước khi enable cổng

**File**: `api/health/firebase-admin.ts` (mới), `src/components/tabs/AdaptiveLearningTab.tsx`

**Bug**: Giáo viên bật cổng → 50 học sinh làm → tất cả fail vì thiếu `FIREBASE_SERVICE_ACCOUNT_KEY`.

**Action**: 
1. Tạo endpoint `GET /api/health/firebase-admin` trả `{ ok: true }` hoặc `{ ok: false, missing: ['FIREBASE_PRIVATE_KEY'] }`
2. Khi giáo viên bấm "Bật cổng" → gọi health check trước. Nếu fail → block và hiển thị hướng dẫn admin.

**Verify**: Xoá env Firebase trên Vercel staging → bật cổng → thấy error rõ ràng.

---

### [P1-6] Ảnh bài làm tự luận không lên Firebase Storage

**File**: liên quan `responseMode: 'image_upload'` trong adaptive flow

**Bug**: Base64 ném thẳng vào Gemini → không có URL ảnh gốc → giáo viên không phúc khảo được.

**Action**:
1. Upload base64 → Firebase Storage `student-uploads/{studentId}/{timestamp}.jpg`
2. Lấy download URL
3. Lưu URL vào `StudentSessionProgressRecord.uploadedImageUrls[]`
4. Sau đó mới gửi ảnh cho Gemini phân tích

**Verify**: Nộp ảnh → kiểm tra Firebase Storage có file, Firestore có URL.

---

### [P1-7] Vercel function build verification

**File**: `.github/workflows/api-typecheck.yml` (mới)

**Bug**: Nếu 1 file `api/*.ts` có TypeScript error → Vercel skip TẤT CẢ functions → 404 toàn bộ. Đây là tail risk đã xảy ra (commit `d56f3fa`).

**Action**: Thêm GitHub Action:
```yaml
name: API typecheck
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node api/*.ts
```
Block merge nếu fail.

**Verify**: Tạo PR với TS error cố ý → CI fail và block merge.

---

## 4. 🟡 P2 — Medium Priority

### [P2-1] Anti-cheat tab switching

**File**: `src/pages/AdaptiveStudentPortalPage.tsx`

**Bug**: Học sinh đổi tab → tra Google → quay lại. Timer còn đúng nhưng không biết.

**Action**: Combine 2 mechanism:

1. **Đếm tab switch**:
```ts
const [tabSwitchCount, setTabSwitchCount] = useState(0);
useEffect(() => {
  const onVisChange = () => {
    if (document.hidden) setTabSwitchCount(c => c + 1);
  };
  document.addEventListener('visibilitychange', onVisChange);
  return () => document.removeEventListener('visibilitychange', onVisChange);
}, []);
```

2. **Timer dùng `Date.now()` reference** (không phải setInterval count) — đảm bảo timer đúng kể cả khi tab ẩn:
```ts
const startedAt = Date.now();
const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
```

3. Lưu `tabSwitchCount` vào `progressRecord.timings.tabSwitchCount`.
4. Dashboard giáo viên cảnh báo nếu > 3 lần.

**Verify**: Mở student portal → đổi tab 5 lần → submit → kiểm tra Firestore `timings.tabSwitchCount === 5`.

---

### [P2-2] Unit test `mergeProfileWithExisting`

**File**: `api/__tests__/adaptive-progress.test.ts` (mới)

**Action**: Test ít nhất 5 cases:
- Hồ sơ mới hoàn toàn (existingProfile === null)
- Session thứ 2 (totalSessions: 0 → 1)
- Misconception cộng dồn
- Concurrent saves (sau khi fix P0-2)
- Profile có objectives khác nhau giữa session

**Verify**: `npm run test` pass tất cả.

---

### [P2-3] E2E smoke test student flow

**File**: `e2e/adaptive-student-flow.spec.ts` (mới, dùng Playwright)

**Action**: Test luồng 7 bước:
identify → diagnostic → lesson(unit 1) → quick check → exit ticket → save → complete

Test cases:
- Happy path (1 unit)
- Multiple units
- Fail quick check → remediation
- Disconnect giữa chừng → fallback localStorage
- Auto-sync khi online lại

**Verify**: Chạy `npm run e2e` pass tất cả.

---

### [P2-4] Math rendering edge cases

**File**: `src/pages/AdaptiveStudentPortalPage.tsx`, `src/utils/examScoring.ts`

**Action**: Test render `MathText` với:
- `\sqrt{a^2+b^2}`
- `\begin{cases} x + y = 1 \\ x - y = 0 \end{cases}`
- `u_{n+1} - u_n = d` (chỉ số kép)
- Markdown lồng ảnh + công thức inline
- Công thức trong `<th>` của bảng
- Công thức trong feedback AI

**Verify**: Render manual + screenshot từng case, đối chiếu với bản LaTeX chuẩn.

---

### [P2-5] PPTX layout overflow với LaTeX dài

**File**: `src/utils/pptxExport.ts` hoặc tương đương

**Bug**: AI sinh nội dung dài → text tràn slide.

**Action**:
1. Detect text length > X ký tự → split sang slide phụ
2. Detect bảng > Y cột → cảnh báo + suggest dạng list
3. Auto-shrink font size theo chiều dài

**Verify**: Export PPTX với giáo án dày → mở PowerPoint → kiểm tra không tràn slide.

---

### [P2-6] Backup giáo án trước khi AI overwrite

**File**: cùng file với P0-3

**Action** (bổ sung cho P0-3): Trước mỗi `<UPDATE_EDITOR>`:
```ts
const backup = { content: currentContent, timestamp: Date.now() };
localStorage.setItem(`editor-backup-${lessonId}`, JSON.stringify(backup));
```
Hiển thị toast "Đã sao lưu - hoàn tác trong 30 giây" + nút Undo.

**Verify**: AI overwrite → bấm Undo → khôi phục đúng.

---

## 5. 🟢 P3 — Nice to have

### [P3-1] Vercel deployment preview smoke test
GitHub Action chạy curl test endpoints sau mỗi deploy.

### [P3-2] Code splitting để giảm bundle
Build warning chunk lớn (>500KB) — split adaptive features thành lazy chunks.

### [P3-3] Confidence score cho AI grading
Mỗi điểm AI chấm kèm `confidence: 0.0-1.0`. Hiển thị màu cảnh báo nếu < 0.7.

### [P3-4] Audit trail cho re-grading
Khi giáo viên sửa điểm AI → lưu lịch sử ai sửa, sửa từ gì sang gì.

---

## 6. ✅ Điểm tốt đã ghi nhận

| Tính năng | Đánh giá |
|----------|---------|
| Phân tách teacher vs student portal | ✓ Đúng kiến trúc |
| Schema Firestore (3 collections) | ✓ Rõ ràng |
| Timer per-section + lưu metadata | ✓ Hữu ích cho phân tích |
| Notice tone system (info/warning/error) | ✓ UX tốt |
| `savedViaAdminApi` + `serverSyncedAt` metadata | ✓ Audit trail tốt |
| Validate payload (teacherId, lessonId, studentId khớp) | ✓ Defense in depth |
| Modular hoá lesson activities | ✓ Tốt cho LLM context |
| Multi-page PDF + MCQ grid format MOET 2025 | ✓ Đã fix triệt để |
| Plagiarism Dashboard | ✓ Tính năng hữu ích |
| AI Auto-solve để tạo answer key | ✓ Tốt — cần thêm review gate |

---

## 7. 📊 So sánh với báo cáo Antigravity (18/05/2026)

| Hạng mục | Antigravity rating | Tester rating | Lý do |
|---------|--------------------|---------------|------|
| Tổng thể | B+ | C- | Antigravity bỏ qua 404 prod đang sống |
| Adaptive Learning | "Chống đạn" | Vỡ trận | API tầng 1 đang fail hoàn toàn |
| Vercel limits | Sai (250MB/10s) | 1024MB/60s | `vercel.json` hiện tại |
| Tasks đề xuất | 5 tasks P1 | 5 tasks P0 + 6 P1 + 6 P2 | Thiếu P0 critical |

### Antigravity nhận đúng:
- LocalStorage không auto-sync (P1-3)
- Browser throttling timer (P2-1)
- Ảnh không lên Storage (P1-6)
- Rate limit Gemini (P1-2)
- AI hallucination khi solve (P1-1)
- PPTX overflow (P2-5)

### Antigravity bỏ sót:
- ❌ Vercel API 404 production (P0-1)
- ❌ Lost update bug (P0-2)
- ❌ AI placeholder làm mất giáo án (P0-3)
- ❌ Domain typo (P0-4)
- ❌ Health check Firebase Admin (P1-5)
- ❌ Telemetry fallback events (P1-4)
- ❌ Build verification CI (P1-7)
- ❌ Unit test coverage (P2-2)
- ❌ E2E smoke test (P2-3)

---

## 8. 🎯 Roadmap đề xuất

### Tuần 1 — Stabilize Production (P0)
- [ ] [P0-1] Fix Vercel 404 routing
- [ ] [P0-2] Fix lost update bug
- [ ] [P0-3] Backup + diff guard cho AI overwrite editor
- [ ] [P0-4] Verify domain và update HANDOFF

**Gate to next phase**: Tất cả P0 phải xanh + smoke test E2E pass.

### Tuần 2 — Trust & Safety (P1)
- [ ] [P1-1] Review gate AI auto-solve
- [ ] [P1-5] Health check Firebase Admin
- [ ] [P1-7] CI typecheck cho API
- [ ] [P1-3] LocalStorage auto-sync
- [ ] [P1-4] Telemetry fallback

### Tuần 3 — Performance & Scale (P1)
- [ ] [P1-2] Rate limit + chunking grading
- [ ] [P1-6] Ảnh tự luận lên Storage

### Tuần 4 — Quality (P2)
- [ ] [P2-1] Anti-cheat tab switching
- [ ] [P2-2] Unit test merge profile
- [ ] [P2-3] E2E student flow
- [ ] [P2-6] Backup giáo án + undo

### Tuần 5+ — Polish (P2 / P3)
- [ ] [P2-4] Math rendering edge cases
- [ ] [P2-5] PPTX overflow
- [ ] [P3-x] Code splitting, confidence score, audit trail

---

## 9. 🔍 Verification Checklist (toàn hệ thống)

Sau khi fix toàn bộ P0 + P1, chạy checklist này trước khi release:

### API endpoints
- [ ] `GET /api/adaptive-progress` → 405
- [ ] `GET /api/gemini-relay` → 405
- [ ] `GET /api/export-lesson` → 405
- [ ] `GET /api/render-word` → 405
- [ ] `GET /api/health/firebase-admin` → 200 với body `{ok: true}`

### Adaptive student flow
- [ ] Đăng nhập giáo viên, tạo bài học, bật cổng
- [ ] Mở incognito → cổng học sinh
- [ ] Hoàn thành flow 7 bước (identify → ... → exit ticket)
- [ ] Firestore `adaptiveSessionProgress/{id}` có record
- [ ] Firestore `studentLearningProfiles/{studentId}` có record với `savedViaAdminApi: true`
- [ ] Test mất mạng giữa chừng → fallback localStorage
- [ ] Bật mạng lại → auto-sync → localStorage clear
- [ ] Test 3 học sinh đồng thời → mỗi profile tăng totalSessions đúng

### Grading
- [ ] Chấm 50 bài liên tục → không 429
- [ ] AI auto-solve → bắt buộc check review checkbox
- [ ] Plagiarism dashboard hiển thị đúng

### Editor / AI Agent
- [ ] AI sửa 1 hoạt động → 4 hoạt động còn lại không thay đổi
- [ ] Nếu AI cắt ngắn → toast warning + nút Undo

### Export
- [ ] Export DOCX giáo án 15 trang → thành công < 60s
- [ ] DOCX có Word equation đúng cho `n < m`, `\frac`, `\sum`
- [ ] PDF render công thức đúng
- [ ] Cột bảng đúng tỉ lệ trên Google Drive preview

---

## 10. 📁 File mapping cho VS Code Agent

Khi fix các task, đây là các file chính cần touch:

| Task ID | File |
|---------|------|
| P0-1 | `vercel.json`, Vercel Dashboard (không phải code) |
| P0-2 | `api/adaptive-progress.ts` |
| P0-3 | `src/components/features/creator/FloatingChatWidget.tsx` (hoặc tương đương) |
| P0-4 | `HANDOFF.md` (typo domain) |
| P1-1 | `src/components/modals/AISolveExamModal.tsx` |
| P1-2 | `src/components/tabs/GradingTab.tsx` |
| P1-3 | `src/pages/AdaptiveStudentPortalPage.tsx` hoặc `src/main.tsx` |
| P1-4 | `src/services/telemetry.ts` (mới), `src/services/adaptiveProgressApi.ts` |
| P1-5 | `api/health/firebase-admin.ts` (mới), `src/components/tabs/AdaptiveLearningTab.tsx` |
| P1-6 | `src/pages/AdaptiveStudentPortalPage.tsx`, `src/lib/firebase.ts` |
| P1-7 | `.github/workflows/api-typecheck.yml` (mới) |
| P2-1 | `src/pages/AdaptiveStudentPortalPage.tsx` |
| P2-2 | `api/__tests__/adaptive-progress.test.ts` (mới) |
| P2-3 | `e2e/adaptive-student-flow.spec.ts` (mới) |
| P2-4 | `src/utils/examScoring.ts`, math rendering components |
| P2-5 | `src/utils/pptxExport.ts` |
| P2-6 | cùng P0-3 |

---

## 11. 🤝 Kết luận tester

Sản phẩm có **kiến trúc tốt và ý tưởng sản phẩm rất sát thực tế giáo viên**. Việc thiết kế cổng học sinh riêng, hồ sơ học tập dài hạn, fallback nhiều lớp — đây là tư duy đúng của một sản phẩm EdTech thương mại.

Tuy nhiên **chưa thể release production cho học sinh thật** vì:

1. **API tầng 1 đang chết** ở production → mất dữ liệu thầm lặng
2. **Lost update bug** → hồ sơ dài hạn sai số tích lũy
3. **AI editor có thể xoá giáo án 2000 chữ** → mất công sức giáo viên
4. **Không có safety net** observability (telemetry, health check)

Sau khi fix P0 + P1, sản phẩm sẽ ở mức **B+** thực sự (sẵn sàng pilot với 1-2 lớp).
Sau khi fix thêm P2, mức **A-** (sẵn sàng triển khai nhiều lớp/nhiều giáo viên).

**Note quan trọng cho team**: HANDOFF.md đã self-aware về một số issue (đặc biệt section 4 về Vercel routing). Đây là điểm cộng văn hoá kỹ thuật. Nhưng **biết** không thay thế **đã fix**. Cần triệt để xử lý P0 trước khi mở rộng tính năng.

---

**Chữ ký**: Claude Code, tester
**Ngày**: 2026-05-18
**Phương pháp**: Phân tích code thực + đối chiếu HANDOFF.md + phản biện báo cáo Antigravity 18/05/2026
