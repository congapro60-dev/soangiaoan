# HANDOFF — Soạn giáo án / học phân hoá

**Cập nhật**: 2026-05-14  
**Repo chính**: `soangiaoan`  
**Branch hiện tại**: `main`
**Commit code ứng dụng mới nhất trước khi cập nhật file này**: `d56f3fa Fix Vercel API route configuration`
**Mục đích file này**: để một phiên Claude Code / Claude Cowork / Google Antigravity hoặc kỹ sư khác đọc nhanh toàn bộ bối cảnh, các thay đổi đã làm, vấn đề còn tồn tại, và các bước cần kiểm tra/sửa tiếp mà không phải hỏi lại từ đầu.

---

## 1. Trạng thái hiện tại của repo

### 1.1 Git

Repo `soangiaoan` đã được commit và push lên GitHub.

Các commit quan trọng gần nhất:

```txt
d56f3fa Fix Vercel API route configuration
14beb30 Expand adaptive student flow with timers
331be3a Add server-side adaptive progress saving
badfb54 Fix adaptive student math and save fallback
8ebd29a Simplify adaptive teacher workflow
a01bfbe Add adaptive student portal and learning profiles
5cad500 Persist adaptive lessons to Firestore
4934e32 Add teacher editing for adaptive lessons
```

Trạng thái đã kiểm tra:

```txt
HEAD -> main
origin/main -> main
working tree clean
```

### 1.2 Kiểm tra local đã chạy

Đã chạy thành công:

```bash
npm run lint
npm run build
```

Đã type-check riêng các API Vercel bằng lệnh tương đương:

```bash
npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck --types node api/adaptive-progress.ts api/gemini-relay.ts api/render-word.ts api/export-lesson.ts
```

Kết quả: pass sau khi sửa lỗi type trong `api/export-lesson.ts`.

---

## 2. Mục tiêu sản phẩm đang làm

Đang xây chức năng học phân hoá trong web soạn giáo án:

1. Giáo viên tạo/chỉnh/lưu bài học phân hoá.
2. Giáo viên bật cổng học sinh.
3. Học sinh vào link riêng, nhập mã học sinh cố định.
4. Học sinh làm test đầu giờ.
5. Hệ thống xếp tuyến học tập cá nhân hoá.
6. Học sinh học theo tuyến, làm quick check, nhận điều chỉnh nếu cần.
7. Học sinh làm exit ticket.
8. Hệ thống lưu kết quả từng tiết và hồ sơ học tập dài hạn để về sau AI có thể biết trình độ từng học sinh qua nhiều bài học.

Định hướng dài hạn: có hàng trăm tiết học, nhiều học sinh, không được phụ thuộc vào `localStorage` trừ khi chỉ là fallback chống mất dữ liệu tạm thời.

---

## 3. Các thay đổi lớn đã hoàn thành

## 3.1 Cổng học sinh riêng cho học phân hoá

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/main.tsx`

Đã làm:

- Tạo giao diện học sinh thật, tách khỏi màn hình mô phỏng giáo viên.
- Route học sinh dạng:

```txt
/adaptive/student/:teacherId
```

- Học sinh nhập:
  - Mã học sinh cố định.
  - Họ tên.
  - Lớp.
- Cổng học sinh tự tải bài học phân hoá từ Firestore theo `teacherId`.
- Nếu giáo viên chưa bật cổng hoặc chưa có bài học, học sinh sẽ thấy trạng thái không khả dụng.

---

## 3.2 Hồ sơ học tập dài hạn cho học sinh

File chính:

- `src/lib/adaptive/types.ts`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/services/adaptiveProgressApi.ts`
- `api/adaptive-progress.ts`

Đã bổ sung các collection/record logic:

- `adaptiveLessons/{teacherId}`: bài học phân hoá giáo viên lưu.
- `adaptiveSessionProgress/{progressId}`: kết quả từng phiên học/từng tiết.
- `studentLearningProfiles/{studentId}`: hồ sơ học tập dài hạn của từng học sinh.

