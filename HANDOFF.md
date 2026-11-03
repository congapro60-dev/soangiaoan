# HANDOFF - signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để bắt nhịp ngay. Lịch sử đầy đủ (R1-R18, v6-v26, V27-V30, V40, HKI, HKII, check chéo 01-02/11):
> - `docs/HANDOFF-ARCHIVE.md` (toàn bộ checkpoint trước 03/11/2026)
> - `tasks/archive/handoff-history-to-2026-10-23.md`, `tasks/archive/handoff-history-v27-v30-2026-10-25.md`

## Latest checkpoint - NÂNG CẤP HKI CHUẨN V88: HINT 3-4 TẦNG DATA-ANCHORED (03/11/2026)

**Branch**: `codex/universal-content-release` · HEAD sau commit này. Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Nội dung
- **G11 HKI** (`build-hki-g11.mjs`): bỏ cắt 1 tầng (`branch==='support'?scaffold:[scaffold[0]]` → `hints:scaffold`); H1 thay bằng `dataAnchor(prompt)` trích dữ kiện từ đề. Trước: 1.441 task × 1 tầng generic → sau: 4 tầng mọi branch.
- **G12 HKI** (`build-hki-g12.mjs`): support 4 tầng / còn lại 3 tầng, H1 = dataAnchor. Trước: 1.722 task × 1 tầng.
- **G10 HKI**: giữ nguyên (1.624 task × 4 tầng method hints từ trước; 137 reflection 1 tầng by-design).
- **`repair-r106-formation.mjs`**: bỏ assert ép số hint khớp; khi repair question định nghĩa khác số tầng thì giữ tầng của builder.
- **Audit HKI sau rebuild**: 5.350 task — 3.140 × 4 tầng + 1.722 × 3 tầng + 488 × 1 tầng (270 reflection + 218 open, by-design); H1 data-anchor 3.346; 0 trùng, 0 thiếu solidKey (case-insensitive), 0 glue, 0 task non-reflection thiếu hint.
- **Verify**: `hki-content` + `hki-package` 5/5 PASS; `npm run build` ✓; HKII không đổi (builder HKII không đụng).

### Lệnh nghiệm thu
\`\`\`powershell
node --test tests/hki-content.test.mjs tests/hki-package.test.mjs
npm --prefix "C:\\Users\\ADMIN\\.codex\\worktrees\\universal-content-release" run build
\`\`\`

### Dọn dẹp
- Commit `196ccc0` lỡ kèm `ship-hki.mjs` + 2 err.log rác — đã xóa trong commit này.

### Check chéo 2 hãng cho đợt HKI (03/11/2026) — ĐỒNG THUẬN PASS
- Payload `check_cheo_payload_hki_20261103.md` (8 mục), Claude CLI + Codex CLI (`-m cx/gpt-6.1-terra`) chạy song song. Bằng chứng: `claude_check_cheo_hki.log`, `codex_check_cheo_hki.log`.
- Claude **PASS 8/8** (kể cả `npm run build` exit 0; validator chạy trực tiếp trên 403 bài: 0 lỗi, 0 `ERR_SCAFFOLD_PENALTY_FORBIDDEN`).
- Codex 6 PASS; 2 mục "FAIL" đều do sandbox của nó bị EPERM khi build (môi trường, không phải nội dung) — số liệu nó đếm được khớp 100% với Claude (3.346 H1, phân bố tầng, 0 trùng/solidKey/glue).
- Verdict chốt: **PASS**.

### Bài học kỹ thuật (lặp lại từ HKII)
- Patch script phải dùng \`split/join\` (không \`String.replace\` với replacement chứa \`$\`).
- Thay dòng trong file có `;` lồng trong chuỗi → dùng ranh giới `\n};` chứ không phải `;` đầu tiên.

## Previous checkpoint - GD1+GD2: STORYLINE Bài 14 + HINT 3-4 TẦNG + VISUAL THỐNG KÊ (03/11/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.
**HEAD**: `74431b1` (chore: remove leftover temporary ship script) — trên `1d65ff4` (feat nội dung).

### Nâng cấp chất lượng theo chuẩn bài học tương tác (đối chiếu V88 Bài 14)
- **Storyline liên hệ mật thiết**: 5 generator thống kê G10 (`mean, quartileMode, mode, spread, variance`) + `bank.mean` dùng đúng **dataset 12 phiên cổ phiếu A/B của Bài 14** (bài học tương tác) — mỗi seed chọn cửa sổ phiên khác nhau, prompt nêu rõ "bài học tương tác Bài 14" (30 task).
- **Hint 3-4 tầng có dữ kiện**: H1 "Chép lại dữ kiện trước khi làm: ..." (chiết xuất từ đề; "=" ngay trước số được diễn đạt "bằng" ngoài công thức để không dính `ERR_SCAFFOLD_PENALTY_FORBIDDEN`; snippet có cấu trúc LaTeX phức tạp `_ ^ {}` chứa "= số" bị bỏ khỏi anchor). G11 đủ 4 tầng mọi branch; G12 3 tầng; G10 auto 4 tầng. Phân bố: 3.257 task × 4 tầng, 2.187 × 3 tầng.
- **Visual thống kê (GD2)**: field `task.visual` (dataset-table) — 30 task thống kê có bảng A/B 12 phiên highlight cửa sổ đang hỏi; pipeline: `DataVisual.tsx` → `TaskImage` (re-export `taskVisualOf`) → 5 page/panel; validate `ERR_VISUAL_INVALID`; serialize 2 path; allowlist `generation-outline.js`.
- **Sửa ~50 lỗi dính chữ** ("bằng0", "và9cm", "từ2bút", "Xếp5cuốn"...) trong G10 extensions/solutions/mc + auto-bank.
- **Audit**: HKI 5.350 & HKII 5.882 tasks — 0 trùng, 0 thiếu solidKey (case-insensitive), 0 glue, 0 task thiếu hint. 7/7 E2E PASS. `npm run build` ✓.

### Check chéo 2 hãng cho đợt nâng cấp này (03/11/2026) — ĐỒNG THUẬN PASS
- Payload `check_cheo_payload_20261103.md` (10 mục, HEAD `9fbbe35`), Claude CLI + Codex CLI (`-m cx/gpt-6.1-terra`, config `ai-stack-economy` mặc định bị provider trả 400) chạy song song. Bằng chứng: `claude_check_cheo_20261103.log`, `codex_check_cheo_20261103.log`, commit `c073fd2`.
- 8/10 mục PASS đồng thuận. 2 mục lệch số kỳ vọng trong payload, đã verify độc lập và chốt PASS:
  - H1 anchor thực tế **3.784** (payload ghi stale 3.779 — số chụp trước lần rebuild cuối).
  - Storyline nằm ở **6 bài** `r177, r178, r327, r328, r336, r337` (payload liệt kê thiếu; 30 task khớp dataset A/B 12 phiên).
  - Codex build FAIL do EPERM trong sandbox của nó; Claude (và chủ máy trước đó) build exit 0.
- Rủi ro ghi nhận: 105 task `type:"open"` (pattern `task-5-3`) chỉ có 1 hint (data-anchor) — by-design bước tự kiểm, theo dõi nếu muốn đủ tầng.

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
