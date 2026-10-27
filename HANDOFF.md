# HANDOFF — signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để phiên sau bắt nhịp ngay. Lịch sử đầy đủ (R1–R18, v6–v26): `tasks/archive/handoff-history-to-2026-10-23.md`.

> Lich su V27-V30 da luu tru: `tasks/archive/handoff-history-v27-v30-2026-10-25.md`.

## Latest checkpoint - V33 CHO DEPLOY (cho Codex chay build-site.mjs): fix P1 AI feedback + responsive luong HS (27/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release` · Base: `ee6b95f` (= v32 da phat hanh).

### Trang thai: CODE XONG — cho Codex commit/push/deploy. Chua co deployment_id / commit_sha / archive.

### Da sua trong v33 (8 file modified, chua commit)

| File | Noi dung |
|---|---|
| `lib/lesson/assessment-ai.js` | P1: `AI_INVALID_PROPOSAL` vao danh sach trang `friendlyAutomaticFailure` |
| `lib/lesson/runtime.js` | P1: truyen `feedback` vao `autoSub.aiAssessment` (runtime.js:1433) |
| `components/lesson/TaskInput.tsx` | P1: banner HS cho nhanh `needs_review` + render `aiAssessment.feedback` o nhanh ok/wrong + bo sung kieu `aiAssessment` |
| `public/style.css` | Responsive: trong media 760px doi `.gamecols{grid-template-columns:minmax(0,1fr)}` (tu `1fr`) + them `.gamecols>*{min-width:0}` |
| `tests/lesson-themed-route-ui.test.mjs` | 2 guard mock TaskImage |
| `tasks/coordination.md`, `tasks/lessons.md`, `tasks/plan-hoan-thien-game-va-day-hoc.md` | Ghi nhan dieu phoi + bai hoc |

### Bang chung verify v33

- `tsc` 0 loi; `npm run build` pass; test 1393/1416 pass — 23 fail la no v32 co san, khong do dot nay (log `C:\Users\ADMIN\AppData\Local\Temp\tap-v33.txt`, UTF-16).
- Responsive trang chu: 6/6 viewport sach (375/390/430/810/820/1366).
- Responsive luong HS: phong R2HJCM, 3 HS browser context RIENG (375/390/430), 4 man waiting → nhiem-vu → filled → checked = **12 do sw=iw, 0 tran, 0 console error**. Script `Temp\opencode\v33-verify.mjs`; ket qua `Temp\opencode\responsive\v33-verify.json` + screenshots.
- Gen goc root man nhiem vu: track grid `1fr` (min-width:auto) bi ep 364px boi chuoi min-content `.evidence`(pad 40) + `.lab`(pad 42) + `table` 280 + 2 border. Fix `minmax(0,1fr)` + `min-width:0` → track 343, sw=375.
- Ban do chien dich bi clip tren man cho = THEO THIET KE (`overflow:hidden`), khong phai bug.
- Da xoa 10 phong QA qua UI GV — "Phien cua toi" trong. Muon test lai phai tao phong moi: `/hosts` → Tao phong game → Sinh van.

### Bai hoc ky thuat dot nay

- Grid `1fr` co `min-width:auto` ngam dinh: con chua `table` se ep track rong hon viewport. Ben trong media query phai dung `minmax(0,1fr)` + `min-width:0` cho con truc tiep.
- Nhieu page Puppeteer trong 1 browser dung chung localStorage → HS phai `browser.createBrowserContext()` rieng, neu khong page sau tu resume session page truoc.
- Rejoin trung ten nhom → 409 Conflict; script QA phai dung ten nhom ngau nhien.

### Buoc tiep theo (Codex)

1. Chay plugin sites `build-site.mjs` theo dung quy trinh v32: commit 8 file + push + dong goi `release-20261027-v33.tar.gz` vao `C:\Users\ADMIN\.codex\sites-release\`. KHONG tai dung archive cu.
2. Sau deploy ghi vao record nay: version_number, deployment_id, commit_sha, kich thuoc archive, SHA256 chunk; kiem doc lap chunk tren live.

### Cho nguoi dung quyet dinh (khong code truoc khi chon)

- Luat choi thay xuc xac cho muc dich day hoc (cac phuong an da trinh: quay 2 xuc xac chon 1 / chon duong theo chu de / diem ma luc doi quyen chon buoc; xuc xac giu lai cho che do thi dua).
- Touch dien thoai that + so du vi vilao: de sau.

## Checkpoint truoc - V32 DA PHAT HANH: sua tuong phan + khoa ti le (26/10/2026)

**Branch**: `codex/universal-content-release` · Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Release record V32

| Truong | Gia tri |
|---|---|
| version_number | **32** |
| deployment_id | `appgdep_6adef7ec3b34819184bfe2600eb8ee39` |
| commit_sha | `b6bf1739ed9cd6ae18b05ebf2e2091fc72856ee7` (= `b6bf173`) |
| archive | `C:\Users\ADMIN\.codex\sites-release\release-20261026-v32.tar.gz` (49.441.982 bytes) |
| audience | public |
| chunk | `useLessonSession-BK-YqRd9.js` — 65.860 bytes |
| SHA256 | `9198C14B9B420118422F6F2B6611E505998C2DA98D82CD1E1CDD72D138659A42` |

**Kiem doc lap**: SHA256 cua chunk tai tu live TRUNG KHIT chunk trong archive va ban QA luu. Xac nhan v32 len dung, khong phai ban khac.

### Da sua trong v32

**Loi 1 — tuong phan (QA phat hien, MAJOR that)**:
`app/lessons/lesson.css` dat `--lesson-text: #f8fafc` (gan trang) cho ca khung toi. Khoi ket qua cham co nen `#fef3c7` nhung **khong set `color`** -> chu trang tren vang nhat. Ti le tuong phan tu tinh: **1.064:1** (chuan AA can 4.5:1). Da set `color: "#14532d"` -> **8.182:1** tren nen vang, **8.296:1** tren nen xanh (ca hai vuot AAA 7:1).

**Loi 2 — khoa ti le SVG**: `KhoiXoay` va `BangVe` doi sang `flex: "0 0 auto"` + `aspectRatio: width/height` thay vi chi `height:auto`. Khong lam thay doi hinh da duyet.

### Bai hoc quan trong — "loi" khong ton tai

QA bao "anh tu dien bi cat" va cham diem "CHUA DAT". **Sai.** Chinh file `mobile-draw-metrics.json` cua QA do duoc canvas `261.33 x 227.11` -> ti le **0.869**, khop viewBox `330/380 = 0.868`. Hinh KHONG bi bop. Anh trong bi cat vi vung cuon cat ngang — hanh vi cuon binh thuong.

Trong luc xu ly, da sua CSS 5 lan lien tiep (aspect-ratio, flex, max-height, sua lesson.css) deu sai huong, roi phai hoan tac toan bo `lesson.css`. Nguyen nhan: **khong doi chieu so do ti le co san trong bao cao QA truoc khi tin ket luan chu**.

**Quy tac rut ra**: khi QA bao "hinh bi cat/bop meo", phai tinh ti le tu so do DOM (`height/width` so voi viewBox) TRUOC khi sua CSS. Neu ti le dung thi do la cuon, khong phai loi.

**Luu y don vi**: `t.length` trong JS dem KY TU, `File.length` dem BYTE. Tieng Viet nhieu ky tu 2-3 byte nen chenh 65.860 byte vs 62.927 ky tu la binh thuong, khong phai loi.