Luồng lưu hiện tại:

1. Frontend gọi server API `/api/adaptive-progress`.
2. Nếu API thành công: lưu bằng Firebase Admin SDK, không phụ thuộc Firestore client rules.
3. Nếu API lỗi: fallback sang Firestore client.
4. Nếu Firestore client cũng lỗi: fallback sang `localStorage` để không mất bài làm của học sinh.

Ý nghĩa:

- API server-side là hướng bền vững nhất cho production.
- Firestore client write chỉ là dự phòng.
- `localStorage` chỉ là cứu dữ liệu tạm, không phù hợp cho mở rộng thật.

---

## 3.3 API server-side để lưu tiến độ học sinh

File mới:

- `api/adaptive-progress.ts`

Chức năng:

- Chỉ nhận `POST`.
- Nếu gọi `GET` đúng ra phải trả `405 Method not allowed`.
- Validate payload gồm:
  - `teacherId`
  - `lessonId`
  - `progressId`
  - `studentId`
  - `progressRecord`
  - `profileRecord`
- Dùng Firebase Admin SDK để ghi Firestore.
- Kiểm tra bài học tồn tại tại `adaptiveLessons/{teacherId}`.
- Kiểm tra `portalEnabled === true`.
- Kiểm tra `lesson.id` khớp `lessonId`.
- Ghi transaction vào:
  - `adaptiveSessionProgress/{progressId}`
  - `studentLearningProfiles/{studentId}`
- Merge hồ sơ dài hạn thay vì ghi đè thô.
- Gắn metadata:
  - `savedViaAdminApi: true`
  - `serverSyncedAt: FieldValue.serverTimestamp()`

Các biến môi trường Firebase Admin API hỗ trợ:

Cách 1 — một biến JSON đầy đủ:

```txt
FIREBASE_SERVICE_ACCOUNT_KEY
```

Cách 2 — base64 JSON:

```txt
FIREBASE_SERVICE_ACCOUNT_BASE64
```

Cách 3 — ba biến tách riêng:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Lưu ý: `FIREBASE_PRIVATE_KEY` phải giữ đầy đủ private key. Nếu nhập một dòng trong dashboard thì newline thường là `\n`.

---

## 3.4 Wrapper frontend gọi API lưu tiến độ

File mới:

- `src/services/adaptiveProgressApi.ts`

Chức năng:

- Export hàm `saveAdaptiveProgressViaApi()`.
- Gọi `fetch('/api/adaptive-progress', { method: 'POST' })`.
- Nếu response không OK thì throw error để frontend chuyển sang fallback.

---

## 3.5 Mở rộng cổng học sinh thành quy trình học đầy đủ hơn

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/sampleAdaptiveLesson.ts`
- `src/lib/adaptive/diagnosticEngine.ts`

Trước đây luồng học sinh quá ngắn:

```txt
identify -> diagnostic -> lesson(firstUnit) -> quick_check(firstUnit) -> complete
```

Đã mở rộng thành:

```txt
identify -> diagnostic -> lesson(unit n) -> quick_check(unit n) -> exit_ticket -> complete
```

Với nhiều đơn vị kiến thức:

- Học sinh học từng `knowledgeUnit`.
- Mỗi unit có tuyến học tương ứng:
  - `support`
  - `core`
  - `extension`
- Làm quick check sau từng unit.
- Nếu chưa đạt, có thể quay lại học bổ trợ/remediation.
- Nếu vẫn mắc sau số lần quy định, đánh dấu cần giáo viên hỗ trợ.
- Sau khi hoàn thành các unit hoặc cần chuyển tiếp, học sinh làm exit ticket.

Các trạng thái đã thêm:

- `exit_ticket`
- `quickCheckAttempts`
- `exitTicketAttempt`
- `remediationAttemptsByUnit`
- `needsTeacherSupport`
- `currentUnitIndex`
- `completedUnitIds`
- `timings`

---

## 3.6 Bổ sung đồng hồ đếm giờ từng phần

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`

