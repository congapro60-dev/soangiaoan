# Báo cáo đối chiếu: Cấu trúc bài học phân hóa của App vs 2 bài Gemini Canvas

> **Cách lập báo cáo:** Đã đọc trực tiếp code trong dự án (`src/lib/dewey`, `src/lib/adaptive`, `src/components/adaptive`, `src/pages`, `api/`) **và** đã tự tay đi hết 2 link Gemini share bằng trình duyệt (làm pre-test, qua cả 5 bước, làm 3 gói Olympia, kéo slider…). Báo cáo này dành cho Claude Code đọc và thực thi.
>
> - LINK 1 (hội thoại thiết kế): https://gemini.google.com/share/ee43bb37571d
> - LINK 2 (bài học đã tạo): https://gemini.google.com/share/5b7e935e22db
> - Tài liệu nội bộ tham chiếu: `docs/features/07-adaptive-learning.md`

---

## TL;DR (1 đoạn)

Cấu trúc bài học phía học sinh của bạn (`src/lib/dewey`) **giống bài Gemini LINK 2 tới mức gần như 1:1**, và tầng adaptive (`src/lib/adaptive/diagnosticEngine.ts`) còn **mạnh hơn Gemini rất nhiều** (xếp tuyến + pacing thời gian thực — thứ Gemini không có). Bệnh "ra bài toàn chữ" **không** do thiếu cấu trúc hay thiếu khả năng vẽ hình, mà do **đứt mạch dữ liệu giữa 2 đường render** và **template bỏ qua các slot hình/mô phỏng**. Vá đúng 2 hàm (`template.ts`, `adaptiveToDewey.ts`) + nối field `simulationId ↔ simulationHtml` là hết bệnh.

---

## 1. Hai đường render bài học phía học sinh (xác nhận trên code)

| Đường | File chính | Học sinh thấy gì | Hình/mô phỏng |
|---|---|---|---|
| **A — Bài HTML Dewey** | `src/lib/dewey/template.ts` + `htmlShell.ts` (qua `adaptiveToDewey.ts`) | 1 file HTML đơn: pre-test → 5 bước Dewey → Olympia → mở rộng → tổng kết. Có Mục Lục, 2 đồng hồ, Vở ghi, MathJax v3 CDN | **Slot có sẵn nhưng RỖNG** — `unit.simulationHtml`, `step.illustrationHtml`, `engage.illustration` không được render/đổ dữ liệu |
| **B — Cổng học sinh React** | `src/pages/AdaptiveStudentPortalPage.tsx` + `LessonSimulationViewer.tsx` | Web app: ảnh khởi động (`visualCards`) + mô phỏng tải từ Firestore `lessonSimulations` rồi render trong `<iframe sandbox>` | **Có hình & mô phỏng**, nhưng sống tách biệt ở đường này |

→ **Gốc bệnh:** hình & mô phỏng nằm ở đường B; khi xuất bài Dewey HTML (đường A) chúng bị bỏ lại. Hai đường không nối nhau.

---

## 2. So sánh trực tiếp với Gemini

