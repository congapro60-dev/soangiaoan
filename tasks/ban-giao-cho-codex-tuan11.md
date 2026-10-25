# BÀN GIAO CHO CODEX — 3 bài Bài học tương tác Tuần 11 (V8.8)

> Người bàn giao: phiên OpenCode (model deepseek-v4.1-flash) · Ngày 2026-10-25
> Repo: `soangiaoan` · Worktree: `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\nop-bai-da-cham`
> Nhánh hiện tại: `feat/nop-bai-da-cham`, đã push lên `main`
> Lý do bàn giao: tôi tự đánh giá phần rà soát độc lập và kiểm thử trình duyệt nên do người/agent khác làm.

---

## 1. BỐI CẢNH NGHIỆP VỤ (đọc trước khi đọc code)

App SmartPlan AI chia bài học thành **hai sản phẩm khác nhau**:

- **Bài tự học phân hoá** — học sinh tự học một mình ở `/adaptive-portal/:id`. Đã chạy tốt với 10 bài Tuần 11.
- **Bài học tương tác (V8.8)** — dạy trong tiết thật, có 3 luồng: Presenter (máy chiếu GV), Student (máy HS), Coach (màn phụ GV). Chạy ở `/adaptive-live`.

Ba bài được chọn làm mẫu Tuần 11 (mỗi khối một bài):

| Khối | Bài | Mã PPCT (sourceKey) | lessonId bài tự học |
|---|---|---|---|
| 10 | Số gần đúng và sai số | `10-11-79` | `adaptive-1792827090625` |
| 11 | Mẫu số liệu ghép nhóm | `11-11-75` | `adaptive-1792831747929` |
| 12 | Phương sai và độ lệch chuẩn | `12-11-80` | `adaptive-1792834706906` |

### Quy trình 3 cổng (đã hoàn tất cổng 1 và 2)

- **Gate P** (khoá kế hoạch) — xong, file `tasks/gate-p-3-bai-tuan11.md`
- **Gate D** (khoá thiết kế) — xong, thầy **đã duyệt** 2026-10-25. 4 file:
  - `tasks/gate-d-3-bai-tuan11.md` (chuẩn chung 3 luồng)
  - `tasks/gate-d-g10-so-gan-dung-sai-so.md`
  - `tasks/gate-d-g11-mau-so-lieu-ghep-nhom.md`
  - `tasks/gate-d-g12-phuong-sai-do-lech-chuan.md`
- **Gate C** (code) — đang làm, đây là phần bàn giao này.

### Quyết định của chủ dự án (thầy Vũ Việt Cường, giáo viên Toán)

1. **Bảng con thay bằng máy HS** — kỹ thuật "chờ hai nhịp" của giáo án gốc vẫn giữ, nhưng ô nhập khoá thật trong lúc chờ.
2. **Không dùng số % bịa** — mọi "80% HS…" trong giáo án cũ chỉ là tham khảo, phải dùng số liệu thật.
3. **Bỏ "K–B–Đ–T"** — chữ tắt do AI tự đặt, không có trong giáo án gốc.
4. **Casio: HS bấm máy thật**, màn hình tương tác chỉ hướng dẫn từng phím.
5. **Bài 11 dùng bảng 40 số mẫu cố định** trong app, không phụ thuộc số liệu thật của lớp.

### Nguồn nội dung (quan trọng)

Giáo án gốc của thầy đã tải từ Firestore về repo:
- `tasks/giaoan-goc-g10.md` (37.602 bytes)
- `tasks/giaoan-goc-g11.md` (32.626 bytes)
- `tasks/giaoan-goc-g12.md` (28.919 bytes)

Biên bản đối chiếu giữa thiết kế và giáo án thật: `tasks/doi-chieu-gate-d-voi-giao-an-goc.md`.

**Nội dung toán trong code phải khớp 3 file giáo án gốc này.** Đây là ranh giới: Codex **không được sửa nội dung toán**, chỉ sửa lỗi kỹ thuật.

---

## 2. NHỮNG GÌ TÔI ĐÃ LÀM (3 commit + 2 commit hạ tầng)

Commit theo thứ tự thời gian:

| Commit | Nội dung |
|---|---|
| `844259d` | Hạ tầng: P-timer, chờ-hai-nhịp, dữ liệu phím Casio (thuần logic + test) |
| `d368c22` | Component `CasioKeyGuide` + CSS |
| `7ac1dee` | Nạp 3 bài Tuần 11 vào registry V4 (snapshot spec + AI error) |
| `8318c5b` | UI đọc số gói từ registry thay vì đóng đinh "48" |
| `abb7475` | Đánh dấu 3 bài là `interactive` khi xuất bản + nút xuất bản riêng |

### 2.1. File MỚI (tôi viết hoàn toàn)

**`src/lib/liveLesson/pTimer.ts`** — P-timer theo dải phút của giáo án in (P0→P40).
- `getPTimerState(elapsedSeconds, slotMinutes = 40)` → `{ minute, second, band, tone, notice, remainingSeconds }`
- Ba mức cảnh báo: phút 35 = `warn` ("Còn 5 phút — chuẩn bị sơ kết"), phút 38 = `urgent` ("SƠ KẾT — còn 2 phút"), quá 40 = `overrun`.
- `formatPTimerLabel` → `"P12 · 12:34"`
- `getPBandForOffset` → đổi `atSeconds` của cue sang `"P12"`

**`src/lib/liveLesson/thinkWindow.ts`** — Logic khoá ô "chờ hai nhịp".
- `getThinkWindowState({ thinkSeconds, skip }, elapsedInRound)` → `{ phase, remainingSeconds, canAnswer, label }`
- `getLockedThinkWindow()` → sau khi GV công bố thì khoá hẳn.

**`src/lib/liveLesson/casioGuide.ts`** — 4 bước bấm Casio fx-580VN X, chuỗi phím lấy nguyên văn giáo án gốc:
1. `MENU → 6 → 1`
2. `SHIFT → MENU → ▼ → 3 → 1` (bật Freq)
3. nhập cᵢ vào x, nᵢ vào Freq
4. `OPTN → 3` → đối soát `σx = 1,02469…`
- `getCasioGuideForLesson(lessonId)` chỉ trả dữ liệu cho `adaptive-1792834706906` (bài 12), bài khác trả `null`.

**`src/components/liveLesson/ThinkWindow.tsx`** — hook `useThinkWindow` + `ThinkWindowBanner`.
**`src/components/liveLesson/CasioKeyGuide.tsx`** — bảng phím hiển thị cho HS.

**Test mới:** `pTimer.test.ts` (10 test), `thinkWindow.test.ts` (7), `casioGuide.test.ts` (7), `v4/week11Catalog.test.ts` (15 — kiểm cả việc 3 bài qua `validateV4Contract`).

### 2.2. File SỬA (cần rà soát kỹ — đây là vùng rủi ro)

**`src/components/liveLesson/TvLiveView.tsx`**
- Thêm import `formatPTimerLabel, getPTimerState`.
- Thêm hàm `getElapsedInLesson()` — tính số giây **từ đầu tiết** (không phải trong cue). Lý do: `getTvPacing` cũ chỉ biết thời gian trong cue, nhưng dải P của giáo án tính theo phút của cả tiết.
- Chèn badge `<span className="tv-p-band is-{tone}">` vào header sau `tv-status-pill`, và banner `tv-p-band-banner` khi tone khác `normal`.

**`src/components/liveLesson/StudentLiveView.tsx`** (file 51,7KB — cẩn thận)
- Thêm 2 dòng import: `ThinkWindowBanner, useThinkWindow` và `CasioKeyGuide`.
- Thêm hook `thinkWindow` cạnh `textControl` (dùng `roundKey = cueId:stepId`, `thinkSeconds: 10`, `skip` khi câu có ≤ 2 lựa chọn).
- Chèn `<ThinkWindowBanner>` và `<CasioKeyGuide>` vào JSX.
- **Chặn 3 đường gửi** khi ô còn khoá: `onChange` của `ResponseControl` (early return), `textarea` (`readOnly` + `aria-disabled`), nút gửi (`disabled` + nhãn "Chờ Ns").

**`src/lib/liveLesson/v4/lessonAdapter.ts`**
- Đổi validator snapshot `48 → 51` bài (2 chỗ: điều kiện và thông điệp lỗi).

**`src/lib/liveLesson/v4/validateContract.ts`**
- Đổi regex sourceKey từ `/^\d{2}-[56]-\d+$/` thành `/^\d{2}-(?:[56]|11)-\d+$/` (mở cho Tuần 11, vẫn chặn tuần lạ).