Đã thêm:

- Đồng hồ cho diagnostic test.
- Đồng hồ cho từng phần học theo unit.
- Đồng hồ cho quick check.
- Đồng hồ cho exit ticket.
- Hiển thị:
  - Thời gian còn lại.
  - Thời gian đã dùng.
  - Trạng thái quá giờ.
- Lưu timing metadata vào `progressRecord.timings`.

Các helper/component liên quan:

- `formatDuration()`
- `SectionTimer`
- `elapsedSecondsFor()`
- `remainingSecondsFor()`
- `sectionStarts`
- `activeSectionKey`

Ý nghĩa dữ liệu timing:

- Sau này có thể phân tích tốc độ làm bài.
- Có thể phát hiện học sinh làm quá nhanh/quá chậm.
- Có thể dùng cho AI cá nhân hoá tiết sau.

---

## 3.7 Sửa hiển thị công thức Toán ở cổng học sinh

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`
- `src/utils/examScoring.ts`

Đã làm:

- Dùng Markdown + math rendering cho nội dung học sinh.
- Thêm `MathText` để render công thức trong câu hỏi, ví dụ, nhiệm vụ, gợi ý.
- Dùng `ReactMarkdown`, `remarkMath`, `rehypeKatex`.
- Import CSS KaTeX.
- Cải thiện `ensureMathWrapped()` để bọc các biểu thức Toán thường gặp.

Mục tiêu: các công thức như `u_1`, `u_6`, `S_5`, phân số, chỉ số dưới... hiển thị đúng chuẩn hơn thay vì text thô.

---

## 3.8 Sửa UX thông báo lỗi lưu bài làm

File chính:

- `src/pages/AdaptiveStudentPortalPage.tsx`

Trước đây khi fallback lưu tạm, giao diện hiện chữ đỏ gây cảm giác lỗi nghiêm trọng.

Đã đổi sang hệ thống notice có tone:

- `info`
- `warning`
- `error`

Nguyên tắc hiện tại:

- Nếu lưu chính thức thành công: không báo lỗi.
- Nếu phải lưu tạm trên thiết bị: báo vàng/cảnh báo.
- Nếu mất hẳn dữ liệu: mới báo đỏ.

Lưu ý: trong production hiện vẫn có khả năng rơi vào lưu tạm vì Vercel production đang chưa phục vụ API routes.

---

## 3.9 Tinh gọn giao diện giáo viên trong tab học phân hoá

File chính:

- `src/components/tabs/AdaptiveLearningTab.tsx`

Đã làm:

- Làm nút lưu/bật cổng học sinh rõ hơn.
- Giảm cảm giác giao diện bị rối.
- Cho giáo viên chỉnh nội dung bài học phân hoá.
- Lưu bài học lên Firestore.
- Hiển thị link cổng học sinh.

Cần tiếp tục sau này:

- Tạo QR code rõ ràng cho học sinh quét.
- Làm dashboard giáo viên xem tiến độ thật từ Firestore.
- Tách màn hình tạo bài, xem mô phỏng, và quản lý lớp thành các vùng rõ hơn nữa nếu mở rộng.

---

## 3.10 Cập nhật kiểu dữ liệu học phân hoá

File chính:

- `src/lib/adaptive/types.ts`

Đã mở rộng `StudentSessionProgressRecord`:

```ts
export interface StudentSessionProgressRecord {
  id: string;
  teacherId: string;
  lessonId: string;
  lessonTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  route: LearningRoute;
  status: 'in_progress' | 'needs_support' | 'completed';
  diagnosticAttempt: AssessmentAttempt;
  quickCheckAttempts: AssessmentAttempt[];
  exitTicketAttempt?: AssessmentAttempt;
  objectiveStates: ObjectiveMasteryState[];
  remediationAttempts: number;
  completedUnitIds?: string[];
  timings?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}
