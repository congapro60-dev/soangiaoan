# HANDOFF - signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để bắt nhịp ngay. Lịch sử đầy đủ (R1-R18, v6-v26, V27-V30, V40, HKI, HKII, check chéo 01-02/11):
> - `docs/HANDOFF-ARCHIVE.md` (toàn bộ checkpoint trước 03/11/2026)
> - `tasks/archive/handoff-history-to-2026-10-23.md`, `tasks/archive/handoff-history-v27-v30-2026-10-25.md`

## Latest checkpoint - GD1+GD2: STORYLINE Bài 14 + HINT 3-4 TẦNG + VISUAL THỐNG KÊ (03/11/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.
**HEAD**: `74431b1` (chore: remove leftover temporary ship script) — trên `1d65ff4` (feat nội dung).

### Nâng cấp chất lượng theo chuẩn bài học tương tác (đối chiếu V88 Bài 14)
- **Storyline liên hệ mật thiết**: 5 generator thống kê G10 (`mean, quartileMode, mode, spread, variance`) + `bank.mean` dùng đúng **dataset 12 phiên cổ phiếu A/B của Bài 14** (bài học tương tác) — mỗi seed chọn cửa sổ phiên khác nhau, prompt nêu rõ "bài học tương tác Bài 14" (30 task).
- **Hint 3-4 tầng có dữ kiện**: H1 "Chép lại dữ kiện trước khi làm: ..." (chiết xuất từ đề; "=" ngay trước số được diễn đạt "bằng" ngoài công thức để không dính `ERR_SCAFFOLD_PENALTY_FORBIDDEN`; snippet có cấu trúc LaTeX phức tạp `_ ^ {}` chứa "= số" bị bỏ khỏi anchor). G11 đủ 4 tầng mọi branch; G12 3 tầng; G10 auto 4 tầng. Phân bố: 3.257 task × 4 tầng, 2.187 × 3 tầng.
- **Visual thống kê (GD2)**: field `task.visual` (dataset-table) — 30 task thống kê có bảng A/B 12 phiên highlight cửa sổ đang hỏi; pipeline: `DataVisual.tsx` → `TaskImage` (re-export `taskVisualOf`) → 5 page/panel; validate `ERR_VISUAL_INVALID`; serialize 2 path; allowlist `generation-outline.js`.
- **Sửa ~50 lỗi dính chữ** ("bằng0", "và9cm", "từ2bút", "Xếp5cuốn"...) trong G10 extensions/solutions/mc + auto-bank.
- **Audit**: HKI 5.350 & HKII 5.882 tasks — 0 trùng, 0 thiếu solidKey (case-insensitive), 0 glue, 0 task thiếu hint. 7/7 E2E PASS. `npm run build` ✓.

### Dọn dẹp trong commit `74431b1`
- Xóa `ship.mjs` (script tạm bị commit nhầm vào `1d65ff4`).
- Cắt HANDOFF.md 495 dòng → ~60 dòng; toàn bộ checkpoint cũ chuyển sang `docs/HANDOFF-ARCHIVE.md`.

### Bài học kỹ thuật (quan trọng cho lần sau)
- **KHÔNG dùng `String.replace` khi replacement chứa `$`** — pattern `$'` đặc biệt nuốt/cắt file (nguyên nhân hỏng builder nhiều lần). Dùng `split/join`.
- Script patch nhiều dòng phải tính CRLF (`\r\n`) — worktree dùng CRLF, không khớp pattern LF là MISS im lặng.
- Regex lồng nhau trong heredoc/script dễ hỏng escape — viết script patch bằng mảng dòng `.join('\n')`, đọc lại bytes bằng `node -e` để kiểm chứng sau khi ghi.

### Còn dở / sắp cắn người sau
- **Check chéo lần này (commit `1d65ff4`) chưa chạy** — payload `check_cheo_payload_20261101.md` cần cập nhật tham chiếu HEAD mới rồi chạy cả Claude CLI + Codex CLI (Codex dùng proxy `127.0.0.1:20128`, probe trước khi dùng; chết mạng thì ghi rõ single-source, không tự ghép review nội bộ).
- `check_cheo_payload_20261101.md` vẫn là bằng chứng QA các lần trước (PASS 5/5 tại `b5f3e06`), tham chiếu commit cũ `4f7bc78` là cố ý (so sánh trước/sau fix).

### Lệnh nghiệm thu
```powershell
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run build
node --test tests/week13-e2e-gameplay.test.mjs tests/week14-e2e-gameplay.test.mjs tests/week15-e2e-gameplay.test.mjs tests/week16-e2e-gameplay.test.mjs tests/week17-week18-e2e-gameplay.test.mjs tests/hkii-e2e-gameplay.test.mjs
# audit: node script đọc content/hki-2026-catalogue.json + content/hkii-2026-catalogue.json (gunzip base64 l.data) — 0 dup/0 missing solidKey/0 glue
```