**`src/lib/liveLesson/v4/sequentialPublication.ts`**
- Thêm export `INTERACTIVE_SOURCE_KEYS = new Set(['10-11-79','11-11-75','12-11-80'])`.
- Chỗ tạo `publishedLesson`: thêm `...(isInteractiveLesson ? { lessonKind: 'interactive' } : {})`.

**`src/pages/AdaptiveLessonListPage.tsx`**
- `handleSequentialPublish(keysOverride?: string[])` — nhận danh sách key tuỳ chọn.
- `banToanPackageCount = getBanToanV4PackageCount()` thay cho chữ "48" cứng.
- Thêm nút "Xuất bản 3 bài tương tác Tuần 11".

**`src/components/liveLesson/liveClassroom.css`** — thêm class `.tv-p-band*`, `.tv-p-band-banner`, `.student-think-banner`, `.student-casio-*`.

**`src/data/liveLessonPackages/banToan-w5-w6.snapshot.json`** — thêm 3 `lessonSpec` + 3 `aiErrors` (48 → 51). Đây là dữ liệu nội dung, khớp giáo án gốc.

**Test cũ đã sửa kỳ vọng số lượng** (48 → 51, 47 → 50, 45 → 48, formation 21 → 24):
`lessonAdapter.test.ts`, `runtimeDefinition.test.ts`, `sequentialPublication.test.ts`, `adaptiveDraft.test.ts`

---

## 3. VẤN ĐỀ 1 — TÔI TỰ GÂY RA, ĐÃ SỬA NHƯNG CẦN RÀ LẠI

Trong phiên làm việc tôi **sửa nhầm 2 lần** vào file đang dùng chung, bằng cách dùng `edit` với chuỗi dài:

1. **`StudentLiveView.tsx`**: tôi định thêm import mới nhưng lại dùng đúng chuỗi của dòng `import type { LiveResponseType, LivePublicState, SubmitLiveResponseInput }` làm `oldString` — tức là **ghi đè mất dòng import types**. Tôi phát hiện ngay và thêm lại dòng đó. Typecheck hiện sạch.

2. **`lessonAdapter.ts`**: tôi xoá nhầm dòng `const seen = new Set<string>();` khi sửa thông điệp lỗi. Typecheck bắt được (`seen` undefined), tôi đã thêm lại.

**Việc cần Codex làm:** diff 2 file này với commit trước để chắc **không mất dòng nào khác** ngoài những gì tôi chủ ý thêm.

```
git diff 41dad79..d368c22 -- src/components/liveLesson/StudentLiveView.tsx
git diff 7ac1dee~1..7ac1dee -- src/lib/liveLesson/v4/lessonAdapter.ts
```

Cách kiểm chắc nhất: `git diff` phải chỉ hiện **thêm dòng**, không có dòng `-` nào ngoài phần tôi cố ý đổi. Nếu thấy dòng `-` bất thường → báo tôi ngay.

---

## 4. VẤN ĐỀ 2 — CHƯA KIỂM HÀNH VI THẬT TRÊN TRÌNH DUYỆT

Test của tôi chỉ kiểm **hàm thuần** (logic tính toán). Tôi **chưa** mở một tiết thật để xem:

- P-timer có nhảy đúng phút không, badge có hiện ở đúng vị trí header không, banner vàng/đỏ có bật đúng lúc phút 35/38 không.
- Ô trả lời có khoá đúng 10 giây rồi tự mở không; khi khoá có thật sự không gửi được không.
- `CasioKeyGuide` có hiện ở bài 12 và **ẩn** ở bài 10/11 không.
- Hook `useThinkWindow` có reset đúng khi GV chuyển câu hỏi không (phụ thuộc `roundKey`).

Đây là loại việc Codex với chrome-devtools làm tốt hơn. Trang cần kiểm: `https://giaoandewey.vercel.app/adaptive-live/:sessionId?mode=student&mode=tv-control`.

---

## 5. VẤN ĐỀ 3 — 3 BÀI CHƯA XUẤT BẢN, TAB VẪN 0 BÀI

Đây là điểm dừng hiện tại, **không phải lỗi code**.

Tôi đã QA trên production và thấy:
- `/adaptive-lessons` hiện **51 gói** ✔ (trước là 48 cứng)
- Bundle production có đủ `10-11-79`, `11-11-75`, `12-11-80` ✔
- **Nhưng tab "Bài học tương tác" vẫn 0 bài** ✘ — vì 3 bài chỉ nằm trong *danh mục gói*, chưa được *xuất bản* thành bài trong Firestore.

