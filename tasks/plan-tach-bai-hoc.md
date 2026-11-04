# PLAN — Tách hai sản phẩm: "Bài tự học phân hoá" và "Bài học tương tác"

> Ngày: 2026-10-24 · Nhánh: `feat/nop-bai-da-cham` · Trạng thái: **CHỜ THẦY DUYỆT — chưa code**
> Bối cảnh: 10 bài Tuần 11 đã publish vào `/adaptive-portal/:id` là **bài tự học phân hoá** (HS tự học một mình, không GV/TV/Coach). Định nghĩa V8.8 thật = **bài học tương tác** (Presenter / Student / Coach + storyboard, chạy trong tiết thật). Hai thứ khác nhau, hiện đang lẫn trên cùng một màn "Quản lý bài học".

## 0. Nguyên tắc

- **Không trộn hai mô hình** trong một màn hình hay một luồng publish.
- **Không phá** 10 bài đã publish (chúng đang chạy đúng với vai trò bài tự học).
- **Không tuyên bố PASS** khi chưa thử thật (theo guide V8.8, mục 8).
- Code cũ không được tự thắng thiết kế đã duyệt.

## 1. Ranh giới hai sản phẩm

| | **Bài tự học phân hoá** | **Bài học tương tác (V8.8)** |
|---|---|---|
| Người học | 1 HS, một mình | Cả lớp + GV điều khiển |
| Thiết bị | Máy cá nhân | Presenter (lớp/TV) + máy HS + Coach (GV) |
| Bề mặt | `/adaptive-portal/:id` | `/adaptive-live/:sessionId?mode=presenter\|student\|coach` |
| Có timer pha | Không (chỉ đếm thời lượng) | Có (coreBudget + reserveBudget, fast-path) |
| Dữ liệu chính | Điểm, checkpoint, tuyến cá nhân | Tiến độ nhóm, Stats/Công bố, peer review, coach evidence |
| Người soạn | `/lesson-gen` (dựng nhanh) hoặc `/adaptive-builder` | Gate P → Gate D → Gate C (bắt buộc) |
| Đơn vị | `AdaptiveLesson` | `LessonPackage` V8.8.1 + IR V8.3.2 |
| Trạng thái code | **Đang chạy tốt** (10 bài Tuần 11) | **Chưa có runtime** (PlaceholderPanel "Task 5") |

## 2. Kết quả khảo sát hiện trạng (bằng chứng)

- `AdaptiveLessonListPage.tsx:19` — `shouldShowLiveLessonAction()` chỉ bật nút "Mở tiết trực tiếp" khi `lesson.id === 'tds-g10-30-pilot'` hoặc có gói Ban Toán V4. → 10 bài Tuần 11 **không có** nút tương tác. Đây là lý do hai sản phẩm đang lẫn mà không ai thấy.
- `LiveLessonPage.tsx:98–102` — `PlaceholderPanel` cho mode teacher/student chưa có publicState, ghi nguyên văn *"Task 5 placeholder… Task 6/7"*.
- `LiveLessonPage.tsx:261–267` — chỉ `mode=tv` và `mode=student` có view thật (`TvLiveView`, `StudentLiveView`); GV/TV-điều-khiển dùng `TvLiveView` + `presenterControls` (dòng 247) → **Presenter là TV + thanh điều khiển**, chưa đủ 5 vùng.
- `V832StudioPage.tsx:798–802` — tạo phòng xem trước **V8.3.2/V8.4**, tự nhận chưa tuyên bố V8.8.1 thành công.
- `QA_REGRESSION_SCENARIOS.json` — 22 scenario, **toàn bộ `NOT_TESTED`**.

## 3. Phương án tách (đề xuất — chọn A)

**A. Tách bằng "loại bài" trên dữ liệu + hai tab riêng (khuyến nghị)**

- Thêm `lessonKind: 'self_study' | 'interactive'` vào `AdaptiveLesson` (migration mặc định `self_study` cho 10 bài đã có; `interactive` khi có gói V8.8.1).
- Màn "Quản lý bài học" chia **2 tab**: `Bài tự học phân hoá` | `Bài học tương tác`. Mỗi tab chỉ hiện nút đúng vai:
  - Tự học: Xem trước (portal) · Sửa · Công bố cho HS · Thống kê cá nhân.
  - Tương tác: Mở tiết (Presenter) · Link TV · Link HS · Link Coach · Kiểm tra Gate.
- Không bao giờ hiện nút "Mở tiết trực tiếp" trên bài tự học, và không hiện "Cổng HS" trên bài tương tác (trừ chế độ GV xem trước, có nhãn rõ).

**B. Tách bằng route mặc định** — `/bai-tu-hoc` và `/bai-tuong-tac` là hai trang độc lập, bảng dữ liệu giữ nguyên.
→ Ít đụng dữ liệu hơn nhưng dễ lẫn lại vì cùng `AdaptiveLesson`.

**C. Không đổi dữ liệu** — chỉ đổi nhãn/UI.
→ Nhanh nhưng không giải quyết gốc: vẫn không biết bài nào được phép chạy tiết.

## 4. Việc phải làm — theo giai đoạn, mỗi giai đoạn có cổng duyệt

### Giai đoạn 1 — Tách nhận diện (P0, ~1 buổi, rủi ro thấp)