```

---

## 3.11 Sửa cấu hình Vercel trong repo

File chính:

- `vercel.json`
- `api/export-lesson.ts`

Đã sửa `vercel.json`:

- Thêm rõ:
  - `installCommand: npm install`
  - `buildCommand: npm run build`
  - `outputDirectory: dist`
- Giữ cấu hình functions cho:
  - `api/export-lesson.ts`
  - `api/render-word.ts`
  - `api/adaptive-progress.ts`
- Bỏ rewrite tự trỏ `/api/:path* -> /api/:path*` vì API routes của Vercel không cần rewrite này và nó có thể gây nhiễu khi debug.
- Giữ rewrite SPA:

```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

Đã sửa `api/export-lesson.ts`:

- Đổi `headless: chromium.headless` thành `headless: true` vì type hiện tại của `@sparticuz/chromium` không khai báo property `headless`.

---

## 4. Vấn đề production còn tồn tại: Vercel chưa phục vụ API routes

### 4.1 Triệu chứng

Đã test production domain:

```txt
https://giaooandewey.vercel.app/api/adaptive-progress
https://giaooandewey.vercel.app/api/gemini-relay
```

Kết quả hiện tại:

```txt
STATUS=404
```

Điều đúng cần đạt:

```txt
GET /api/adaptive-progress -> 405 Method not allowed
```

Ý nghĩa:

- `404`: Vercel chưa nhận/serve API route.
- `405`: API route tồn tại, nhưng từ chối vì gọi bằng GET thay vì POST. Đây là trạng thái mong muốn khi test bằng browser/GET.

### 4.2 Vì sao đây không phải lỗi riêng của `api/adaptive-progress.ts`

API cũ `api/gemini-relay.ts` cũng trả `404`. Vì vậy khả năng cao không phải lỗi code của API mới, mà là một trong các lỗi sau:

1. Vercel project đang trỏ sai repository.
2. Vercel project đang deploy sai branch.
3. Vercel project đang deploy sai Root Directory.
4. Production deployment chưa lấy commit mới nhất.
5. Domain `giaooandewey.vercel.app` đang gắn với một Vercel project khác.
6. Build/deploy trên Vercel bỏ qua thư mục `api` vì root project không phải `soangiaoan`.
7. Dashboard Vercel đang override build settings khác với `vercel.json`.

---

## 5. Việc người dùng cần làm thủ công trên Vercel

Do môi trường hiện tại không có token/đăng nhập Vercel, không thể tự chỉnh dashboard Vercel trực tiếp. Cần kiểm tra thủ công như sau.

### 5.1 Kiểm tra project/domain đúng

Vào Vercel Dashboard → mở project đang phục vụ domain:

```txt
giaooandewey.vercel.app
```

Kiểm tra:

- Domain này có đúng là project web soạn giáo án không.
- Nếu domain đang nằm ở project cũ/khác, cần chuyển domain sang project đúng hoặc deploy project đúng.

### 5.2 Settings → Git

Cần đúng các mục:

- Repository: repo chứa thư mục `soangiaoan`.
- Production Branch: `main`.
- Latest production deployment phải lấy commit:

```txt
d56f3fa Fix Vercel API route configuration
```

Nếu deployment mới nhất không phải commit này, cần redeploy latest commit.

### 5.3 Settings → General → Build & Development Settings

Nếu Vercel project kết nối từ monorepo gốc `edu-lesson-automation`, bắt buộc:

```txt
Root Directory: soangiaoan
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Nếu Vercel project kết nối trực tiếp vào repo/thư mục `soangiaoan`, Root Directory có thể để trống, nhưng vẫn nên kiểm tra:

```txt
Framework Preset: Vite
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Điểm quan trọng nhất: Vercel phải nhìn thấy các file:

```txt
api/adaptive-progress.ts
api/gemini-relay.ts
api/render-word.ts
api/export-lesson.ts
```

ở root của project mà Vercel build.

### 5.4 Settings → Environment Variables

Production environment cần có Firebase Admin credentials.

Khuyến nghị dùng một biến:

```txt
FIREBASE_SERVICE_ACCOUNT_KEY
```

Giá trị là toàn bộ JSON service account Firebase.

Hoặc dùng ba biến:

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Cần thêm cho đúng environment:

- Production
- Preview nếu muốn test preview deployment
- Development nếu dùng Vercel dev/pull local

Sau khi thêm/sửa env vars, phải redeploy. Vercel không tự áp env mới vào deployment cũ.

### 5.5 Deployments → Redeploy

Sau khi chỉnh settings:

1. Vào tab Deployments.
2. Chọn deployment mới nhất từ branch `main`.
3. Bấm Redeploy.
4. Không dùng cache nếu nghi ngờ cache build cũ.
5. Đợi deploy xong.
6. Mở Build Logs kiểm tra có dấu hiệu build từ đúng thư mục `soangiaoan`.

Dấu hiệu đúng:

- Có chạy `npm install`.
- Có chạy `npm run build`.
- Có nhận `vercel.json` của repo `soangiaoan`.
- Có tạo Serverless Functions cho `api/*.ts`.

---

## 6. Cách kiểm tra sau khi sửa Vercel

### 6.1 Test bằng browser

Mở:

```txt
https://giaooandewey.vercel.app/api/adaptive-progress
```

Kết quả mong muốn:

```txt
405 Method not allowed
```

Nếu vẫn là:

```txt
404
```

thì Vercel vẫn chưa phục vụ API route.

### 6.2 Test bằng PowerShell

Chạy:

```powershell
$urls = @(
  'https://giaooandewey.vercel.app/api/adaptive-progress',
  'https://giaooandewey.vercel.app/api/gemini-relay'
)
foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -Method GET -UseBasicParsing -TimeoutSec 20 -ErrorAction SilentlyContinue
    "$u STATUS=$($r.StatusCode)"
  } catch {
    if ($_.Exception.Response) {
      "$u STATUS=$([int]$_.Exception.Response.StatusCode)"
    } else {
      "$u ERROR=$($_.Exception.Message)"
    }
  }
}
```

Kỳ vọng:

```txt
https://giaooandewey.vercel.app/api/adaptive-progress STATUS=405
```

Với `api/gemini-relay.ts`, tuỳ handler có thể trả `405`, `400`, hoặc lỗi thiếu payload/env, nhưng không được là `404`.

### 6.3 Test luồng học sinh thật

Sau khi API không còn `404`:

1. Vào web giáo viên.
2. Mở tab học phân hoá.
3. Lưu & bật cổng học sinh.
4. Vào link học sinh `/adaptive/student/:teacherId`.
5. Nhập mã học sinh.
6. Làm diagnostic.
7. Học ít nhất một unit.
8. Làm quick check.
9. Làm exit ticket.
10. Kiểm tra Firestore có dữ liệu ở:
    - `adaptiveSessionProgress`
    - `studentLearningProfiles`

---

## 7. Nếu vẫn lỗi sau khi Vercel nhận API routes

Sau khi `/api/adaptive-progress` không còn `404`, vẫn có thể gặp các lỗi khác. Cách đọc lỗi:

### 7.1 GET trả 405

Đây là tốt. API tồn tại.

### 7.2 POST trả 400

Payload frontend thiếu/sai field. Cần kiểm tra `src/services/adaptiveProgressApi.ts` và object gửi từ `src/pages/AdaptiveStudentPortalPage.tsx`.

### 7.3 POST trả 403

Thường do:

- `portalEnabled !== true`
- `lesson.id` không khớp `lessonId`
- bài học giáo viên chưa được lưu/bật cổng

Cần kiểm tra document `adaptiveLessons/{teacherId}`.