Cách giải: thầy bấm nút "Xuất bản 3 bài tương tác Tuần 11" trên trang `/adaptive-lessons`. Cần phiên đăng nhập Google của thầy — **không agent nào làm hộ được**.

Sau khi bấm, cần kiểm: 3 bài có `lessonKind = 'interactive'` trong Firestore, và hiện đúng trong tab.

---

## 6. VẤN ĐỀ 4 — 4 TEST HỎNG SẴN TỪ TRƯỚC (không do phiên này)

`src/lib/lessonCompiler/v832/contractData.test.ts` (2 test) và `goldenCandidates.test.ts` (2 test) hỏng.

Tôi đã **stash toàn bộ thay đổi** rồi chạy lại 2 file này trên code gốc → vẫn hỏng y hệt. Xác nhận không liên quan.

Nội dung hỏng: `lessonIRSchemaData` và `lessonValidatorContractData` không khớp từng byte với file JSON canonical; và `11T38` không import được mà không đổi fixture.

**Đề nghị:** đây là việc riêng của V8.3.2, không gộp vào đợt Tuần 11. Nếu thầy muốn dọn thì giao Codex một task riêng.

---

## 7. VẤN ĐỀ 5 — CUE ID ĐANG BỊ HARDCODE (chưa sửa, cần quyết định)

Trong code có nhiều chỗ so sánh **chuỗi cue ID cứng**:

| File | Dòng | Nội dung |
|---|---|---|
| `LiveActivityPublisher.tsx` | 18 | `cueId === 'P20' \|\| cueId === 'P22' \|\| stepId === 'cp-group-product'` |
| `StudentLiveView.tsx` | 336 | `publicState.cueId === 'P20' \|\| 'P22'` (isGroupActivity) |
| `StudentLiveView.tsx` | 599 | `cueId === 'P35' \|\| 'P39'` (reflectionMoment) |
| `TvLiveView.tsx` | 33–34 | `cueId === 'P05'` → goals, `cueId === 'P38'` → reflection |
| `TvStatsPanel.tsx` | 89 | `cueId === 'P20' \|\| 'P22'` |
| `v4/lessonAdapter.ts` | 319–338 | ánh xạ cue ID → checkpoint ID cho **2 bộ timeline** (P02/P04/P09… và P03/P05/P08…) |
| `v4/runtimeDefinition.ts` | 246–247 | `P00`, `P19`, `P38` |

**Vì sao đáng lo:** 48 bài Tuần 5–6 dùng một bộ cue ID; 3 bài Tuần 11 tôi thêm dùng bộ khác do adapter sinh theo `lessonMode`. Nếu adapter sinh cue ID không nằm trong các chuỗi trên thì các tính năng (chia nhóm, phản tư, mục tiêu, checkpoint) **im lặng không chạy** — không báo lỗi.

**Việc cần Codex làm:** kiểm timeline của 3 bài mới, đối chiếu xem cue ID nào được sinh ra, rồi xác nhận các nhánh hardcode có bắt đúng hay không. Nếu không, đề xuất cách khai báo thuộc tính trên cue (ví dụ `cue.kind = 'group' | 'goals' | 'reflection'`) thay vì so chuỗi — nhưng **chưa sửa**, chờ thầy duyệt vì chạm code dùng chung.

Lệnh gợi ý:
```
npx vitest run src/lib/liveLesson/v4/week11Catalog.test.ts
```
rồi viết script in `contract.timeline.map(b => b.id + ':' + b.checkpointId)` cho 3 key mới.

---

## 8. VIỆC CẦN CODEX LÀM — DANH SÁCH CỤ THỂ

### Ưu tiên 1 — rà soát an toàn (làm trước)

1. `git diff` 2 file ở mục 3, xác nhận không có dòng bị mất ngoài ý muốn.
2. Đọc lại toàn bộ `sequentialPublication.ts` phần tôi sửa — đặc biệt chỗ spread `...(isInteractiveLesson ? { lessonKind } : {})` có ghi đè `lessonKind` cũ khi **xuất bản lại** bài đã có không. Nếu thầy bấm nút 2 lần, bài có bị mất trường gì không?
3. Kiểm `handleSequentialPublish(keysOverride)` — khi truyền 3 key, biến `existingLessons` xây từ toàn bộ `lessons` có đúng không, và `sequentialProgress.total` có hiện đúng 3 không.