1. `src/lib/adaptive/types.ts`: thêm `lessonKind?: 'self_study' | 'interactive'` (optional để không vỡ dữ liệu cũ; helper `resolveLessonKind()` mặc định `self_study`).
2. `AdaptiveLessonListPage.tsx`: 2 tab lọc theo `lessonKind`; đổi `shouldShowLiveLessonAction()` thành đọc `lessonKind === 'interactive'` (giữ fallback cũ cho pilot để không vỡ test).
3. Nhãn tiếng Việt rõ: tab **"Bài tự học phân hoá"** / **"Bài học tương tác"**; badge trên từng card.
4. 10 bài Tuần 11: **không** ghi DB — `resolveLessonKind` tự coi là `self_study` (chưa cần migration).
5. Nghiệm thu: `npx vitest run src/pages/AdaptiveLessonListPage* src/lib/adaptive` + `npm run build` 0 TS error; mở `/adaptive-lessons` thấy 2 tab, 10 bài nằm đúng tab tự học.

### Giai đoạn 2 — Đưa "bài tương tác" thành thật (P0, lớn — cần đặc tả)

Trước khi code **bắt buộc** Gate P + Gate D (guide V8.8 mục 3):
1. Chọn **1 bài mẫu** (đề nghị 1 bài Tuần 11 đã có nội dung).
2. Gate P: `Lesson Experience Map` (dùng template trong zip) + goal→task→evidence→criterion→allowedClaim + coreBudget/reserveBudget cho 40'.
3. Gate D: storyboard 3 luồng + Attention Handoff + visual contract + copy tiếng Việt chốt + timing fast-path.
4. **Thầy duyệt Gate P + Gate D** → mới code.
5. Gate C: dựng Presenter đủ 5 vùng (Header/Main/Visual/Teacher Cue/Control Dock), Student tối giản, Coach đọc evidence — Coach **không** là điều kiện bắt buộc.
6. Chạy `python tools/preflight_v88.py` + các scenario liên quan trong `QA_REGRESSION_SCENARIOS.json`, điền evidence thật, báo **3 gate độc lập**.

### Giai đoạn 3 — Dọn nhãn toàn hệ (P1)

- Sidebar/Header: "Quản lý bài học" → tách rõ khi mở vào (2 tab); không đổi route để khỏi mất bookmark.
- `/lesson-gen` (dựng nhanh) chỉ sinh bài `self_study`; `/lesson-compiler-v832` chỉ sinh bài `interactive` — ghi rõ trên UI.
- Bỏ nhãn mơ hồ "V8.8" ở nơi đang dùng cho bài tự học (nếu có) để tránh hiểu sai lần nữa.

## 5. Rủi ro & cách chặn

| Rủi ro | Chặn |
|---|---|
| Migration ghi đè 10 bài đang published | Giai đoạn 1 **không ghi DB**; `resolveLessonKind` suy ra tại chỗ |
| Nút "Mở tiết trực tiếp" hiện nhầm trên bài tự học | Test đơn vị `shouldShowLiveLessonAction` cho cả 3 loại |
| Tuyên bố "V8.8 xong" khi mới có 1 bài mẫu | Báo 3 gate riêng, mỗi gate ghi evidence; không có điểm tổng hợp |
| Lẫn lại sau này | `lessonKind` là trường bắt buộc khi tạo mới + badge hiển thị trên mọi card |

## 6. Lệnh nghiệm thu (copy chạy được)

```powershell
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\nop-bai-da-cham" run build
npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\nop-bai-da-cham" exec -- vitest run src/pages/AdaptiveLessonListPage src/lib/adaptive src/lib/liveLesson
python "C:\Users\ADMIN\AppData\Local\Temp\opencode\v88zip\V8_8_CONSOLIDATED_QUALITY_HARDENING\tools\preflight_v88.py" <lesson_package>
```

## 7. Quyết định của thầy (2026-10-24) — ĐÃ CHỐT

1. **Phương án A** — tách bằng `lessonKind` + 2 tab. ✅
2. **Đường dài**: ghi `lessonKind` thật vào dữ liệu (không chỉ suy ra), và dự phòng loại thứ ba **"Bài học phân hoá"** cho tương lai → đã thêm `differentiated` vào `LessonKind`. ✅
3. **Bài mẫu Giai đoạn 2**: mỗi khối (10/11/12) lấy **1 bài của Tuần 11** → 3 bài mẫu.
4. Luồng ChatGPT share: **bỏ qua**, lấy guide V8.8 trong zip làm chuẩn. ✅

## 8. Trạng thái thực hiện — Giai đoạn 1 XONG (chưa deploy)

| Việc | File | Trạng thái |
|---|---|---|
| Thêm `LessonKind` + nhãn + `resolveLessonKind` (3 loại, mặc định `self_study`) | `src/lib/adaptive/types.ts` | ✅ |
| `shouldShowLiveLessonAction` đọc `lessonKind`; bài tự học **không bao giờ** hiện nút tiết trực tiếp | `src/pages/AdaptiveLessonListPage.tsx` | ✅ |
| 2 tab thật: Bài tự học phân hoá · Bài học tương tác · Bài học phân hoá (kèm số lượng + mô tả từng tab) | cùng file | ✅ |
| Badge loại bài trên từng dòng; tiêu đề trang đổi thành "Bài tự học phân hoá · Bài học tương tác" | cùng file | ✅ |
| Đọc bài cũ tự gán `self_study` (không ghi DB, không đụng 10 bài đã publish) | `src/services/adaptiveLessonService.ts` | ✅ |
| Test: 16/16 pass (`lessonKind.test.ts` 3 + `AdaptiveLessonListPage.test.ts` 13) | — | ✅ |
| Build 0 TS error | — | ✅ exit=0, 3m51s |

**Chưa làm (chờ deploy + duyệt):** Giai đoạn 2 (Gate P cho 3 bài mẫu), ghi `lessonKind` ngược vào 10 bài đã publish (hiện chỉ suy ra), dọn nhãn ở `/lesson-gen` + `/lesson-compiler-v832`.