### 7.4 POST trả 404 từ API JSON

Nếu response JSON là:

```json
{ "error": "Adaptive lesson not found" }
```

thì API đã chạy, nhưng không tìm thấy document `adaptiveLessons/{teacherId}`. Đây khác với Vercel route `404` text/plain.

### 7.5 POST trả 500

Khả năng cao thiếu/sai Firebase Admin env vars:

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- hoặc `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Cần xem Vercel Function Logs.

---

## 8. Các file quan trọng cho người tiếp tục debug

| File | Vai trò |
|------|--------|
| `vercel.json` | Cấu hình Vercel build/output/functions/SPA rewrite |
| `api/adaptive-progress.ts` | API server-side lưu tiến độ học sinh và hồ sơ dài hạn bằng Firebase Admin |
| `src/services/adaptiveProgressApi.ts` | Frontend wrapper gọi `/api/adaptive-progress` |
| `src/pages/AdaptiveStudentPortalPage.tsx` | Cổng học sinh, test đầu giờ, tuyến học, timer, quick check, exit ticket, lưu kết quả |
| `src/lib/adaptive/types.ts` | Type dữ liệu học phân hoá, session progress, learning profile |
| `src/lib/adaptive/diagnosticEngine.ts` | Chấm diagnostic/quick check, xếp tuyến, quyết định remediation/support |
| `src/lib/adaptive/sampleAdaptiveLesson.ts` | Bài mẫu Toán 11 Cấp số cộng với duration/pacing/5-step/unit/exit ticket |
| `src/components/tabs/AdaptiveLearningTab.tsx` | Giao diện giáo viên cho học phân hoá, lưu/bật cổng học sinh |
| `firestore.rules` | Rules Firestore client-side; không thay thế được API Admin nhưng vẫn cần đúng cho đọc/ghi client |
| `api/gemini-relay.ts` | API cũ dùng làm route kiểm chứng: nếu file này cũng 404 thì Vercel chưa nhận API routes |
| `api/export-lesson.ts` | API export DOCX/PDF; vừa sửa type `headless` |

---

## 9. Việc cần làm tiếp ngay

### Ưu tiên 1 — Fix production API routes trên Vercel

Mục tiêu:

```txt
GET https://giaooandewey.vercel.app/api/adaptive-progress -> 405
```

Không làm tiếp QR/AI feedback trước khi vấn đề này rõ ràng, vì nếu API production chưa chạy thì hồ sơ dài hạn vẫn có thể rơi vào fallback.

Checklist:

- [ ] Kiểm tra domain `giaooandewey.vercel.app` thuộc đúng Vercel project.
- [ ] Kiểm tra Vercel project deploy đúng repo/branch `main`.
- [ ] Kiểm tra latest deployment là commit `d56f3fa` hoặc mới hơn.
- [ ] Nếu monorepo, đặt Root Directory là `soangiaoan`.
- [ ] Kiểm tra build settings: Vite / `npm install` / `npm run build` / `dist`.
- [ ] Kiểm tra Production env vars Firebase Admin.
- [ ] Redeploy sau khi chỉnh settings/env.
- [ ] Test `/api/adaptive-progress` không còn `404`.
- [ ] Test học sinh submit exit ticket và kiểm tra Firestore.

### Ưu tiên 2 — Link/QR cho học sinh

Sau khi API ổn:

- Tạo QR code cho link `/adaptive/student/:teacherId`.
- Hiển thị rõ trong tab giáo viên.
- Có nút copy link.
- Có trạng thái bật/tắt cổng học sinh.
- Có thể thêm hướng dẫn ngắn cho giáo viên chiếu lên màn hình.

Dependency đã có trong `package.json`:

```txt
qrcode.react
```

### Ưu tiên 3 — Dashboard giáo viên xem dữ liệu thật

Cần đọc từ Firestore:

- `adaptiveSessionProgress`
- `studentLearningProfiles`

Mục tiêu:

- Xem học sinh nào đã làm.
- Điểm diagnostic.
- Tuyến học được phân.
- Quick check từng unit.
- Exit ticket.
- Học sinh cần hỗ trợ.
- Thời gian từng phần.

### Ưu tiên 4 — AI feedback/giảng lại có kiểm soát

Chưa triển khai. Khi làm cần cẩn thận:

- AI không được đưa đáp án trực tiếp quá sớm.
- AI phải dựa trên objective/misconception/route hiện tại.
- Có giới hạn prompt để không phá quy trình 5 bước.
- Có log feedback để giáo viên xem lại.

---

## 10. Rủi ro/điểm mù cần chú ý

### 10.1 Vercel Root Directory

Đây là nghi vấn lớn nhất hiện tại. Nếu Vercel build từ root `edu-lesson-automation` thay vì `soangiaoan`, các file `soangiaoan/api/*.ts` sẽ không trở thành serverless functions.

### 10.2 Domain trỏ nhầm project

Nếu `giaooandewey.vercel.app` thuộc một project cũ, dù repo đã push đúng cũng không ảnh hưởng production hiện tại.

### 10.3 Env vars Firebase Admin

Ngay cả khi API route chạy, thiếu env vars sẽ làm POST lỗi 500. Cần xem Vercel Function Logs.

### 10.4 Firestore rules chưa phải giải pháp triệt để

Firestore rules vẫn quan trọng cho đọc/ghi client, nhưng hướng lưu bền vững cho học sinh là API Admin. Không nên phụ thuộc hoàn toàn vào client rules cho dữ liệu học tập dài hạn.

### 10.5 `localStorage` chỉ là fallback

Nếu thấy thông báo lưu tạm trên thiết bị, nghĩa là dữ liệu chưa chắc đã về server. Không thể dùng trạng thái đó cho triển khai nhiều lớp/hàng trăm tiết.

### 10.6 Build warning chunk lớn

`npm run build` pass nhưng có warning chunk lớn. Chưa chặn production, nhưng sau này nên code-split nếu app chậm.

---

## 11. Hướng dẫn cho agent/kỹ sư tiếp theo

Khi bắt đầu session mới:

1. Đọc file này.
2. Kiểm tra Git status.
3. Không sửa lại các phần đã hoàn thành nếu không có lỗi cụ thể.
4. Việc đầu tiên cần xác minh là Vercel production API route.
5. Nếu có quyền Vercel, kiểm tra Dashboard theo mục 5.
6. Nếu không có quyền Vercel, yêu cầu user gửi ảnh/copy các settings:
   - Project domain.
   - Git repo/branch.
   - Root Directory.
   - Build settings.
   - Latest deployment commit.
   - Build logs phần đầu.
   - Environment Variables names, không cần gửi secret value.
7. Sau khi chỉnh Vercel, test lại endpoint.
8. Chỉ khi `/api/adaptive-progress` không còn `404`, mới tiếp tục làm QR hoặc AI feedback.

---

## 12. Tóm tắt ngắn cho người xử lý Vercel

Vấn đề hiện tại không phải là thiếu file API. Repo đã có:

```txt
api/adaptive-progress.ts
api/gemini-relay.ts
api/render-word.ts
api/export-lesson.ts
```

Nhưng production:

```txt
https://giaooandewey.vercel.app/api/adaptive-progress -> 404
https://giaooandewey.vercel.app/api/gemini-relay -> 404
```

Do `api/gemini-relay.ts` là API cũ cũng 404, khả năng cao là Vercel chưa deploy đúng root/project/domain. Cần chỉnh Vercel Dashboard để project build từ đúng thư mục `soangiaoan` và deploy commit `d56f3fa` hoặc mới hơn.

Kết quả cần đạt:

```txt
GET /api/adaptive-progress -> 405 Method not allowed
```

Sau đó mới test POST thật từ cổng học sinh và kiểm tra Firestore.