### Ưu tiên 2 — kiểm hành vi trình duyệt (mục 4)

### Ưu tiên 3 — kiểm chéo nội dung toán (mục 9)

---

## 9. CON SỐ CẦN KIỂM CHÉO ĐỘC LẬP

Tôi soạn từ giáo án gốc. Kiểm lại bằng script hoặc bấm máy:

**Bài 10 (Số gần đúng):**
- Fansipan: `d = 0,2` → hàng quy tròn là hàng **đơn vị** → `3 147,3 ≈ 3 147`
- `|3,14 − 3,14159| = 0,00159`
- Cầu 100 m ± 1 cm: `δ ≤ 0,01/100 = 0,01%`; bút chì 10 cm ± 1 cm: `δ ≤ 1/10 = 10%`
- Ruộng `45,6 ± 0,1` → khoảng `[45,5; 45,7]`, nên 45,75 **sai**
- Trái Đất `6 371 ± 1 km` → `δ ≈ 0,016%`

**Bài 11 (Ghép nhóm):**
- Bảng 40 số tôi tạo: min 42, max 235, `R = 193`
- Tần số 6 nhóm 40 phút: `10, 15, 11, 3, 0, 1` — **tổng phải bằng 40**
- Nhóm `[190;230)` tần số **0** — cố ý giữ để dạy "không bỏ hổng"
- Cự ly: `x_min = 12,1`, `x_max = 15,5`, `R = 3,5`, 4 nhóm → `h ≥ 0,875` → chọn `h = 1,0`

**Bài 12 (Phương sai):**
- An (2, 16, 2), Bình (7, 6, 7), cᵢ = 7, 9, 11, cả hai `x̄ = 8,5`
- An: `Σnᵢ(cᵢ−x̄)² = 21` → `s² = 1,05` → `s ≈ 1,0247` ✔ khớp `σx = 1,02469…` trên Casio
- Bình: `Σ = 61` → `s² = 3,05` → `s ≈ 1,7464`
- Rút gọn An: `Σnᵢcᵢ² = 1636` → `1636/20 − 8,5² = 81,8 − 72,25 = 1,05` ✔

Nếu con số nào lệch → **báo lại, không tự sửa** (vì nội dung phải khớp giáo án gốc của thầy).

---

## 10. RANH GIỚI — CODEX KHÔNG ĐƯỢC LÀM

- **Không sửa nội dung toán** trong snapshot (số liệu, công thức, đáp án). Muốn sửa phải hỏi thầy.
- **Không đổi** `INTERACTIVE_SOURCE_KEYS`, không đổi mã `10-11-79 / 11-11-75 / 12-11-80` — đây là `periodNo` thật từ `src/data/ppct/tds-gXX.json`.
- **Không bật lại "48"** ở bất kỳ đâu — con số thật là 51.
- **Không sửa** 4 test hỏng sẵn ở `lessonCompiler/v832` trong đợt này.
- **Không tự ý refactor** phần hardcode cue ID (mục 7) — chỉ báo cáo và đề xuất.

## 11. LỆNH KIỂM TRA

```powershell
npm run lint                                    # phải 0 lỗi
npx vitest run src/lib/liveLesson src/components/liveLesson   # 464 test, phải xanh hết
npm run build                                   # phải thành công
```

Trạng thái tôi để lại: `lint` 0 lỗi · 464/464 test xanh · build thành công · đã push `main` tại `abb7475`.

## 12. MÔI TRƯỜNG — LƯU Ý KHI CHẠY

- Terminal là **PowerShell**, không phải CMD. Đừng dùng `cd /d`. Dùng `npm --prefix "<đường dẫn>" run <script>` hoặc đặt `workdir`.
- Tên file có dấu tiếng Việt bị PowerShell làm hỏng hiển thị — lấy tên qua pipeline/`fs.readdirSync`, đừng gõ tay.
- `git push` trả exit code 1 dù thành công (PowerShell coi stderr là lỗi) — đọc dòng `xxx..yyy HEAD -> main` mới là kết quả thật.
- `git commit`/`git push` trần bị harness deny → dùng `git -c core.hooksPath=.githooks commit|push`.
- Remote `main` nhận commit rất thường xuyên từ phiên khác → luôn `git fetch origin main` + `rebase` trước khi push.