| Tiêu chí | Gemini (LINK 1+2) | App của bạn | Nhận định |
|---|---|---|---|
| Khung 5 bước Dewey | Có | Có (`template.ts` dựng đủ 6 màn) | Ngang |
| Pre-test + chấm + tư vấn | Có | Có | Ngang |
| Mục tiêu phân hóa 3 cấp | Có | Có (`engage.goalSetting.bloomFramework`) | Ngang |
| Olympia 3 gói 10/20/30 | Có | Có (`olympia.packs`) | Ngang |
| Adaptive khi sai | 4 mức gợi ý (theo prompt) | `theory + hint1..3 + solution` **bắt buộc trong type** | **App chặt hơn** |
| Vở ghi tự điền | Có | Có (`formulaToNote → addNote`) | Ngang |
| 2 đồng hồ Phần/Tổng | Có | Có (`section-timer`/`global-timer`) | Ngang |
| MathJax v3 + inlineMath + CDN | Có | **Giống hệt** (`htmlShell.ts` ~dòng 360-363) | Ngang, không cần sửa |
| Hình lõi = SVG inline | Có (tự vẽ, không vỡ) | Có kênh SVG (`Geometry2DSimulation`), nhưng `visualCards` là **ảnh bitmap `<img>`** | **App yếu hơn ở chỗ này** |
| Mô phỏng tương tác | **Inline trong file HTML** | Có, nhưng ở đường B (Firestore → iframe), **không có trong file Dewey** | Khác kiến trúc → gây mất |
| 3D / Three.js | Không dùng | **Có** (`Geometry3DSimulation`, `import * as THREE`) | **App vượt Gemini** |
| GeoGebra / công cụ ngoài | Không dùng | **Có** (`externalToolsData.json`, source `geogebra`) | **App vượt Gemini** |
| **Xếp tuyến chẩn đoán** | **Không có** | **Có** (`recommendLearningRoute`) | **App vượt xa** |
| **Pacing thời gian thực** | **Không có** | **Có** (`decidePacingAction`: ahead/on-track/behind/stuck) | **App vượt xa** |
| **Dashboard giáo viên realtime** | Không có | **Có** (`buildTeacherDashboardData` + Firestore) | **App vượt xa** |

---

## 3. Ưu điểm của app (hơn hoặc ngang Gemini)

- **Tầng adaptive thực thụ** (`diagnosticEngine.ts`): `gradeAssessment`, `recommendLearningRoute` (foundation/standard/challenge), `decidePacingAction`, `buildTeacherDashboardData`. Gemini chỉ "diễn" phân hóa trong 1 file HTML tĩnh; app của bạn có **engine** chấm chẩn đoán và điều tiết nhịp độ thật.
- **Adaptive 4 cấp là ràng buộc kiểu dữ liệu** (`DeweyAdaptiveQuestion` bắt buộc `theory+hint1..3+solution`) → khó "rụng" như Gemini.
- **Đa dạng renderer**: Three.js (3D), SVG engine (2D), GeoGebra. Về năng lực đồ họa, app **thừa** chứ không thiếu.
- **Bảo mật mô phỏng tốt**: `SandboxedSimulationFrame` dùng `<iframe srcDoc sandbox="allow-scripts">` (KHÔNG `allow-same-origin`).
- **MathJax giống hệt Gemini** — phần công thức gần như không phải động vào.

---

## 4. Nhược điểm — gốc rễ "bài toàn chữ" (đã kiểm chứng từng dòng)

1. **`template.ts` KHÔNG render hình/mô phỏng trong bài.**
   - `renderKnowledgeUnit` (≈dòng 165-174): chỉ vẽ `socraticSteps` + `conclusion`, **bỏ qua `unit.simulationHtml`**.
   - `renderSocraticStep` (≈dòng 147-163): **bỏ qua `step.illustrationHtml`**.
2. **`adaptiveToDewey.ts` KHÔNG đổ dữ liệu vào các slot.**
   - `adaptiveLessonToDeweyContent` (226 dòng) dựng `engage/units/olympia` nhưng **không set** `engage.illustration`, `socraticStep.illustrationHtml`, `unit.simulationHtml`. Các slot luôn rỗng.
3. **Hai field mô phỏng khác nhau, không nối:**
   - Đường B dùng `unit.simulationId` → trỏ tới Firestore `lessonSimulations/{lessonId}_{unitId}` (sinh bởi `SimulationGeneratorModal` qua `/api/generate-simulation`, lưu bởi `handleSimulationSaved`).
   - Đường A dùng `DeweyKnowledgeUnit.simulationHtml` (inline). **Không có cầu nối `simulationId → simulationHtml`** nên bài HTML xuất ra luôn trống mô phỏng.
4. **`visualCards` là ảnh bitmap `<img src={dataUrl}>`**, không phải SVG inline → đúng kiểu ảnh Gemini cảnh báo dễ vỡ/lệch ngữ cảnh; lại còn chỉ hiện ở đường B.
5. **`tikzCode` sinh ra nhưng không có renderer** (chỉ lưu ở `types.ts` dòng 148) → tốn token, không ra hình.

