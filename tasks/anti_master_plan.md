# Master Plan — Antigravity Execution (2026-06-19)

> **Mục đích**: Anti chạy hết danh sách dưới đây. Claude QA một lần cuối.
> **Quy tắc vàng**: KHÔNG đụng `Coordinator.ts`, `ContentAgent.ts`, `PlanningAgent.ts`, pipeline giáo án. KHÔNG xóa `onStreamChunk`. Build PASS (`npm run build`) sau MỖI phase. Screenshot mỗi kết quả test.

---

## Phase A — Runtime Test Text-to-Slide (30 phút)

**Mục tiêu**: Xác nhận tính năng Text-to-Slide vừa thêm hoạt động end-to-end.

**Cần**: Gemini paid key (free tier hay 429).

**Bước thực hiện**:
1. `npm run dev` → mở Creator tab → chế độ "single".
2. Bấm nút cam **"Tạo Slide nhanh từ Văn bản thô"** → modal hiện ra.
3. Dán văn bản test (ít nhất 2 lần):
   - Test 1: Văn bản thuần Việt (vd: tóm tắt tác phẩm "Chí Phèo" của Nam Cao).
   - Test 2: Văn bản có công thức (vd: "Định luật Ohm: U = I × R, trong đó U là hiệu điện thế...").
4. Bấm "Bắt đầu tạo Slide" → đợi AI.
5. Kiểm tra SlidePreviewBoard hiện đúng.
6. Bấm Tải PPTX → mở file.

**Tiêu chí PASS** (đánh dấu từng mục):
- [ ] Modal mở/đóng mượt, không crash.
- [ ] Slide đầu `type === "walt"`, slide cuối `type === "wrapup"`.
- [ ] Mỗi slide ≤ 4 bullet points trong `points[]`.
- [ ] KHÔNG lẫn "gợi ý ảnh"/"gợi ý lời thoại" vào bullet points.
- [ ] KHÔNG lộ mã LaTeX thô, thẻ XML/JSON trong slide.
- [ ] File PPTX mở được, không crash.
- [ ] Speaker Notes có nội dung.
- [ ] Nút disabled khi textarea rỗng.
- [ ] Toast thông báo hiện đúng (info khi bắt đầu, success khi xong, error nếu lỗi).

**Nếu FAIL**: Ghi rõ slide nào lỗi gì + chụp screenshot. KHÔNG tự sửa code — ghi vào report.

---

## Phase B — FormatAgent Delegation (tiết kiệm chi phí API) (1 giờ)

**Mục tiêu**: FormatAgent dùng model rẻ hơn (Gemini Flash / Haiku) thay vì model đắt. Chỉ FormatAgent — KHÔNG đụng Planning/Content.

**Lý do an toàn**: FormatAgent chỉ format bảng/heading, không cần tư duy sư phạm. Đã có bài học từ việc dùng model rẻ cho PlanningAgent (thất bại, revert `ebb0c79`).

**File cần sửa**:
- `src/lib/agents/FormatAgent.ts` — thêm logic chọn model rẻ.
- `src/lib/agents/types.ts` — thêm field `formatModel?: string` vào `AgentContext` (nếu cần).
- `src/lib/aiProviders.ts` — kiểm tra `callAIStream` đã nhận param model override chưa. Nếu chưa, thêm optional param.

**KHÔNG tạo file mới** (`llmRouter.ts` hay bất cứ gì). Giữ đơn giản: FormatAgent tự biết nó dùng model nào.

**Logic**:
```
Trong FormatAgent.ts:
- Xác định model rẻ dựa trên provider hiện tại trong settings:
  - Gemini → dùng "gemini-2.0-flash" (hoặc flash model rẻ nhất có sẵn)
  - Claude → dùng "claude-haiku-4-5-20251001"
  - OpenAI → dùng "gpt-4o-mini"
  - DeepSeek → giữ nguyên (đã rẻ)
  - Grok → giữ nguyên
- Gọi callAIStream với model override, KHÔNG thay đổi settings gốc.
```

**Cảnh báo**:
- PHẢI giữ nguyên `onStreamChunk` callback — nếu xóa = app trắng màn hình.
- PHẢI test output format vẫn đúng (bảng 3 cột, heading chuẩn, không lộ XML).
- Nếu model rẻ trả kết quả kém (bảng vỡ, mất nội dung) → revert ngay, ghi report.

**Tiêu chí PASS**:
- [ ] Build PASS, 0 lỗi TypeScript.
- [ ] Soạn 1 giáo án hoàn chỉnh → output format giống hệt trước (so sánh visual).
- [ ] Console log cho thấy FormatAgent dùng model khác với Planning/Content.
- [ ] Tốc độ FormatAgent nhanh hơn trước (đo bằng mắt hoặc timestamp log).

---

## Phase C — GeoGebra trong DiagramRenderer (1.5 giờ)

**Mục tiêu**: Thêm engine `geogebra` vào `DiagramRenderer.tsx` để render hình học chính xác hơn kroki/tikz.

**Phát hiện quan trọng**: `src/components/adaptive/ExternalToolFrame.tsx` ĐÃ CÓ sandbox iframe cho GeoGebra — copy pattern từ đó, KHÔNG phát minh lại.

