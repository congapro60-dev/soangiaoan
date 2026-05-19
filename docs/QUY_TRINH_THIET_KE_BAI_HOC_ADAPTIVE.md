# QUY TRÌNH THIẾT KẾ BÀI HỌC ADAPTIVE

**Phiên bản:** 1.0
**Ngày:** 19/05/2026
**Áp dụng cho:** soangiaoan / Adaptive Student Portal
**Mục đích:** Khung quy trình lặp lại để thiết kế bài học hấp dẫn, tích hợp nhất quán 4 nhóm tool ngoại sinh

---

## MỤC LỤC

1. [Triết lý sư phạm](#1-triết-lý-sư-phạm)
2. [Bản đồ tích hợp 4 tool](#2-bản-đồ-tích-hợp-4-tool)
3. [Quy trình tạo bài học mới (10 bước)](#3-quy-trình-tạo-bài-học-mới)
4. [Thư viện tool theo chủ đề](#4-thư-viện-tool-theo-chủ-đề)
5. [Spec kỹ thuật Tool 2 (Gemini API)](#5-spec-kỹ-thuật-tool-2-gemini-api-integration)
6. [Template prompt cho Gemini](#6-template-prompt-cho-gemini)
7. [Checklist QA trước khi xuất bản](#7-checklist-qa-trước-khi-xuất-bản)

---

## 1. TRIẾT LÝ SƯ PHẠM

### 1.1. Bốn giai đoạn tâm lý của học sinh

Mỗi bài học 40 phút phải đưa học sinh qua đủ 4 giai đoạn theo thứ tự:

```
   TÒ MÒ    →    HIỂU    →   THÀNH THẠO   →    VUI
     🎨            🔷              🧮             🎮
   (3 phút)    (12-15 phút)    (15-20 phút)    (2-3 phút)
```

Thiếu một mắt xích là bài học mất sức hút.

### 1.2. Tiến trình Concrete → Pictorial → Abstract (CPA)

Áp dụng cho từng **mảnh kiến thức**:

| Bước | Cấp độ | Tool dùng |
|------|--------|-----------|
| 1 | **Concrete** (cụ thể, tình huống) | Ảnh minh họa (Tool 1) |
| 2 | **Pictorial** (hình ảnh, mô phỏng) | Mô phỏng HTML (Tool 2) |
| 3 | **Abstract** (công thức, ký hiệu) | Worked example + Tool 3 |

**Quy tắc bất di bất dịch:** Tool 2 (mô phỏng) phải xuất hiện **TRƯỚC** worked example, không phải sau.

### 1.3. Nguyên tắc lựa chọn tool

- **Mỗi tool có 1 nhiệm vụ rõ ràng** — không nhồi nhét nhiều tool cùng giai đoạn
- **Tool ngoại sinh không thay thế giáo viên** — luôn cần lời dẫn ngắn từ giáo viên
- **Tool nào không có giá trị giáo dục rõ ràng thì bỏ** — đẹp không bằng hiệu quả

---

## 2. BẢN ĐỒ TÍCH HỢP 4 TOOL

### 2.1. Bốn nhóm tool

| Nhóm | Tool | Hình thức | Quản lý |
|------|------|-----------|---------|
| 🎨 Tool 1 | Gemini Gem sinh ảnh minh họa | Link mở Gem, giáo viên tải ảnh về | Thủ công, lưu ảnh vào Firebase Storage |
| 🔷 Tool 2 | Gemini API sinh mô phỏng HTML | Tích hợp sâu, app tự gọi API | Tự động, cache vào Firestore |
| 🧮 Tool 3 | congcutoanhoc.com (15 tool) | Iframe nhúng trong bài | Khai báo qua `externalToolIds` |
| 🎮 Tool 4 | gamedoikhang | Link mở tab mới | Khai báo qua `externalToolIds` |

### 2.2. Tiến trình 40 phút chuẩn

```
┌─ GIAI ĐOẠN 1: KẾT NỐI (3 phút) ────────────────────┐
│ 🎨 Tool 1 — Ảnh minh họa sinh từ đề bài            │
│ Giáo viên dẫn: "Bài hôm nay liên quan đến..."      │
└─────────────────────────────────────────────────────┘
            ↓
┌─ GIAI ĐOẠN 2: CHẨN ĐOÁN (7 phút) ──────────────────┐
│ 📋 Test đầu giờ 5 câu                              │
│ Không có tool — pure assessment                    │
│ Output: phân tuyến Foundation/Standard/Challenge   │
└─────────────────────────────────────────────────────┘
            ↓
┌─ GIAI ĐOẠN 3: HỌC TỪNG MẢNH (15 phút) ─────────────┐
│                                                     │
│ Mỗi mảnh kiến thức lặp lại vòng tròn này:          │
│                                                     │
│   📖 Lý thuyết (text theo tuyến)                   │
│         ↓                                           │
│   🔷 Tool 2 — Mô phỏng HTML tương tác              │
│      Học sinh kéo tham số, xây trực giác           │
│         ↓                                           │
│   📝 Worked example (timer, gợi ý, nộp)            │
│         ↓                                           │
│   🧮 Tool 3 — congcutoanhoc tool                   │
│      Học sinh kiểm chứng, thử số khác              │
│         ↓                                           │
│   ✅ Quick check (2-3 câu)                          │
│      PASS → mảnh tiếp / FAIL → xem lại Tool 2     │
│                                                     │
└─────────────────────────────────────────────────────┘
            ↓
┌─ GIAI ĐOẠN 4: EXIT TICKET (5 phút) ────────────────┐
│ 📋 3 câu đánh giá cuối                             │
│ Không có tool                                       │
└─────────────────────────────────────────────────────┘
            ↓
┌─ GIAI ĐOẠN 5: HOÀN THÀNH ──────────────────────────┐
│ 🎮 Tool 4 — Game đối kháng (link)                  │
│ "Em đã học xong! Thử thách bạn cùng lớp?"          │
└─────────────────────────────────────────────────────┘
```

### 2.3. Vai trò chi tiết mỗi tool

| Tool | Thời điểm | Mục đích | Cảm xúc học sinh |
|------|-----------|----------|------------------|
| 🎨 Tool 1 | Đầu bài | Kéo vào câu chuyện | *"Ồ bài này về thực tế thế à?"* |
| 🔷 Tool 2 | Trước công thức | Xây trực giác visual | *"Tôi hiểu tại sao có (n-1)"* |
| 🧮 Tool 3 | Sau ví dụ | Kiểm chứng + khám phá | *"Thử thay số khác xem"* |
| 🎮 Tool 4 | Cuối bài | Vui + nhớ lâu | *"Hôm sau đánh lại bạn!"* |

---

## 3. QUY TRÌNH TẠO BÀI HỌC MỚI

10 bước cố định, làm theo thứ tự. Mỗi bài mới mất khoảng **2-3 giờ** chuẩn bị.

### Bước 1 — Định nghĩa bài học (15 phút)

Trả lời 5 câu hỏi:

- [ ] Lớp nào? (10/11/12)
- [ ] Chương + tên bài
- [ ] 3-5 **mục tiêu học tập** (objective) theo Bloom (understand / apply / analyze)
- [ ] Số **mảnh kiến thức** (knowledge unit) — thường 2-3 mảnh / bài 40 phút
- [ ] Bài này gắn với tình huống thực tế nào? (sẽ dùng cho Tool 1)

### Bước 2 — Viết test chẩn đoán (20 phút)

5 câu hỏi, mỗi câu gắn 1-2 objective. Đủ độ khó tăng dần:
- Câu 1-2: dễ (nhận diện)
- Câu 3-4: vừa (áp dụng)
- Câu 5: khó (vận dụng thực tế)

Mỗi câu cần khai báo:
- `objectiveIds`
- `misconceptionIds` (sai lầm thường gặp)
- `difficulty`

### Bước 3 — Thiết kế 3 tuyến học cho mỗi mảnh (40 phút)

Mỗi mảnh kiến thức cần đủ 3 tuyến:

| Tuyến | Đối tượng | Đặc điểm |
|-------|-----------|----------|
| **Foundation** | Học sinh yếu | Câu dẫn từng bước, ví dụ rõ, hint nhiều |
| **Standard** | Học sinh trung bình | Trình bày chuẩn, ít hint, 1 ví dụ + bài luyện |
| **Challenge** | Học sinh khá | Bài toán ngược / tình huống thực tế / sáng tạo |

Mỗi tuyến gồm:
- `explanation` (text giải thích)
- 1 `workedExample` (có problem, solution, hints, timer)
- 1 `practiceTask`

### Bước 4 — Viết Quick Check + Exit Ticket (15 phút)

- **Quick check** cho mỗi mảnh: 2-3 câu, ngắn (3-4 phút)
- **Exit ticket** cho cả bài: 3 câu chốt mục tiêu chính (5 phút)

### Bước 5 — Sinh ảnh đầu bài bằng Tool 1 (10 phút)

1. Mở https://gemini.google.com/gem/2270eacd0ce9
2. Paste đề bài hoặc mô tả tình huống thực tế của bài
3. Nhận 2 phiên bản ảnh: **REALISTIC** và **TEXTBOOK STYLE**
4. Tải ảnh về máy
5. Upload vào Firebase Storage: path `lesson-illustrations/{lessonId}/cover-{realistic|textbook}.png`
6. Khai báo trong `AdaptiveLesson`:
   ```typescript
   coverImageRealistic: '<storage URL>',
   coverImageTextbook: '<storage URL>',
   ```

> **Lưu ý:** Tool 1 đặc biệt hữu ích cho slide bài giảng / Canva. Có thể bỏ qua nếu bài thuần lý thuyết không có tình huống thực tế.

### Bước 6 — Sinh mô phỏng HTML bằng Tool 2 (15 phút mỗi mảnh)

**Cần triển khai Tool 2 vào dashboard giáo viên trước (xem [Phần 5](#5-spec-kỹ-thuật-tool-2-gemini-api-integration))**

Sau khi triển khai xong:

1. Mở dashboard → chọn bài học → chọn mảnh kiến thức
2. Bấm "Tạo mô phỏng tương tác"
3. App đã có sẵn problem text của worked example đầu tiên trong mảnh
4. Giáo viên tinh chỉnh prompt nếu cần (có template gợi ý)
5. App gọi Gemini API → nhận HTML (5-15 giây)
6. Preview HTML trong sandbox iframe → giáo viên duyệt
7. Bấm "Lưu" → HTML cache vào Firestore `lessonSimulations/{lessonId}_{unitId}`
8. Học sinh khi vào mảnh đó sẽ thấy mô phỏng

### Bước 7 — Chọn congcutoanhoc tools (Tool 3) cho mỗi mảnh (5 phút)

Mở [thư viện tool theo chủ đề](#4-thư-viện-tool-theo-chủ-đề) ở Phần 4.

Chọn 2-3 tool phù hợp với mảnh, khai báo:
```typescript
externalToolIds: ['cscn', 'tinhcapso']  // ví dụ cho cấp số cộng
```

> **Lưu ý:** Chỉ `vatnemxien` đã verified cross-origin embed. 14 tool còn lại cần test thực tế lần đầu, nếu chặn thì hệ thống tự fallback "Mở tab mới".

### Bước 8 — Thêm Tool 4 (Game đối kháng) — mặc định (1 phút)

Mặc định mọi bài đều có ở cuối:
```typescript
completionReward: {
  toolId: 'gamedoikhang',
  message: 'Em đã học xong! Thử thách bạn cùng lớp trong Đấu Trường Tri Thức?'
}
```

(Khi triển khai feature `completionReward`, hiện chưa có)

### Bước 9 — Nạp vào hệ thống (10 phút)

**Cách 1 (hiện tại):** Sửa file `src/lib/adaptive/sampleAdaptiveLesson.ts` — copy template, sửa nội dung.

**Cách 2 (tương lai — Lesson Builder UI):** Giao diện form tạo bài trong dashboard giáo viên.

### Bước 10 — Test với 1 học sinh thật (30 phút)

Quan sát học sinh chạy nguyên bài 40 phút. Ghi nhận:
- [ ] Học sinh có bị tắc ở chỗ nào không?
- [ ] Tool nào học sinh bỏ qua / không hiểu cách dùng?
- [ ] Timer có hợp lý không?
- [ ] Quick check sai nhiều thì là do bài hay do học sinh?

Sửa lại theo feedback, rồi mới `status: 'published'`.

---

## 4. THƯ VIỆN TOOL THEO CHỦ ĐỀ

Tra cứu nhanh để chọn Tool 3 (congcutoanhoc) cho từng chủ đề.

### Toán 10

| Chủ đề | Tool 3 (congcutoanhoc) |
|--------|------------------------|
| Hàm số bậc 2 | `vatnemxien` (Mô phỏng vật ném xiên) ✅ verified |
| Thống kê | `sodactrungmslgn` (Số đặc trưng) |

### Toán 11

| Chủ đề | Tool 3 (congcutoanhoc) |
|--------|------------------------|
| Cấp số cộng | `cscn`, `tinhcapso` |
| Cấp số nhân | `cscn`, `bancovua` (Bàn cờ vua) |
| Dãy số | `ranangoanCS`, `tranhdau` |
| Hàm lượng giác | `duongtronlg`, `hamsosin` |
| Đạo hàm | `pttieptuyen` (Phương trình tiếp tuyến) |
| Hàm mũ - logarit | `hammu`, `hamlog`, `dudoandanso` (Dự đoán dân số) |
| Hình không gian | `gocnhidien` (Góc nhị diện), `thietdienlapphuong` (Thiết diện) |

### Toán 12

(Hiện chưa có tool ở congcutoanhoc.com cho lớp 12. Có thể bù bằng Tool 2 mô phỏng riêng.)

### Quy tắc chọn tool

- 1 mảnh kiến thức → **tối đa 2-3 tool**, không quá nhiều
- Ưu tiên tool có **tính tương tác** (kéo, nhập số) hơn tool chỉ hiển thị
- Tool `verified` (đã test embed) ưu tiên hơn tool `inferred`

---

## 5. SPEC KỸ THUẬT TOOL 2 (GEMINI API INTEGRATION)

### 5.1. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────┐
│  TEACHER DASHBOARD (frontend)                       │
│  - Form: paste/chọn problem text                   │
│  - Button: "Tạo mô phỏng"                          │
│  - Preview iframe sandbox                          │
│  - Button: "Lưu" / "Tạo lại"                       │
└─────────────────────────────────────────────────────┘
                       ↓ POST /api/generate-simulation
┌─────────────────────────────────────────────────────┐
│  VERCEL SERVERLESS FUNCTION                         │
│  api/generate-simulation.ts                         │
│  - Verify Firebase Auth token (chỉ teacher mới gọi)│
│  - Build prompt với system instruction             │
│  - Call Gemini API (gemini-2.5-flash)              │
│  - Validate HTML output                            │
│  - Save to Firestore lessonSimulations             │
│  - Return { simulationId, html }                   │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  FIRESTORE                                          │
│  Collection: lessonSimulations                      │
│  Doc ID: {lessonId}_{unitId}                        │
│  Schema:                                            │
│  {                                                  │
│    lessonId, unitId, exampleId,                    │
│    problemText, html, style,                       │
│    createdAt, createdBy (teacherId),               │
│    htmlSizeBytes, geminiModel                      │
│  }                                                  │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  STUDENT PORTAL (frontend)                          │
│  Khi học sinh vào mảnh có simulation:              │
│  - Fetch simulation từ Firestore                   │
│  - Render trong <iframe srcDoc={html} sandbox=... />│
└─────────────────────────────────────────────────────┘
```

### 5.2. Firestore Security Rules cho `lessonSimulations`

```javascript
match /lessonSimulations/{simulationId} {
  // Teacher tạo simulation cho bài của mình
  allow create: if request.auth != null
                && request.resource.data.createdBy == request.auth.uid
                && request.resource.data.html is string
                && request.resource.data.html.size() < 200000  // max 200KB HTML
                && request.resource.data.lessonId is string;

  // Học sinh đọc được simulation của bài đang học
  // (cần xác thực qua progressId, tạm thời cho phép authenticated read)
  allow read: if request.auth != null;

  // Chỉ teacher tạo mới sửa được
  allow update: if request.auth != null
                && resource.data.createdBy == request.auth.uid;

  allow delete: if request.auth != null
                && resource.data.createdBy == request.auth.uid;
}
```

### 5.3. API Route Spec

**Endpoint:** `POST /api/generate-simulation`

**Auth:** Firebase ID Token trong `Authorization: Bearer <token>`

**Request body:**
```typescript
{
  lessonId: string;
  unitId: string;
  exampleId: string;
  problemText: string;
  style?: 'realistic' | 'textbook';  // default 'textbook'
  regenerate?: boolean;  // force regenerate ignoring cache
}
```

**Response (200):**
```typescript
{
  ok: true;
  simulationId: string;
  html: string;
  cached: boolean;
  geminiTokensUsed?: number;
}
```

**Response (error):**
```typescript
{
  ok: false;
  error: 'unauthorized' | 'invalid_input' | 'gemini_error' | 'html_too_large' | 'rate_limited';
  message: string;
}
```

### 5.4. Sandbox iframe (student side)

```tsx
<iframe
  srcDoc={simulation.html}
  sandbox="allow-scripts"           // ⚠️ KHÔNG allow-same-origin → cách ly hoàn toàn
  referrerPolicy="no-referrer"
  loading="lazy"
  style={{ width: '100%', maxHeight: 600, border: 'none' }}
  title={`Mô phỏng — ${unitTitle}`}
/>
```

**Lý do dùng `srcDoc` thay vì `src`:** HTML lưu trong Firestore, không cần host file riêng. Sandbox `allow-scripts` cho phép JS chạy nhưng không truy cập được parent window (vì không có `allow-same-origin`).

### 5.5. Caching strategy

- Mỗi `(lessonId, unitId, exampleId)` chỉ tạo simulation **1 lần**
- Student-side: fetch 1 lần khi vào unit, cache trong `useMemo`
- Teacher có thể bấm "Tạo lại" → set `regenerate: true` → ghi đè doc cũ
- Không tự động regenerate

### 5.6. Quota & cost (Gemini API)

| Hạng mục | Giá trị |
|----------|---------|
| Model | `gemini-2.5-flash` |
| Free tier | 15 requests/phút, 1500 requests/ngày |
| Cost (nếu vượt free) | ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens |
| Output size trung bình | ~30-80 KB HTML |
| Ước tính token / simulation | ~4000-8000 output tokens |
| **Cost / simulation (vượt free)** | **~$0.002 - $0.003** |

Với 1000 simulations/tháng (≈ 100 bài × 10 mảnh × 1 simulation): chỉ ~$2-3/tháng.

Free tier đủ dùng cho < 1500 simulations/tháng.

### 5.7. Rate limiting

- Per teacher: 10 calls/phút
- Per project: 1500 calls/ngày
- Hết quota → 429 + thông báo "Vui lòng thử lại sau X phút"

### 5.8. Error handling

| Lỗi | Xử lý |
|-----|-------|
| Gemini timeout | Retry 1 lần với exponential backoff |
| HTML > 200KB | Reject, yêu cầu rút gọn |
| HTML invalid syntax | Parse error → báo lỗi giáo viên |
| Rate limit | Trả 429, hiện đếm ngược |
| Firebase auth fail | Trả 401 |

---

## 6. TEMPLATE PROMPT CHO GEMINI

### 6.1. System Prompt cho Tool 2 (Mô phỏng HTML)

```
Bạn là chuyên gia tạo mô phỏng HTML tương tác cho học sinh THPT Việt Nam.

NHIỆM VỤ: Sinh ra 1 file HTML duy nhất (self-contained, không cần asset ngoài)
mô phỏng đề bài toán được cung cấp, để học sinh hiểu trực quan trước khi học công thức.

YÊU CẦU KỸ THUẬT:
- Output: 1 đoạn HTML hoàn chỉnh từ <!DOCTYPE html> đến </html>
- CSS inline trong <style>, JS inline trong <script>
- KHÔNG dùng asset bên ngoài (no <img src="http...">, no <link href="...">)
- KHÔNG dùng framework (no React, Vue, jQuery)
- Vanilla JS + Canvas/SVG cho hình động nếu cần
- Tổng dung lượng < 100KB

YÊU CẦU GIÁO DỤC:
- Có ít nhất 1 thanh trượt / input / nút điều khiển để học sinh thay đổi tham số
- Khi học sinh thay đổi tham số, mô phỏng cập nhật REAL-TIME
- Hiển thị bảng giá trị / công thức tương ứng cập nhật theo
- KHÔNG hiện đáp án bài toán
- KHÔNG nhồi chữ giải thích dài — chỉ chú thích đại lượng

PHONG CÁCH:
- {style}: 'textbook' = đường nét sạch, màu pastel, kiểu SGK
- {style}: 'realistic' = hình minh họa sinh động, gradient, animation mượt

NGÔN NGỮ: Tiếng Việt, dùng ký hiệu toán học chuẩn (u_n, S_n, d, ...)
```

### 6.2. User Prompt template

```
Đề bài: {problemText}

Lớp: {grade}
Chủ đề: {topic}
Mục tiêu mô phỏng: Giúp học sinh hiểu trực quan {targetConcept}
Phong cách: {style}

Hãy sinh HTML mô phỏng.
```

### 6.3. Ví dụ cụ thể — Cấp số cộng

**Input:**
```
Đề bài: Cho cấp số cộng có u_1 = 2, d = 3. Tính u_5.
Lớp: 11
Chủ đề: Cấp số cộng
Mục tiêu mô phỏng: Giúp học sinh thấy tại sao u_n = u_1 + (n-1)d, đặc biệt là phần (n-1)
Phong cách: textbook
```

**Output mong muốn (Gemini sinh):**

HTML có:
- 2 slider: `u_1` (0-20), `d` (-10 đến 10)
- Hiển thị dãy `u_1, u_2, ..., u_7` dạng cột bar tăng/giảm đều
- Highlight số bước nhảy từ u_1 đến u_n (n-1 mũi tên)
- Bảng cập nhật real-time: n | u_n | công thức

### 6.4. Prompt template cho Tool 1 (Ảnh minh họa) — để giáo viên dùng trực tiếp trên Gem

```
[Lớp {grade} — Bài {topic}]

Đề bài: {problemText}

Hãy tạo ảnh minh họa cho đề trên theo 2 phong cách:
1) REALISTIC/CINEMATIC — cho slide bài giảng
2) TEXTBOOK STYLE — vector sạch, kiểu SGK

KHÔNG giải bài, KHÔNG hiện đáp án, KHÔNG nhồi chữ.
```

---

## 7. CHECKLIST QA TRƯỚC KHI XUẤT BẢN

Sau khi hoàn tất 10 bước, kiểm tra bài học theo checklist sau trước khi `status: 'published'`:

### 7.1. Cấu trúc bài
- [ ] Tên bài rõ ràng, có gắn `curriculumRef`
- [ ] Đúng 1 `diagnosticTest` (5 câu)
- [ ] 2-3 `knowledgeUnits`, mỗi unit có đủ 3 routes
- [ ] Mỗi route có ≥ 1 worked example và ≥ 1 practice task
- [ ] Mỗi unit có `quickCheck` (2-3 câu)
- [ ] 1 `exitTicket` (3 câu)

### 7.2. Mục tiêu & sai lầm
- [ ] Có ≥ 3 `objectives` với Bloom level rõ ràng
- [ ] Mỗi objective có ≥ 1 `commonMisconception`
- [ ] Mọi câu hỏi gắn ≥ 1 `objectiveId`

### 7.3. Tool integration
- [ ] Ảnh đầu bài (Tool 1) đã upload → có URL trong `coverImageRealistic` / `coverImageTextbook`
- [ ] Mô phỏng HTML (Tool 2) đã tạo cho mỗi mảnh kiến thức → có doc trong Firestore `lessonSimulations`
- [ ] `externalToolIds` (Tool 3) đã khai báo cho mỗi mảnh
- [ ] Game đối kháng (Tool 4) đã có ở `completionReward`

### 7.4. UX & timer
- [ ] Worked example có `timeLimitSeconds` và `hintDelaySeconds` hợp lý
- [ ] Timer trên 1 worked example không quá 5 phút
- [ ] Quick check không quá 3-4 phút
- [ ] Exit ticket không quá 5 phút
- [ ] Tổng `estimatedMinutes` của các unit + diagnostic + exit ticket ≤ 38 phút

### 7.5. Đã test
- [ ] Đã chạy thử với ít nhất 1 học sinh thật từ đầu đến cuối
- [ ] TypeScript build pass (`npm run build`)
- [ ] Không có console error khi chạy local

### 7.6. Pháp lý
- [ ] Nếu dùng tool từ tác giả khác, đã ghi rõ `license` và `author` trong catalog
- [ ] Đã có sự đồng thuận / ghi nhận của tác giả tool (xem [Phụ lục A](#phụ-lục-a))

---

## PHỤ LỤC A — DANH SÁCH TÁC GIẢ TOOL VÀ GHI NHẬN

| Tool | Tác giả | Liên hệ | Trạng thái pháp lý |
|------|---------|---------|---------------------|
| congcutoanhoc.com (15 tool) | Nguyễn Cung Hoàng Nam | Zalo 0908063998 | ⚠️ Cần liên hệ xin phép trước khi production |
| gamedoikhang + giaovienai.vercel.app | Trần Hoài Thanh | (qua Facebook) | ⚠️ Cần liên hệ xin phép |
| Tool 1 - Gemini Gem ảnh minh họa | Trần Hoài Thanh | (qua Facebook) | ✅ Gem public, có thể dùng |
| Tool 2 - Gemini API | Google | — | ✅ Theo Terms of Service Gemini API |

---

## PHỤ LỤC B — LỘ TRÌNH TRIỂN KHAI

| Sprint | Nội dung | Trạng thái |
|--------|----------|------------|
| Sprint A | Tích hợp Tool 3 (congcutoanhoc) + Tool 4 (gamedoikhang) | ✅ Hoàn thành (19/05/2026) |
| Sprint B | Tool 2 — Gemini API backend + dashboard tạo simulation | 🔲 Chưa làm |
| Sprint C | Tool 1 — Upload ảnh đầu bài + render trong portal | 🔲 Chưa làm |
| Sprint D | Lesson Builder UI (thay thế việc sửa file `sampleAdaptiveLesson.ts`) | 🔲 Chưa làm |
| Sprint E | Completion reward — link sang gamedoikhang sau khi hoàn thành | 🔲 Chưa làm |

---

## PHỤ LỤC C — SƠ ĐỒ DỮ LIỆU MỞ RỘNG

Khi triển khai Sprint B-E, cần mở rộng các interface sau:

```typescript
// types.ts — bổ sung
export interface AdaptiveLesson {
  // ... các field hiện có ...

  // Sprint C
  coverImageRealistic?: string;  // URL Firebase Storage
  coverImageTextbook?: string;

  // Sprint E
  completionReward?: {
    toolId: string;
    message: string;
  };
}

export interface KnowledgeUnit {
  // ... các field hiện có ...

  // Sprint B
  simulationId?: string;  // ref đến lessonSimulations/{simulationId}
}

// Sprint B — collection mới
export interface LessonSimulation {
  id: string;  // {lessonId}_{unitId}
  lessonId: string;
  unitId: string;
  exampleId: string;
  problemText: string;
  html: string;
  style: 'textbook' | 'realistic';
  createdAt: string;
  createdBy: string;  // teacherId
  htmlSizeBytes: number;
  geminiModel: string;
}
```

---

**HẾT TÀI LIỆU**

*File này nên được commit vào repo `soangiaoan` tại đường dẫn `docs/QUY_TRINH_THIET_KE_BAI_HOC_ADAPTIVE.md` để cả team tham khảo.*