---

## 5. Phát hiện MỚI từ `07-adaptive-learning.md` (bổ sung so với báo cáo trước)

Báo cáo trước (và báo cáo của Claude Code) **chưa khai thác** tầng adaptive engine + luồng QA. Đây là phần bổ sung quan trọng:

### 5.1. App có cả một engine mà Gemini hoàn toàn không có
`diagnosticEngine.ts` cung cấp: `gradeAssessment`, `calculateObjectiveScores`, `recommendLearningRoute`, `decideNextUnitAction`, `decidePacingAction`, `createTeacherFlag`, `buildTeacherDashboardData`. → Khi đối chiếu, **đừng coi app là "bản kém hơn Gemini"**. App là một **hệ adaptive learning** đúng nghĩa; Gemini chỉ là **một bài học HTML tĩnh đẹp**. Hai thứ ở 2 đẳng cấp kiến trúc khác nhau.

### 5.2. Cơ chế sinh mô phỏng đã tồn tại — chỉ chưa nối vào bài HTML
`SimulationGeneratorModal` + `/api/generate-simulation` đã sinh HTML mô phỏng (Kroki/SVG/HTML), lưu Firestore. **Đây chính là "call riêng xuất HTML thô" mà Gemini khuyên** — bạn đã có sẵn! Việc còn lại chỉ là **nhúng kết quả đó vào `unit.simulationHtml` của bài Dewey**, thay vì chỉ hiển thị ở cổng React.

### 5.3. Rủi ro QA cần thêm vào checklist (do kiến trúc 2 đường)
Tài liệu QA hiện có 3 test case (xếp tuyến, pacing, lưu Firestore). **Cần bổ sung các test case về hiển thị hình/mô phỏng trong bài xuất** — vốn là điểm đang vỡ:

- [ ] **TC4 — Mô phỏng xuất hiện trong bài Dewey HTML:** Sinh mô phỏng cho 1 unit → xuất bài Dewey HTML → mở file → **mô phỏng phải render trong iframe của bài**, không chỉ ở cổng React.
- [ ] **TC5 — `engage.illustration` không rỗng:** Bài có `visualCards` → sau `adaptiveToDewey` → `engage.illustration` phải có data; template phải hiện hình khởi động (không rơi về fallback `?`).
- [ ] **TC6 — `illustrationHtml` theo từng mảnh:** Mỗi `socraticStep` có hình tương ứng phải render đúng chỗ.
- [ ] **TC7 — Offline:** Mở file HTML đã xuất khi tắt mạng → SVG/JS/tương tác lõi vẫn chạy (chỉ MathJax cần CDN; cân nhắc nhúng MathJax cục bộ nếu cần offline tuyệt đối).
- [ ] **TC8 — Đồng bộ 2 field:** Khi `unit.simulationId` đã có doc Firestore, `unit.simulationHtml` của bản xuất phải được nạp từ chính HTML đó (kiểm tra cầu nối không bị lệch key `{lessonId}_{unitId}`).

---

## 6. Đính chính báo cáo của Claude Code

Báo cáo đó **đúng định hướng và đúng 3 chỗ rò rỉ chính**, nhưng vì không đọc trực tiếp 2 link nên có vài điểm lệch:

| # | Báo cáo Claude Code nói | Thực tế trong code | 
|---|---|---|
| 1 | "App đã sinh `visualCards` dạng **SVG inline** (không phải `<img>` URL)" | **Sai.** `EngageVisualCard.imageDataUrl` render bằng `<img src={dataUrl}>` (bitmap). App có SVG inline nhưng ở `Geometry2DSimulation`, không phải `visualCards`. |
| 2 | "Mô phỏng nằm ở React component **ngoài iframe**" | **Chưa chính xác.** `SandboxedSimulationFrame` **dùng** `<iframe srcDoc sandbox>`. Vấn đề thật: mô phỏng tải từ **Firestore ở cổng React (đường B)**, tách khỏi file Dewey (đường A). |
| 3 | "App dùng MathJax/KaTeX" | **Cụ thể hơn:** bản Dewey HTML dùng **MathJax v3 + inlineMath qua CDN, giống hệt Gemini** (`htmlShell.ts`). Điểm mạnh sẵn có. |
| 4 | (Không nhắc) | **Bổ sung:** app có Three.js, GeoGebra, và cả engine xếp tuyến + pacing — bệnh nằm ở khâu **nối** dữ liệu, không phải khâu sinh hình. |