**File cần sửa**:
1. `src/components/features/creator/DiagramRenderer.tsx`:
   - Thêm `'geogebra'` vào union type: `type: 'tikz' | 'svg' | 'mermaid' | 'plantuml' | 'geogebra'`.
   - Khi `type === 'geogebra'`: render iframe sandbox giống `ExternalToolFrame.tsx`:
     ```
     sandbox="allow-scripts allow-forms allow-pointer-lock"
     ```
     **KHÔNG dùng `allow-same-origin`** (khác với ExternalToolFrame — vì đây là AI-generated code, rủi ro XSS cao hơn).
   - Iframe src: `https://www.geogebra.org/classic` với commands inject qua postMessage API hoặc GeoGebra Apps API.
   - Fallback: nếu GeoGebra load fail → hiện code text + nút copy (giống behavior hiện tại khi kroki fail).

2. `src/types.ts`:
   - Nếu `DiagramRendererProps` được define ở đây, thêm `'geogebra'` vào type union.
   - Nếu define inline trong DiagramRenderer.tsx → sửa trực tiếp ở đó.

3. `src/components/features/creator/LessonContentBoard.tsx`:
   - Kiểm tra regex/parser detect diagram blocks. Nếu chỉ detect ` ```tikz ` / ` ```mermaid ` → thêm detect ` ```geogebra `.

4. `src/utils/worksheetUtils.ts` (NẾU cần):
   - Kiểm tra prompt AI có sinh block ` ```geogebra ` không. Nếu chưa → thêm instruction trong prompt Toán/Lý yêu cầu AI dùng GeoGebra commands thay vì TikZ cho hình học.

**KHÔNG sửa**:
- `ExternalToolFrame.tsx` — đó là module adaptive learning, không liên quan.
- `src/lib/krokiRender.ts` — giữ nguyên cho tikz/mermaid.

**Tiêu chí PASS**:
- [ ] Build PASS, 0 lỗi TypeScript.
- [ ] Tạo 1 giáo án Toán có hình (vd: "Tam giác ABC nội tiếp đường tròn") → nếu AI sinh block ` ```geogebra ``` ` → iframe GeoGebra hiện hình đúng.
- [ ] Nếu AI vẫn sinh ` ```tikz ``` ` → kroki render bình thường (backward compatible).
- [ ] Iframe KHÔNG có `allow-same-origin` (kiểm tra DOM).
- [ ] Khi GeoGebra load fail → fallback hiện code text, không crash.

---

## Phase D — Export GeoGebra ra Word (45 phút)

**Mục tiêu**: Khi xuất Word, diagram GeoGebra được rasterize thành ảnh PNG (giống cách kroki/tikz đã xử lý).

**File cần sửa**:
- `src/utils/wordExportA4.ts` hoặc `api/render-word-core.ts`:
  - Kiểm tra logic hiện tại xử lý diagram blocks khi export Word.
  - Thêm case cho `geogebra`: dùng html2canvas hoặc GeoGebra API `exportPNG()` để capture iframe → base64 → ImageRun trong docx.

**Lưu ý**: `render-word-core.ts` đã có logic rasterize SVG/TikZ/Mermaid (theo HANDOFF mục 1.1). Extend pattern đó, KHÔNG viết engine mới.

**Tiêu chí PASS**:
- [ ] Xuất Word với giáo án có GeoGebra diagram → ảnh hiện trong file .docx.
- [ ] Xuất Word với giáo án KHÔNG có GeoGebra → không regression (vẫn đúng như trước).

---

## Phase E — Commit & Report (15 phút)

**Sau khi Phase A–D đều PASS**:

1. Chạy final check:
   ```
   npm run build
   npm run lint
   npm run test
   ```
2. Liệt kê TẤT CẢ file đã tạo/sửa.
3. Viết báo cáo ngắn:
   - Phase nào PASS, phase nào FAIL (kèm screenshot).
   - Nếu có FAIL: mô tả cụ thể, KHÔNG tự fix — để Claude xử lý.
4. **KHÔNG commit** — để Claude review diff toàn bộ trước khi quyết định commit.

---

## Tóm tắt file impact dự kiến

| File | Phase | Hành động |
|---|---|---|
| `src/components/modals/TextToSlideModal.tsx` | A | Test only (đã có) |
| `src/utils/exportUtils.ts` | A | Test only (đã sửa) |
| `src/components/tabs/CreatorTab.tsx` | A | Test only (đã sửa) |
| `src/lib/agents/FormatAgent.ts` | B | Sửa — thêm model override |
| `src/lib/agents/types.ts` | B | Sửa — thêm field (nếu cần) |
| `src/lib/aiProviders.ts` | B | Sửa — thêm model override param (nếu chưa có) |
| `src/components/features/creator/DiagramRenderer.tsx` | C | Sửa — thêm engine geogebra |
| `src/components/features/creator/LessonContentBoard.tsx` | C | Sửa — detect block geogebra |
| `src/utils/wordExportA4.ts` hoặc `api/render-word-core.ts` | D | Sửa — rasterize geogebra |
| `HANDOFF.md` | E | Claude cập nhật sau QA |

---

## Ranh giới cấm (Red Lines)

1. **KHÔNG sửa** `Coordinator.ts`, `ContentAgent.ts`, `PlanningAgent.ts`.
2. **KHÔNG xóa** `onStreamChunk` ở bất kỳ đâu.
3. **KHÔNG dùng** `allow-same-origin` trong sandbox GeoGebra ở DiagramRenderer.
4. **KHÔNG tạo** file `llmRouter.ts` hay bất kỳ router/orchestrator mới.
5. **KHÔNG commit** — để Claude QA trước.
6. Nếu bất kỳ phase nào gây build fail → DỪNG, ghi report, chuyển phase tiếp.