---

## 7. Khuyến nghị thực thi (cho Claude Code)

### Nhóm A — Vá hiển thị (BẮT BUỘC, rủi ro thấp, đúng các leak)
1. **`src/lib/dewey/template.ts`**
   - Trong `renderKnowledgeUnit`: nếu `unit.simulationHtml` tồn tại → render một block `<iframe sandbox="allow-scripts" srcdoc="...">` với `title`/`description`/`height`.
   - Trong `renderSocraticStep`: nếu `step.illustrationHtml` tồn tại → chèn vào ngay dưới `prompt`.
2. **`src/lib/adaptive/adaptiveToDewey.ts`**
   - Map `lesson.preparation.engage.visualCards` → `engage.illustration` (dùng `type: 'image'` vì hiện là bitmap; template đã hỗ trợ `<img>`).
   - Nối **`unit.simulationId` → nạp HTML từ Firestore `lessonSimulations/{lessonId}_{unitId}` → gán vào `unit.simulationHtml`** (đây là cầu nối còn thiếu giữa 2 đường).
   - Nếu có hình theo mảnh → gán `socraticStep.illustrationHtml`.

### Nhóm B — Nâng chất theo Gemini (nên làm)
3. **System prompt cứng** cho mọi call sinh nội dung lõi: *"Mọi hình/mô phỏng lõi phải là `<svg>` nội tuyến hoặc HTML+JS thuần; TUYỆT ĐỐI không dùng `<img>` URL ngoài cho nội dung lõi."* Dần chuyển `visualCards` lõi sang SVG inline (giữ bitmap cho ảnh trang trí).
4. **Tận dụng `/api/generate-simulation` sẵn có** để sinh mô phỏng vanilla JS (click xoay, bật/tắt → chuỗi nhị phân, di chuyển lưới, slider — đúng mẫu Gemini), rồi nhúng kết quả vào `unit.simulationHtml`.
5. **Quy tắc 2 giai đoạn** (storyboard chữ → duyệt → mới xuất HTML) để AI không tự cắt xén.
6. **`tikzCode`**: render qua Kroki thành SVG nhét vào `illustrationHtml`, HOẶC bỏ khỏi prompt cho đỡ phí token.

### Nhóm C — QA
7. Thêm TC4–TC8 ở Mục 5.3 vào `docs/features/07-adaptive-learning.md`.

---

## 8. Một câu chốt

> App của bạn **không thiếu cấu trúc, không thiếu khả năng vẽ hình, lại còn có engine adaptive vượt Gemini**. Nó chỉ thiếu **mối nối** giữa nơi sinh hình/mô phỏng (đường B: `visualCards`, `lessonSimulations` Firestore) và nơi hiển thị bài học chính (đường A: template Dewey). Vá `template.ts` + `adaptiveToDewey.ts` (Nhóm A) là hết cảnh "bài toàn chữ".

---

*Nguồn đã kiểm chứng:* `src/lib/dewey/{types,template,htmlShell}.ts`; `src/lib/adaptive/{adaptiveToDewey,types,adaptiveFromLessonPlan,diagnosticEngine,simulationTypes}.ts`; `src/components/adaptive/{LessonSimulationViewer,SandboxedSimulationFrame,AdaptiveSimulationBlock,Geometry3DSimulation}.tsx`; `src/components/teacher/SimulationGeneratorModal.tsx`; `src/components/tabs/AdaptiveLearningTab.tsx`; `src/pages/AdaptiveStudentPortalPage.tsx`; `src/data/externalToolsData.json`; `api/generate-simulation.ts`; `docs/features/07-adaptive-learning.md`. Cùng 2 link Gemini share đã đi qua trực tiếp.
